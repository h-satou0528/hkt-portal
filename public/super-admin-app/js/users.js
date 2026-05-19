document.addEventListener("DOMContentLoaded", () => {

  let editUserId = null;

  const nameInput = document.getElementById("userName");
  const emailInput = document.getElementById("userEmail");
  const passInput = document.getElementById("userPassword");
  const companySelect = document.getElementById("userCompany");
  const roleSelect = document.getElementById("userRole");
  const filterSelect = document.getElementById("companyFilter");

  const addBtn = document.getElementById("addUpdateUserBtn");
  const cancelBtn = document.getElementById("cancelEditUserBtn");
  const tableBody = document.querySelector("#userTable tbody");

  // =========================
  // 会社一覧
  // =========================
  async function fetchCompanies() {
    const res = await fetch("/api/admin/companies", { credentials: "include" });
    return res.json();
  }

  async function renderCompanyOptions() {
    const companies = await fetchCompanies();

    companySelect.innerHTML = `<option value="">会社を選択</option>`;
    filterSelect.innerHTML = `<option value="">全て</option>`;

    companies.forEach(c => {
      const opt1 = new Option(c.name, c.id);
      const opt2 = new Option(c.name, c.id);

      companySelect.appendChild(opt1);
      filterSelect.appendChild(opt2);
    });
  }

  // =========================
  // ロールオプション
  // =========================
  function getRoleOptions(companyId, selectedRole) {

  let roles = [
    { value: "admin", label: "会社管理者" }
  ];

  // A社
  if (companyId == 5) {
    roles.push(
      { value: "allapp", label: "工番登録者" },
      { value: "user", label: "工番参照者" },
      { value: "soumu", label: "総務部" }
    );
  }

  // B社
  if (companyId == 6) {
    roles.push(
      { value: "buser", label: "三久一般" }
    );
  }

  return roles.map(r =>
    `<option value="${r.value}" ${r.value === selectedRole ? "selected" : ""}>
      ${r.label}
    </option>`
  ).join("");
}

function updateRoleSelectByCompany() {
  const companyId = companySelect.value;
  roleSelect.innerHTML = getRoleOptions(companyId, "user");
}

companySelect.addEventListener("change", updateRoleSelectByCompany);

updateRoleSelectByCompany();





  // =========================
  // ユーザー一覧
  // =========================
  async function fetchUsers() {
    const res = await fetch("/api/admin/users", { credentials: "include" });
    return res.json();
  }

  async function renderUsers() {
    const users = await fetchUsers();
    const filter = filterSelect.value;

    tableBody.innerHTML = "";

    users
      .filter(u => !filter || u.company_id == filter)
      .forEach(u => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${u.id}</td>
          <td>${u.name}</td>

          <td>${u.company_name}</td>
          <td>
  <select data-id="${u.id}" class="role">
    ${getRoleOptions(u.company_id, u.role)}
  </select>
</td>
          <td>
            <button class="updateBtn" data-id="${u.id}">更新</button>
            <button class="deleteBtn" data-id="${u.id}">削除</button>
          </td>
        `;

        tableBody.appendChild(tr);
      });

    // 更新
    document.querySelectorAll(".updateBtn").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const role = document.querySelector(`.role[data-id="${id}"]`).value;

        await fetch(`/api/admin/users/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role })
        });

        alert("権限を変更しました");
        renderUsers();
      };
    });

    // 削除
    document.querySelectorAll(".deleteBtn").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("削除しますか？")) return;

        await fetch(`/api/admin/users/${btn.dataset.id}`, {
          method: "DELETE"
        });

        alert("削除しました");
        renderUsers();
      };
    });
  }

  // =========================
  // 追加
  // =========================
  addBtn.onclick = async () => {

    const name = nameInput.value.trim();
    //const email = emailInput.value.trim();
    const password = passInput.value;
    const company_id = companySelect.value;
    const role = roleSelect.value;

    if (!name || !password || !company_id) {
      return alert("全て入力してください");
    }

    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password, company_id, role })
    });

    alert("ユーザーを追加しました");

    nameInput.value = "";
    //emailInput.value = "";
    passInput.value = "";
    companySelect.value = "";

    renderUsers();
  };

  // =========================
  // フィルタ
  // =========================
  filterSelect.onchange = renderUsers;

  // 初期
  renderCompanyOptions().then(renderUsers);

});