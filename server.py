"""
로컬 API 서버
- 대시보드에서 호출하면 SA API / DA Playwright 실행
- http://localhost:5000
"""

import os
import json
import time
import hmac
import hashlib
import base64
import csv
import glob
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

BASE_DIR = os.path.dirname(__file__)
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
COOKIE_FILE = os.path.join(BASE_DIR, ".naver_cookies.json")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# === SA API 설정 ===
SA_API_KEY = os.getenv("SA_API_KEY")
SA_SECRET_KEY = os.getenv("SA_SECRET_KEY")
SA_CUSTOMER_ID = os.getenv("SA_CUSTOMER_ID")
SA_BASE_URL = "https://api.searchad.naver.com"


def generate_signature(timestamp, method, uri, secret_key):
    message = f"{timestamp}.{method}.{uri}"
    sign = hmac.new(
        bytes(secret_key, "utf-8"),
        bytes(message, "utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.b64encode(sign).decode("utf-8")


def sa_header(method, uri):
    timestamp = str(int(time.time() * 1000))
    signature = generate_signature(timestamp, method, uri, SA_SECRET_KEY)
    return {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Timestamp": timestamp,
        "X-API-KEY": SA_API_KEY,
        "X-Customer": SA_CUSTOMER_ID,
        "X-Signature": signature,
    }


def get_purchase_conversions():
    """
    stat-reports에서 AD_CONVERSION_DETAIL 리포트를 가져와서
    'purchase'와 'add_to_cart' 전환을 캠페인별로 합산하여 반환
    여러 날짜의 리포트를 모두 다운받아 합산
    """
    import requests as req

    uri = "/stat-reports"
    r = req.get(SA_BASE_URL + uri, headers=sa_header("GET", uri))
    if r.status_code != 200:
        return {}

    reports = r.json()
    if not isinstance(reports, list):
        return {}

    conv_reports = [
        rp for rp in reports
        if rp.get("reportTp") == "AD_CONVERSION_DETAIL" and rp.get("status") == "BUILT"
    ]

    if not conv_reports:
        return {}

    result = {}

    for rp in conv_reports[:30]:
        download_url = rp.get("downloadUrl", "")
        if not download_url:
            continue

        r = req.get(download_url, headers=sa_header("GET", "/report-download"))
        if r.status_code != 200:
            continue

        lines = r.content.decode("utf-8", errors="replace").strip().split("\n")
        for line in lines:
            cols = line.split("\t")
            if len(cols) < 15:
                continue

            campaign_id = cols[2].strip()
            conv_type = cols[12].strip() if len(cols) > 12 else ""
            conv_count = int(cols[13].strip()) if len(cols) > 13 and cols[13].strip().isdigit() else 0
            conv_amount = int(cols[14].strip()) if len(cols) > 14 and cols[14].strip().isdigit() else 0

            if conv_type in ("purchase", "add_to_cart"):
                if campaign_id not in result:
                    result[campaign_id] = {"purchaseCount": 0, "purchaseAmount": 0, "cartCount": 0}
                if conv_type == "purchase":
                    result[campaign_id]["purchaseCount"] += conv_count
                    result[campaign_id]["purchaseAmount"] += conv_amount
                elif conv_type == "add_to_cart":
                    result[campaign_id]["cartCount"] += conv_count

        time.sleep(0.2)

    return result


@app.route("/api/sa/campaigns", methods=["GET"])
def get_sa_campaigns():
    """SA 캠페인 성과 데이터 반환 (구매전환 분리 포함)"""
    import requests as req

    start_date = request.args.get("start", (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"))
    end_date = request.args.get("end", datetime.now().strftime("%Y-%m-%d"))

    # 캠페인 목록
    uri = "/ncc/campaigns"
    r = req.get(SA_BASE_URL + uri, headers=sa_header("GET", uri))
    if r.status_code != 200:
        return jsonify({"error": "SA 캠페인 조회 실패", "status": r.status_code}), 500

    campaigns = r.json()
    campaign_map = {c["nccCampaignId"]: c for c in campaigns}
    campaign_ids = list(campaign_map.keys())

    if not campaign_ids:
        return jsonify([])

    # 성과 데이터 (stat API - 합산)
    uri = "/stats"
    fields = json.dumps(["impCnt", "clkCnt", "salesAmt", "ctr", "cpc", "ccnt", "convAmt", "crto", "viewCnt", "viewAmt"])
    time_range = json.dumps({"since": start_date, "until": end_date})

    all_stats = []
    for i in range(0, len(campaign_ids), 100):
        batch = campaign_ids[i:i+100]
        params = {"ids": batch, "fields": fields, "timeRange": time_range}
        r = req.get(SA_BASE_URL + uri, params=params, headers=sa_header("GET", uri))
        if r.status_code == 200:
            result = r.json()
            if isinstance(result, dict) and "data" in result:
                all_stats.extend(result["data"])
            elif isinstance(result, list):
                all_stats.extend(result)
        time.sleep(0.3)

    # 구매전환 상세 데이터 (stat-reports에서 가져오기)
    purchase_data = get_purchase_conversions()

    # 조합
    output = []
    for s in all_stats:
        cid = s.get("id", "")
        camp = campaign_map.get(cid, {})
        pdata = purchase_data.get(cid, {"purchaseCount": 0, "purchaseAmount": 0, "cartCount": 0})

        output.append({
            "id": cid,
            "name": camp.get("name", ""),
            "type": camp.get("campaignTp", ""),
            "account": "SA",
            "status": camp.get("status", ""),
            "impressions": s.get("impCnt", 0),
            "clicks": s.get("clkCnt", 0),
            "cost": s.get("salesAmt", 0),
            "ctr": s.get("ctr", 0),
            "cpc": s.get("cpc", 0),
            "conversions": s.get("ccnt", 0),
            "convRate": s.get("crto", 0),
            "convValue": s.get("convAmt", 0),
            "viewConversions": s.get("viewCnt", 0),
            "viewConvValue": s.get("viewAmt", 0),
            "purchaseCount": pdata["purchaseCount"],
            "purchaseAmount": pdata["purchaseAmount"],
            "cartCount": pdata["cartCount"],
        })

    return jsonify(output)


@app.route("/api/da/fetch", methods=["POST"])
def fetch_da_report():
    """DA 보고서 Playwright로 다운로드"""
    from playwright.sync_api import sync_playwright

    start_date = request.json.get("start", (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"))
    end_date = request.json.get("end", datetime.now().strftime("%Y-%m-%d"))

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)  # 로그인 필요하므로 보이게
            context = browser.new_context()

            # 쿠키 로드
            if os.path.exists(COOKIE_FILE):
                with open(COOKIE_FILE, "r") as f:
                    cookies = json.load(f)
                context.add_cookies(cookies)

            page = context.new_page()

            # ads.naver.com 접속
            page.goto("https://ads.naver.com/manage/ad-accounts/1667290/dashboard")
            time.sleep(5)

            # 로그인 필요 여부 확인
            if "nid.naver.com" in page.url or "nidlogin" in page.url:
                # 로그인 페이지에 있음 — 아무것도 건드리지 않고 사용자가 직접 로그인할 때까지 대기
                print("[DA] 로그인 필요 — 브라우저에서 직접 로그인해주세요 (최대 3분)")
                
                # 3분(180초) 동안 기다림 — 사용자가 수동으로 로그인
                for i in range(180):
                    time.sleep(1)
                    if "ads.naver.com" in page.url and "nid.naver.com" not in page.url:
                        print(f"[DA] 로그인 감지! ({i+1}초)")
                        break

                time.sleep(3)  # 리다이렉트 안정화 대기

                if "nid.naver.com" in page.url or "nidlogin" in page.url:
                    browser.close()
                    return jsonify({"error": "로그인 시간 초과 (3분). 브라우저에서 로그인을 완료해주세요.", "needLogin": True}), 401

            # 로그인 성공 — 쿠키 저장
            cookies = context.cookies()
            with open(COOKIE_FILE, "w") as f:
                json.dump(cookies, f)

            # 보고서 페이지 이동
            page.goto("https://ads.naver.com/manage/ad-accounts/1667290/reports")
            time.sleep(3)

            # 보고서 다운로드 시도
            # ads.naver.com 보고서 페이지에서 CSV 다운로드
            # 실제 셀렉터는 페이지 구조에 따라 조정 필요
            
            # 스크린샷 저장 (디버깅용)
            screenshot_path = os.path.join(OUTPUT_DIR, "da_report_page.png")
            page.screenshot(path=screenshot_path, full_page=True)

            # 현재 페이지 정보 수집
            page_url = page.url
            page_title = page.title()

            # 페이지에서 다운로드 버튼 찾기 시도
            download_success = False
            downloaded_file = None

            try:
                # 일반적인 다운로드 버튼 패턴 시도
                download_selectors = [
                    'button:has-text("다운로드")',
                    'button:has-text("내려받기")',
                    'button:has-text("엑셀")',
                    'button:has-text("CSV")',
                    '[data-testid="download"]',
                    '.download-btn',
                ]

                for selector in download_selectors:
                    try:
                        if page.locator(selector).count() > 0:
                            with page.expect_download(timeout=10000) as download_info:
                                page.click(selector)
                            download = download_info.value
                            downloaded_file = os.path.join(OUTPUT_DIR, f"da_report_{start_date}_{end_date}.csv")
                            download.save_as(downloaded_file)
                            download_success = True
                            break
                    except:
                        continue
            except Exception as e:
                pass

            browser.close()

            if download_success and downloaded_file:
                # CSV 파싱
                data = parse_da_csv(downloaded_file)
                return jsonify({"success": True, "data": data, "file": downloaded_file})
            else:
                return jsonify({
                    "success": False,
                    "message": "보고서 다운로드 버튼을 자동으로 찾지 못했어요. 스크린샷을 확인해주세요.",
                    "screenshot": screenshot_path,
                    "pageUrl": page_url,
                    "pageTitle": page_title,
                    "needManualSetup": True,
                })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/da/login", methods=["POST"])
def da_login():
    """DA 로그인용 — 브라우저 띄워서 수동 로그인, 쿠키 저장"""
    from playwright.sync_api import sync_playwright

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()

            page.goto("https://ads.naver.com")
            time.sleep(2)

            # 사용자가 로그인할 때까지 대기 (최대 180초)
            logged_in = False
            for _ in range(180):
                time.sleep(1)
                if "ads.naver.com/manage" in page.url:
                    logged_in = True
                    break

            if logged_in:
                # 쿠키 저장
                cookies = context.cookies()
                with open(COOKIE_FILE, "w") as f:
                    json.dump(cookies, f)
                browser.close()
                return jsonify({"success": True, "message": "로그인 완료, 쿠키 저장됨"})
            else:
                browser.close()
                return jsonify({"success": False, "message": "로그인 시간 초과 (3분)"}), 408

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/da/status", methods=["GET"])
def da_status():
    """DA 연동 상태 확인"""
    has_cookies = os.path.exists(COOKIE_FILE)
    cookie_age = None
    if has_cookies:
        mtime = os.path.getmtime(COOKIE_FILE)
        cookie_age = int(time.time() - mtime)

    return jsonify({
        "hasCookies": has_cookies,
        "cookieAgeSeconds": cookie_age,
        "cookieFresh": cookie_age is not None and cookie_age < 86400,  # 24시간 이내
    })


def parse_da_csv(filepath):
    """DA CSV 파싱 → JSON"""
    data = []
    try:
        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append({
                    "name": row.get("캠페인", row.get("campaign", "")),
                    "type": "DISPLAY",
                    "account": "DA",
                    "impressions": int(row.get("노출수", row.get("impressions", 0)) or 0),
                    "clicks": int(row.get("클릭수", row.get("clicks", 0)) or 0),
                    "cost": int(row.get("비용", row.get("cost", 0)) or 0),
                    "conversions": int(row.get("전환수", row.get("conversions", 0)) or 0),
                    "convValue": int(row.get("전환매출", row.get("revenue", 0)) or 0),
                })
    except Exception as e:
        print(f"CSV 파싱 에러: {e}")
    return data


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.now().isoformat()})


@app.route("/")
def serve_dashboard():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    print("=" * 50)
    print("마케팅 자동화 로컬 서버 시작")
    print("http://localhost:5000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5001, debug=True)
