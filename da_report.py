"""
DA (성과형 디스플레이/애드부스트) 보고서 자동 다운로드 스크립트
- Playwright로 ads.naver.com 로그인 → 보고서 CSV 다운로드
- 네이버 로그인 필요 (쿠키 기반 세션 유지)
"""

import os
import time
import glob
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

# 설정
NAVER_ID = os.getenv("NAVER_ID", "")  # .env에 추가 필요
NAVER_PW = os.getenv("NAVER_PW", "")  # .env에 추가 필요
DA_ACCOUNT_ID = "1667290"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
COOKIE_FILE = os.path.join(os.path.dirname(__file__), ".naver_cookies.json")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def login_naver(page):
    """
    네이버 로그인
    주의: 네이버는 자동 로그인 감지(캡차)가 강력함.
    방법 1: 수동 로그인 후 쿠키 저장 → 이후 쿠키로 세션 유지
    방법 2: 2차인증 없는 환경에서 ID/PW 입력
    """
    print("[DA] 네이버 로그인 시도...")
    page.goto("https://nid.naver.com/nidlogin.login")
    time.sleep(2)

    # 네이버는 직접 타이핑을 감지하므로, clipboard 방식 사용
    # ID 입력
    page.click("#id")
    page.evaluate(f'document.querySelector("#id").value = "{NAVER_ID}"')
    page.dispatch_event("#id", "input")
    time.sleep(0.5)

    # PW 입력
    page.click("#pw")
    page.evaluate(f'document.querySelector("#pw").value = "{NAVER_PW}"')
    page.dispatch_event("#pw", "input")
    time.sleep(0.5)

    # 로그인 버튼
    page.click("#log\\.login")
    time.sleep(3)

    # 2차인증 또는 캡차가 뜨는 경우 대기
    if "nidlogin" in page.url:
        print("  ⚠️  2차인증 또는 캡차 감지됨. 수동 처리 필요.")
        print("  → 브라우저에서 수동으로 로그인을 완료해주세요.")
        print("  → 완료 후 Enter를 눌러주세요.")
        input("  [Enter 대기]")

    print(f"  로그인 완료. 현재 URL: {page.url}")


def save_cookies(context):
    """세션 쿠키 저장 (다음 실행 시 로그인 스킵)"""
    cookies = context.cookies()
    import json
    with open(COOKIE_FILE, "w") as f:
        json.dump(cookies, f)
    print(f"  쿠키 저장: {COOKIE_FILE}")


def load_cookies(context):
    """저장된 쿠키 로드"""
    import json
    if os.path.exists(COOKIE_FILE):
        with open(COOKIE_FILE, "r") as f:
            cookies = json.load(f)
        context.add_cookies(cookies)
        print("  저장된 쿠키 로드 완료")
        return True
    return False


def download_da_report(page, start_date, end_date):
    """
    DA 보고서 다운로드
    ads.naver.com → DA 계정 선택 → 보고서 → 기간 설정 → 다운로드
    """
    print(f"[DA] 보고서 다운로드: {start_date} ~ {end_date}")

    # 1. 광고 관리 시스템 접속
    page.goto(f"https://ads.naver.com/manage/ad-accounts/{DA_ACCOUNT_ID}/dashboard")
    time.sleep(3)

    # 로그인 페이지로 리다이렉트되었는지 확인
    if "nidlogin" in page.url or "nid.naver.com" in page.url:
        print("  세션 만료 — 재로그인 필요")
        return False

    print(f"  광고 관리 시스템 접속 완료: {page.url}")

    # 2. 보고서 메뉴로 이동
    # ads.naver.com의 보고서 URL 패턴
    report_url = f"https://ads.naver.com/manage/ad-accounts/{DA_ACCOUNT_ID}/reports"
    page.goto(report_url)
    time.sleep(3)

    print(f"  보고서 페이지: {page.url}")

    # 3. 보고서 다운로드 시도
    # 주의: ads.naver.com UI가 변경될 수 있으므로, 셀렉터는 실제 확인 후 조정 필요
    # 아래는 일반적인 흐름의 스켈레톤 코드

    try:
        # 기간 설정 (UI 셀렉터는 실제 페이지 구조에 맞게 조정 필요)
        # page.click("[data-testid='date-picker']")  # 날짜 선택기
        # page.fill("[data-testid='start-date']", start_date)
        # page.fill("[data-testid='end-date']", end_date)

        # 다운로드 버튼 클릭
        # with page.expect_download() as download_info:
        #     page.click("[data-testid='download-btn']")
        # download = download_info.value
        # download.save_as(os.path.join(OUTPUT_DIR, f"da_report_{start_date}_{end_date}.csv"))

        print("  ⚠️  보고서 다운로드 UI 셀렉터 미설정 상태")
        print("  → 최초 1회 수동 실행으로 페이지 구조 확인 필요")
        print("  → 확인 후 셀렉터를 업데이트해주세요")
        return False

    except Exception as e:
        print(f"  에러: {e}")
        return False


def run_interactive():
    """
    인터랙티브 모드 — 최초 설정 시 사용
    브라우저를 띄워서 수동으로 로그인하고, 쿠키를 저장함
    """
    print("=" * 60)
    print("[DA] 인터랙티브 모드 (최초 설정)")
    print("=" * 60)
    print()
    print("브라우저가 열립니다. 수동으로 로그인해주세요.")
    print("로그인 후 ads.naver.com DA 보고서 페이지까지 이동해주세요.")
    print("완료 후 터미널에서 Enter를 눌러주세요.")
    print()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 브라우저 보이게
        context = browser.new_context()
        page = context.new_page()

        page.goto("https://ads.naver.com")
        time.sleep(2)

        input("[수동 로그인 완료 후 Enter]")

        # 쿠키 저장
        save_cookies(context)

        # 현재 페이지 스크린샷
        page.screenshot(path=os.path.join(OUTPUT_DIR, "da_page_screenshot.png"))
        print(f"  스크린샷 저장: output/da_page_screenshot.png")
        print(f"  현재 URL: {page.url}")

        browser.close()

    print()
    print("쿠키가 저장되었습니다. 다음 실행부터는 자동 모드로 동작합니다.")


def run_auto():
    """
    자동 모드 — 저장된 쿠키로 보고서 다운로드
    """
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

    print("=" * 60)
    print(f"[DA] 자동 보고서 다운로드")
    print(f"기간: {start_date} ~ {end_date}")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # 쿠키 로드
        if not load_cookies(context):
            print("  저장된 쿠키 없음. 인터랙티브 모드를 먼저 실행해주세요.")
            print("  → python da_report.py --setup")
            browser.close()
            return

        page = context.new_page()
        success = download_da_report(page, start_date, end_date)

        if success:
            save_cookies(context)  # 쿠키 갱신

        browser.close()


def main():
    import sys

    if "--setup" in sys.argv:
        run_interactive()
    else:
        run_auto()


if __name__ == "__main__":
    main()
