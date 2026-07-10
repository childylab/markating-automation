// === 데이터 ===
let saData = [];

let daData = [];
let daRawData = [];

// === 상태 ===
let currentChannel = "SA";
let currentPeriod = "7d";

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

// DA 원본 데이터 (CSV 파싱 전체, 필터링 전)

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

// === KPI 렌더 ===
function renderKPI() {
  const data = getData();
  const cost = data.reduce((s, c) => s + c.cost, 0);
  const imps = data.reduce((s, c) => s + c.impressions, 0);
  const clicks = data.reduce((s, c) => s + c.clicks, 0);
  const purchase = data.reduce((s, c) => s + (c.purchaseCount || 0), 0);
  const revenue = data.reduce((s, c) => s + (c.purchaseAmount || 0), 0);
  const roas = cost && revenue ? ((revenue / cost) * 100).toFixed(1) + "%" : "-";
  const convRate = clicks && purchase ? ((purchase / clicks) * 100).toFixed(2) + "%" : "-";

  // 새 KPI 카드 ID에 맞춰서 값 설정
  const setKpi = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      const valEl = el.querySelector(".kpi-value");
      if (valEl) valEl.textContent = value;
    }
  };

  setKpi("kpiRoi", "-"); // 실제 ROI는 수수료/원가 반영 후 (미구현)
  setKpi("kpiRoas", roas);
  setKpi("kpiCost", fmtWon(cost));
  setKpi("kpiRevenue", fmtWon(revenue));
  setKpi("kpiPurchase", fmt(purchase) + "건");
  setKpi("kpiConvRate", convRate);
}

// === 테이블 렌더 ===
function renderTable() {
  const data = getData();
  const tbody = document.querySelector("#mainTable tbody");

  // 데이터 없으면 로드 버튼 표시
  if (!data.length) {
    if (currentChannel === "SA") {
      tbody.innerHTML = `<tr><td colspan="11" class="load-cell">
        <button class="btn-load" id="btnLoadData">데이터 로드</button>
        <span class="load-hint">기간을 선택하고 데이터를 불러오세요</span>
      </td></tr>`;
      document.getElementById("btnLoadData").addEventListener("click", loadSAData);
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
    row.style.cursor = "pointer";
    row.addEventListener("click", () => toggleDaily(rowId, c));
    tbody.appendChild(row);

    // 일별 데이터가 이미 있으면 바로 넣기
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
      <td>${d.date}</td>
      <td class="num">${costStr}</td>
      <td class="num">${impStr}</td>
      <td class="num">${clkStr}</td>
      <td class="num">${fmt(d.cartCount || 0)}</td>
      <td class="num">${fmt(d.purchaseCount || 0)}</td>
      <td class="num">${fmtWon(d.purchaseAmount || 0)}</td>
      <td class="num">${roas}</td>
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

  let dailyData = [];

  if (campaign.daily && campaign.daily.length > 0) {
    dailyData = campaign.daily;
  }

  if (dailyData.length === 0) {
    row.querySelector(".daily-cell").innerHTML = '<div class="daily-loading">일별 데이터 없음</div>';
    row.dataset.loaded = "true";
    return;
  }

  row.querySelector(".daily-cell").innerHTML = buildDailyHtml(dailyData);
  row.dataset.loaded = "true";
}

function render() {
  renderKPI();
  renderTable();
}

// === 이벤트 ===

// 기간 필터
document.getElementById("periodSelect").addEventListener("change", (e) => {
  currentPeriod = e.target.value;
  const customEl = document.getElementById("customDates");
  if (customEl) customEl.style.display = currentPeriod === "custom" ? "flex" : "none";
  if (currentPeriod !== "custom") render();
});

const applyBtn = document.getElementById("applyDate");
if (applyBtn) applyBtn.addEventListener("click", render);

// === 서버 연동 ===
const API = "https://n8n.childylab.com/webhook";

function setStatus(msg, type = "") {
  const el = document.getElementById("statusBar");
  el.textContent = msg;
  el.className = "status-bar " + type;
  if (type === "success") setTimeout(() => { el.textContent = ""; el.className = "status-bar"; }, 5000);
}

// 새로고침/데이터 로드 버튼
const refreshBtn = document.getElementById("btnRefresh");
if (refreshBtn) {
  refreshBtn.addEventListener("click", async () => {
    await loadSAData();
  });
}

async function refreshSA() {
  const btn = document.getElementById("btnRefresh");
  btn.disabled = true;
  setStatus("SA 데이터를 가져오는 중...");

  const { start, end } = getDateRange();
  const s = start.toISOString().split("T")[0];
  const e = end.toISOString().split("T")[0];

  try {
    const res = await fetch(`${API}/naver-sa-campaigns?start=${s}&end=${e}`);
    if (!res.ok) throw new Error("실패");
    const data = await res.json();
    saData = data.map((c) => ({
      id: c.id, name: c.name, impressions: c.impressions,
      clicks: c.clicks, cost: c.cost,
      purchaseCount: c.purchaseCount || 0, purchaseAmount: c.purchaseAmount || 0,
      cartCount: c.cartCount || 0, account: "SA",
    }));
    render();
    setStatus(`SA 갱신 완료 — ${data.length}개 캠페인`, "success");
  } catch (e) {
    setStatus("SA 실패 — 서버(python server.py) 실행 필요", "error");
  }
  btn.disabled = false;
}

async function loadSAData() {
  const { start, end } = getDateRange();
  const s = start.toISOString().split("T")[0];
  const e = end.toISOString().split("T")[0];

  // 프로그레스바 표시
  showProgress("캠페인 목록 가져오는 중...", 0);

  try {
    // 1. 캠페인 목록 + 합산 데이터
    const res = await fetch(`${API}/naver-sa-campaigns?start=${s}&end=${e}`);
    if (!res.ok) throw new Error("서버 연결 실패");
    const data = await res.json();

    saData = data.map((c) => ({
      id: c.id, name: c.name, impressions: c.impressions,
      clicks: c.clicks, cost: c.cost,
      purchaseCount: c.purchaseCount || 0, purchaseAmount: c.purchaseAmount || 0,
      cartCount: c.cartCount || 0, account: "SA",
      daily: (c.daily || []).map(d => ({ date: d.date, purchaseCount: d.purchaseCount || 0, purchaseAmount: d.purchaseAmount || 0, cartCount: d.cartCount || 0, cost: d.cost != null ? d.cost : null, impressions: d.impressions != null ? d.impressions : null, clicks: d.clicks != null ? d.clicks : null })),
    }));

    showProgress(`캠페인 ${saData.length}개 로드 완료`, 100);

    hideProgress();
    render();
    setStatus(`SA 데이터 로드 완료 — ${saData.length}개 캠페인, 일별 데이터 포함`, "success");
  } catch (err) {
    hideProgress();
    setStatus("SA 데이터 로드 실패 — 서버(python server.py) 실행 필요", "error");
  }
}

function showProgress(msg, pct) {
  let bar = document.getElementById("progressBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "progressBar";
    bar.className = "progress-bar";
    document.querySelector(".table-section").prepend(bar);
  }
  bar.innerHTML = `
    <div class="progress-text">${msg}</div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
  `;
  bar.classList.remove("hidden");
}

function hideProgress() {
  const bar = document.getElementById("progressBar");
  if (bar) bar.classList.add("hidden");
}

// DA CSV 업로드
const daInput = document.getElementById("daFileInput");
if (daInput) {
  daInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("DA CSV 파일 읽는 중...");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = parseNaverDaCsv(evt.target.result);
        if (parsed.length > 0) {
          daRawData = parsed;
          daData = parsed;
          render();
          setStatus(`DA 데이터 반영 완료 — ${parsed.length}개 캠페인`, "success");
        } else {
          setStatus("CSV에서 데이터를 읽지 못했어요", "error");
        }
      } catch (err) {
        setStatus("CSV 파싱 에러: " + err.message, "error");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  });
}

function parseNaverDaCsv(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  let header = lines[0].replace(/^\uFEFF/, "");
  const headers = header.split(",");

  const idx = (name) => headers.findIndex((h) => h.trim() === name);
  const iName = idx("캠페인 이름");
  const iDate = idx("기간");
  const iCost = idx("총비용");
  const iImpressions = idx("노출수");
  const iClicks = idx("클릭수");
  const iPurchase = idx("구매완료 수");
  const iCart = idx("장바구니 담기 수");
  const iPurchaseAmt = idx("구매완료 전환매출액");

  const campaigns = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;

    const name = cols[iName]?.trim() || "";
    if (!name) continue;

    const toNum = (v) => parseInt((v || "0").replace(/[^0-9.-]/g, "")) || 0;
    const date = cols[iDate]?.trim().replace(/\./g, "-").replace(/-$/, "") || "";

    if (!campaigns[name]) {
      campaigns[name] = {
        name, account: "DA",
        impressions: 0, clicks: 0, cost: 0,
        purchaseCount: 0, purchaseAmount: 0, cartCount: 0,
        daily: [],
      };
    }

    const c = campaigns[name];
    const dayCost = toNum(cols[iCost]);
    const dayImps = toNum(cols[iImpressions]);
    const dayClicks = toNum(cols[iClicks]);
    const dayPurchase = toNum(cols[iPurchase]);
    const dayCart = toNum(cols[iCart]);
    const dayPurchaseAmt = toNum(cols[iPurchaseAmt]);

    c.cost += dayCost;
    c.impressions += dayImps;
    c.clicks += dayClicks;
    c.purchaseCount += dayPurchase;
    c.cartCount += dayCart;
    c.purchaseAmount += dayPurchaseAmt;

    if (date) {
      c.daily.push({ date, cost: dayCost, impressions: dayImps, clicks: dayClicks, purchaseCount: dayPurchase, cartCount: dayCart, purchaseAmount: dayPurchaseAmt });
    }
  }

  Object.values(campaigns).forEach((c) => {
    c.daily.sort((a, b) => b.date.localeCompare(a.date));
  });

  return Object.values(campaigns);
}

// === 초기 렌더 ===
render();
