# Marketing Performance Dashboard

## PRD (Product Requirements Document)

### 한 줄 정의

마케팅 퍼포먼스 통합 대시보드

### 제품 목표

경영진 및 C-level이 브랜드 → 매체(채널) → 캠페인 단위로 마케팅 성과를 빠르고 정확하게 파악하고, 수수료/원가를 반영한 실질 ROAS/ROI 분석을 통해 예산·전략·소재/타겟팅 의사결정을 즉시 내릴 수 있도록 한다.

### 배경

기존 마케터가 제작한 데이터 정리 시트는 가독성과 범용성이 떨어지고, 가공된 지표의 정합성 검증이 추가로 필요했다. 또한 수동 취합 과정에서 휴먼에러가 발생하면 지표 왜곡이 생겨 신뢰도가 낮아졌다.

이제는 스프레드시트나 Baserow 테이블을 가공해 대시보드를 만드는 방식이 아니라, 각 광고 매체 데이터를 직접 연동하여 수동 유지보수/왜곡 개입이 최소화된 '순수 지표 기반' 대시보드를 구축한다. 아드리엘 등 서드파티 마케팅 대시보드 툴과 같은 방향성을 가지되, 사내 BI 플랫폼(웹기반)에 내장하는 자체 구축으로 커스터마이징과 비용 통제를 가능하게 한다.

### 문제 및 해결 방안

**사용자 문제**

- 광고 매체별 데이터가 분산되어 있어 브랜드/매체/캠페인 단위의 통합 성과 파악이 어렵다.
- 수수료/원가까지 반영한 정확한 ROAS/ROI 계산이 어렵다.
- 수동 리포트 생성/취합에 시간이 많이 들고, 휴먼에러로 지표 왜곡이 발생한다.
- 성과 추이/이상 징후를 빠르게 발견하고 조치(예산·전략·소재/타겟팅 변경)로 연결하기 어렵다.

**해결 방안**

- 사내 BI 플랫폼 내에서 동작하는 웹 기반 대시보드를 제공하며, PC웹과 모바일웹을 지원한다(별도 로그인/설정 화면 없이 사내 BI 플랫폼의 접근/권한 체계를 전제).
- 브랜드 → 매체(채널) → 캠페인 3단계 분류를 기본 탐색 구조로 제공한다.
- 매체 API 직연동을 우선으로 하며, API 미지원 매체는 CSV 업로드를 보조 수단으로 제공한다.
- SA 등 API 연동 데이터는 수집 서버가 주기적으로 적재하고 내부 저장소(DB)에서 조회하는 구조로 대시보드 응답성을 확보한다.
- DA 등 CSV 업로드 데이터는 동일 캠페인/날짜 중복 시 '덮어쓰기(기본)'와 '건너뛰기(옵션)'를 제공해 운영 리스크를 낮춘다.
- 조회 중인 뷰(기간/필터 적용 상태)를 기준으로 엑셀/CSV 내려받기를 제공하며, 요약/일별 상세를 시트 분리해 제공한다.
- 기간 필터와 연동된 차트(일별 추이/캠페인 비교)를 제공해 성과 변화를 직관적으로 파악한다.
- 기준 지표(ROAS/ROI 등) 미달 시 대시보드 강조 표시 및 일 단위 위험지표 알림(슬랙/플로우/카카오톡 등)으로 후속 조치를 촉진한다.

### 차별점

- 스프레드시트 가공 기반이 아닌 '매체 직연동+내부 적재'로 정합성과 재현성을 높인다.
- 사내 BI 플랫폼에 내장해 기존 권한/접근 체계를 활용하고, 로그인/설정 같은 부가 화면을 제거해 운영 부담을 줄인다.
- 서드파티 대시보드 툴(예: 아드리엘)과 유사한 방향성을 가지면서도, 자체 구축으로 커스터마이징(분류 체계/지표/다운로드 포맷/알림 룰)과 비용 통제를 동시에 달성한다.
- ROI 계산을 '수수료/원가(상수 % 등)' 반영까지 확장 가능한 구조로 설계해 단계적 고도화가 쉽다.

### 타겟 및 시나리오

**타겟 사용자**

- 1차 사용자: 경영진 및 C-level 임원
  - 관심사: 회사/브랜드 단위의 마케팅 성과 요약, 예산 배분, 전략 방향성 점검
  - 행동: 성과 저하/개선 신호 발견 시 예산·캠페인 전략 조정, 채널 비중 변경, 소재/타겟팅 개선 지시
- 2차 사용자(운영/분석): 마케팅 팀 리드 / 퍼포먼스 마케터 / 데이터 담당자
  - 관심사: 캠페인/광고그룹/소재 단위의 상세 성과, 데이터 적재/업로드 운영, 지표 정합성 확인

**사용자 시나리오**

1. 경영진이 월간 보고 전, 브랜드별·채널별 성과를 한 화면에서 비교하고 ROAS/ROI 추이를 확인한다.
2. 특정 기간(일/주/월) 필터로 성과 저하를 발견하고, 해당 매체 → 캠페인으로 드릴다운하여 원인을 좁힌 뒤 예산/전략 조정을 결정한다.
3. 마케팅 팀이 DA(성과형 디스플레이) 데이터를 CSV로 업로드하고, 중복 데이터 처리(덮어쓰기/건너뛰기) 옵션으로 최신 데이터를 유지한다.
4. 사용자가 현재 뷰(필터/기간 적용 상태)를 그대로 엑셀/CSV로 내려받아 내부 공유/후속 분석에 활용한다.
5. ROAS/ROI 등 기준 미달 캠페인이 발생하면 대시보드에서 강조 표시되고, 일 단위 알림을 통해 즉시 조치한다.

### 성공·위험 요소

**핵심 지표**

- 실질 ROAS/ROI: 정의된 기준 대비 n% 상승(목표값은 운영 단계에서 브랜드/채널별로 설정)
- 리포트 생성/취합 시간: 월/주간 보고 준비 시간 감소
- 데이터 신뢰도: 지표 정합성 이슈(수동 오류, 중복/누락) 건수 감소
- 의사결정 리드타임: 성과 이상 징후 발견 → 조치(예산/전략/소재·타겟팅 변경)까지 걸리는 시간 단축

**리스크**

- 매체 API 정책 변경/제한(쿼터, 필드 변경)으로 데이터 수집이 불안정해질 수 있다.
- DA 등 CSV 업로드는 운영자 실수(잘못된 파일/기간/중복 처리 선택)로 데이터 왜곡 위험이 있다.
- '실제 ROI' 산식은 수수료/원가 정의(상수 % vs 실데이터)가 미정이면 해석 차이가 생길 수 있다.
- 내부 저장소/배치 지연이 발생하면 '최신성' 기대와 실제 데이터 시점 간 괴리가 생길 수 있다.
- 알림 기준(임계값) 설계가 미흡하면 과다 알림으로 무시되거나, 반대로 중요한 신호를 놓칠 수 있다.

### 속성 설정

**카테고리:** 마케팅 퍼포먼스 대시보드 (사내 BI 내장형)

**사용자 역할:**
- 경영진(C-level)
- 마케팅 팀 리드/의사결정자
- 퍼포먼스 마케터(운영)
- 데이터 담당자(적재/품질)

**기기:** PC 웹, 모바일 웹

---

## Current Status

- 네이버 SA 검색광고 API 연동 완료
- SA 캠페인 목록, 성과 데이터, 일별 데이터 조회 완료
- SA 구매전환은 `AD_CONVERSION_DETAIL` 리포트에서 `purchase`만 분리해 계산
- 네이버 DA CSV 업로드, 파싱, 기간 필터, 일별 상세 토글 완료
- SA/DA 채널 전환, KPI 카드, 캠페인 테이블, 프로그레스바 완료
- Flask 로컬 API 프록시와 Netlify 정적 배포 구성 완료
- n8n SA Webhook 워크플로우 백업 포함

## Project Structure

```text
.
├── README.md                    # 프로젝트 개요, 명세, 운영 메모
├── DESIGN.md                    # Genesis 디자인 시스템 명세
├── index.html                   # 대시보드 화면
├── style.css                    # 화면 스타일
├── app.js                       # 프론트 상태, 렌더링, SA 호출, DA CSV 파싱
├── server.py                    # Flask 로컬 API 프록시
├── sa_report.py                 # SA CSV 리포트 수집 스크립트
├── test_api.py                  # SA/DA API 인증 및 성과 조회 테스트
├── test_da_cross.py             # Customer ID/API Key 조합 테스트
├── requirements.txt             # Python 의존성
├── netlify.toml                 # Netlify 배포 설정
├── n8n_naver_sa_webhook.json    # n8n 워크플로우 백업
└── 애드부스트 성과업로드 예시.csv     # DA 업로드 샘플
```

로컬 전용 파일인 `.env`, `.naver_cookies.json`, `.venv/`, `output/`은 Git에 올리지 않습니다.

## Data Sources

| Channel | Source | Current Method | Notes |
| --- | --- | --- | --- |
| Naver SA | Search Ads API | API direct integration | 공식 API로 안정적으로 자동화 가능 |
| Naver DA | Performance Display / AdVoost CSV | Manual CSV upload | DA API는 공식 파트너사 전용이라 일반 광고주 접근 불가 |
| Meta Ads | Meta Ads API | Planned | Phase 2 |
| Google Ads | Google Ads API | Planned | Phase 2 |
| Commerce | Smart Store order data etc. | Planned | 실매출 기반 ROAS 계산용 |

## Architecture

현재 구조:

```text
Naver SA API ───────────────┐
                            ├── Flask API Proxy ── Frontend Dashboard
Naver DA CSV Upload ────────┘
```

목표 구조:

```text
Ad Platform APIs / CSV Upload
        ↓
Collector / n8n Workflow
        ↓
Internal DB
        ↓
Frontend Dashboard
```

장기적으로는 매번 API를 직접 호출하지 않고 내부 DB에 캠페인/날짜 단위 일별 데이터를 적재한 뒤, 대시보드는 저장소에서 빠르게 조회하는 방식으로 전환합니다.

## Metrics

### Campaign Columns

| Field | Description |
| --- | --- |
| `campaign_id` | 캠페인 ID |
| `campaign_name` | 캠페인명 |
| `campaign_type` | 캠페인 유형 |
| `cost` | 광고비 |
| `impressions` | 노출수 |
| `clicks` | 클릭수 |
| `ctr` | 클릭률 |
| `cart_count` | 장바구니 수 |
| `purchase_count` | 구매전환 수 |
| `purchase_amount` | 구매전환 매출액 |
| `purchase_roas` | 구매 ROAS |
| `imp_to_purchase` | 노출 대비 구매율 |
| `click_to_purchase` | 클릭 대비 구매율 |
| `date` | 일별 상세 날짜 |

### Main Table

캠페인 | 광고비 | 노출 | 클릭 | CTR | 장바구니 | 구매 | 구매액 | 구매ROAS | 노출→구매 | 클릭→구매

### Daily Detail Table

날짜 | 광고비 | 노출 | 클릭 | 장바구니 | 구매 | 구매액 | 구매ROAS

## Naver Ads Findings

### SA

SA는 네이버 검색광고 API(`https://api.searchad.naver.com`)로 자동화할 수 있습니다.

- 인증: API Key + Secret Key + Customer ID + HMAC-SHA256 signature
- 주요 엔드포인트: `/ncc/campaigns`, `/ncc/adgroups`, `/stats`, `/stat-reports`
- 검증 결과: SA 계정은 캠페인 목록과 최근 1개월 성과 데이터 조회 성공

SA의 `ccnt`, `convAmt`는 구매, 장바구니, 기타 전환이 합산될 수 있으므로 구매 ROAS 계산에는 그대로 쓰지 않습니다. 정확한 구매 ROAS는 `AD_CONVERSION_DETAIL` 리포트에서 `purchase` 전환만 필터링해 계산합니다.

### DA

DA 성과형 디스플레이와 애드부스트는 현재 CSV 업로드 방식으로 처리합니다.

- DA API는 공식 파트너사에 한해 제공됩니다.
- 일반 광고주 계정에서는 API 인증이 통과해도 DA 캠페인이 조회되지 않을 수 있습니다.
- Playwright/Selenium 기반 보고서 자동 다운로드는 네이버의 자동화 탐지와 추가 인증 요구 때문에 운영 방식으로 채택하지 않습니다.

## n8n Workflow

### Current SA Webhook

- Workflow: `[DX팀] 네이버 SA 검색광고 API`
- Workflow ID: `6IyY4gMgDqHxYpbTdXd6V`
- Webhook: `GET /webhook/naver-sa-campaigns?start=YYYY-MM-DD&end=YYYY-MM-DD`
- Backup file: `n8n_naver_sa_webhook.json`

### Node Flow

1. Webhook
2. 캠페인 서명 메시지 생성
3. HMAC 서명
4. 네이버 캠페인 조회
5. Stats 서명 메시지 생성
6. HMAC 서명
7. 네이버 Stats 조회
8. 리포트 서명 메시지 생성
9. HMAC 서명
10. 리포트 목록 조회
11. 전환 리포트 다운로드 및 파싱
12. 데이터 조합
13. 응답 반환

### n8n Notes

- Crypto 노드는 RSA `sign`이 아니라 HMAC 용도인 `hmac` action을 사용합니다.
- 호스팅 환경에서 Code 노드의 `require("crypto")`가 막힐 수 있으므로, 서명은 Crypto 노드로 생성합니다.
- 네이버 `/stats`의 `ids`는 `ids=id1&ids=id2` 형태로 직접 URL을 조합하는 편이 안전합니다.
- HTTP Request 노드가 배열 응답을 개별 item으로 넘길 수 있으므로 `$input.all()` 사용을 전제로 처리합니다.
- 리포트 downloadUrl 호출 시 `/report-download` URI 전용 HMAC 서명이 별도 필요합니다. 다른 URI 서명(예: `/stat-reports`)을 재활용하면 403 에러 발생.
- 하나의 `/report-download` 서명으로 여러 리포트 URL을 연속 다운로드할 수 있습니다 (재사용 가능).
- `this.helpers.httpRequest`에서 `json: false` 옵션을 넣어야 텍스트 응답을 string으로 받습니다.

## Roadmap

### Phase 1: Naver SA/DA

- [x] 네이버 SA API 직연동
- [x] 네이버 SA 구매전환 분리
- [x] 네이버 SA 일별 데이터 조회
- [x] 네이버 DA CSV 업로드
- [x] 기간 필터와 채널 전환
- [x] KPI 카드와 캠페인 테이블
- [ ] DA CSV 중복 처리 옵션: 덮어쓰기 / 건너뛰기
- [ ] 현재 뷰 기준 CSV 또는 Excel 다운로드
- [ ] 캠페인별 일별 추이 차트
- [ ] 캠페인 비교 막대 차트

### Phase 2: More Ad Platforms

- [ ] Meta Ads API 연동
- [ ] Google Ads API 연동

### Phase 3: Owned Channel Analytics

- [ ] Instagram Insights
- [ ] YouTube Analytics

### Phase 4: Commerce Data

- [ ] 스마트스토어 주문 API 등 실매출 데이터 연동
- [ ] 광고비 대비 실제 매출 기반 ROAS 계산

## Local Development

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

서버는 기본적으로 `http://localhost:5001`에서 실행됩니다.

프런트는 `index.html`을 열거나 Flask 서버를 통해 접근할 수 있습니다. SA 데이터를 불러오려면 `.env`에 네이버 광고 API 인증 정보가 필요합니다.

## Environment Variables

```env
SA_API_KEY=
SA_SECRET_KEY=
SA_CUSTOMER_ID=
DA_API_KEY=
DA_SECRET_KEY=
DA_CUSTOMER_ID=
```

`.env`는 로컬 전용이며 Git에 커밋하지 않습니다.

## Deployment

- Netlify: `https://marketing-automation-childy.netlify.app/`
- GitHub: `https://github.com/childylab/markating-automation`
- n8n: `https://n8n.childylab.com/workflow/6IyY4gMgDqHxYpbTdXd6V`

## Documentation Policy

루트 문서는 최대한 분산하지 않습니다.

- `README.md`: 프로젝트 목적, 명세, 운영 메모, 로드맵
- `DESIGN.md`: 디자인 시스템과 시각 규칙

새로운 조사 내용이나 문제 해결 이력은 별도 Markdown 파일을 만들기보다 먼저 `README.md`에 통합합니다. 디자인 토큰이나 UI 규칙처럼 프로젝트 설명과 성격이 다른 내용만 `DESIGN.md`에 둡니다.

워크플로우나 대시보드의 수정 사항이 발생하는 경우, 또는 원인 파악이나 문제 해결이 신규로 된 경우 기존 내용을 반드시 업데이트하거나 신규로 해당 케이스에 기재하도록 합니다.
