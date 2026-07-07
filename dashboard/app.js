// === 캠페인 데이터 (SA + DA) ===
const allCampaigns = [
  // --- SA 캠페인 (검색광고, 실제 API 데이터) ---
  {
    id: "cmp-sa-01",
    name: "오디너리홀리데이_PC",
    type: "WEB_SITE",
    account: "SA",
    status: "ELIGIBLE",
    impressions: 304,
    clicks: 8,
    cost: 1806,
    ctr: 2.63,
    cpc: 226,
    conversions: 0,
    convRate: 0,
    convValue: 0,
  },
  {
    id: "cmp-sa-02",
    name: "오디너리홀리데이_MO",
    type: "WEB_SITE",
    account: "SA",
    status: "ELIGIBLE",
    impressions: 7225,
    clicks: 915,
    cost: 192598,
    ctr: 12.66,
    cpc: 210,
    conversions: 68,
    convRate: 7.43,
    convValue: 535350,
  },
  {
    id: "cmp-sa-03",
    name: "ODP스마트스토어_쇼핑검색",
    type: "SHOPPING",
    account: "SA",
    status: "ELIGIBLE",
    impressions: 432378,
    clicks: 2143,
    cost: 590850,
    ctr: 0.5,
    cpc: 276,
    conversions: 866,
    convRate: 40.41,
    convValue: 46922010,
  },
  {
    id: "cmp-sa-04",
    name: "ODP스마트스토어_쇼핑검색_일반키워드",
    type: "SHOPPING",
    account: "SA",
    status: "ELIGIBLE",
    impressions: 267906,
    clicks: 2376,
    cost: 722152,
    ctr: 0.89,
    cpc: 304,
    conversions: 1178,
    convRate: 49.58,
    convValue: 60195600,
  },
  {
    id: "cmp-sa-05",
    name: "차일디_브랜드검색",
    type: "BRAND_SEARCH",
    account: "SA",
    status: "ELIGIBLE",
    impressions: 4054,
    clicks: 1309,
    cost: 0,
    ctr: 32.29,
    cpc: 0,
    conversions: 383,
    convRate: 29.26,
    convValue: 3317300,
  },
  {
    id: "cmp-sa-06",
    name: "유니버셜오버롤_MO_브랜드검색",
    type: "BRAND_SEARCH",
    account: "SA",
    status: "PAUSED",
    impressions: 108,
    clicks: 47,
    cost: 0,
    ctr: 43.52,
    cpc: 0,
    conversions: 0,
    convRate: 0,
    convValue: 0,
  },
  // --- DA 캠페인 (성과형 디스플레이, 수동 입력 대기) ---
  {
    id: "cmp-da-01",
    name: "ODP_ADVoost_26년_상시운영",
    type: "DISPLAY",
    account: "DA",
    status: "ELIGIBLE",
    impressions: 0,
    clicks: 0,
    cost: 0,
    ctr: 0,
    cpc: 0,
    conversions: 0,
    convRate: 0,
    convValue: 0,
    note: "DA 데이터는 Playwright 연동 후 자동 업데이트 예정",
  },
];

// === 상태 ===
let currentAccount = "all";
let currentType = "all";
let currentSort = "cost";
let currentPeriod = "7";
let customStart = "";
let customEnd = "";

// === 유틸리티 ===
function formatNumber(num) {
  if (num >= 100000000) return (num / 100000000).toFixed(1) + "억";
  if (num >= 10000) return Math.round(num / 10000).toLocaleString("ko-KR") + "만";
  return num.toLocaleString("ko-KR");
}

function formatCurrency(num) {
  if (num >= 100000000) return (num / 100000000).toFixed(1) + "억원";
  if (num >= 10000) return Math.round(num / 10000).toLocaleString("ko-KR") + "만원";
  if (num === 0) return "0원";
  return num.toLocaleString("ko-KR") + "원";
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function getDateRange() {
  const today = new Date();
  let start, end;

  switch (currentPeriod) {
    case "7":
      end = new Date(today);
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      break;
    case "7ex":
      end = new Date(today);
      end.setDate(end.getDate() - 1);
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      break;
    case "30":
      end = new Date(today);
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      break;
    case "30ex":
      end = new Date(today);
      end.setDate(end.getDate() - 1);
      start = new Date(end);
      start.setDate(start.getDate() - 29);
      break;
    case "custom":
      start = customStart ? new Date(customStart) : new Date(today);
      end = customEnd ? new Date(customEnd) : new Date(today);
      break;
    default:
      end = new Date(today);
      start = new Date(today);
      start.setDate(start.getDate() - 6);
  }

  return { start, end };
}

function getBadgeClass(type) {
  switch (type) {
    case "SHOPPING": return "badge-shopping";
    case "BRAND_SEARCH": return "badge-brand";
    case "WEB_SITE": return "badge-website";
    case "DISPLAY": return "badge-display";
    default: return "";
  }
}

function getTypeLabel(type) {
  switch (type) {
    case "SHOPPING": return "쇼핑검색";
    case "BRAND_SEARCH": return "브랜드검색";
    case "WEB_SITE": return "파워링크";
    case "DISPLAY": return "애드부스트";
    default: return type;
  }
}

// === 필터 & 렌더링 ===
function getFilteredData() {
  let data = [...allCampaigns];

  if (currentAccount !== "all") {
    data = data.filter((c) => c.account === currentAccount);
  }

  if (currentType !== "all") {
    data = data.filter((c) => c.type === currentType);
  }

  data.sort((a, b) => b[currentSort] - a[currentSort]);

  return data;
}

function renderKPI(data) {
  const totalCost = data.reduce((s, c) => s + c.cost, 0);
  const totalClicks = data.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = data.reduce((s, c) => s + c.conversions, 0);
  const totalConvValue = data.reduce((s, c) => s + c.convValue, 0);
  const totalImpressions = data.reduce((s, c) => s + c.impressions, 0);
  const roas = totalCost > 0 ? ((totalConvValue / totalCost) * 100).toFixed(0) : "-";
  const avgCpc = totalClicks > 0 ? Math.round(totalCost / totalClicks) : 0;

  document.getElementById("totalCost").textContent = formatCurrency(totalCost);
  document.getElementById("totalClicks").textContent = formatNumber(totalClicks);
  document.getElementById("totalConversions").textContent = formatNumber(totalConversions);
  document.getElementById("totalRoas").textContent = roas !== "-" ? roas + "%" : "-";
  document.getElementById("totalImpressions").textContent = formatNumber(totalImpressions);
  document.getElementById("avgCpc").textContent = avgCpc > 0 ? formatCurrency(avgCpc) : "-";
}

function renderList(data) {
  const container = document.getElementById("campaignList");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = '<div class="empty-state">해당하는 캠페인이 없어요</div>';
    return;
  }

  data.forEach((c) => {
    const roas = c.cost > 0 ? ((c.convValue / c.cost) * 100).toFixed(0) + "%" : "-";
    const row = document.createElement("div");
    row.className = "campaign-row";

    const hasNote = c.note ? `<div class="metric" style="grid-column: 1/-1;"><span class="metric-label" style="color: var(--tds-orange);">${c.note}</span></div>` : "";

    row.innerHTML = `
      <div class="campaign-row-top">
        <span class="campaign-name">${c.name}</span>
        <div class="campaign-badges">
          <span class="badge ${c.account === 'SA' ? 'badge-sa' : 'badge-da'}">${c.account}</span>
          <span class="badge ${getBadgeClass(c.type)}">${getTypeLabel(c.type)}</span>
        </div>
      </div>
      <div class="campaign-metrics">
        <div class="metric">
          <span class="metric-label">광고비</span>
          <span class="metric-value">${formatCurrency(c.cost)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">클릭</span>
          <span class="metric-value">${formatNumber(c.clicks)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">전환</span>
          <span class="metric-value">${formatNumber(c.conversions)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">전환매출</span>
          <span class="metric-value highlight">${formatCurrency(c.convValue)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">ROAS</span>
          <span class="metric-value ${roas !== '-' && parseInt(roas) >= 500 ? 'success' : ''}">${roas}</span>
        </div>
        <div class="metric">
          <span class="metric-label">CTR</span>
          <span class="metric-value">${c.ctr.toFixed(2)}%</span>
        </div>
        ${hasNote}
      </div>
    `;
    container.appendChild(row);
  });
}

function renderPeriodLabel() {
  const { start, end } = getDateRange();
  document.getElementById("periodLabel").textContent = `${formatDate(start)} ~ ${formatDate(end)}`;
}

function render() {
  const data = getFilteredData();
  renderKPI(data);
  renderList(data);
  renderPeriodLabel();
}

// === 이벤트 바인딩 ===

// 기간 프리셋
document.querySelectorAll(".period-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".period-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentPeriod = btn.dataset.period;

    const customEl = document.getElementById("periodCustom");
    if (currentPeriod === "custom") {
      customEl.classList.remove("hidden");
    } else {
      customEl.classList.add("hidden");
      render();
    }
  });
});

// 커스텀 날짜 적용
document.getElementById("applyCustomDate").addEventListener("click", () => {
  customStart = document.getElementById("startDate").value;
  customEnd = document.getElementById("endDate").value;
  if (customStart && customEnd) {
    render();
  }
});

// 계정 탭
document.querySelectorAll(".account-section .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".account-section .tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentAccount = tab.dataset.account;
    render();
  });
});

// 캠페인 유형 탭
document.querySelectorAll(".type-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".type-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentType = tab.dataset.type;
    render();
  });
});

// 정렬 토글
const sortOptions = ["cost", "conversions", "convValue", "clicks"];
const sortLabels = ["비용순 ↓", "전환순 ↓", "매출순 ↓", "클릭순 ↓"];
let sortIndex = 0;

document.getElementById("sortToggle").addEventListener("click", () => {
  sortIndex = (sortIndex + 1) % sortOptions.length;
  currentSort = sortOptions[sortIndex];
  document.getElementById("sortToggle").textContent = sortLabels[sortIndex];
  render();
});

// === 초기 렌더 ===
render();
