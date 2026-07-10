// ═══════════════════════════════════════════════════════════════
// Childy Lab — Marketing Analytics SPA
// ═══════════════════════════════════════════════════════════════

// === 데이터 ===
let saData = [];
let daData = [];
let daRawData = [];

// === 상태 ===
let currentChannel = "SA";
let currentPeriod = "7d";
let currentPage = "dashboard";
let currentSubPage = "";
let chartMode = "roas"; // "roas" or "roi"
let trendChartInstance = null;
let mediaChartInstance = null;

// 수집 상태 추적
let collectionStatus = {
  naver_sa: "pending",  // pending | ok | error
  naver_da: "pending",
  meta: "pending",
  criteo: "pending"
};

// ROI 계산용 비용 설정 (localStorage에 저장)
let costSettings = {
  platformFees: {
    smartstore: 5.5,
    godomall: 3.3,
    cafe24: 3.3,
    coupang: 10.8,
    musinsa: 0,
    jasamol: 0,
  },
  // 브랜드 → 판매 플랫폼 매핑
  brandPlatformMap: {
    "차일디": "godomall",
    "아웃도어프로덕츠": "smartstore",
    "오디너리홀리데이": "jasamol",
    "유니버셜오버롤": "jasamol",
    "ODP": "smartstore",
  },
  logisticsFee: 5,   // 물류비 고정 5%
  otherFee: 0        // 기타 부대비용 %
};

function loadCostSettings() {
  try {
    const saved = localStorage.getItem("costSettings_v3");
    if (saved) costSettings = JSON.parse(saved);
  } catch(e) {}
}

function saveCostSettings() {
  localStorage.setItem("costSettings_v3", JSON.stringify(costSettings));
}

function getPlatformFeeForBrand(brand) {
  const platformKey = costSettings.brandPlatformMap[brand];
  if (!platformKey) return null; // 매핑 없음
  const rate = costSettings.platformFees[platformKey];
  return rate != null ? rate / 100 : null;
}

function getActivePlatformFeeRate() {
  // fallback: 첫 번째 브랜드 매핑 기준 (KPI 합산용)
  return (costSettings.platformFees["smartstore"] || 0) / 100;
}

function getTotalFeeRate() {
  return getActivePlatformFeeRate() + (costSettings.logisticsFee / 100) + (costSettings.otherFee / 100);
}

// === 유틸 ===
function fmt(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + "억";
  if (n >= 10000) return Math.round(n / 10000).toLocaleString() + "만";
  return n.toLocaleString();
}

function fmtWon(n) {
  if (n >= 100000000) return "₩" + (n / 100000000).toFixed(1) + "억";
  if (n >= 10000) return "₩" + Math.round(n / 10000).toLocaleString() + "만";
  if (n === 0) return "-";
  return "₩" + n.toLocaleString();
}

function getDateRange() {
  const today = new Date();
  let start, end;
  switch (currentPeriod) {
    case "7d": end = new Date(today); end.setDate(end.getDate() - 1); start = new Date(end); start.setDate(start.getDate() - 6); break;
    case "30d": end = new Date(today); end.setDate(end.getDate() - 1); start = new Date(end); start.setDate(start.getDate() - 29); break;
    case "thisMonth": start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today); end.setDate(end.getDate() - 1); break;
    case "custom":
      start = document.getElementById("startDate").value ? new Date(document.getElementById("startDate").value) : new Date(today);
      end = document.getElementById("endDate").value ? new Date(document.getElementById("endDate").value) : new Date(today);
      break;
    default: end = new Date(today); end.setDate(end.getDate() - 1); start = new Date(end); start.setDate(start.getDate() - 6);
  }
  return { start, end };
}

// === DA 필터링 ===
function getFilteredDA() {
  if (daRawData.length === 0) return daData;
  const { start, end } = getDateRange();
  const startStr = start.toISOString().split("T")[0].replace(/-/g, "");
  const endStr = end.toISOString().split("T")[0].replace(/-/g, "");
  return daRawData.map((campaign) => {
    const filtered = (campaign.daily || []).filter((d) => {
      const dateStr = d.date.replace(/-/g, "");
      return dateStr >= startStr && dateStr <= endStr;
    });
    return {
      ...campaign,
      cost: filtered.reduce((s, d) => s + d.cost, 0),
      impressions: filtered.reduce((s, d) => s + d.impressions, 0),
      clicks: filtered.reduce((s, d) => s + d.clicks, 0),
      purchaseCount: filtered.reduce((s, d) => s + d.purchaseCount, 0),
      purchaseAmount: filtered.reduce((s, d) => s + d.purchaseAmount, 0),
      cartCount: filtered.reduce((s, d) => s + d.cartCount, 0),
      daily: filtered,
    };
  });
}

function getData() {
  // 모든 소스 합치고 필터 적용
  const sa = saData || [];
  const da = daRawData.length > 0 ? getFilteredDA() : (daData || []);
  let all = [...sa, ...da];
  return applyFilters(all);
}

function getAllData() {
  // 필터 없이 전체 데이터 (브랜드/매체 분석 등 독립 페이지용)
  const sa = saData || [];
  const da = daRawData.length > 0 ? getFilteredDA() : (daData || []);
  return [...sa, ...da];
}

function applyFilters(data) {
  const brand = document.getElementById("filterBrand")?.value || "all";
  const media = document.getElementById("filterMedia")?.value || "all";
  const adType = document.getElementById("filterAdType")?.value || "all";

  return data.filter(c => {
    // 브랜드 필터
    if (brand !== "all") {
      const name = (c.name || "").toLowerCase();
      if (brand === "odp" && !name.includes("odp") && !name.includes("오디피")) return false;
      if (brand === "ordinary" && !name.includes("오디너리") && !name.includes("ordinary")) return false;
      if (brand === "childy" && !name.includes("차일디") && !name.includes("childy")) return false;
    }
    // 매체 필터
    if (media !== "all") {
      const acc = (c.account || "").toUpperCase();
      if (media === "naver_sa" && acc !== "SA") return false;
      if (media === "naver_da" && acc !== "DA") return false;
      if (media === "meta" && acc !== "META") return false;
      if (media === "criteo" && acc !== "CRITEO") return false;
    }
    // 광고유형 필터
    if (adType !== "all") {
      const name = (c.name || "").toLowerCase();
      const tp = String(c.type || "").toUpperCase();
      if (adType === "shopping" && tp !== "SHOPPING" && tp !== "2" && !name.includes("쇼핑")) return false;
      if (adType === "powerlink" && tp !== "WEB_SITE" && tp !== "POWER_LINK" && tp !== "1" && !name.includes("파워링크")) return false;
      if (adType === "adboost" && !name.includes("애드부스트") && !name.includes("adboost") && c.account !== "DA") return false;
      if (adType === "brandsearch" && tp !== "BRAND_SEARCH" && tp !== "7") return false;
    }
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════
const PAGE_TITLES = {
  "dashboard": "통합 대시보드",
  "sns": "SNS 성과",
  "brand-analysis": "브랜드/매체 분석",
  "roi-analysis": "ROI 분석",
  "data-management": "데이터 관리",
  "settings": "설정"
};

// 테이블 정렬 상태
let sortCol = "cost";
let sortDir = "desc";

function navigateTo(page, subPage) {
  currentPage = page || "dashboard";
  currentSubPage = subPage || "";

  // Show/hide pages
  document.querySelectorAll(".page-content").forEach(el => el.classList.add("hidden"));
  const pageEl = document.getElementById("page-" + currentPage);
  if (pageEl) pageEl.classList.remove("hidden");

  // Update nav tabs
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.page === currentPage);
  });

  renderPageContent();
}

function renderPageContent() {
  switch (currentPage) {
    case "dashboard": render(); break;
    case "sns": renderSns(); break;
    case "brand-analysis": renderBrandAnalysis(); break;
    case "roi-analysis": renderRoiAnalysis(); break;
    case "data-management": renderDataManagement(); break;
    case "settings": renderSettings(); break;
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace("#", "") || "dashboard";
  const parts = hash.split("/");
  navigateTo(parts[0] || "dashboard", parts[1] || "");
}

// ═══════════════════════════════════════════════════════════════
// KPI RENDER
// ═══════════════════════════════════════════════════════════════
function renderKPI() {
  const data = getData();
  const cost = data.reduce((s, c) => s + c.cost, 0);
  const imps = data.reduce((s, c) => s + c.impressions, 0);
  const clicks = data.reduce((s, c) => s + c.clicks, 0);
  const cart = data.reduce((s, c) => s + (c.cartCount || 0), 0);
  const purchase = data.reduce((s, c) => s + (c.purchaseCount || 0), 0);
  const revenue = data.reduce((s, c) => s + (c.purchaseAmount || 0), 0);
  const ctr = imps ? ((clicks / imps) * 100).toFixed(2) + "%" : "-";
  const roas = cost && revenue ? ((revenue / cost) * 100).toFixed(1) + "%" : "-";
  const convRate = clicks && purchase ? ((purchase / clicks) * 100).toFixed(2) + "%" : "-";

  // 비용 계산 (브랜드별 수수료 가중 합산)
  const logisticsRate = costSettings.logisticsFee / 100;
  let totalLogistics = revenue * logisticsRate;
  let totalPlatformFee = 0;
  let canCalcRoi = false;

  data.forEach(c => {
    const rev = c.purchaseAmount || 0;
    const name = (c.name || "").toLowerCase();
    let brand = "기타";
    if (name.includes("odp") || name.includes("오디피")) brand = "ODP";
    else if (name.includes("오디너리") || name.includes("ordinary")) brand = "오디너리홀리데이";
    else if (name.includes("차일디") || name.includes("childy")) brand = "차일디";
    else if (name.includes("아웃도어") || name.includes("outdoor")) brand = "아웃도어프로덕츠";
    else if (name.includes("유니버셜") || name.includes("universal")) brand = "유니버셜오버롤";
    const platRate = getPlatformFeeForBrand(brand);
    if (platRate != null) {
      totalPlatformFee += rev * platRate;
      canCalcRoi = true;
    }
  });

  // ROI = (매출 - 상품원가 - 고정비 - 몰별수수료) / 광고비 × 100
  // 상품원가 미연동 → 계산 불가
  let roiValue = "-";
  let roiUnavailable = true; // 상품원가 없으므로 항상 계산 불가

  const setKpi = (id, value) => {
    const el = document.getElementById(id);
    if (el) { const v = el.querySelector(".kpi-value"); if (v) v.textContent = value; }
  };
  const setKpiError = (id, value, tooltip) => {
    const el = document.getElementById(id);
    if (el) {
      const v = el.querySelector(".kpi-value");
      if (v) { v.textContent = value; v.className = "kpi-value roi-unavailable"; v.title = tooltip; }
    }
  };

  setKpi("kpiCost", cost ? fmtWon(cost) : "-");
  setKpi("kpiImpressions", imps ? fmt(imps) : "-");
  setKpi("kpiClicks", clicks ? fmt(clicks) : "-");
  setKpi("kpiCtr", ctr);
  setKpi("kpiCart", cart ? fmt(cart) + "건" : "-");
  setKpi("kpiPurchase", purchase ? fmt(purchase) + "건" : "-");
  setKpi("kpiConvRate", convRate);
  setKpi("kpiRevenue", revenue ? fmtWon(revenue) : "-");
  setKpi("kpiRoas", roas);
  setKpi("kpiCogs", "-"); // ERP 연동 전
  setKpi("kpiLogistics", revenue ? fmtWon(Math.round(totalLogistics)) : "-");
  setKpi("kpiPlatformFee", totalPlatformFee > 0 ? fmtWon(Math.round(totalPlatformFee)) : "-");

  if (roiUnavailable && revenue > 0) {
    setKpiError("kpiRoi", "계산 불가", "상품원가(ERP) 미연동으로 ROI 계산 불가");
  } else {
    setKpi("kpiRoi", "-");
  }
}

// ═══════════════════════════════════════════════════════════════
// CHARTS (Chart.js)
// ═══════════════════════════════════════════════════════════════
function renderCharts() {
  renderTrendChart();
  renderMediaChart();
}

function renderTrendChart() {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Aggregate daily data across all campaigns
  const data = getData();
  const dailyMap = {};

  data.forEach(c => {
    if (!c.daily) return;
    c.daily.forEach(d => {
      if (!dailyMap[d.date]) dailyMap[d.date] = { cost: 0, revenue: 0 };
      dailyMap[d.date].cost += d.cost || 0;
      dailyMap[d.date].revenue += d.purchaseAmount || 0;
    });
  });

  const dates = Object.keys(dailyMap).sort();
  const values = dates.map(date => {
    const { cost, revenue } = dailyMap[date];
    if (chartMode === "roas") {
      return cost > 0 ? Math.round((revenue / cost) * 100) : 0;
    } else {
      // ROI = (매출 - 상품원가 - 고정비 - 수수료) / 광고비 × 100
      const logRate = costSettings.logisticsFee / 100;
      const platRate = getActivePlatformFeeRate();
      if (cost > 0) {
        const net = revenue - (revenue * logRate) - (revenue * platRate);
        return Math.round((net / cost) * 100);
      }
      return 0;
    }
  });
  const costs = dates.map(date => dailyMap[date].cost);

  if (trendChartInstance) trendChartInstance.destroy();

  const label = chartMode === "roas" ? "ROAS (%)" : "ROI (%)";
  const borderColor = chartMode === "roas" ? "#6366F1" : "#10B981";

  trendChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dates.map(d => d.slice(5)), // MM-DD
      datasets: [
        {
          type: "line",
          label: label,
          data: values,
          borderColor: borderColor,
          backgroundColor: borderColor + "20",
          borderWidth: 2,
          tension: 0.3,
          yAxisID: "y",
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          type: "bar",
          label: "광고비",
          data: costs,
          backgroundColor: "#E8E8EC",
          borderRadius: 4,
          yAxisID: "y1",
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true, position: "bottom", labels: { font: { size: 11 }, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              if (ctx.dataset.yAxisID === "y1") return "광고비: ₩" + ctx.raw.toLocaleString();
              return ctx.dataset.label + ": " + ctx.raw + "%";
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { position: "left", grid: { color: "#E8E8EC40" }, ticks: { font: { size: 10 }, callback: v => v + "%" } },
        y1: { position: "right", grid: { display: false }, ticks: { font: { size: 10 }, callback: v => "₩" + (v/10000).toFixed(0) + "만" } }
      }
    }
  });
}

function renderMediaChart() {
  const canvas = document.getElementById("mediaChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const allData = getAllData();
  const mediaMap = {};
  allData.forEach(c => {
    const account = c.account || "기타";
    const label = account === "SA" ? "네이버SA" : account === "DA" ? "네이버DA" : account;
    mediaMap[label] = (mediaMap[label] || 0) + (c.cost || 0);
  });

  const labels = Object.keys(mediaMap);
  const values = Object.values(mediaMap);
  const colors = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  if (mediaChartInstance) mediaChartInstance.destroy();

  if (labels.length === 0) {
    mediaChartInstance = null;
    return;
  }

  mediaChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 11 }, usePointStyle: true, padding: 12 } },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total ? ((ctx.raw / total) * 100).toFixed(1) : 0;
              return ctx.label + ": ₩" + ctx.raw.toLocaleString() + " (" + pct + "%)";
            }
          }
        }
      },
      cutout: "60%",
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// TABLE RENDER (Dashboard)
// ═══════════════════════════════════════════════════════════════
function renderTable() {
  const data = getData();
  const tbody = document.querySelector("#mainTable tbody");
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="16" class="load-cell">
      <button class="btn-load" id="btnLoadData">데이터 로드</button>
      <span class="load-hint">필터 조건을 설정하고 [조회] 버튼을 누르세요</span>
    </td></tr>`;
    const loadBtn = document.getElementById("btnLoadData");
    if (loadBtn) loadBtn.addEventListener("click", loadSAData);
    return;
  }

  // 계산 컬럼 추가 후 정렬
  const enriched = data.map(c => {
    const name = (c.name || "").toLowerCase();
    let brand = "기타";
    if (name.includes("odp") || name.includes("오디피")) brand = "ODP";
    else if (name.includes("오디너리") || name.includes("ordinary")) brand = "오디너리홀리데이";
    else if (name.includes("차일디") || name.includes("childy")) brand = "차일디";
    else if (name.includes("아웃도어") || name.includes("outdoor")) brand = "아웃도어프로덕츠";
    else if (name.includes("유니버셜") || name.includes("universal")) brand = "유니버셜오버롤";

    const acc = (c.account || "").toUpperCase();
    let media = c.account === "SA" ? "네이버SA" : c.account === "DA" ? "네이버DA" : (c.account || "기타");

    let adType = "-";
    const tp = String(c.type || "").toUpperCase();
    if (tp === "SHOPPING" || tp === "2" || name.includes("쇼핑")) adType = "쇼핑검색";
    else if (tp === "WEB_SITE" || tp === "POWER_LINK" || tp === "1" || name.includes("파워링크") || name.includes("powerlink")) adType = "파워링크";
    else if (tp === "POWER_CONTENTS" || tp === "4") adType = "파워콘텐츠";
    else if (tp === "BRAND_SEARCH" || tp === "7") adType = "브랜드검색";
    else if (name.includes("애드부스트") || name.includes("adboost") || c.account === "DA") adType = "애드부스트";

    const platRate = getPlatformFeeForBrand(brand);
    const logRate = costSettings.logisticsFee / 100;
    const rev = c.purchaseAmount || 0;

    return {
      ...c, brand, media, adType,
      ctr: c.impressions ? (c.clicks / c.impressions) * 100 : 0,
      roas: c.cost ? (c.purchaseAmount / c.cost) * 100 : 0,
      logisticsCost: rev * logRate,
      platformFeeCost: platRate != null ? rev * platRate : 0,
      platRateMapped: platRate, // null if no mapping
      roi: null, // 상품원가 미연동 → 항상 null (계산 불가)
    };
  });

  const sorted = [...enriched].sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (sortCol === "name") {
      va = (va || "").toLowerCase(); vb = (vb || "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    va = va || 0; vb = vb || 0;
    return sortDir === "asc" ? va - vb : vb - va;
  });

  // 헤더 정렬 상태 반영
  document.querySelectorAll("#mainTable th.sortable").forEach(th => {
    th.classList.remove("asc", "desc");
    if (th.dataset.col === sortCol) th.classList.add(sortDir);
  });

  tbody.innerHTML = "";

  sorted.forEach((c, idx) => {
    const purchaseRoas = c.cost && c.purchaseAmount ? ((c.purchaseAmount / c.cost) * 100).toFixed(1) + "%" : "-";
    const roasClass = purchaseRoas !== "-" && parseFloat(purchaseRoas) >= 300 ? "roas-high" : "";
    const ctr = c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) + "%" : "-";
    const logStr = c.logisticsCost > 0 ? fmtWon(Math.round(c.logisticsCost)) : "-";
    const platStr = c.platformFeeCost > 0 ? fmtWon(Math.round(c.platformFeeCost)) : (c.platRateMapped == null ? '<span class="roi-unavailable" title="브랜드-플랫폼 매핑 없음">미설정</span>' : "-");
    const roiStr = '<span class="roi-unavailable" title="상품원가(ERP) 미연동으로 ROI 계산 불가">계산 불가</span>';
    const rowId = `daily-${currentChannel}-${idx}`;

    const row = document.createElement("tr");
    row.className = "campaign-row-clickable";
    row.innerHTML = `
      <td class="toggle-cell"><span class="toggle-icon" id="icon-${rowId}"></span></td>
      <td>${c.brand}</td>
      <td>${c.media}</td>
      <td>${c.adType}</td>
      <td class="campaign-name">${c.name}</td>
      <td class="num">${fmtWon(c.cost)}</td>
      <td class="num">${fmt(c.impressions)}</td>
      <td class="num">${fmt(c.clicks)}</td>
      <td class="num">${ctr}</td>
      <td class="num">${fmt(c.cartCount || 0)}</td>
      <td class="num">${fmt(c.purchaseCount || 0)}</td>
      <td class="num">${fmtWon(c.purchaseAmount || 0)}</td>
      <td class="num ${roasClass}">${purchaseRoas}</td>
      <td class="num">${logStr}</td>
      <td class="num">${platStr}</td>
      <td class="num">${roiStr}</td>
    `;
    row.addEventListener("click", () => toggleDaily(rowId, c));
    tbody.appendChild(row);

    const dailyRow = document.createElement("tr");
    dailyRow.id = rowId;
    dailyRow.className = "daily-row hidden";
    if (c.daily && c.daily.length > 0) {
      dailyRow.innerHTML = `<td colspan="16" class="daily-cell">${buildDailyHtml(c.daily)}</td>`;
      dailyRow.dataset.loaded = "true";
    } else {
      dailyRow.innerHTML = `<td colspan="16" class="daily-cell"><div class="daily-loading">로딩 중...</div></td>`;
    }
    tbody.appendChild(dailyRow);
  });
}

function buildDailyHtml(dailyData) {
  let html = `<table class="daily-table">
    <thead><tr>
      <th>날짜</th><th class="num">광고비</th><th class="num">노출</th><th class="num">클릭</th>
      <th class="num">장바구니</th><th class="num">구매</th><th class="num">구매액</th><th class="num">구매ROAS</th>
    </tr></thead><tbody>`;
  dailyData.forEach((d) => {
    const roas = (d.cost != null && d.cost > 0 && d.purchaseAmount) ? ((d.purchaseAmount / d.cost) * 100).toFixed(1) + "%" : "-";
    const costStr = d.cost === null || d.cost === undefined ? "-" : fmtWon(d.cost);
    const impStr = d.impressions === null || d.impressions === undefined ? "-" : fmt(d.impressions);
    const clkStr = d.clicks === null || d.clicks === undefined ? "-" : fmt(d.clicks);
    html += `<tr>
      <td>${d.date}</td><td class="num">${costStr}</td><td class="num">${impStr}</td><td class="num">${clkStr}</td>
      <td class="num">${fmt(d.cartCount || 0)}</td><td class="num">${fmt(d.purchaseCount || 0)}</td>
      <td class="num">${fmtWon(d.purchaseAmount || 0)}</td><td class="num">${roas}</td>
    </tr>`;
  });
  html += "</tbody></table>";
  return html;
}

async function toggleDaily(rowId, campaign) {
  const row = document.getElementById(rowId);
  const icon = document.getElementById("icon-" + rowId);
  if (!row) return;
  if (!row.classList.contains("hidden")) {
    row.classList.add("hidden");
    if (icon) icon.classList.remove("open");
    return;
  }
  row.classList.remove("hidden");
  if (icon) icon.classList.add("open");
  if (row.dataset.loaded === "true") return;
  if (campaign.daily && campaign.daily.length > 0) {
    const cell = row.querySelector(".daily-cell");
    if (cell) cell.innerHTML = buildDailyHtml(campaign.daily);
  } else {
    const cell = row.querySelector(".daily-cell");
    if (cell) cell.innerHTML = '<div class="daily-loading">일별 데이터 없음</div>';
  }
  row.dataset.loaded = "true";
}

function render() {
  renderKPI();
  renderTable();
  renderCharts();
}

// ═══════════════════════════════════════════════════════════════
// PAGE: BRAND/MEDIA ANALYSIS
// ═══════════════════════════════════════════════════════════════
function renderBrandAnalysis() {
  const body = document.getElementById("brandAnalysisBody");
  if (!body) return;
  const sub = currentSubPage || "brand";
  updateSubNav("brandSubNav", sub);
  const allData = getAllData();
  if (allData.length === 0) {
    body.innerHTML = `<div class="empty-state"><p class="empty-text">데이터가 없습니다. 먼저 대시보드에서 SA 데이터를 로드하거나 DA CSV를 업로드해주세요.</p><a href="#dashboard" class="btn btn-primary">대시보드로 이동</a></div>`;
    return;
  }
  if (sub === "brand") body.innerHTML = renderGroupedTable(allData, "brand");
  else if (sub === "media") body.innerHTML = renderGroupedTable(allData, "media");
}

function renderGroupedTable(data, groupBy) {
  const groups = {};
  data.forEach(c => {
    let key;
    if (groupBy === "brand") {
      const name = (c.name || "").toLowerCase();
      if (name.includes("odp") || name.includes("오디피")) key = "ODP";
      else if (name.includes("오디너리") || name.includes("ordinary")) key = "오디너리홀리데이";
      else if (name.includes("차일디") || name.includes("childy")) key = "차일디";
      else key = "기타";
    } else {
      const acc = c.account || "기타";
      key = acc === "SA" ? "네이버SA" : acc === "DA" ? "네이버DA" : acc;
    }
    if (!groups[key]) groups[key] = { cost: 0, impressions: 0, clicks: 0, purchaseCount: 0, purchaseAmount: 0 };
    groups[key].cost += c.cost || 0;
    groups[key].impressions += c.impressions || 0;
    groups[key].clicks += c.clicks || 0;
    groups[key].purchaseCount += c.purchaseCount || 0;
    groups[key].purchaseAmount += c.purchaseAmount || 0;
  });
  const label = groupBy === "brand" ? "브랜드" : "매체";
  let html = `<div class="table-wrap"><table class="data-table"><thead><tr>
    <th>${label}</th><th class="num">광고비</th><th class="num">노출</th><th class="num">클릭</th>
    <th class="num">CTR</th><th class="num">구매</th><th class="num">구매액</th><th class="num">ROAS</th>
  </tr></thead><tbody>`;
  Object.entries(groups).sort((a,b) => b[1].cost - a[1].cost).forEach(([name, d]) => {
    const ctr = d.impressions ? ((d.clicks / d.impressions) * 100).toFixed(2) + "%" : "-";
    const roas = d.cost ? ((d.purchaseAmount / d.cost) * 100).toFixed(1) + "%" : "-";
    html += `<tr><td>${name}</td><td class="num">${fmtWon(d.cost)}</td><td class="num">${fmt(d.impressions)}</td>
      <td class="num">${fmt(d.clicks)}</td><td class="num">${ctr}</td>
      <td class="num">${fmt(d.purchaseCount)}</td><td class="num">${fmtWon(d.purchaseAmount)}</td><td class="num">${roas}</td></tr>`;
  });
  html += "</tbody></table></div>";
  return html;
}

function renderCampaignDetailTable(data) {
  const sorted = [...data].sort((a, b) => b.cost - a.cost);
  let html = `<div class="table-wrap"><table class="data-table"><thead><tr>
    <th>캠페인</th><th>매체</th><th class="num">광고비</th><th class="num">노출</th>
    <th class="num">클릭</th><th class="num">CTR</th><th class="num">구매</th><th class="num">구매액</th><th class="num">ROAS</th>
  </tr></thead><tbody>`;
  sorted.forEach(c => {
    const ctr = c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) + "%" : "-";
    const roas = c.cost ? ((c.purchaseAmount / c.cost) * 100).toFixed(1) + "%" : "-";
    const media = c.account === "SA" ? "네이버SA" : c.account === "DA" ? "네이버DA" : (c.account || "-");
    html += `<tr><td>${c.name}</td><td>${media}</td><td class="num">${fmtWon(c.cost)}</td>
      <td class="num">${fmt(c.impressions)}</td><td class="num">${fmt(c.clicks)}</td><td class="num">${ctr}</td>
      <td class="num">${fmt(c.purchaseCount || 0)}</td><td class="num">${fmtWon(c.purchaseAmount || 0)}</td><td class="num">${roas}</td></tr>`;
  });
  html += "</tbody></table></div>";
  return html;
}

// ═══════════════════════════════════════════════════════════════
// PAGE: SNS 성과 (인스타그램 / 쓰레드)
// ═══════════════════════════════════════════════════════════════
let snsData = { instagram: null, threads: null };

function renderSns() {
  const body = document.getElementById("snsBody");
  if (!body) return;
  const sub = currentSubPage || "instagram";
  updateSubNav("snsSubNav", sub);

  if (sub === "instagram") {
    renderSnsInstagram(body);
  } else if (sub === "threads") {
    renderSnsThreads(body);
  }
}

function renderSnsInstagram(body) {
  const data = snsData.instagram;
  body.innerHTML = `
    <div class="sns-kpi-grid">
      <div class="kpi-card"><span class="kpi-label">팔로워</span><span class="kpi-value">${data ? fmt(data.metrics.followers || 0) : "—"}</span></div>
      <div class="kpi-card"><span class="kpi-label">팔로워 증감</span><span class="kpi-value">${data ? (data.metrics.followerChange > 0 ? "+" : "") + fmt(data.metrics.followerChange || 0) : "—"}</span></div>
      <div class="kpi-card"><span class="kpi-label">도달</span><span class="kpi-value">${data ? fmt(data.metrics.reach || 0) : "—"}</span></div>
      <div class="kpi-card"><span class="kpi-label">프로필 방문</span><span class="kpi-value">${data ? fmt(data.metrics.profileViews || 0) : "—"}</span></div>
      <div class="kpi-card"><span class="kpi-label">웹사이트 클릭</span><span class="kpi-value">${data ? fmt(data.metrics.websiteClicks || 0) : "—"}</span></div>
    </div>

    <div class="section-heading" style="padding:0 0 var(--space-2);"><h2 class="section-title">피드/릴스 게시물 성과</h2></div>
    <div class="table-wrap" style="padding:0 0 var(--space-6);">
      <table class="data-table" id="instaFeedTable">
        <thead><tr>
          <th>게시일</th><th>유형</th><th>캡션</th>
          <th class="num">좋아요</th><th class="num">댓글</th><th class="num">저장</th>
          <th class="num">공유</th><th class="num">도달</th><th class="num">조회수</th>
        </tr></thead>
        <tbody>${data && data.feedPosts ? data.feedPosts.map(p => `<tr>
          <td>${p.timestamp || "-"}</td><td>${p.mediaType || "-"}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${p.caption || "-"}</td>
          <td class="num">${fmt(p.likes || 0)}</td><td class="num">${fmt(p.comments || 0)}</td><td class="num">${fmt(p.saved || 0)}</td>
          <td class="num">${fmt(p.shares || 0)}</td><td class="num">${fmt(p.reach || 0)}</td><td class="num">${fmt(p.views || 0)}</td>
        </tr>`).join("") : `<tr><td colspan="9" class="load-cell"><span class="load-hint">데이터 없음 — 설정 > API 연동에서 인스타그램을 연결해주세요</span></td></tr>`}</tbody>
      </table>
    </div>

    <div class="section-heading" style="padding:0 0 var(--space-2);"><h2 class="section-title">스토리 성과</h2></div>
    <div class="table-wrap" style="padding:0;">
      <table class="data-table" id="instaStoryTable">
        <thead><tr>
          <th>게시일</th><th class="num">도달</th><th class="num">조회수</th><th class="num">답장</th><th class="num">탐색(Navigation)</th>
        </tr></thead>
        <tbody>${data && data.stories ? data.stories.map(s => `<tr>
          <td>${s.timestamp || "-"}</td>
          <td class="num">${fmt(s.reach || 0)}</td><td class="num">${fmt(s.views || 0)}</td>
          <td class="num">${fmt(s.replies || 0)}</td><td class="num">${fmt(s.navigation || 0)}</td>
        </tr>`).join("") : `<tr><td colspan="5" class="load-cell"><span class="load-hint">데이터 없음</span></td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function renderSnsThreads(body) {
  const data = snsData.threads;
  body.innerHTML = `
    <div class="sns-kpi-grid">
      <div class="kpi-card"><span class="kpi-label">팔로워</span><span class="kpi-value">${data ? fmt(data.metrics.followers || 0) : "—"}</span></div>
      <div class="kpi-card"><span class="kpi-label">도달 (기간)</span><span class="kpi-value">${data ? fmt(data.metrics.reach || 0) : "—"}</span></div>
      <div class="kpi-card"><span class="kpi-label">인게이지먼트율</span><span class="kpi-value">${data ? data.metrics.engagementRate.toFixed(2) + "%" : "—"}</span></div>
      <div class="kpi-card"><span class="kpi-label">좋아요</span><span class="kpi-value">${data ? fmt(data.metrics.likes || 0) : "—"}</span></div>
      <div class="kpi-card"><span class="kpi-label">리포스트</span><span class="kpi-value">${data ? fmt(data.metrics.reposts || 0) : "—"}</span></div>
    </div>`;
  if (!data) {
    body.innerHTML += `<div class="empty-state"><p class="empty-text">쓰레드 데이터가 없습니다. 설정 > API 연동에서 Threads API를 연결해주세요.</p></div>`;
  } else {
    renderSnsDataView(body, data, "threads");
  }
}

function renderSnsDataView(body, data, platform) {
  // 데이터가 있을 때의 풀 뷰 (향후 API 연동 시 활성화)
  const metrics = data.metrics || {};
  const posts = data.posts || [];

  let kpiHtml = `<div class="sns-kpi-grid">
    <div class="kpi-card"><span class="kpi-label">팔로워</span><span class="kpi-value">${fmt(metrics.followers || 0)}</span></div>
    <div class="kpi-card"><span class="kpi-label">도달 (기간)</span><span class="kpi-value">${fmt(metrics.reach || 0)}</span></div>
    <div class="kpi-card"><span class="kpi-label">인게이지먼트율</span><span class="kpi-value">${metrics.engagementRate ? metrics.engagementRate.toFixed(2) + "%" : "-"}</span></div>
    <div class="kpi-card"><span class="kpi-label">${platform === "threads" ? "리포스트" : "프로필 방문"}</span><span class="kpi-value">${fmt(metrics.profileVisits || metrics.reposts || 0)}</span></div>
    <div class="kpi-card"><span class="kpi-label">${platform === "threads" ? "좋아요" : "링크 클릭"}</span><span class="kpi-value">${fmt(metrics.linkClicks || metrics.likes || 0)}</span></div>
  </div>`;

  let tableHtml = "";
  if (posts.length > 0) {
    const cols = platform === "threads"
      ? ["게시일", "내용", "조회", "좋아요", "답글", "리포스트", "인용"]
      : ["게시일", "유형", "도달", "노출", "좋아요", "댓글", "저장", "공유"];
    tableHtml = `<div class="table-wrap" style="margin-top:24px;"><table class="data-table">
      <thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${posts.map(p => `<tr>${Object.values(p).map(v => `<td class="num">${v}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
  }

  body.innerHTML = kpiHtml + tableHtml;
}

// ═══════════════════════════════════════════════════════════════
// PAGE: ROI ANALYSIS
// ═══════════════════════════════════════════════════════════════
function renderRoiAnalysis() {
  const body = document.getElementById("roiAnalysisBody");
  if (!body) return;
  const sub = currentSubPage || "period";
  updateSubNav("roiSubNav", sub);
  body.innerHTML = `
    <div class="info-card">
      <div class="info-card-icon">💡</div>
      <div class="info-card-content">
        <h4 class="info-card-title">ROI 분석 기능 안내</h4>
        <p class="info-card-desc">실제 ROI를 계산하려면 다음 데이터가 필요합니다:</p>
        <ul class="info-list">
          <li>상품별 원가 / 마진율</li>
          <li>플랫폼 수수료율 (스마트스토어, 자사몰 등)</li>
          <li>배송비 / 포장비 등 부대비용</li>
        </ul>
        <p class="info-card-desc" style="margin-top:12px;"><strong>현재 상태:</strong> 원가/마진 데이터 미설정. 설정에서 연동 후 자동 계산됩니다.</p>
        <div style="margin-top:16px;"><a href="#settings/api" class="btn btn-primary btn-sm">설정으로 이동</a></div>
      </div>
    </div>
    <div class="roi-formula-card">
      <h4 class="info-card-title">ROI 계산 공식</h4>
      <div class="formula"><code>실제ROI = (매출 - 원가 - 수수료 - 광고비) / 광고비 × 100%</code></div>
      <p class="info-card-desc" style="margin-top:8px;">현재 ROAS만 표시 가능: ROAS = 매출 / 광고비 × 100%</p>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// PAGE: DATA MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function renderDataManagement() {
  const body = document.getElementById("dataManagementBody");
  if (!body) return;
  const sub = currentSubPage || "status";
  updateSubNav("dataSubNav", sub);
  if (sub === "upload") {
    body.innerHTML = `<div class="upload-section">
      <h4 class="section-title" style="margin-bottom:16px;">네이버 DA CSV 업로드</h4>
      <div class="upload-dropzone" id="dropZone">
        <div class="upload-dropzone-inner">
          <span class="upload-icon">📁</span>
          <p class="upload-title">CSV 파일을 여기에 드래그하거나 클릭</p>
          <p class="upload-desc">네이버 DA 성과 리포트 CSV 파일</p>
          <button class="btn btn-primary btn-sm" id="btnSelectFile">파일 선택</button>
        </div>
      </div>
      <div class="upload-info">
        <p><strong>지원 형식:</strong> CSV (UTF-8, EUC-KR)</p>
        <p><strong>필수 컬럼:</strong> 캠페인 이름, 기간, 총비용, 노출수, 클릭수, 구매완료 수, 장바구니 담기 수, 구매완료 전환매출액</p>
      </div>
      <div id="uploadStatus"></div>
    </div>`;
    initDropZone();
  } else if (sub === "status") {
    const saCount = saData.length;
    const daCount = daRawData.length || daData.length;
    body.innerHTML = `<div class="status-overview">
      <h4 class="section-title" style="margin-bottom:16px;">데이터 수집 현황</h4>
      <div class="status-cards-grid">
        <div class="status-card"><div class="status-card-header"><span class="status-card-name">네이버SA</span><span class="status-badge ok">정상</span></div><div class="status-card-body"><p>캠페인: <strong>${saCount}개</strong> | 방식: API (n8n) | ${saCount > 0 ? "로드 완료" : "미수집"}</p></div></div>
        <div class="status-card"><div class="status-card-header"><span class="status-card-name">네이버DA</span><span class="status-badge ${daCount > 0 ? 'ok' : 'warn'}">${daCount > 0 ? '정상' : '누락'}</span></div><div class="status-card-body"><p>캠페인: <strong>${daCount}개</strong> | 방식: CSV 업로드 | ${daCount > 0 ? "완료" : "미업로드"}</p></div></div>
        <div class="status-card"><div class="status-card-header"><span class="status-card-name">메타</span><span class="status-badge warn">대기</span></div><div class="status-card-body"><p>API 연동 예정</p></div></div>
        <div class="status-card"><div class="status-card-header"><span class="status-card-name">크리테오</span><span class="status-badge warn">대기</span></div><div class="status-card-body"><p>API 연동 예정</p></div></div>
      </div>
    </div>`;
  } else {
    body.innerHTML = `<div class="info-card"><div class="info-card-icon">🔧</div><div class="info-card-content"><h4 class="info-card-title">데이터 보정</h4><p class="info-card-desc">현재 보정이 필요한 데이터가 없습니다.</p></div></div>`;
  }
}

function initDropZone() {
  const dropZone = document.getElementById("dropZone");
  const btnSelect = document.getElementById("btnSelectFile");
  const daInput = document.getElementById("daFileInput");
  if (!dropZone || !daInput) return;
  if (btnSelect) btnSelect.addEventListener("click", (e) => { e.stopPropagation(); daInput.click(); });
  dropZone.addEventListener("click", () => daInput.click());
  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault(); dropZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) processDAFile(file);
    else { const s = document.getElementById("uploadStatus"); if (s) s.innerHTML = '<p class="upload-error">CSV 파일만 업로드 가능합니다.</p>'; }
  });
}

function processDAFile(file) {
  const statusEl = document.getElementById("uploadStatus");
  if (statusEl) statusEl.innerHTML = '<p class="upload-processing">파일 처리 중...</p>';
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const parsed = parseNaverDaCsv(evt.target.result);
      if (parsed.length > 0) {
        daRawData = parsed; daData = parsed;
        collectionStatus.naver_da = "ok";
        updateCollectionStatus();
        if (statusEl) statusEl.innerHTML = `<p class="upload-success">✓ ${parsed.length}개 캠페인 데이터 반영 완료</p>`;
      } else {
        collectionStatus.naver_da = "error";
        updateCollectionStatus();
        if (statusEl) statusEl.innerHTML = '<p class="upload-error">CSV에서 데이터를 읽지 못했습니다.</p>';
      }
    } catch (err) {
      if (statusEl) statusEl.innerHTML = `<p class="upload-error">파싱 에러: ${err.message}</p>`;
    }
  };
  reader.readAsText(file, "utf-8");
}

// ═══════════════════════════════════════════════════════════════
// PAGE: SETTINGS
// ═══════════════════════════════════════════════════════════════
function renderSettings() {
  const body = document.getElementById("settingsBody");
  if (!body) return;
  const sub = currentSubPage || "api";
  updateSubNav("settingsSubNav", sub);
  if (sub === "api") {
    body.innerHTML = `<div class="settings-section" style="max-width:720px;">
      <h4 class="section-title" style="margin-bottom:16px;">API 연동 설정</h4>

      <div class="settings-card">
        <div class="settings-card-header"><span class="settings-card-icon">🔗</span><div><strong>n8n Webhook</strong><p class="settings-card-desc">네이버SA 데이터 수집</p></div><span class="status-badge ok">연결됨</span></div>
        <div class="settings-card-body"><label class="settings-label">Webhook URL</label><div class="settings-url-row"><input type="text" class="settings-input" value="https://n8n.childylab.com/webhook" readonly><button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('https://n8n.childylab.com/webhook')">복사</button></div></div>
      </div>

      <div class="settings-card">
        <div class="settings-card-header"><span class="settings-card-icon">📸</span><div><strong>인스타그램 (Meta Graph API)</strong><p class="settings-card-desc">비즈니스 계정 인사이트 수집</p></div><span class="status-badge warn">미연동</span></div>
        <div class="settings-card-body">
          <div class="settings-field">
            <label class="settings-label">Instagram Business Account ID</label>
            <input type="text" class="settings-input" id="inputInstaAccountId" value="${costSettings.instagram?.accountId || ''}" placeholder="예: 17841430549922918">
          </div>
          <div class="settings-field">
            <label class="settings-label">Meta App Access Token (Long-lived)</label>
            <input type="password" class="settings-input" id="inputInstaToken" value="${costSettings.instagram?.token || ''}" placeholder="Meta Developer에서 발급">
          </div>
          <div class="settings-field" style="margin-top:12px;">
            <p class="settings-hint"><strong>필요 권한:</strong> business_management, instagram_basic, instagram_manage_insights, pages_read_engagement</p>
          </div>
          <div class="settings-field" style="margin-top:8px;">
            <p class="settings-hint"><strong>수집 가능 지표:</strong></p>
            <p class="settings-hint">• 계정: 팔로워 증감, 프로필 방문, 도달, 웹사이트 클릭</p>
            <p class="settings-hint">• 피드/릴스: 좋아요, 댓글, 저장, 공유, 도달, 조회수</p>
            <p class="settings-hint">• 스토리: 도달, 조회수, 답장, 탐색</p>
            <p class="settings-hint" style="color:var(--color-error);">• 노출 수(Impressions): API v25.0에서 조회 불가 ❌</p>
          </div>
          <div style="margin-top:12px;">
            <button class="btn btn-primary btn-sm" id="btnSaveInsta">저장</button>
            <span id="instaSaveStatus" style="font-size:12px; color:var(--color-success); margin-left:8px;"></span>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-header"><span class="settings-card-icon">🧵</span><div><strong>쓰레드 (Threads API)</strong><p class="settings-card-desc">쓰레드 계정 인사이트 수집</p></div><span class="status-badge warn">미연동</span></div>
        <div class="settings-card-body">
          <div class="settings-field">
            <label class="settings-label">Threads User ID</label>
            <input type="text" class="settings-input" id="inputThreadsUserId" value="${costSettings.threads?.userId || ''}" placeholder="Threads 사용자 ID">
          </div>
          <div class="settings-field">
            <label class="settings-label">Threads Access Token</label>
            <input type="password" class="settings-input" id="inputThreadsToken" value="${costSettings.threads?.token || ''}" placeholder="Threads API 토큰">
          </div>
          <div style="margin-top:12px;">
            <button class="btn btn-primary btn-sm" id="btnSaveThreads">저장</button>
            <span id="threadsSaveStatus" style="font-size:12px; color:var(--color-success); margin-left:8px;"></span>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-header"><span class="settings-card-icon">🛒</span><div><strong>자사몰 / ERP</strong><p class="settings-card-desc">주문/원가 데이터</p></div><span class="status-badge warn">미설정</span></div>
        <div class="settings-card-body"><p class="settings-hint">자사몰 API + ERP를 연동하면 상품별 원가 기반 ROI 계산이 가능합니다.</p></div>
      </div>
    </div>`;
    setTimeout(() => {
      const btnInsta = document.getElementById("btnSaveInsta");
      if (btnInsta) btnInsta.addEventListener("click", () => {
        if (!costSettings.instagram) costSettings.instagram = {};
        costSettings.instagram.accountId = document.getElementById("inputInstaAccountId")?.value || "";
        costSettings.instagram.token = document.getElementById("inputInstaToken")?.value || "";
        saveCostSettings();
        const st = document.getElementById("instaSaveStatus");
        if (st) { st.textContent = "✓ 저장됨"; setTimeout(() => st.textContent = "", 3000); }
      });
      const btnThreads = document.getElementById("btnSaveThreads");
      if (btnThreads) btnThreads.addEventListener("click", () => {
        if (!costSettings.threads) costSettings.threads = {};
        costSettings.threads.userId = document.getElementById("inputThreadsUserId")?.value || "";
        costSettings.threads.token = document.getElementById("inputThreadsToken")?.value || "";
        saveCostSettings();
        const st = document.getElementById("threadsSaveStatus");
        if (st) { st.textContent = "✓ 저장됨"; setTimeout(() => st.textContent = "", 3000); }
      });
    }, 0);
  } else if (sub === "cost") {
    const fees = costSettings.platformFees || {};
    const platforms = [
      { key: "smartstore", name: "스마트스토어" },
      { key: "godomall", name: "고도몰" },
      { key: "cafe24", name: "카페24" },
      { key: "coupang", name: "쿠팡" },
      { key: "musinsa", name: "무신사" },
      { key: "jasamol", name: "자사몰" },
    ];
    const brandMap = costSettings.brandPlatformMap || {};
    const brands = ["차일디", "아웃도어프로덕츠", "오디너리홀리데이", "유니버셜오버롤", "ODP"];

    const platformRows = platforms.map(p =>
      `<div class="settings-field" style="display:flex; align-items:center; gap:8px;">
        <label style="font-size:13px; color:var(--color-text); min-width:100px;">${p.name}</label>
        <input type="number" class="settings-input platform-fee-input" data-platform="${p.key}" value="${fees[p.key] || 0}" min="0" max="100" step="0.1" style="max-width:100px;">
        <span style="font-size:12px; color:var(--color-text-muted);">%</span>
      </div>`
    ).join("");

    const brandRows = brands.map(b =>
      `<div class="settings-field" style="display:flex; align-items:center; gap:8px;">
        <label style="font-size:13px; color:var(--color-text); min-width:120px;">${b}</label>
        <select class="filter-select brand-platform-select" data-brand="${b}" style="min-width:140px;">
          <option value="">미설정</option>
          ${platforms.map(p => `<option value="${p.key}" ${brandMap[b] === p.key ? 'selected' : ''}>${p.name}</option>`).join("")}
        </select>
      </div>`
    ).join("");

    body.innerHTML = `<div class="settings-section">
      <h4 class="section-title" style="margin-bottom:16px;">수수료/비용 설정</h4>
      <p class="info-card-desc" style="margin-bottom:16px;">ROI = (매출 - 상품원가 - 고정비 - 몰별수수료) / 광고비 × 100%</p>
      <div class="settings-card">
        <div class="settings-card-header"><span class="settings-card-icon">🏪</span><div><strong>몰별 수수료율</strong><p class="settings-card-desc">각 판매 채널의 수수료율을 설정합니다</p></div></div>
        <div class="settings-card-body">${platformRows}</div>
      </div>
      <div class="settings-card">
        <div class="settings-card-header"><span class="settings-card-icon">🔗</span><div><strong>브랜드 → 플랫폼 매핑</strong><p class="settings-card-desc">각 브랜드가 주로 판매하는 플랫폼을 지정합니다</p></div></div>
        <div class="settings-card-body">${brandRows}</div>
      </div>
      <div class="settings-card">
        <div class="settings-card-header"><span class="settings-card-icon">🚚</span><div><strong>고정비</strong><p class="settings-card-desc">물류비 ${costSettings.logisticsFee}% 고정 적용</p></div></div>
        <div class="settings-card-body">
          <div class="settings-field">
            <label class="settings-label">물류비 (배송+포장) %</label>
            <input type="number" class="settings-input" id="inputLogisticsFee" value="${costSettings.logisticsFee}" min="0" max="100" step="0.1">
          </div>
          <div class="settings-field">
            <label class="settings-label">기타 부대비용 %</label>
            <input type="number" class="settings-input" id="inputOtherFee" value="${costSettings.otherFee}" min="0" max="100" step="0.1">
          </div>
        </div>
      </div>
      <div style="margin-top:16px; display:flex; gap:8px; align-items:center;">
        <button class="btn btn-primary btn-sm" id="btnSaveCost">저장</button>
        <span id="costSaveStatus" style="font-size:12px; color:var(--color-success);"></span>
      </div>
      <div class="info-card" style="margin-top:16px;">
        <div class="info-card-icon">💡</div>
        <div class="info-card-content">
          <p class="info-card-desc">제조원가(상품별 원가)는 사내 ERP 연동이 필요하며 현재 미포함입니다. 상품원가가 없으면 ROI는 "계산 불가"로 표시됩니다.</p>
        </div>
      </div>
    </div>`;
    setTimeout(() => {
      const btnSave = document.getElementById("btnSaveCost");
      if (btnSave) btnSave.addEventListener("click", () => {
        document.querySelectorAll(".platform-fee-input").forEach(input => {
          costSettings.platformFees[input.dataset.platform] = parseFloat(input.value) || 0;
        });
        document.querySelectorAll(".brand-platform-select").forEach(sel => {
          costSettings.brandPlatformMap[sel.dataset.brand] = sel.value || "";
        });
        costSettings.logisticsFee = parseFloat(document.getElementById("inputLogisticsFee")?.value) || 0;
        costSettings.otherFee = parseFloat(document.getElementById("inputOtherFee")?.value) || 0;
        saveCostSettings();
        const st = document.getElementById("costSaveStatus");
        if (st) { st.textContent = "✓ 저장됨"; setTimeout(() => st.textContent = "", 3000); }
      });
    }, 0);

  } else if (sub === "alerts") {
    body.innerHTML = `<div class="settings-section"><div class="info-card"><div class="info-card-icon">🔔</div><div class="info-card-content"><h4 class="info-card-title">알림 설정</h4><p class="info-card-desc">ROAS 임계값 하락, 예산 초과, 수집 실패, 전환율 급변동 시 알림을 받을 수 있습니다.</p><p class="info-card-desc" style="margin-top:8px; color: var(--color-text-muted);">알림 채널 (슬랙, 이메일) 연동 후 사용 가능합니다.</p></div></div></div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// SUB-NAV HELPER
// ═══════════════════════════════════════════════════════════════
function updateSubNav(navId, activeSub) {
  const nav = document.getElementById(navId);
  if (!nav) return;
  nav.querySelectorAll(".sub-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.subpage === activeSub);
  });
}

// ═══════════════════════════════════════════════════════════════
// SERVER / API
// ═══════════════════════════════════════════════════════════════
const API = "https://n8n.childylab.com/webhook";

function setStatus(msg, type) {
  const el = document.getElementById("statusBar");
  if (!el) return;
  el.textContent = msg;
  el.className = "status-bar " + (type || "");
  if (type === "success") setTimeout(() => { el.textContent = ""; el.className = "status-bar"; }, 5000);
}

// 수집 상태 UI 업데이트
function updateCollectionStatus() {
  const list = document.getElementById("collectionStatus");
  if (!list) return;
  const items = [
    { name: "네이버SA", key: "naver_sa" },
    { name: "네이버DA (CSV)", key: "naver_da" },
    { name: "메타", key: "meta" },
    { name: "크리테오", key: "criteo" },
  ];
  list.innerHTML = items.map(({ name, key }) => {
    const status = collectionStatus[key];
    let badgeClass, badgeText;
    if (status === "ok") { badgeClass = "ok"; badgeText = "수집 성공"; }
    else if (status === "error") { badgeClass = "error"; badgeText = "수집 실패"; }
    else { badgeClass = "pending"; badgeText = "미수집"; }
    return `<li class="status-item"><span class="status-name">${name}</span><span class="status-badge ${badgeClass}">${badgeText}</span></li>`;
  }).join("");
}

// 매체 → 광고유형 연동
function updateAdTypeOptions() {
  const media = document.getElementById("filterMedia")?.value || "all";
  const adTypeEl = document.getElementById("filterAdType");
  if (!adTypeEl) return;

  let options = '<option value="all">광고유형: 전체</option>';
  if (media === "all") {
    options += '<option value="shopping">쇼핑검색</option><option value="powerlink">파워링크</option><option value="brandsearch">브랜드검색</option><option value="adboost">애드부스트</option>';
  } else if (media === "naver_sa") {
    options += '<option value="shopping">쇼핑검색</option><option value="powerlink">파워링크</option><option value="brandsearch">브랜드검색</option>';
  } else if (media === "naver_da") {
    options += '<option value="adboost">애드부스트</option>';
  }
  // 메타, 크리테오는 하위 항목 없음 → 전체만
  adTypeEl.innerHTML = options;
}

async function loadSAData() {
  const { start, end } = getDateRange();
  const s = start.toISOString().split("T")[0];
  const e = end.toISOString().split("T")[0];

  // 이미 같은 기간 데이터가 있으면 필터만 적용해서 렌더
  if (saData.length > 0 && saData._loadedStart === s && saData._loadedEnd === e) {
    render();
    return;
  }

  showProgress();
  try {
    const res = await fetch(`${API}/naver-sa-campaigns?start=${s}&end=${e}`);
    if (!res.ok) throw new Error("서버 연결 실패");
    const data = await res.json();
    saData = data.map((c) => ({
      id: c.id, name: c.name, type: c.type || "", impressions: c.impressions,
      clicks: c.clicks, cost: c.cost,
      purchaseCount: c.purchaseCount || 0, purchaseAmount: c.purchaseAmount || 0,
      cartCount: c.cartCount || 0, account: "SA",
      daily: (c.daily || []).map(d => ({
        date: d.date, purchaseCount: d.purchaseCount || 0,
        purchaseAmount: d.purchaseAmount || 0, cartCount: d.cartCount || 0,
        cost: d.cost != null ? d.cost : null,
        impressions: d.impressions != null ? d.impressions : null,
        clicks: d.clicks != null ? d.clicks : null
      })),
    }));
    saData._loadedStart = s;
    saData._loadedEnd = e;
    hideProgress();
    collectionStatus.naver_sa = "ok";
    updateCollectionStatus();
    render();
  } catch (err) {
    hideProgress();
    collectionStatus.naver_sa = saData.length > 0 ? "ok" : "error";
    updateCollectionStatus();
    // 데이터가 이미 있으면 필터만 적용
    if (saData.length > 0) {
      render();
      setStatus("기간 변경 실패 — 기존 데이터로 필터 적용됨", "error");
    } else {
      setStatus("SA 데이터 로드 실패 — 서버 연결 확인 필요", "error");
    }
  }
}

function showProgress() {
  let overlay = document.getElementById("loadingOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = '<div class="loading-spinner"></div><p class="loading-text">Loading...</p>';
    document.body.appendChild(overlay);
  }
  overlay.classList.remove("hidden");
}

function hideProgress() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.add("hidden");
}

// ═══════════════════════════════════════════════════════════════
// CSV PARSER
// ═══════════════════════════════════════════════════════════════
function parseNaverDaCsv(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  let header = lines[0].replace(/^\uFEFF/, "");
  const headers = header.split(",");
  const idx = (name) => headers.findIndex((h) => h.trim() === name);
  const iName = idx("캠페인 이름"), iDate = idx("기간"), iCost = idx("총비용");
  const iImpressions = idx("노출수"), iClicks = idx("클릭수");
  const iPurchase = idx("구매완료 수"), iCart = idx("장바구니 담기 수"), iPurchaseAmt = idx("구매완료 전환매출액");
  const campaigns = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;
    const name = cols[iName]?.trim() || "";
    if (!name) continue;
    const toNum = (v) => parseInt((v || "0").replace(/[^0-9.-]/g, "")) || 0;
    const date = cols[iDate]?.trim().replace(/\./g, "-").replace(/-$/, "") || "";
    if (!campaigns[name]) campaigns[name] = { name, account: "DA", impressions: 0, clicks: 0, cost: 0, purchaseCount: 0, purchaseAmount: 0, cartCount: 0, daily: [] };
    const c = campaigns[name];
    const dayCost = toNum(cols[iCost]), dayImps = toNum(cols[iImpressions]), dayClicks = toNum(cols[iClicks]);
    const dayPurchase = toNum(cols[iPurchase]), dayCart = toNum(cols[iCart]), dayPurchaseAmt = toNum(cols[iPurchaseAmt]);
    c.cost += dayCost; c.impressions += dayImps; c.clicks += dayClicks;
    c.purchaseCount += dayPurchase; c.cartCount += dayCart; c.purchaseAmount += dayPurchaseAmt;
    if (date) c.daily.push({ date, cost: dayCost, impressions: dayImps, clicks: dayClicks, purchaseCount: dayPurchase, cartCount: dayCart, purchaseAmount: dayPurchaseAmt });
  }
  Object.values(campaigns).forEach((c) => c.daily.sort((a, b) => a.date.localeCompare(b.date)));
  return Object.values(campaigns);
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS & INIT
// ═══════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  // 비용 설정 로드
  loadCostSettings();

  // Period filter — custom 날짜 표시/숨김만 처리 (자동 리프레시 안함)
  const periodEl = document.getElementById("periodSelect");
  if (periodEl) periodEl.addEventListener("change", (e) => {
    currentPeriod = e.target.value;
    const customEl = document.getElementById("customDates");
    if (customEl) customEl.style.display = currentPeriod === "custom" ? "flex" : "none";
  });

  // 매체 선택 → 광고유형 옵션 연동
  const mediaEl = document.getElementById("filterMedia");
  if (mediaEl) mediaEl.addEventListener("change", updateAdTypeOptions);

  // "조회" 버튼 — 필터 조건 확정 후 데이터 로드 + 렌더
  const btnQuery = document.getElementById("btnQuery");
  if (btnQuery) btnQuery.addEventListener("click", async () => {
    currentPeriod = document.getElementById("periodSelect")?.value || "7d";
    // SA 데이터가 없거나 기간이 바뀌었으면 서버에서 새로 로드
    await loadSAData();
  });

  // DA file input
  const daInput = document.getElementById("daFileInput");
  if (daInput) daInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) processDAFile(file);
    e.target.value = "";
  });

  // "데이터 관리" button on dashboard
  const btnUpload = document.getElementById("btnUploadWrap");
  if (btnUpload) btnUpload.addEventListener("click", () => { window.location.hash = "#data-management/upload"; });

  // 테이블 헤더 정렬 클릭
  document.querySelectorAll("#mainTable th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortCol === col) {
        sortDir = sortDir === "desc" ? "asc" : "desc";
      } else {
        sortCol = col;
        sortDir = th.dataset.type === "str" ? "asc" : "desc";
      }
      renderTable();
    });
  });

  // Chart toggle: ROAS / ROI
  const btnRoas = document.getElementById("btnChartRoas");
  const btnRoi = document.getElementById("btnChartRoi");
  if (btnRoas) btnRoas.addEventListener("click", () => {
    chartMode = "roas";
    btnRoas.classList.add("active"); if (btnRoi) btnRoi.classList.remove("active");
    renderTrendChart();
  });
  if (btnRoi) btnRoi.addEventListener("click", () => {
    chartMode = "roi";
    if (btnRoas) btnRoas.classList.remove("active"); btnRoi.classList.add("active");
    renderTrendChart();
  });

  // Sub-nav click delegation
  document.querySelectorAll(".sub-nav").forEach(nav => {
    nav.addEventListener("click", (e) => {
      const btn = e.target.closest(".sub-nav-btn");
      if (!btn) return;
      const subPage = btn.dataset.subpage;
      if (subPage) { currentSubPage = subPage; window.location.hash = `#${currentPage}/${subPage}`; }
    });
  });

  // Hash routing
  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();
});
