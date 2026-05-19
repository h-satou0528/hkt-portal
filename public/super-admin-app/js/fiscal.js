// fiscal.js（既存管理画面の年度締めコードを使用）
document.addEventListener("DOMContentLoaded", () => {
  async function fetchSettings() {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) throw new Error("settings取得失敗");
    return res.json();
  }

  async function renderSettings() {
    const data = await fetchSettings();
    document.getElementById("currentYear").textContent = data.current_fiscal_year;
    document.getElementById("yearStatus").textContent = data.fiscal_year_closed ? "🔒 締め済み" : "🟢 編集中";
    document.getElementById("closeYearBtn").disabled = data.fiscal_year_closed;
    document.getElementById("openYearBtn").disabled = !data.fiscal_year_closed;

    const select = document.getElementById("yearSelect");
    select.innerHTML = "";
    for (let y = data.current_fiscal_year - 2; y <= data.current_fiscal_year + 2; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = `${y}年度`;
      if (y === data.current_fiscal_year) opt.selected = true;
      select.appendChild(opt);
    }
  }

  document.getElementById("switchYearBtn").onclick = async () => {
    const year = Number(document.getElementById("yearSelect").value);
    const res = await fetch("/api/admin/fiscal-year/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newYear: year }),
    });
    if (!res.ok) return alert("年度切替に失敗しました");
    alert("年度を切り替えました");
    renderSettings();
  };

  document.getElementById("closeYearBtn").onclick = async () => {
    if (!confirm("本当に年度を締めますか？")) return;
    const res = await fetch("/api/admin/close-year", { method: "POST" });
    const result = await res.json();
    if (result.success) alert("年度を締めました");
    renderSettings();
  };

  document.getElementById("openYearBtn").onclick = async () => {
    if (!confirm("年度締めを解除しますか？")) return;
    const res = await fetch("/api/admin/open-year", { method: "POST" });
    const result = await res.json();
    if (result.success) alert("年度締めを解除しました");
    renderSettings();
  };

  // 初期表示
  renderSettings().catch(err => alert(err.message));
});

// =========================
// 現在会社表示
// =========================
async function loadCurrentCompany() {

  const res = await fetch("/api/admin/current-company", {
    credentials: "include"
  });

  if (!res.ok) return;

  const data = await res.json();

  const el = document.getElementById("currentCompanyName");
  if (el) {
    el.textContent = data.name;
  }
}

// 初期表示に追加
loadCurrentCompany();