---
title: "Apps in Toss TDS Design Guide"
source: "https://developers-apps-in-toss.toss.im/design/components.md"
description: "앱인토스 미니앱을 Toss Design System 감성으로 만들기 위한 AI 에이전트용 디자인 가이드"
---

# Apps in Toss TDS Design Guide

이 문서는 앱인토스 미니앱 UI를 만들 때 AI 에이전트가 참고할 수 있도록 정리한 `DESIGN.md`입니다. 토스 디자인 시스템(TDS)의 방향성을 따르되, 토스가 제공하는 자료와 지식재산권은 앱인토스 서비스 이용 범위 안에서만 사용해야 합니다.

## Design Intent

TDS는 사용자가 토스 앱 안에서 여러 미니앱을 오가더라도 같은 제품처럼 느끼게 하는 공통 디자인 언어입니다. 화면은 빠르고 명확해야 하며, 사용자는 다음 행동을 고민하지 않아야 합니다.

목표:

- 사용자가 한눈에 현재 상태와 다음 행동을 이해한다.
- 화면은 정보보다 행동 흐름을 먼저 드러낸다.
- 커스텀 UI를 과하게 만들지 않고 검증된 컴포넌트 조합을 우선한다.
- 불필요한 설명, 장식, 브랜딩 과시는 줄이고 태스크 완료를 돕는다.
- 토스 앱 안에 들어온 서비스처럼 가볍고 안정적이며 신뢰감 있게 보인다.

## Core Principles

### 1. Clarity First

모든 화면은 하나의 주요 목적을 가져야 합니다. 제목, 본문, 입력, CTA가 사용자의 다음 행동을 자연스럽게 이끌어야 합니다.

- 제목은 짧고 구체적으로 쓴다.
- 본문은 사용자가 알아야 하는 이유와 결과만 남긴다.
- 버튼은 행동 동사로 쓴다.
- 화면 하나에 주요 CTA는 하나만 둔다.

### 2. Native App Feel

앱인토스 미니앱은 모바일 WebView 환경에서 동작합니다. 웹사이트보다 앱 화면처럼 느껴져야 합니다.

- 전체 폭 카드형 웹 페이지보다 모바일 앱 레이아웃을 우선한다.
- 상단 Navigation, 본문, 하단 CTA의 구조를 명확히 둔다.
- 긴 페이지에서는 하단 CTA를 고정해 핵심 행동 접근성을 높인다.
- Safe Area와 하단 네비게이션 영역을 침범하지 않는다.

### 3. Functional Minimalism

장식은 기능을 방해하지 않는 수준으로만 사용합니다.

- 정보 밀도가 높은 화면에서도 여백과 그룹핑으로 읽기 흐름을 만든다.
- 불필요한 아이콘, 배경 그래픽, 과한 그라데이션을 피한다.
- 강조 색상은 행동, 상태, 피드백에만 사용한다.
- 컴포넌트를 중첩 카드처럼 과하게 쌓지 않는다.

### 4. Trust and Safety

금융 앱 안에서 동작하는 경험이므로 신뢰가 중요합니다.

- 금액, 리워드, 결제, 개인정보, 권한 요청은 명확하고 오해 없이 표현한다.
- 다크패턴, 과장된 보상 표현, 숨겨진 조건을 피한다.
- 위험하거나 되돌리기 어려운 행동은 확인 단계를 둔다.
- 실패/오류 상태는 사용자가 바로 회복할 수 있게 안내한다.

## Visual Style

### Color

기본 색상 체계는 토스 계열의 밝고 선명한 앱 UI를 따른다.

- Primary: Toss Blue 계열을 주요 CTA와 선택 상태에 사용한다.
- Text Primary: 거의 검정에 가까운 진한 회색.
- Text Secondary: 설명과 보조 정보용 중간 회색.
- Background: 밝은 회색 또는 흰색 기반.
- Surface: 흰색 카드 또는 얕은 회색 그룹.
- Error: 선명한 빨강, 단 경고/오류에만 사용.
- Success: 초록 계열, 완료/성공 상태에만 사용.

권장 토큰 예시:

```css
:root {
  --tds-blue: #3182f6;
  --tds-blue-pressed: #1b64da;
  --tds-text: #191f28;
  --tds-text-secondary: #6b7684;
  --tds-text-tertiary: #8b95a1;
  --tds-background: #f2f4f6;
  --tds-surface: #ffffff;
  --tds-line: #e5e8eb;
  --tds-error: #f04452;
  --tds-success: #00a661;
}
```

### Typography

모바일에서 읽기 쉬운 산세리프를 사용합니다.

- 시스템 폰트 또는 Pretendard 계열을 우선한다.
- 제목은 굵고 짧게, 본문은 명확하게.
- 문단 폭은 모바일 기준으로 읽기 편하게 유지한다.
- 숫자, 금액, 날짜는 표기 형식을 일관되게 맞춘다.

권장 스타일:

```css
body {
  font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--tds-text);
  background: var(--tds-background);
}

.title-large {
  font-size: 26px;
  line-height: 1.25;
  font-weight: 700;
}

.title {
  font-size: 22px;
  line-height: 1.3;
  font-weight: 700;
}

.body {
  font-size: 16px;
  line-height: 1.55;
  font-weight: 400;
}

.caption {
  font-size: 13px;
  line-height: 1.45;
  color: var(--tds-text-secondary);
}
```

### Spacing

간격은 4px 단위로 맞춥니다.

- 화면 좌우 기본 여백: 20px.
- 섹션 간격: 24px~32px.
- 관련 요소 간격: 8px~12px.
- 버튼 내부 좌우 여백: 18px~20px.
- 리스트 행 높이: 터치 가능한 충분한 높이를 확보한다.

### Shape

토스 스타일의 부드러운 모서리를 사용하되, 과하게 둥근 장식 카드를 남발하지 않습니다.

- 버튼: 12px~16px radius.
- 입력 필드: 12px~14px radius.
- 카드/그룹: 16px~20px radius.
- 작은 배지: pill 형태 가능.

## Layout Patterns

### Standard Screen

기본 화면 구조:

1. Navigation
2. Top 또는 페이지 타이틀
3. 핵심 콘텐츠
4. 보조 정보 또는 리스트
5. BottomCTA

```text
┌─────────────────────────┐
│ Navigation              │
├─────────────────────────┤
│ Top / Title             │
│ Description             │
├─────────────────────────┤
│ Main content            │
│ List / Cards / Form     │
├─────────────────────────┤
│ BottomCTA               │
└─────────────────────────┘
```

### Form Screen

- 입력 필드는 한 화면에서 위에서 아래로 자연스럽게 진행되게 배치한다.
- 오류 메시지는 해당 필드 바로 아래에 둔다.
- 입력 완료 후 다음 행동은 하단 CTA로 고정한다.
- 키보드가 올라와도 CTA 접근성이 유지되게 한다.

### Result Screen

- 성공/실패 상태를 상단에서 명확히 보여준다.
- 사용자가 다음으로 할 수 있는 행동을 1~2개만 제공한다.
- 금액, 포인트, 쿠폰, 주문 상태 등 핵심 결과를 크게 보여준다.

## Component Guidance

앱인토스 TDS 핵심 컴포넌트는 아래 역할을 기준으로 사용합니다.

### Navigation

모든 화면 상단에 배치하는 기본 네비게이션입니다. 현재 서비스 맥락, 토스로 돌아가기, 신고/문의 같은 기능과 연결될 수 있으므로 앱인토스 브랜드 인지에 중요합니다.

사용 규칙:

- 화면 최상단에 둔다.
- 임의의 커스텀 상단바보다 제공되는 Navigation 구조를 우선한다.
- 뒤로가기, 닫기, 홈, 타이틀, 액세서리 액션을 명확히 구분한다.

### Top

페이지의 시작 영역입니다. 제목, 설명, 이미지, 액션을 조합해 현재 화면의 목적을 전달합니다.

사용 규칙:

- 페이지 상단에 하나만 사용한다.
- 제목은 1~2줄 안에서 끝낸다.
- 설명은 사용자가 이 화면에서 얻는 결과를 말한다.

### Text

텍스트 스타일과 위계를 맞추는 컴포넌트입니다.

사용 규칙:

- 제목, 본문, 캡션, 보조 텍스트를 시각적으로 구분한다.
- 회색 텍스트를 너무 많이 사용해 정보가 흐려지지 않게 한다.
- 중요 정보는 굵기와 위치로 강조하고 색상 강조는 절제한다.

### Button

사용자 액션을 실행하는 컴포넌트입니다.

사용 규칙:

- Primary 버튼은 화면의 핵심 행동에만 사용한다.
- Secondary/Tertiary 버튼은 보조 행동에 사용한다.
- 비활성 상태는 이유를 함께 설명할 수 있어야 한다.
- 버튼 문구는 명사보다 동사 중심으로 쓴다.

좋은 예:

- 확인했어요
- 동의하고 계속하기
- 포인트 받기
- 결제하기

피할 예:

- 확인
- 다음
- 제출
- 버튼

### BottomCTA

화면 하단에 고정되는 핵심 CTA입니다. 사용자가 특정 작업을 완료하도록 돕는 가장 중요한 액션 영역입니다.

사용 규칙:

- 긴 화면, 폼, 결제/동의/신청 플로우에서 우선 사용한다.
- 주요 버튼은 하나로 유지한다.
- 보조 액션이 필요하면 텍스트 링크나 secondary 버튼으로 낮춘다.
- Safe Area를 고려해 하단 여백을 확보한다.

### ListHeader

목록의 그룹 제목 또는 보조 설명에 사용합니다.

사용 규칙:

- 리스트 묶음의 의미를 짧게 설명한다.
- 과한 장식 없이 텍스트 위계로만 구분한다.

### ListRow

리스트 아이템, 설정 항목, 선택 항목, 내역 표시 등에 사용합니다.

사용 규칙:

- 왼쪽에는 주요 정보, 오른쪽에는 상태/값/화살표를 둔다.
- 한 행에 너무 많은 정보를 넣지 않는다.
- 보조 설명은 한두 줄로 제한한다.
- 터치 영역은 충분히 크게 둔다.

### Badge

상태를 빠르게 인식하도록 돕는 작은 강조 요소입니다.

사용 규칙:

- 신규, 진행중, 완료, 혜택, 오류 등 상태에만 사용한다.
- 배지를 제목처럼 사용하지 않는다.
- 색상은 상태 의미와 일관되게 매칭한다.

### Tab

한 화면 안에서 관련 콘텐츠를 전환할 때 사용합니다.

사용 규칙:

- 탭 수는 적게 유지한다.
- 서로 같은 위계의 콘텐츠만 탭으로 묶는다.
- 탭 전환 시 사용자의 맥락이 갑자기 바뀌지 않게 한다.

### Tabbar

서비스의 주요 기능으로 빠르게 이동하는 하단 내비게이션입니다.

사용 규칙:

- 탭바가 필요하다면 토스가 제공하는 플로팅 형태를 우선한다.
- 핵심 기능 2~5개 정도만 둔다.
- 현재 선택 상태를 명확하게 표시한다.
- BottomCTA와 동시에 사용할 때 하단 영역 충돌을 피한다.

### Asset

아이콘, 이미지, 비디오, Lottie 같은 미디어 에셋을 표시합니다.

사용 규칙:

- 장식 목적보다 이해를 돕는 목적에 사용한다.
- 아이콘은 텍스트 의미를 보강해야 한다.
- 이미지/일러스트는 실제 상태나 혜택을 명확히 보여줘야 한다.
- 로딩이 느린 대형 이미지는 피한다.

### Border

테두리와 구분선을 만드는 스타일 규칙입니다.

사용 규칙:

- 리스트 행 구분, 카드 경계, 입력 필드 경계에만 절제해 사용한다.
- 너무 진한 선은 피하고 얕은 회색을 사용한다.
- 여백만으로 구분 가능한 곳에는 선을 줄인다.

## UX Writing

토스 보이스톤에 맞춰 쉽고 자연스러운 해요체를 사용합니다.

원칙:

- 사용자가 이해하는 말로 쓴다.
- 능동형으로 말한다.
- 한 문장은 짧게 쓴다.
- 화면 안에서는 같은 대상을 같은 이름으로 부른다.
- 버튼은 사용자가 누르면 일어나는 일을 말한다.
- 실패 문구는 이유와 해결 방법을 함께 준다.

좋은 문장:

- 정보를 확인하고 있어요.
- 결제가 완료됐어요.
- 다시 시도해 주세요.
- 받을 수 있는 포인트가 있어요.

피할 문장:

- 처리가 진행 중입니다.
- 결제 성공.
- 오류가 발생했습니다.
- 혜택 수령 가능 상태입니다.

## Accessibility

- 터치 타깃은 최소 44px 이상을 확보한다.
- 텍스트와 배경의 대비를 충분히 확보한다.
- 색상만으로 상태를 전달하지 않는다.
- 입력 오류는 텍스트로도 설명한다.
- 스크린 리더가 읽을 수 있는 버튼 이름과 이미지 대체 텍스트를 제공한다.
- 모달/바텀시트는 포커스 흐름과 닫기 동작을 명확히 한다.

## Interaction

- 터치 피드백은 즉각적이어야 한다.
- 로딩은 가능하면 짧게 유지하고, 길어질 때는 진행 중임을 보여준다.
- 위험한 액션은 확인을 받는다.
- 성공 후에는 다음 행동을 제안한다.
- 뒤로가기/닫기 동작은 사용자가 예상하는 방식으로 작동해야 한다.

## Do

- TDS 컴포넌트 조합을 우선한다.
- 주요 행동을 하단 CTA로 명확히 둔다.
- 모바일 앱 화면처럼 간결하게 구성한다.
- 글은 쉽고 짧게 쓴다.
- 정보 위계와 상태를 명확히 보여준다.
- 토스 앱 안에 자연스럽게 들어간 화면처럼 만든다.

## Don't

- 마케팅 랜딩 페이지처럼 큰 히어로와 장식 카드를 남발하지 않는다.
- 하나의 화면에 CTA를 여러 개 경쟁시키지 않는다.
- 토스 브랜드 자산을 허용 범위 밖에서 사용하지 않는다.
- 사용자를 오해하게 만드는 보상/가격/조건 표현을 쓰지 않는다.
- 탭바, 내비게이션, Safe Area와 하단 CTA가 겹치게 만들지 않는다.
- 긴 설명을 버튼 위에 쌓아 사용자가 읽어야만 진행되게 하지 않는다.

## Reference Links

- TDS Components: https://developers-apps-in-toss.toss.im/design/components.md
- Apps in Toss llms.txt: https://developers-apps-in-toss.toss.im/llms.txt
- Navigation: https://developers-apps-in-toss.toss.im/design/components/navigation.md
- BottomCTA: https://developers-apps-in-toss.toss.im/design/components/bottomcta.md
- Button: https://developers-apps-in-toss.toss.im/design/components/button.md
- ListRow: https://developers-apps-in-toss.toss.im/design/components/list.md
- Tabbar: https://developers-apps-in-toss.toss.im/design/components/tabbar.md
- UX Writing: https://developers-apps-in-toss.toss.im/design/ux-writing.md
- UI/UX Guide: https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.md
- Miniapp Branding Guide: https://developers-apps-in-toss.toss.im/design/miniapp-branding-guide.md

## Implementation Notes for AI Agents

When generating UI from this guide:

1. Start with Navigation and a concise Top area.
2. Use list rows, text hierarchy, badges, and bottom CTA before inventing new widgets.
3. Keep one primary user action per screen.
4. Prefer mobile-first, single-column layouts.
5. Use Korean 해요체 for user-facing copy.
6. If building outside the official Apps in Toss partner context, do not copy proprietary Toss assets directly. Use this document as style guidance only.
