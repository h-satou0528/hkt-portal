let csrfToken = "";

document.addEventListener("DOMContentLoaded", async () => {
  await fetchCsrf();
  bindUI();
  await loadLedgerList();
});

// --------------------
// CSRF取得
// --------------------
async function fetchCsrf() {
  const resp = await fetch("/api/csrf-token", { credentials: "include" });
  const data = await resp.json();
  csrfToken = data.csrfToken;
}

// --------------------
// UIバインド
// --------------------
function bindUI() {
  openFormBtn.onclick = openModalForNew;
  closeBtn.onclick = closeModal;
  saveBtn.onclick = onSave;
  updateBtn.onclick = onUpdate;
  deleteBtn.onclick = onDelete;

  searchInput.addEventListener("input", debounce(loadLedgerList, 300));
  sortSelect.addEventListener("change", loadLedgerList);
}

// --------------------
// モーダル：新規
// --------------------
function openModalForNew() {
  orderForm.reset();
  id.value = "";
  saveBtn.classList.remove("hidden");
  updateBtn.classList.add("hidden");
  deleteBtn.classList.add("hidden");
  modal.classList.remove("hidden");
}

// --------------------
// モーダル：閉じる
// --------------------
function closeModal() {
  modal.classList.add("hidden");
}

// --------------------
// 一覧取得
// --------------------
async function loadLedgerList() {
  const q = searchInput.value;
  const sort = sortSelect.value;

  const params = new URLSearchParams({ q, sort });
  const res = await fetch(`/api/ledger?${params}`, { credentials: "include" });
  const rows = await res.json();

  renderLedgerTable(rows);
}

// --------------------
// 一覧描画
// --------------------
function renderLedgerTable(rows) {
  const tbody = document.querySelector("#orderTable tbody");
  tbody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.dataset.id = r.id;

    const add = v => {
      const td = document.createElement("td");
      td.textContent = v ?? "";
      tr.appendChild(td);
    };

    add(r.department);
    add(r.kouji_number);
    add(r.remarks);
    add(r.hkt39number);
    add(r.reciveday);
    add(r.client);
    add(r.construction);
    add(r.shipnumber);
    add(r.tec_dep);
    add(r.incharge);
    add(r.comp_date1);
    add(r.note);
    add(r.p_amount);
    add(r.transport_ex);
    add(r.o_amount);
    add(r.determ_amount);
    add(r.comp_date2);
    add(r.claim);
    add(r.pub_date);
    add(r.d_amount);
    add(r.bill_amount);
    add(r.deposit_total);
    add(r.bill_transfer);
    add(r.bank_name);
    add(r.offset_amount);
    add(r.transfer_amount);
    add(r.depo_date1);
    add(r.bill_amount2);
    add(r.depo_date2);
    add(r.cash);
    add(r.depo_date3);
    add(r.check);
    add(r.depo_date4);

    tr.onclick = () => openModalForEdit(r);
    tbody.appendChild(tr);
  });
}

// --------------------
// モーダル：編集
// --------------------
function openModalForEdit(r) {
  modal.classList.remove("hidden");

  Object.keys(r).forEach(k => {
    const el = document.getElementById(k);
    if (el) el.value = r[k] ?? "";
  });

  saveBtn.classList.add("hidden");
  updateBtn.classList.remove("hidden");
  deleteBtn.classList.remove("hidden");
}

// --------------------
// 保存（POST）
// --------------------
async function onSave() {
  const payload = collectForm();

  const res = await fetch("/api/ledger", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    alert("登録エラー: " + err.error);
    return;
  }

  closeModal();
  loadLedgerList();
}

// --------------------
// 更新（PUT）
// --------------------
async function onUpdate() {
  const payload = collectForm();

  const res = await fetch(`/api/ledger/${id.value}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    alert("更新エラー: " + err.error);
    return;
  }

  closeModal();
  loadLedgerList();
}

// --------------------
// 削除（DELETE）
// --------------------
async function onDelete() {
  if (!confirm("削除しますか？")) return;

  const res = await fetch(`/api/ledger/${id.value}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
    credentials: "include"
  });

  if (!res.ok) {
    const err = await res.json();
    alert("削除エラー: " + err.error);
    return;
  }

  closeModal();
  loadLedgerList();
}

// --------------------
// フォーム収集
// --------------------
function collectForm() {
  const data = {};
  document.querySelectorAll("#orderForm input, #orderForm select")
    .forEach(el => data[el.id] = el.value || null);
  return data;
}

// --------------------
// デバウンス
// --------------------
function debounce(fn, ms) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}
