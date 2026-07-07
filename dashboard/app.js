// === 실제 SA 캠페인 데이터 (2026-06-07 ~ 2026-07-07) ===
const campaignData = [
  {
    id: "cmp-a001-01-000000009766448",
    name: "오디너리홀리데이_PC",
    type: "WEB_SITE",
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
    id: "cmp-a001-01-000000009769846",
    name: "오디너리홀리데이_MO",
    type: "WEB_SITE",
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
    id: "cmp-a001-02-000000008686339",
    name: "ODP스마트스토어_쇼핑검색",
    type: "SHOPPING",
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
    id: "cmp-a001-02-000000009871348",
    name: "ODP스마트스토어_쇼핑검색_일반키워드",
    type: "SHOPPING",
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
    id: "cmp-a001-04-000000008686340",
    name: "차일디_브랜드검색",
    type: "BRAND_SEARCH",
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
    id: "cmp-a001-04-000000010479784",
    name: "유니버셜오버롤_MO_브랜드검색",
    type: "BRAND_SEARCH",
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
];

// === 유틸리티 ===
function formatNumber(num) {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + "억";
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(0) + "만";
  }
  return num.toLocaleString("ko-KR");
}

function formatCurrency(num) {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + "억원";
  }
  if (num >= 10000) {
    return Math.round(num / 10000).toLocaleString("ko-KR") + "만원";
  }
  return num.toLocaleString("ko-KR") + "원";
}

function getBadgeClass(type) {
  switch (type) {
    case "SHOPPING":
      return "badge-shopping";
    case "BRAND_SEARCH":
      return "badge-brand";
    case "WEB_SITE":
      return "badge-webiste";
    default:
      return "";
  }
}

function getBadgeLabel(type) {
  switch (type) {
    case "SHOPPING":
      return "쇼핑검색";
    case "BRAND_SEARCH":
      return "브랜드검색";
    case "WEB_SITE":
      return "파워링크";
    default:
      return type;
  }
}

// === KPI 렌더링 ===
function renderKPI(data) {
  const totalCost = data.reduce((sum, c) => sum + c.cost, 0);
  const totalClicks = data.reduce((sum, c) => sum + c.clicks, 0);
  const totalConversions = data.reduce((sum, c) => sum + c.conversions, 0);
  const totalConvValue = data.reduce((sum, c) => sum + c.convValue, 0);
  const roas = totalCost > 0 ? ((totalConvValue / totalCost) * 100).toFixed(0) : "-";

  document.getElementById("totalCost").textContent = formatCurrency(totalCost);
  document.getElementById("totalClicks").textContent = formatNumber(totalClicks);
  document.getElementById("totalConversions").textContent = formatNumber(totalConversions);
  document.getElementById("totalRoas").textContent = roas !== "-" ? roas + "%" : "-";
}

// === 캠페인 리스트 렌더링 ===
function renderCampaignList(data) {
  const container = document.getElementById("campaignList");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = '<div class="campaign-row"><span class="text-secondary body">해당하는 캠페인이 없어요</span></div>';
    return;
  }

  data.forEach((c) => {
    const roas = c.cost > 0 ? ((c.convValue / c.cost) * 100).toFixed(0) + "%" : "-";
    const row = document.createElement("div");
    row.className = "campaign-row";
    row.innerHTML = `
      <div class="campaign-row-top">
        <span class="campaign-name">${c.name}</span>
        <span class="campaign-badge ${getBadgeClass(c.type)}">${getBadgeLabel(c.type)}</span>
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
          <span class="metric-value">${roas}</span>
        </div>
        <div class="metric">
          <span class="metric-label">CTR</span>
          <span class="metric-value">${c.ctr.toFixed(2)}%</span>
        </div>
      </div>
    `;
    container.appendChild(row);
  });
}

// === 탭 필터링 ===
let currentFilter = "all";
let currentSort = "cost"; // cost or conversions

function applyFilter() {
  let filtered = campaignData;
  if (currentFilter !== "all") {
    filtered = campaignData.filter((c) => c.type === currentFilter);
  }

  // 정렬
  filtered.sort((a, b) => b[currentSort] - a[currentSort]);

  renderKPI(filtered);
  renderCampaignList(filtered);
}

// 탭 이벤트
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.filter;
    applyFilter();
  });
});

// 정렬 토글
document.getElementById("sortToggle").addEventListener("click", () => {
  const el = document.getElementById("sortToggle");
  if (currentSort === "cost") {
    currentSort = "conversions";
    el.textContent = "전환순";
  } else {
    currentSort = "cost";
    el.textContent = "비용순";
  }
  applyFilter();
});

// === 초기화 ===
document.getElementById("dataDate").textContent = "2026.06.07 ~ 2026.07.07";
applyFilter();
