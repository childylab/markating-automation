// === 데이터 ===
let saData = [
  { name: "오디너리홀리데이_PC", type: "WEB_SITE", impressions: 304, clicks: 8, cost: 1806, conversions: 0, convValue: 0 },
  { name: "오디너리홀리데이_MO", type: "WEB_SITE", impressions: 7225, clicks: 915, cost: 192598, conversions: 68, convValue: 535350 },
  { name: "ODP스마트스토어_쇼핑검색", type: "SHOPPING", impressions: 432378, clicks: 2143, cost: 590850, conversions: 866, convValue: 46922010 },
  { name: "ODP스마트스토어_쇼핑검색_일반키워드", type: "SHOPPING", impressions: 267906, clicks: 2376, cost: 722152, conversions: 1178, convValue: 60195600 },
  { name: "차일디_브랜드검색", type: "BRAND_SEARCH", impressions: 4054, clicks: 1309, cost: 0, conversions: 383, convValue: 3317300 },
  { name: "유니버셜오버롤_MO_브랜드검색", type: "BRAND_SEARCH", impressions: 108, clicks: 47, cost: 0, conversions: 0, convValue: 0 },
];

let daData = [
  { name: "ODP_ADVoost_26년_상시운영", type: "DISPLAY", impressions: 0, clicks: 0, cost: 0, conversions: 0, convValue: 0, note: "Playwright 연동 후 자동 업데이트" },
];

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

function calcRoas(cost, convValue) {
  if (!cost) return "-";
  return ((convValue / cost) * 100).toFixed(1) + "%";
}

function calcCpc(cost, clicks) {
  if (!clicks) return "-";
  return "₩" + Math.round(cost / clicks).toLocaleString();
}

// === 기간 ===
let currentPeriod = "30";

function getDateRange() {
  const today = new Date();
  let start, end;
  switch (currentPeriod) {
    case "7": end = new Date(today); start = new Date(today); start.setDate(start.getDate() - 6); break;
    case "7ex": end = new Date(today); end.setDate(end.getDate() - 1); start = new Date(end); start.setDate(start.getDate() - 6); break;
    case "30": end = new Date(today); start = new Date(today); start.setDate(start.getDate() - 29); break;
    case "30ex": end = new Date(today); end.setDate(end.getDate() - 1); start = new Date(end); start.setDate(start.getDate() - 29); break;
    case "custom":
      start = document.getElementById("startDate").value ? new Date(document.getElementById("startDate").value) : new Date(today);
      end = document.getElementById("endDate").value ? new Date(document.getElementById("endDate").value) : new Date(today);
      break;
    default: end = new Date(today); start = new Date(today); start.setDate(start.getDate() - 29);
  }
  return { start, end };
}

// === 렌더 ===
function renderKPI() {
  const saCost = saData.reduce((s, c) => s + c.cost, 0);
  const saClicks = saData.reduce((s, c) => s + c.clicks, 0);
  const saConvValue = saData.reduce((s, c) => s + c.convValue, 0);

  const daCost = daData.reduce((s, c) => s + c.cost, 0);
  const daClicks = daData.reduce((s, c) => s + c.clicks, 0);
  const daConvValue = daData.reduce((s, c) => s + c.convValue, 0);

  const totalCost = saCost + daCost;
  const totalConv = saData.reduce((s, c) => s + c.conversions, 0) + daData.reduce((s, c) => s + c.conversions, 0);

  document.getElementById("saCpc").textContent = calcCpc(saCost, saClicks);
  document.getElementById("saRoas").textContent = saCost ? ((saConvValue / saCost) * 100).toFixed(1) + "%" : "-";
  document.getElementById("daCpc").textContent = calcCpc(daCost, daClicks);
  document.getElementById("daRoas").textContent = daCost ? ((daConvValue / daCost) * 100).toFixed(1) + "%" : "-";
  document.getElementById("totalCost").textContent = fmtWon(totalCost);
  document.getElementById("totalConv").textContent = fmt(totalConv);
}

function renderSummary(el, data) {
  const cost = data.reduce((s, c) => s + c.cost, 0);
  const clicks = data.reduce((s, c) => s + c.clicks, 0);
  const imps = data.reduce((s, c) => s + c.impressions, 0);
  const conv = data.reduce((s, c) => s + c.conversions, 0);
  const convVal = data.reduce((s, c) => s + c.convValue, 0);

  el.innerHTML = `
    <div class="summary-item"><span class="summary-label">광고비</span><span class="summary-value">${fmtWon(cost)}</span></div>
    <div class="summary-item"><span class="summary-label">노출</span><span class="summary-value">${fmt(imps)}</span></div>
    <div class="summary-item"><span class="summary-label">클릭</span><span class="summary-value">${fmt(clicks)}</span></div>
    <div class="summary-item"><span class="summary-label">전환</span><span class="summary-value">${fmt(conv)}</span></div>
    <div class="summary-item"><span class="summary-label">전환매출</span><span class="summary-value">${fmtWon(convVal)}</span></div>
  `;
}

function renderTable(tableEl, data) {
  const tbody = tableEl.querySelector("tbody");
  if (!data.length || (data.length === 1 && data[0].cost === 0 && data[0].note)) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">${data[0]?.note || "데이터 없음"}</td></tr>`;
    return;
  }

  const sorted = [...data].sort((a, b) => b.cost - a.cost);
  tbody.innerHTML = sorted.map((c) => {
    const roas = calcRoas(c.cost, c.convValue);
    const roasClass = roas !== "-" && parseFloat(roas) >= 500 ? "roas-high" : "";
    return `
      <tr>
        <td class="campaign-name">${c.name}</td>
        <td class="num">${fmtWon(c.cost)}</td>
        <td class="num">${fmt(c.impressions)}</td>
        <td class="num">${fmt(c.clicks)}</td>
        <td class="num">${fmt(c.conversions)}</td>
        <td class="num ${roasClass}">${roas}</td>
      </tr>
    `;
  }).join("");
}

function render() {
  renderKPI();
  renderSummary(document.getElementById("saSummary"), saData);
  renderSummary(document.getElementById("daSummary"), daData);
  renderTable(document.getElementById("saTable"), saData);
  renderTable(document.getElementById("daTable"), daData);
}

// === 이벤트 ===
document.getElementById("periodSelect").addEventListener("change", (e) => {
  currentPeriod = e.target.value;
  const customEl = document.getElementById("customDates");
  if (currentPeriod === "custom") {
    customEl.classList.remove("hidden");
  } else {
    customEl.classList.add("hidden");
  }
});

document.getElementById("applyDate").addEventListener("click", () => {
  render();
});

// === 서버 연동 ===
const API = "http://localhost:5001";

function setStatus(msg, type = "") {
  const el = document.getElementById("statusBar");
  el.textContent = msg;
  el.className = "status-bar " + type;
  if (type === "success") setTimeout(() => { el.textContent = ""; el.className = "status-bar"; }, 5000);
}

document.getElementById("btnRefreshSA").addEventListener("click", async () => {
  const btn = document.getElementById("btnRefreshSA");
  btn.disabled = true;
  setStatus("SA 데이터를 가져오는 중...");

  const { start, end } = getDateRange();
  const s = start.toISOString().split("T")[0];
  const e = end.toISOString().split("T")[0];

  try {
    const res = await fetch(`${API}/api/sa/campaigns?start=${s}&end=${e}`);
    if (!res.ok) throw new Error("실패");
    const data = await res.json();
    saData = data.map((c) => ({
      name: c.name, type: c.type, impressions: c.impressions,
      clicks: c.clicks, cost: c.cost, conversions: c.conversions, convValue: c.convValue,
    }));
    render();
    setStatus(`SA 갱신 완료 — ${data.length}개 캠페인`, "success");
  } catch (e) {
    setStatus("SA 실패 — 서버(python server.py)가 실행 중인지 확인하세요", "error");
  }
  btn.disabled = false;
});

document.getElementById("btnFetchDA").addEventListener("click", async () => {
  const btn = document.getElementById("btnFetchDA");
  btn.disabled = true;
  setStatus("DA 보고서 다운로드 중... 브라우저가 열릴 수 있어요");

  const { start, end } = getDateRange();
  const s = start.toISOString().split("T")[0];
  const e = end.toISOString().split("T")[0];

  try {
    const res = await fetch(`${API}/api/da/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start: s, end: e }),
    });
    const result = await res.json();

    if (res.status === 401) {
      setStatus("네이버 로그인 필요 — '로그인' 버튼을 먼저 눌러주세요", "error");
    } else if (result.success && result.data) {
      daData = result.data;
      render();
      setStatus(`DA 갱신 완료 — ${result.data.length}개 캠페인`, "success");
    } else {
      setStatus(result.message || "DA 다운로드 실패 — 스크린샷 확인", "error");
    }
  } catch (e) {
    setStatus("서버 연결 실패 — python server.py 실행 필요", "error");
  }
  btn.disabled = false;
});

document.getElementById("btnLoginDA").addEventListener("click", async () => {
  const btn = document.getElementById("btnLoginDA");
  btn.disabled = true;
  setStatus("브라우저가 열립니다. 네이버 로그인을 완료해주세요 (3분)...");

  try {
    const res = await fetch(`${API}/api/da/login`, { method: "POST" });
    const result = await res.json();
    if (result.success) {
      setStatus("로그인 완료! DA 데이터를 불러올 수 있어요", "success");
    } else {
      setStatus(result.message || "로그인 실패", "error");
    }
  } catch (e) {
    setStatus("서버 연결 실패 — python server.py 실행 필요", "error");
  }
  btn.disabled = false;
});

// === 초기 렌더 ===
render();
