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


@app.route("/api/sa/campaigns/daily", methods=["GET"])
def get_sa_campaigns_daily():
    """SA 캠페인별 일별 성과 데이터"""
    import requests as req

    campaign_id = request.args.get("id")
    start_date = request.args.get("start", (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"))
    end_date = request.args.get("end", datetime.now().strftime("%Y-%m-%d"))

    if not campaign_id:
        return jsonify({"error": "id 파라미터 필요"}), 400

    uri = "/stats"
    fields = json.dumps(["impCnt", "clkCnt", "salesAmt", "ctr", "cpc", "ccnt", "convAmt"])
    time_range = json.dumps({"since": start_date, "until": end_date})

    params = {
        "ids": [campaign_id],
        "fields": fields,
        "timeRange": time_range,
        "breakdown": "daily",
    }

    r = req.get(SA_BASE_URL + uri, params=params, headers=sa_header("GET", uri))
    if r.status_code != 200:
        return jsonify({"error": "조회 실패"}), 500

    result = r.json()
    data = []
    if isinstance(result, dict) and "data" in result:
        data = result["data"]
    elif isinstance(result, list):
        data = result

    # 일별 purchase 데이터도 가져오기
    purchase_daily = get_purchase_conversions_daily(campaign_id)

    output = []
    for d in data:
        date = d.get("statDt", "")
        pdata = purchase_daily.get(date, {"purchaseCount": 0, "purchaseAmount": 0, "cartCount": 0})
        output.append({
            "date": date,
            "cost": d.get("salesAmt", 0),
            "impressions": d.get("impCnt", 0),
            "clicks": d.get("clkCnt", 0),
            "ctr": d.get("ctr", 0),
            "conversions": d.get("ccnt", 0),
            "convValue": d.get("convAmt", 0),
            "purchaseCount": pdata["purchaseCount"],
            "purchaseAmount": pdata["purchaseAmount"],
            "cartCount": pdata["cartCount"],
        })

    output.sort(key=lambda x: x["date"], reverse=True)
    return jsonify(output)


def get_purchase_conversions_daily(campaign_id):
    """특정 캠페인의 일별 purchase/add_to_cart 데이터"""
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
            if cols[2].strip() != campaign_id:
                continue

            date = cols[0].strip()
            conv_type = cols[12].strip()
            conv_count = int(cols[13].strip()) if cols[13].strip().isdigit() else 0
            conv_amount = int(cols[14].strip()) if cols[14].strip().isdigit() else 0

            if conv_type in ("purchase", "add_to_cart"):
                if date not in result:
                    result[date] = {"purchaseCount": 0, "purchaseAmount": 0, "cartCount": 0}
                if conv_type == "purchase":
                    result[date]["purchaseCount"] += conv_count
                    result[date]["purchaseAmount"] += conv_amount
                elif conv_type == "add_to_cart":
                    result[date]["cartCount"] += conv_count

        time.sleep(0.2)

    return result


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.now().isoformat()})


@app.route("/")
def serve_dashboard():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    print("=" * 50)
    print("마케팅 자동화 로컬 서버 시작")
    print("http://localhost:5001")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5001, debug=True)
