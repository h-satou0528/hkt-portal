let csrfToken = "";

document.addEventListener("DOMContentLoaded", async () => {
  await fetchCsrf();
  bindUI();
  await loadList();
});

async function fetchCsrf() {
  const resp = await fetch("/api/csrf-token", { credentials: "include" });
  const data = await resp.json();
  csrfToken = data.csrfToken;
}

function bindUI() {
  openFormBtn.onclick = openModalForNew;
  closeBtn.onclick = closeModal;
  saveBtn.onclick = onSave;
  updateBtn.onclick = onUpdate;
  deleteBtn.onclick = onDelete;

  searchInput.addEventListener("input", debounce(loadList, 300));
  sortSelect.addEventListener("change", loadList);
}

function openModalForNew() {
  orderForm.reset();
  id.value = "";
  saveBtn.classList.remove("hidden");
  updateBtn.classList.add("hidden");
  deleteBtn.classList.add("hidden");
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

async function loadList() {
  const q = searchInput.value;
  const sort = sortSelect.value;

  const params = new URLSearchParams({ q, sort });

  const res = await fetch(`/api/ledger?${params}`, { credentials: "include" });
  const rows = await res.json();

  renderTable(rows);
}

function renderTable(rows) {
  const tbody = document.querySelector("#orderTable tbody");
  tbody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");

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
    add(r.comp_edate);
    add(r.p_amount);
    add(r.transport_ex);
    add(r.o_amount);
    add(r.determ_amount);
    add(r.comp_date);
    add(r.claim);
    add(r.d_amount);
    add(r.bill_amount);
    add(r.deposit_total);

    tr.onclick = () => openModalForEdit(r);

    tbody.appendChild(tr);
  });
}

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

async function onSave() {
  const payload = collectForm();

  await fetch("/api/ledger", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  closeModal();
  loadList();
}

async function onUpdate() {
  const payload = collectForm();

  await fetch(`/api/ledger/${id.value}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  closeModal();
  loadList();
}

async function onDelete() {
  if (!confirm("削除しますか？")) return;

  await fetch(`/api/ledger/${id.value}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
    credentials: "include"
  });

  closeModal();
  loadList();
}

function collectForm() {
  const data = {};
  document.querySelectorAll("#orderForm input, #orderForm select")
    .forEach(el => data[el.id] = el.value || null);
  return data;
}

function debounce(fn, ms) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}
