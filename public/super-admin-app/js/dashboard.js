// dashboard.js

document.addEventListener("DOMContentLoaded", async () => {

  await loadCompanies();
  await loadCurrentCompany();

  const select = document.getElementById("companySelect");

  if (select) {
    select.addEventListener("change", async (e) => {

      const company_id = e.target.value;

      await fetch("/api/admin/switch-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ company_id })
      });

      alert("会社を切替しました");

      location.reload();
    });
  }

});


// ==============================
// 会社一覧取得
// ==============================
async function loadCompanies() {
  const res = await fetch("/api/admin/companies", {
    credentials: "include"
  });

  const companies = await res.json();

  const select = document.getElementById("companySelect");
  if (!select) return;

  select.innerHTML = "";

  companies.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}


// ==============================
// 現在の会社表示
// ==============================
async function loadCurrentCompany() {
  const res = await fetch("/api/admin/current-company", {
    credentials: "include"
  });

  const data = await res.json();

  const label = document.getElementById("currentCompany");
  if (label) {
    label.textContent = `選択中の会社：${data.name}`;
  }

  const select = document.getElementById("companySelect");
  if (select) {
    select.value = data.id;
  }
}