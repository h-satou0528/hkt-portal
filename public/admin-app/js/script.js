let posts = [];
let selectedIndex = null;
let isEditMode = false;

// ==============================
// CSRFトークン取得（今は未使用）
// ==============================
function getCsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// ==============================
// 管理画面：設定取得
// ==============================
async function fetchSettings() {
  const res = await fetch("/api/admin/settings");
  if (!res.ok) throw new Error("settings取得失敗");
  return res.json();
}

// ==============================
// 表示更新（唯一の関数）
// ==============================
async function renderSettings() {
  const data = await fetchSettings();

  // 現在年度
  document.getElementById("currentYear").textContent =
    data.current_fiscal_year;

  // 状態表示
  document.getElementById("yearStatus").textContent =
    data.fiscal_year_closed ? "🔒 締め済み" : "🟢 編集中";

  // ボタン制御
  document.getElementById("closeYearBtn").disabled =
    data.fiscal_year_closed;

  document.getElementById("openYearBtn").disabled =
    !data.fiscal_year_closed;

  // 年度セレクト生成
  const select = document.getElementById("yearSelect");
  select.innerHTML = "";

  for (
    let y = data.current_fiscal_year - 2;
    y <= data.current_fiscal_year + 2;
    y++
  ) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = `${y}年度`;
    if (y === data.current_fiscal_year) opt.selected = true;
    select.appendChild(opt);
  }
}

// ==============================
// DOM 初期化
// ==============================
document.addEventListener("DOMContentLoaded", () => {

  // 年度切替
  document.getElementById("switchYearBtn").onclick = async () => {
    const year = Number(document.getElementById("yearSelect").value);

    const res = await fetch("/api/admin/fiscal-year/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newYear: year }),
    });

    if (!res.ok) {
      alert("年度切替に失敗しました");
      return;
    }

    alert("年度を切り替えました");
    renderSettings();
  };

  // 年度締め
  document.getElementById("closeYearBtn").onclick = async () => {
    if (!confirm("本当に年度を締めますか？")) return;

    const res = await fetch("/api/admin/close-year", { method: "POST" });
    const result = await res.json();

    if (result.success) {
      alert("年度を締めました");
      renderSettings();
    }
  };

  // 年度解除
  document.getElementById("openYearBtn").onclick = async () => {
    if (!confirm("年度締めを解除しますか？")) return;

    const res = await fetch("/api/admin/open-year", { method: "POST" });
    const result = await res.json();

    if (result.success) {
      alert("年度締めを解除しました");
      renderSettings();
    }
  };

  // 初期表示
  renderSettings().catch(err => alert(err.message));
});
