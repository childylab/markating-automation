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
  if (currentChannel === "SA") return saData;
  return daRawData.length > 0 ? getFilteredDA() : daData;
}

function getAllData() {
  const sa = saData || [];
  const da = daRawData.length > 0 ? getFilteredDA() : (daData || []);
  return [...sa, ...da];
}

// ═══════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════
const PAGE_TITLES = {
  "dashboard": "메인 대시보드",
  "brand-analysis": "브랜드/매체 분석",
  "roi-analysis": "ROI 분석",
  "data-management": "데이터 관리",
  "settings": "설정"
};

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
  const clicks = data.reduce((s, c) => s + c.clicks, 0);
  const purchase = data.reduce((s, c) => s + (c.purchaseCount || 0), 0);
  const revenue = data.reduce((s, c) => s + (c.purchaseAmount || 0), 0);
  const roas = cost && revenue ? ((revenue / cost) * 100).toFixed(1) + "%" : "-";
  const convRate = clicks && purchase ? ((purchase / clicks) * 100).toFixed(2) + "%" : "-";

  const setKpi = (id, value) => {
    const el = document.getElementById(id);
    if (el) { const v = el.querySelector(".kpi-value"); if (v) v.textContent = value; }
  };

  setKpi("kpiRoas", roas);
  setKpi("kpiCost", fmtWon(cost));
  setKpi("kpiRevenue", fmtWon(revenue));
  setKpi("kpiPurchase", purchase ? fmt(purchase) + "건" : "-");
  setKpi("kpiConvRate", convRate);
  setKpi("kpiRoi", "-"); // 수수료/원가 미설정
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
      // ROI는 원가/수수료 미설정이므로 ROAS - 100 으로 근사
      return cost > 0 ? Math.round((revenue / cost) * 100 - 100) : 0;
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
    if (currentChannel === "SA") {
      tbody.innerHTML = `<tr><td colspan="11" class="load-cell">
        <button class="btn-load" id="btnLoadData">데이터 로드</button>
        <span class="load-hint">기간을 선택하고 데이터를 불러오세요</span>
      </td></tr>`;
      const loadBtn = document.getElementById("btnLoadData");
      if (loadBtn) loadBtn.addEventListener("click", loadSAData);
    } else {
      tbody.innerHTML = `<tr><td colspan="11" class="load-cell">
        <span class="load-hint">CSV 파일을 업로드해주세요</span>
      </td></tr>`;
    }
    return;
  }

  const sorted = [...data].sort((a, b) => b.cost - a.cost);
  tbody.innerHTML = "";

  sorted.forEach((c, idx) => {
    const purchaseRoas = c.cost && c.purchaseAmount ? ((c.purchaseAmount / c.cost) * 100).toFixed(1) + "%" : "-";
    const roasClass = purchaseRoas !== "-" && parseFloat(purchaseRoas) >= 300 ? "roas-high" : "";
    const ctr = c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) + "%" : "-";
    const impToPurchase = c.impressions && c.purchaseCount ? ((c.purchaseCount / c.impressions) * 100).toFixed(3) + "%" : "-";
    const clkToPurchase = c.clicks && c.purchaseCount ? ((c.purchaseCount / c.clicks) * 100).toFixed(1) + "%" : "-";
    const rowId = `daily-${currentChannel}-${idx}`;

    const row = document.createElement("tr");
    row.className = "campaign-row-clickable";
    row.innerHTML = `
      <td class="campaign-name"><span class="toggle-icon" id="icon-${rowId}"></span>${c.name}</td>
      <td class="num">${fmtWon(c.cost)}</td>
      <td class="num">${fmt(c.impressions)}</td>
      <td class="num">${fmt(c.clicks)}</td>
      <td class="num">${ctr}</td>
      <td class="num">${fmt(c.cartCount || 0)}</td>
      <td class="num">${fmt(c.purchaseCount || 0)}</td>
      <td class="num">${fmtWon(c.purchaseAmount || 0)}</td>
      <td class="num ${roasClass}">${purchaseRoas}</td>
      <td class="num">${impToPurchase}</td>
      <td class="num">${clkToPurchase}</td>
    `;
    row.addEventListener("click", () => toggleDaily(rowId, c));
    tbody.appendChild(row);

    const dailyRow = document.createElement("tr");
    dailyRow.id = rowId;
    dailyRow.className = "daily-row hidden";
    if (c.daily && c.daily.length > 0) {
      dailyRow.innerHTML = `<td colspan="11" class="daily-cell">${buildDailyHtml(c.daily)}</td>`;
      dailyRow.dataset.loaded = "true";
    } else {
      dailyRow.innerHTML = `<td colspan="11" class="daily-cell"><div class="daily-loading">로딩 중...</div></td>`;
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
  else if (sub === "campaign") body.innerHTML = renderCampaignDetailTable(allData);
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
  const sub = currentSubPage || "upload";
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
        if (statusEl) statusEl.innerHTML = `<p class="upload-success">✓ ${parsed.length}개 캠페인 데이터 반영 완료</p>`;
        setStatus(`DA 데이터 반영 완료 — ${parsed.length}개 캠페인`, "success");
      } else {
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
    body.innerHTML = `<div class="settings-section">
      <h4 class="section-title" style="margin-bottom:16px;">API 연동 설정</h4>
      <div class="settings-card"><div class="settings-card-header"><span class="settings-card-icon">🔗</span><div><strong>n8n Webhook</strong><p class="settings-card-desc">네이버SA 데이터 수집</p></div><span class="status-badge ok">연결됨</span></div>
        <div class="settings-card-body"><label class="settings-label">Webhook URL</label><div class="settings-url-row"><input type="text" class="settings-input" value="https://n8n.childylab.com/webhook" readonly><button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('https://n8n.childylab.com/webhook')">복사</button></div><p class="settings-hint">SA 캠페인 데이터를 가져오는 엔드포인트입니다.</p></div></div>
      <div class="settings-card"><div class="settings-card-header"><span class="settings-card-icon">🛒</span><div><strong>자사몰 연동</strong><p class="settings-card-desc">주문/매출 데이터</p></div><span class="status-badge warn">미설정</span></div>
        <div class="settings-card-body"><p class="settings-hint">자사몰 API를 연동하면 실제 ROI 계산이 가능합니다.</p></div></div>
    </div>`;
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

async function loadSAData() {
  const { start, end } = getDateRange();
  const s = start.toISOString().split("T")[0];
  const e = end.toISOString().split("T")[0];
  showProgress("캠페인 목록 가져오는 중...", 0);
  try {
    const res = await fetch(`${API}/naver-sa-campaigns?start=${s}&end=${e}`);
    if (!res.ok) throw new Error("서버 연결 실패");
    const data = await res.json();
    saData = data.map((c) => ({
      id: c.id, name: c.name, impressions: c.impressions,
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
    showProgress(`캠페인 ${saData.length}개 로드 완료`, 100);
    hideProgress();
    render();
    setStatus(`SA 데이터 로드 완료 — ${saData.length}개 캠페인`, "success");
  } catch (err) {
    hideProgress();
    setStatus("SA 데이터 로드 실패 — 서버 연결 확인 필요", "error");
  }
}

function showProgress(msg, pct) {
  let bar = document.getElementById("progressBar");
  if (!bar) {
    bar = document.createElement("div"); bar.id = "progressBar"; bar.className = "progress-bar";
    const wrap = document.querySelector(".table-wrap");
    if (wrap) wrap.prepend(bar);
  }
  if (bar) { bar.innerHTML = `<div class="progress-text">${msg}</div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>`; bar.classList.remove("hidden"); }
}

function hideProgress() {
  const bar = document.getElementById("progressBar");
  if (bar) bar.classList.add("hidden");
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
  // Period filter
  const periodEl = document.getElementById("periodSelect");
  if (periodEl) periodEl.addEventListener("change", (e) => {
    currentPeriod = e.target.value;
    const customEl = document.getElementById("customDates");
    if (customEl) customEl.style.display = currentPeriod === "custom" ? "flex" : "none";
    if (currentPeriod !== "custom") render();
  });

  const applyBtn = document.getElementById("applyDate");
  if (applyBtn) applyBtn.addEventListener("click", render);

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
