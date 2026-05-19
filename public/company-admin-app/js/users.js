import { loadCompanyName } from "./common.js";

loadCompanyName();

// ⭐ ここに追加（←ここ！）
let companyId = null;

// 会社情報取得（既存API使う）
async function loadCompanyInfo() {
  const res = await fetch("/api/company", {
    credentials: "include"
  });

  const data = await res.json();
  companyId = data.company_id;
}

const tableBody = document.querySelector("#userTable tbody");

function getRoleOptions(selectedRole) {

  let roles = [

    { value: "admin", label: "管理者" }
  ];

  if (companyId === 5) {
    roles.push(
      { value: "allapp", label: "工番管理" },
      { value: "user", label: "工番参照" },
      { value: "soumu", label: "総務" }
    );
  }

  if (companyId === 6) {
    roles.push(
      { value: "buser", label: "三久一般" },
      );
  }

  return roles.map(r =>
    `<option value="${r.value}" ${r.value === selectedRole ? "selected" : ""}>${r.label}</option>`
  ).join("");
}

function initRoleSelect() {
  const select = document.getElementById("role");
  select.innerHTML = getRoleOptions("user");
}


// =============================
// 一覧取得
// =============================
async function loadUsers() {
  const res = await fetch("/api/users", {
    credentials: "include"
  });

  const users = await res.json();
  tableBody.innerHTML = "";

  users.forEach(u => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${u.id}</td>
      <td><input value="${u.username}" data-id="${u.id}" class="username"></td>
      <td>
        <select data-id="${u.id}" class="role">
          ${getRoleOptions(u.role)}
        </select>
      </td>
      <td>
        <button onclick="updateUser(${u.id})">更新</button>
        <button onclick="deleteUser(${u.id})">削除</button>
      </td>
    `;

    tableBody.appendChild(tr);
    console.log("tableBody:", tableBody);
  });
}

// =============================
// 新規作成
// =============================
async function createUser() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  const res = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ username, password, role })
  });

  if (!res.ok) {
    alert("作成失敗");
    return;
  }
  alert("新規ユーザーを作成しました");
  loadUsers();
}

// =============================
// 更新
// =============================
async function updateUser(id) {
  const username = document.querySelector(`.username[data-id="${id}"]`).value;
  const role = document.querySelector(`.role[data-id="${id}"]`).value;

  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ username, role })
  });

  if (!res.ok) {
    alert("更新失敗");
    return;
  }
  alert("ユーザーの権限を変更しました");

  loadUsers();
}

// =============================
// 削除
// =============================
async function deleteUser(id) {
  if (!confirm("このユーザーを削除しますか？")) return;

  const res = await fetch(`/api/users/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!res.ok) {
    alert("ユーザー削除失敗");
    return;
  }
  alert("ユーザーを削除しました");
  loadUsers();
}

async function init() {
  await loadCompanyInfo();   // ← 先に会社取得
  initRoleSelect();          // ← select生成
  await loadUsers();         // ← 一覧表示
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});

// 一番下に追加
window.createUser = createUser;
window.updateUser = updateUser;
window.deleteUser = deleteUser;