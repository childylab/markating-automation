import time
import hmac
import hashlib
import base64
import requests
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# === DA 계정 (1667290) 차일디 ===
DA_API_KEY = os.getenv("DA_API_KEY")
DA_SECRET_KEY = os.getenv("DA_SECRET_KEY")
DA_CUSTOMER_ID = os.getenv("DA_CUSTOMER_ID")

# === SA 계정 (1667291) 차일디 ===
SA_API_KEY = os.getenv("SA_API_KEY")
SA_SECRET_KEY = os.getenv("SA_SECRET_KEY")
SA_CUSTOMER_ID = os.getenv("SA_CUSTOMER_ID")

BASE_URL = "https://api.searchad.naver.com"


def generate_signature(timestamp, method, uri, secret_key):
    message = f"{timestamp}.{method}.{uri}"
    sign = hmac.new(
        bytes(secret_key, "utf-8"),
        bytes(message, "utf-8"),
        hashlib.sha256
    ).digest()
    return base64.b64encode(sign).decode("utf-8")


def get_header(method, uri, api_key, secret_key, customer_id):
    timestamp = str(int(time.time() * 1000))
    signature = generate_signature(timestamp, method, uri, secret_key)
    return {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Timestamp": timestamp,
        "X-API-KEY": api_key,
        "X-Customer": customer_id,
        "X-Signature": signature,
    }


def test_campaigns(account_name, api_key, secret_key, customer_id):
    print(f"\n{'='*60}")
    print(f"[{account_name}] 캠페인 목록 조회 (Customer ID: {customer_id})")
    print(f"{'='*60}")
    
    uri = "/ncc/campaigns"
    method = "GET"
    headers = get_header(method, uri, api_key, secret_key, customer_id)
    
    r = requests.get(BASE_URL + uri, headers=headers)
    print(f"Status: {r.status_code}")
    
    if r.status_code == 200:
        campaigns = r.json()
        print(f"캠페인 수: {len(campaigns)}")
        for c in campaigns[:10]:  # 최대 10개만 출력
            print(f"  - [{c.get('campaignTp', '?')}] {c.get('name', '?')} (ID: {c.get('nccCampaignId', '?')}, 상태: {c.get('status', '?')})")
    else:
        print(f"에러: {r.text}")
    
    return r.status_code, r.json() if r.status_code == 200 else r.text


def test_stats(account_name, api_key, secret_key, customer_id, campaign_ids):
    print(f"\n{'='*60}")
    print(f"[{account_name}] 성과 데이터 조회 (최근 1달)")
    print(f"{'='*60}")
    
    if not campaign_ids:
        print("조회할 캠페인 ID가 없습니다.")
        return
    
    uri = "/stats"
    method = "GET"
    headers = get_header(method, uri, api_key, secret_key, customer_id)
    
    # 최근 1달
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    # 최대 5개 캠페인만 테스트
    test_ids = campaign_ids[:5]
    
    params = {
        "ids": test_ids,
        "fields": '["impCnt","clkCnt","salesAmt","ctr","cpc","ccnt"]',
        "timeRange": json.dumps({"since": start_date, "until": end_date}),
    }
    
    r = requests.get(BASE_URL + uri, params=params, headers=headers)
    print(f"Status: {r.status_code}")
    print(f"기간: {start_date} ~ {end_date}")
    
    if r.status_code == 200:
        stats = r.json()
        print(f"결과 수: {len(stats)}")
        if isinstance(stats, list):
            for s in stats:
                if isinstance(s, dict):
                    print(f"  - ID: {s.get('id', '?')}")
                    print(f"    노출: {s.get('impCnt', 0):,} | 클릭: {s.get('clkCnt', 0):,} | 비용: {s.get('salesAmt', 0):,}원 | CTR: {s.get('ctr', 0):.2f}% | 전환: {s.get('ccnt', 0)}")
                else:
                    print(f"  - (raw): {s}")
        else:
            print(f"  응답: {json.dumps(stats, ensure_ascii=False, indent=2)[:500]}")
    else:
        print(f"에러: {r.text}")


if __name__ == "__main__":
    print("=" * 60)
    print("네이버 광고 API 테스트 시작")
    print("=" * 60)
    
    # 1. DA 계정 테스트
    da_status, da_result = test_campaigns("DA (1667290)", DA_API_KEY, DA_SECRET_KEY, DA_CUSTOMER_ID)
    
    da_campaign_ids = []
    if da_status == 200 and isinstance(da_result, list):
        da_campaign_ids = [c["nccCampaignId"] for c in da_result]
        test_stats("DA (1667290)", DA_API_KEY, DA_SECRET_KEY, DA_CUSTOMER_ID, da_campaign_ids)
    
    # 2. SA 계정 테스트
    sa_status, sa_result = test_campaigns("SA (1667291)", SA_API_KEY, SA_SECRET_KEY, SA_CUSTOMER_ID)
    
    sa_campaign_ids = []
    if sa_status == 200 and isinstance(sa_result, list):
        sa_campaign_ids = [c["nccCampaignId"] for c in sa_result]
        test_stats("SA (1667291)", SA_API_KEY, SA_SECRET_KEY, SA_CUSTOMER_ID, sa_campaign_ids)
    
    print(f"\n{'='*60}")
    print("테스트 완료")
    print(f"{'='*60}")
