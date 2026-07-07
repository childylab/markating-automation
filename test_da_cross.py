import time
import hmac
import hashlib
import base64
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# SA 계정 키로 DA Customer ID를 호출해보는 크로스 테스트
SA_API_KEY = os.getenv("SA_API_KEY")
SA_SECRET_KEY = os.getenv("SA_SECRET_KEY")

# DA 계정 키
DA_API_KEY = os.getenv("DA_API_KEY")
DA_SECRET_KEY = os.getenv("DA_SECRET_KEY")

# 여러 Customer ID 후보
CUSTOMER_IDS = {
    "DA_API_CID_3856241": "3856241",
    "SA_API_CID_3303451": "3303451",
    "광고계정번호_1667290": "1667290",
    "광고계정번호_1667291": "1667291",
}

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


def test_campaigns(label, api_key, secret_key, customer_id):
    uri = "/ncc/campaigns"
    method = "GET"
    headers = get_header(method, uri, api_key, secret_key, customer_id)
    r = requests.get(BASE_URL + uri, headers=headers)
    
    count = 0
    if r.status_code == 200:
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        if count > 0:
            print(f"  ✅ [{label}] CID={customer_id} → {count}개 캠페인!")
            for c in data[:5]:
                print(f"     - [{c.get('campaignTp', '?')}] {c.get('name', '?')}")
        else:
            print(f"  ❌ [{label}] CID={customer_id} → 캠페인 0개")
    else:
        print(f"  ❌ [{label}] CID={customer_id} → HTTP {r.status_code}: {r.text[:100]}")
    
    return count


print("=" * 60)
print("테스트 1: DA 키로 여러 Customer ID 시도")
print("=" * 60)
for name, cid in CUSTOMER_IDS.items():
    test_campaigns(f"DA키+{name}", DA_API_KEY, DA_SECRET_KEY, cid)

print(f"\n{'=' * 60}")
print("테스트 2: SA 키로 여러 Customer ID 시도")
print("=" * 60)
for name, cid in CUSTOMER_IDS.items():
    test_campaigns(f"SA키+{name}", SA_API_KEY, SA_SECRET_KEY, cid)
