// companies.js
document.addEventListener("DOMContentLoaded", () => {

  let editCompanyId = null;

  const companyNameInput = document.getElementById("companyName");
  const fiscalStartSelect = document.getElementById("fiscalStartMonth");
  const addUpdateBtn = document.getElementById("addUpdateCompanyBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const tableBody = document.querySelector("#companyTable tbody");

  // ==========================
  // 一覧取得
  // ==========================
  async function fetchCompanies() {
    const res = await fetch("/api/admin/companies", {
      credentials: "include"
    });

    if (!res.ok) throw new Error("会社一覧取得失敗");

    return res.json();
  }




  
  // ==========================
  // 描画
  // ==========================
  async function renderCompanies() {
    const companies = await fetchCompanies();

    tableBody.innerHTML = "";

    companies.forEach(c => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.fiscal_start_month}月</td>
        <td>
          <button class="editBtn" data-id="${c.id}" data-name="${c.name}" data-month="${c.fiscal_start_month}">編集</button>
          <button class="deleteBtn" data-id="${c.id}">削除</button>
        </td>
      `;

      tableBody.appendChild(tr);
    });

    // 編集
    document.querySelectorAll(".editBtn").forEach(btn => {
      btn.onclick = () => {
        editCompanyId = btn.dataset.id;
        companyNameInput.value = btn.dataset.name;
        fiscalStartSelect.value = btn.dataset.month;

        addUpdateBtn.textContent = "更新";
        cancelBtn.style.display = "inline-block";
      };
    });

    // 削除
    document.querySelectorAll(".deleteBtn").forEach(btn => {
      btn.onclick = async () => {

        if (!confirm("本当に削除しますか？")) return;

        const res = await fetch(`/api/admin/companies/${btn.dataset.id}`, {
          method: "DELETE",
          credentials: "include"
        });

        if (!res.ok) {
          alert("削除失敗");
          return;
        }

        alert("会社を削除しました");
        renderCompanies();
      };
    });
  }

  // ==========================
  // 追加 / 更新
  // ==========================
  addUpdateBtn.onclick = async () => {

    const name = companyNameInput.value.trim();
    const month = fiscalStartSelect.value;

    if (!name) {
      alert("会社名を入力してください");
      return;
    }

    if (editCompanyId) {
      // 更新
      const res = await fetch(`/api/admin/companies/${editCompanyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          fiscal_start_month: month
        })
      });

      if (!res.ok) {
        alert("更新失敗");
        return;
      }

      alert("会社を更新しました");

      editCompanyId = null;
      addUpdateBtn.textContent = "追加";
      cancelBtn.style.display = "none";

    } else {
      // 追加
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          fiscal_start_month: month
        })
      });

      if (!res.ok) {
        alert("追加失敗");
        return;
      }

      alert("会社を追加しました");
    }

    companyNameInput.value = "";
    fiscalStartSelect.value = "4";

    renderCompanies();
  };

  // ==========================
  // キャンセル
  // ==========================
  cancelBtn.onclick = () => {
    editCompanyId = null;
    companyNameInput.value = "";
    fiscalStartSelect.value = "4";

    addUpdateBtn.textContent = "追加";
    cancelBtn.style.display = "none";
  };

  // 初期表示
  renderCompanies().catch(err => console.error(err));

});