"""
SA (검색광고) 마스터 리포트 수집 스크립트
- 캠페인/광고그룹 단위 일별 성과 데이터 수집
- CSV로 저장
"""

import time
import hmac
import hashlib
import base64
import requests
import json
import os
import csv
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SA_API_KEY")
SECRET_KEY = os.getenv("SA_SECRET_KEY")
CUSTOMER_ID = os.getenv("SA_CUSTOMER_ID")
BASE_URL = "https://api.searchad.naver.com"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_signature(timestamp, method, uri, secret_key):
    message = f"{timestamp}.{method}.{uri}"
    sign = hmac.new(
        bytes(secret_key, "utf-8"),
        bytes(message, "utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.b64encode(sign).decode("utf-8")


def get_header(method, uri):
    timestamp = str(int(time.time() * 1000))
    signature = generate_signature(timestamp, method, uri, SECRET_KEY)
    return {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Timestamp": timestamp,
        "X-API-KEY": API_KEY,
        "X-Customer": CUSTOMER_ID,
        "X-Signature": signature,
    }


def get_campaigns():
    """전체 캠페인 목록 조회"""
    uri = "/ncc/campaigns"
    r = requests.get(BASE_URL + uri, headers=get_header("GET", uri))
    r.raise_for_status()
    return r.json()


def get_adgroups(campaign_id):
    """캠페인 내 광고그룹 목록 조회"""
    uri = "/ncc/adgroups"
    r = requests.get(
        BASE_URL + uri,
        params={"nccCampaignId": campaign_id},
        headers=get_header("GET", uri),
    )
    r.raise_for_status()
    return r.json()


def get_stats(ids, start_date, end_date, breakdown="allDays"):
    """
    성과 데이터 조회
    - ids: 캠페인 또는 광고그룹 ID 리스트
    - breakdown: "allDays" (기간 합산) 또는 "daily" (일별)
    """
    uri = "/stats"
    fields = json.dumps(["impCnt", "clkCnt", "salesAmt", "ctr", "cpc", "ccnt", "crto", "convAmt"])
    time_range = json.dumps({"since": start_date, "until": end_date})

    # API는 한번에 최대 100개 ID 처리
    all_stats = []
    for i in range(0, len(ids), 100):
        batch = ids[i : i + 100]
        params = {
            "ids": batch,
            "fields": fields,
            "timeRange": time_range,
            "breakdown": breakdown,
        }
        r = requests.get(BASE_URL + uri, params=params, headers=get_header("GET", uri))
        r.raise_for_status()
        result = r.json()

        # 응답 구조 처리
        if isinstance(result, dict) and "data" in result:
            all_stats.extend(result["data"])
        elif isinstance(result, list):
            all_stats.extend(result)

        time.sleep(0.5)  # rate limit 방지

    return all_stats


def collect_campaign_report(start_date, end_date):
    """캠페인 단위 리포트 수집"""
    print(f"[SA] 캠페인 리포트 수집: {start_date} ~ {end_date}")

    campaigns = get_campaigns()
    if not campaigns:
        print("  캠페인 없음")
        return []

    campaign_ids = [c["nccCampaignId"] for c in campaigns]
    campaign_map = {c["nccCampaignId"]: c for c in campaigns}

    stats = get_stats(campaign_ids, start_date, end_date, breakdown="daily")

    rows = []
    for s in stats:
        cid = s.get("id", "")
        camp = campaign_map.get(cid, {})
        row = {
            "date": s.get("statDt", start_date),
            "campaign_id": cid,
            "campaign_name": camp.get("name", ""),
            "campaign_type": camp.get("campaignTp", ""),
            "status": camp.get("status", ""),
            "impressions": s.get("impCnt", 0),
            "clicks": s.get("clkCnt", 0),
            "cost": s.get("salesAmt", 0),
            "ctr": s.get("ctr", 0),
            "cpc": s.get("cpc", 0),
            "conversions": s.get("ccnt", 0),
            "conv_rate": s.get("crto", 0),
            "conv_value": s.get("convAmt", 0),
        }
        rows.append(row)

    return rows


def collect_adgroup_report(start_date, end_date):
    """광고그룹 단위 리포트 수집"""
    print(f"[SA] 광고그룹 리포트 수집: {start_date} ~ {end_date}")

    campaigns = get_campaigns()
    all_adgroups = []

    for camp in campaigns:
        adgroups = get_adgroups(camp["nccCampaignId"])
        for ag in adgroups:
            ag["_campaign_name"] = camp.get("name", "")
            ag["_campaign_type"] = camp.get("campaignTp", "")
        all_adgroups.extend(adgroups)
        time.sleep(0.3)

    if not all_adgroups:
        print("  광고그룹 없음")
        return []

    adgroup_ids = [ag["nccAdgroupId"] for ag in all_adgroups]
    adgroup_map = {ag["nccAdgroupId"]: ag for ag in all_adgroups}

    stats = get_stats(adgroup_ids, start_date, end_date, breakdown="daily")

    rows = []
    for s in stats:
        agid = s.get("id", "")
        ag = adgroup_map.get(agid, {})
        row = {
            "date": s.get("statDt", start_date),
            "campaign_name": ag.get("_campaign_name", ""),
            "campaign_type": ag.get("_campaign_type", ""),
            "adgroup_id": agid,
            "adgroup_name": ag.get("name", ""),
            "status": ag.get("status", ""),
            "impressions": s.get("impCnt", 0),
            "clicks": s.get("clkCnt", 0),
            "cost": s.get("salesAmt", 0),
            "ctr": s.get("ctr", 0),
            "cpc": s.get("cpc", 0),
            "conversions": s.get("ccnt", 0),
            "conv_rate": s.get("crto", 0),
            "conv_value": s.get("convAmt", 0),
        }
        rows.append(row)

    return rows


def save_csv(rows, filename):
    """리스트를 CSV로 저장"""
    if not rows:
        print(f"  저장할 데이터 없음: {filename}")
        return

    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    print(f"  저장 완료: {filepath} ({len(rows)}행)")


def main():
    # 최근 30일
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

    print("=" * 60)
    print(f"SA 마스터 리포트 수집 시작")
    print(f"기간: {start_date} ~ {end_date}")
    print("=" * 60)

    # 캠페인 단위
    campaign_rows = collect_campaign_report(start_date, end_date)
    save_csv(campaign_rows, f"sa_campaign_{start_date}_{end_date}.csv")

    # 광고그룹 단위
    adgroup_rows = collect_adgroup_report(start_date, end_date)
    save_csv(adgroup_rows, f"sa_adgroup_{start_date}_{end_date}.csv")

    print(f"\n{'=' * 60}")
    print("SA 리포트 수집 완료")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
