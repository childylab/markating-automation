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
    """DA 보고서 Playwright로 다운로드 — 크롬 프로필 복사본 사용 (봇감지 우회)"""
    from playwright.sync_api import sync_playwright

    start_date = request.json.get("start", (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"))
    end_date = request.json.get("end", datetime.now().strftime("%Y-%m-%d"))

    # 복사해둔 크롬 프로필 (크롬이 열려있어도 충돌 안 남)
    profile_path = os.path.join(BASE_DIR, ".chrome-profile")

    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir=profile_path,
                channel="chrome",
                headless=False,
            )

            page = context.pages[0] if context.pages else context.new_page()

            # ads.naver.com 접속
            page.goto("https://ads.naver.com/manage/ad-accounts/1667290/dashboard")
            time.sleep(5)

            # 로그인 필요하면 3분 대기
            if "nid.naver.com" in page.url or "nidlogin" in page.url:
                print("[DA] 로그인 필요 — 브라우저에서 직접 로그인해주세요 (최대 3분)")
                for i in range(180):
                    time.sleep(1)
                    if "ads.naver.com" in page.url and "nid.naver.com" not in page.url:
                        break
                time.sleep(3)
                if "nid.naver.com" in page.url:
                    context.close()
                    return jsonify({"error": "로그인 시간 초과", "needLogin": True}), 401

            # 보고서 페이지 이동
            page.goto("https://ads.naver.com/manage/ad-accounts/1667290/reports")
            time.sleep(3)

            # 스크린샷
            screenshot_path = os.path.join(OUTPUT_DIR, "da_report_page.png")
            page.screenshot(path=screenshot_path, full_page=True)
            page_url = page.url
            page_title = page.title()

            # 다운로드 시도
            download_success = False
            downloaded_file = None

            try:
                download_selectors = [
                    'button:has-text("다운로드")',
                    'button:has-text("내려받기")',
                    'button:has-text("엑셀")',
                    'button:has-text("CSV")',
                    '[data-testid="download"]',
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
            except:
                pass

            context.close()

            if download_success and downloaded_file:
                data = parse_da_csv(downloaded_file)
                return jsonify({"success": True, "data": data, "file": downloaded_file})
            else:
                return jsonify({
                    "success": False,
                    "message": "보고서 페이지 접근 성공. 스크린샷 확인: output/da_report_page.png",
                    "screenshot": screenshot_path,
                    "pageUrl": page_url,
                    "pageTitle": page_title,
                    "needManualSetup": True,
                })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/da/login", methods=["POST"])
def da_login():
    """DA 로그인용 — 크롬 프로필 복사본으로 브라우저 띄움"""
    from playwright.sync_api import sync_playwright

    profile_path = os.path.join(BASE_DIR, ".chrome-profile")

    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir=profile_path,
                channel="chrome",
                headless=False,
            )

            page = context.pages[0] if context.pages else context.new_page()
            page.goto("https://ads.naver.com")
            time.sleep(3)

            # 이미 로그인되어 있으면 바로 성공
            if "ads.naver.com/manage" in page.url:
                context.close()
                return jsonify({"success": True, "message": "이미 로그인되어 있어요!"})

            # 로그인 대기 (3분)
            for i in range(180):
                time.sleep(1)
                if "ads.naver.com/manage" in page.url:
                    context.close()
                    return jsonify({"success": True, "message": "로그인 완료!"})

            context.close()
            return jsonify({"success": False, "message": "로그인 시간 초과 (3분)"}), 408

    except Exception as e:
        return jsonify({"error": str(e)}), 500
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
