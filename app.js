// === 데이터 ===
let saData = [
  { id: "cmp-sa-01", name: "오디너리홀리데이_PC", impressions: 304, clicks: 8, cost: 1806, purchaseCount: 0, purchaseAmount: 0, cartCount: 0, account: "SA" },
  { id: "cmp-sa-02", name: "오디너리홀리데이_MO", impressions: 7225, clicks: 915, cost: 192598, purchaseCount: 5, purchaseAmount: 296850, cartCount: 30, account: "SA" },
  { id: "cmp-sa-03", name: "ODP스마트스토어_쇼핑검색", impressions: 432378, clicks: 2143, cost: 590850, purchaseCount: 39, purchaseAmount: 1281770, cartCount: 280, account: "SA" },
  { id: "cmp-sa-04", name: "ODP스마트스토어_쇼핑검색_일반키워드", impressions: 267906, clicks: 2376, cost: 722152, purchaseCount: 68, purchaseAmount: 2653280, cartCount: 404, account: "SA" },
  { id: "cmp-sa-05", name: "차일디_브랜드검색", impressions: 4054, clicks: 1309, cost: 0, purchaseCount: 0, purchaseAmount: 0, cartCount: 10, account: "SA" },
  { id: "cmp-sa-06", name: "유니버셜오버롤_MO_브랜드검색", impressions: 108, clicks: 47, cost: 0, purchaseCount: 0, purchaseAmount: 0, cartCount: 0, account: "SA" },
];

let daData = [
  { name: "ODP_ADVoost_26년_상시운영", impressions: 0, clicks: 0, cost: 0, purchaseCount: 0, purchaseAmount: 0, cartCount: 0, account: "DA", daily: [], note: "CSV 업로드로 데이터를 반영해주세요" },
];

// === 상태 ===
let currentChannel = "SA";
let currentPeriod = "30";

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

function getData() {
  return currentChannel === "SA" ? saData : daData;
}

// === KPI 렌더 ===
function renderKPI() {
  const data = getData();
  const cost = data.reduce((s, c) => s + c.cost, 0);
  const imps = data.reduce((s, c) => s + c.impressions, 0);
  const clicks = data.reduce((s, c) => s + c.clicks, 0);
  const purchase = data.reduce((s, c) => s + (c.purchaseCount || 0), 0);
  const revenue = data.reduce((s, c) => s + (c.purchaseAmount || 0), 0);
  const ctr = imps ? ((clicks / imps) * 100).toFixed(2) + "%" : "-";
  const roas = cost && revenue ? ((revenue / cost) * 100).toFixed(1) + "%" : "-";
  const cpc = clicks ? "₩" + Math.round(cost / clicks).toLocaleString() : "-";

  document.getElementById("kpiCost").textContent = fmtWon(cost);
  document.getElementById("kpiImpressions").textContent = fmt(imps);
  document.getElementById("kpiClicks").textContent = fmt(clicks);
  document.getElementById("kpiCtr").textContent = ctr;
  document.getElementById("kpiPurchase").textContent = fmt(purchase) + "건";
  document.getElementById("kpiRevenue").textContent = fmtWon(revenue);
  document.getElementById("kpiRoas").textContent = roas;
  document.getElementById("kpiCpc").textContent = cpc;
}

// === 테이블 렌더 ===
function renderTable() {
  const data = getData();
  const tbody = document.querySelector("#mainTable tbody");

  if (!data.length || (data.length === 1 && data[0].cost === 0 && data[0].note)) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">${data[0]?.note || "데이터 없음"}</td></tr>`;
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
    const hasDaily = c.daily && c.daily.length > 0;

    const row = document.createElement("tr");
    row.className = "campaign-row-clickable";
    row.innerHTML = `
      <td class="campaign-name">${hasDaily || currentChannel === "SA" ? "▶ " : ""}${c.name}</td>
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

    const dailyRow = document.createElement("tr");
    dailyRow.id = rowId;
    dailyRow.className = "daily-row hidden";
    dailyRow.innerHTML = `<td colspan="11" class="daily-cell"><div class="daily-loading">로딩 중...</div></td>`;
    tbody.appendChild(dailyRow);
  });
}

async function toggleDaily(rowId, campaign) {
  const row = document.getElementById(rowId);
  if (!row) return;

  if (!row.classList.contains("hidden")) {
    row.classList.add("hidden");
    return;
  }
  row.classList.remove("hidden");

  if (row.dataset.loaded === "true") return;

  let dailyData = [];

  if (currentChannel === "DA" && campaign.daily && campaign.daily.length > 0) {
    dailyData = campaign.daily;
  } else if (currentChannel === "SA" && campaign.id) {
    try {
      const { start, end } = getDateRange();
      const s = start.toISOString().split("T")[0];
      const e = end.toISOString().split("T")[0];
      const res = await fetch(`${API}/api/sa/campaigns/daily?id=${campaign.id}&start=${s}&end=${e}`);
      if (res.ok) dailyData = await res.json();
    } catch (err) {
      row.querySelector(".daily-cell").innerHTML = '<div class="daily-loading">서버 연결 실패</div>';
      return;
    }
  }

  if (dailyData.length === 0) {
    row.querySelector(".daily-cell").innerHTML = '<div class="daily-loading">일별 데이터 없음</div>';
    row.dataset.loaded = "true";
    return;
  }

  let html = `<table class="daily-table">
    <thead><tr>
      <th>날짜</th><th class="num">광고비</th><th class="num">노출</th><th class="num">클릭</th>
      <th class="num">장바구니</th><th class="num">구매</th><th class="num">구매액</th><th class="num">구매ROAS</th>
    </tr></thead><tbody>`;

  dailyData.forEach((d) => {
    const roas = d.cost && d.purchaseAmount ? ((d.purchaseAmount / d.cost) * 100).toFixed(1) + "%" : "-";
    html += `<tr>
      <td>${d.date}</td>
      <td class="num">${fmtWon(d.cost || 0)}</td>
      <td class="num">${fmt(d.impressions || 0)}</td>
      <td class="num">${fmt(d.clicks || 0)}</td>
      <td class="num">${fmt(d.cartCount || 0)}</td>
      <td class="num">${fmt(d.purchaseCount || 0)}</td>
      <td class="num">${fmtWon(d.purchaseAmount || 0)}</td>
      <td class="num">${roas}</td>
    </tr>`;
  });

  html += "</tbody></table>";
  row.querySelector(".daily-cell").innerHTML = html;
  row.dataset.loaded = "true";
}

function render() {
  renderKPI();
  renderTable();

  // SA일 때 업로드 버튼 숨기고, DA일 때 표시
  document.getElementById("btnUploadWrap").classList.toggle("hidden", currentChannel === "SA");
}

// === 이벤트 ===

// 채널 탭
document.querySelectorAll(".channel-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".channel-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentChannel = tab.dataset.channel;
    render();
  });
});

// 기간
document.getElementById("periodSelect").addEventListener("change", (e) => {
  currentPeriod = e.target.value;
  document.getElementById("customDates").classList.toggle("hidden", currentPeriod !== "custom");
});

document.getElementById("applyDate").addEventListener("click", render);

// === 서버 연동 ===
const API = "http://localhost:5001";

function setStatus(msg, type = "") {
  const el = document.getElementById("statusBar");
  el.textContent = msg;
  el.className = "status-bar " + type;
  if (type === "success") setTimeout(() => { el.textContent = ""; el.className = "status-bar"; }, 5000);
}

// 새로고침 버튼
document.getElementById("btnRefresh").addEventListener("click", async () => {
  if (currentChannel === "SA") {
    await refreshSA();
  }
});

async function refreshSA() {
  const btn = document.getElementById("btnRefresh");
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

// DA CSV 업로드
document.getElementById("daFileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setStatus("DA CSV 파일 읽는 중...");
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const parsed = parseNaverDaCsv(evt.target.result);
      if (parsed.length > 0) {
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
