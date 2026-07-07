# 마케팅 퍼포먼스 대시보드

네이버 광고 SA API + DA CSV 업로드 기반 마케팅 성과 대시보드

---

## 프로젝트 구조

```
├── index.html          # 대시보드 프론트 (Genesis 디자인, 사이드바 레이아웃)
├── style.css           # Genesis 디자인시스템 CSS
├── app.js              # 대시보드 로직 (SA API 호출, DA CSV 파싱, KPI, 테이블)
├── server.py           # Flask 로컬 API 프록시 (n8n 전환 후 백업용)
├── sa_report.py        # SA 리포트 CSV 수집 스크립트 (독립 실행)
├── requirements.txt    # Python 의존성
├── netlify.toml        # Netlify 배포 설정
├── design.md           # Genesis 디자인시스템 명세
├── .env                # API 키 (gitignore, 로컬 전용)
├── n8n_naver_sa_webhook.json  # n8n 워크플로우 백업
└── 문서/
    ├── 네이버광고_API_대시보드_자동화_검토보고서.md
    ├── 마케팅_대시보드_기획방향.md
    └── 프로젝트_명세.md
```

---

## 에이전트 작업 규칙

### 1. n8n 노드 정보 동기화
n8n 관련 노드 정보는 md 파일(`n8n_워크플로우_현황.md`)로 항상 동기화하여 작업 이력 및 현재 세팅 상황을 에이전트가 신속히 파악 및 학습할 수 있도록 한다.

### 2. n8n 공식 가이드 참조
n8n 관련 워크플로우 작업을 할 땐, https://docs.n8n.io/ 및 하위 경로에 있는 다양한 가이드를 참조하는 것이 정확한 작업에 도움이 된다. 새로운 요구사항이 있을 경우, 공식 n8n 가이드를 참조하여 작업하도록 한다.

### 3. 목표 달성까지 자율 수행
모든 지시사항은 작업이 완료되고 원하는 목표가 달성될 때까지 스스로 학습하고 원인을 찾고 다각도로 개선한다. 작업만 완료됐다고 멈추지 말고, 실제 목표가 달성됐는지 확인하고 안됐으면 다시 다르게 원인을 찾거나 추가적으로 검토하여 개선하여 목표를 달성한다 (토큰이 많이 소모되어도 상관 없다).

### 4. n8n 공식 지원 방법 우선
가급적 문제 해결은 n8n에서 공식 지원하는 방법을 사용한다.

### 5. 문제 해결 히스토리
해결한 문제는 히스토리를 남겨서 같은 문제가 발생하지 않도록 한다.

---

## n8n 워크플로우 현황

### [DX팀] 네이버 SA 검색광고 API
- **워크플로우 ID:** `6IyY4gMgDqHxYpbTdXd6V`
- **Webhook URL:** `https://n8n.childylab.com/webhook/naver-sa-campaigns`
- **상태:** Active
- **호출 방법:** `GET /webhook/naver-sa-campaigns?start=YYYY-MM-DD&end=YYYY-MM-DD`

**노드 구성:**
1. Webhook (GET, path: naver-sa-campaigns, responseMode: responseNode)
2. 캠페인 서명메시지 (Code: 타임스탬프 + signMessage 생성)
3. HMAC 서명 (캠페인) (Crypto: action=hmac, SHA256, base64, secret=SA_SECRET_KEY)
4. 네이버 캠페인 조회 (HTTP Request: GET /ncc/campaigns)
5. Stats 서명메시지 (Code: 캠페인 목록 수집 + stats용 signMessage + fullUrl 생성)
6. HMAC 서명 (Stats) (Crypto: 동일)
7. 네이버 Stats 조회 (HTTP Request: GET /stats?ids=...&fields=...&timeRange=...)
8. 리포트 서명메시지 (Code: /stat-reports용 signMessage)
9. HMAC 서명 (리포트) (Crypto: 동일)
10. 리포트 목록 조회 (HTTP Request: GET /stat-reports)
11. 전환 리포트 다운로드 및 파싱 (Code: this.helpers.httpRequest로 AD_CONVERSION_DETAIL 리포트 다운로드 → purchase/add_to_cart 파싱)
12. 데이터 조합 (Code: stats + purchaseMap 합쳐서 최종 JSON)
13. 응답 반환 (Respond to Webhook: JSON + CORS)

**SA API 인증 정보:**
- API Key: `.env` 파일 참조 (SA_API_KEY)
- Secret Key: `.env` 파일 참조 (SA_SECRET_KEY)
- Customer ID: 3303451

---

## 문제 해결 히스토리

### 1. n8n Crypto 노드 `sign` vs `hmac`
- **문제:** Crypto 노드의 `action: "sign"`은 RSA/PEM 키 전용. HMAC-SHA256에 사용하면 `error:1E08010C:DECODER routines::unsupported` 에러 발생.
- **해결:** `action: "hmac"`으로 변경. 파라미터: `type=SHA256`, `encoding=base64`, `secret=비밀키`, `value=서명메시지`, `dataPropertyName=data`

### 2. n8n Code 노드에서 `require('crypto')` 차단
- **문제:** n8n 호스팅 환경에서 `Module 'crypto' is disallowed` 에러.
- **해결:** Crypto 노드(action=hmac)를 사용하여 서명 생성. Code 노드는 메시지 조합만 담당.
- **근본 해결:** 서버에 `NODE_FUNCTION_ALLOW_BUILTIN=crypto` 환경변수 추가하면 Code 노드에서 crypto 모듈 사용 가능.

### 3. n8n HTTP Request에서 네이버 stats `ids` 파라미터 형식
- **문제:** Query Parameters에 배열을 넣으면 `잘못된 파라미터 형식입니다` 에러.
- **해결:** Code 노드에서 `ids=id1&ids=id2&...` 형태의 fullUrl을 직접 조합하고, HTTP Request 노드의 URL에 expression으로 주입. Send Query는 끔.

### 4. n8n에서 캠페인 목록이 개별 아이템으로 전달됨
- **문제:** HTTP Request가 배열 응답을 받으면 각 요소를 별도 item으로 넘김. `$input.first().json`으로는 첫 번째만 가져옴.
- **해결:** `$input.all().map(item => item.json)` 사용.

### 5. Code 노드에서 배열을 json으로 반환 시 에러
- **문제:** `return [{ json: output }]`에서 output이 배열이면 `A 'json' property isn't an object` 에러.
- **해결:** `return [{ json: { campaigns: output } }]`로 객체에 감싸고, 응답 반환에서 `$json.campaigns` 참조.

### 6. 전환 리포트 다운로드 — HTTP Request 노드 실패
- **문제:** 리포트 downloadUrl을 HTTP Request 노드의 URL로 넣으면 `Bad request` 에러.
- **해결:** 별도 HTTP Request 노드 대신 Code 노드 내 `this.helpers.httpRequest({ method: 'GET', url: ... })`로 직접 호출.
- **현재 이슈:** 응답이 string이 아닌 형태로 와서 파싱이 안 됨. 추가 조사 필요.

### 7. DA(성과형 디스플레이) API 접근 불가
- **문제:** 네이버 DA API는 공식 파트너사에만 제공 (2026.05.11 FAQ 확인).
- **해결:** CSV 수동 업로드 방식 채택. 대시보드에서 파일 선택 → 파싱 → 표시.

### 8. Playwright 브라우저 자동화 실패
- **문제:** 네이버가 Playwright/Selenium을 적극 감지·차단. 무한 추가인증 요구.
- **해결:** Playwright 방식 포기. DA는 CSV 업로드로 대체.

### 9. SA stat API의 `convAmt`에 장바구니 금액 포함
- **문제:** `convAmt`에 purchase + add_to_cart + 기타 모든 전환이 합산되어 ROAS 8000%+ 발생.
- **해결:** AD_CONVERSION_DETAIL 리포트에서 `purchase` 전환만 필터링하여 정확한 구매 ROAS 계산.

---

## 배포

- **Netlify:** https://marketing-automation-childy.netlify.app/
- **GitHub:** https://github.com/childylab/markating-automation
- **n8n:** https://n8n.childylab.com/workflow/6IyY4gMgDqHxYpbTdXd6V

---

## 로컬 개발 (필요 시)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py  # localhost:5001
```
