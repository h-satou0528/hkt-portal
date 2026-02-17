let csrfToken = "";

// =============================
// 初期化
// =============================
document.addEventListener("DOMContentLoaded", async () => {
  await fetchCsrf();
  bindUI();
  initDateInputs();
  initAmountFormatting();
  await loadLedgerList();
});

// =============================
// 日付カラムID
// =============================
const dateFields = [
  "reciveday",
  "comp_date1",
  "comp_date2",
  "pub_date",
  "depo_date1",
  "depo_date2",
  "depo_date3",
  "depo_date4"
];

// =============================
// 金額カラムID
// =============================
const amountFields = [
  "p_amount","transport_ex","o_amount","determ_amount",
  "claim","d_amount","bill_amount","deposit_total",
  "bill_transfer","offset_amount","transfer_amount",
  "bill_amount2","cash","check_amount"
];

// =============================
// CSRF取得
// =============================
async function fetchCsrf() {
  const resp = await fetch("/api/csrf-token", { credentials: "include" });
  const data = await resp.json();
  csrfToken = data.csrfToken;
}

// =============================
// UIバインド
// =============================
function bindUI() {
  openFormBtn.onclick = openModalForNew;
  closeBtn.onclick = closeModal;
  saveBtn.onclick = onSave;
  updateBtn.onclick = onUpdate;
  deleteBtn.onclick = onDelete;

  searchInput.addEventListener("input", debounce(loadLedgerList, 300));
  sortSelect.addEventListener("change", loadLedgerList);
}

// =============================
// 日付入力をカレンダー化
// =============================
function initDateInputs() {
  dateFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.type = "date";
  });
}

// =============================
// 金額フォーマット初期化
// =============================
function initAmountFormatting() {
  amountFields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("blur", () => {
      if (!el.value) return;
      const num = parseFloat(el.value.replace(/,/g, ""));
      if (!isNaN(num)) {
        el.value = num.toLocaleString("ja-JP", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        });
      }
    });
  });
}

// =============================
// 日付表示フォーマット
// =============================
function formatDateForDisplay(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}

// date input用
function formatDateForInput(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  return d.toISOString().split("T")[0];
}

// =============================
// モーダル：新規
// =============================
function openModalForNew() {
  orderForm.reset();
  id.value = "";
  saveBtn.classList.remove("hidden");
  updateBtn.classList.add("hidden");
  deleteBtn.classList.add("hidden");
  modal.classList.remove("hidden");
}

// =============================
function closeModal() {
  modal.classList.add("hidden");
}

// =============================
// 一覧取得
// =============================
async function loadLedgerList() {
  const q = searchInput.value;
  const sort = sortSelect.value;

  const params = new URLSearchParams({ q, sort });
  const res = await fetch(`/api/ledger?${params}`, { credentials: "include" });
  const rows = await res.json();

  renderLedgerTable(rows);
}

// =============================
// 一覧描画
// =============================
// --------------------
// 一覧描画（ズレ修正版）
// --------------------
function renderLedgerTable(rows) {
  const tbody = document.querySelector("#orderTable tbody");
  tbody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.dataset.id = r.id;

    const add = (value, key) => {
      const td = document.createElement("td");

      // 日付フォーマット
      if (dateFields.includes(key)) {
        td.textContent = formatDateForDisplay(value);

      // 金額フォーマット
      } else if (amountFields.includes(key)) {
        if (value != null) {
          td.textContent = Number(value).toLocaleString("ja-JP", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          });
        } else {
          td.textContent = "";
        }

      } else {
        td.textContent = value ?? "";
      }

      tr.appendChild(td);
    };

    // ★ 元の固定順をそのまま維持
    add(r.department, "department");
    add(r.kouji_number, "kouji_number");
    add(r.remarks, "remarks");
    add(r.hkt39number, "hkt39number");
    add(r.reciveday, "reciveday");
    add(r.client, "client");
    add(r.construction, "construction");
    add(r.shipnumber, "shipnumber");
    add(r.tec_dep, "tec_dep");
    add(r.incharge, "incharge");
    add(r.comp_date1, "comp_date1");
    add(r.note, "note");
    add(r.p_amount, "p_amount");
    add(r.transport_ex, "transport_ex");
    add(r.o_amount, "o_amount");
    add(r.determ_amount, "determ_amount");
    add(r.comp_date2, "comp_date2");
    add(r.claim, "claim");
    add(r.pub_date, "pub_date");
    add(r.d_amount, "d_amount");
    add(r.bill_amount, "bill_amount");
    add(r.deposit_total, "deposit_total");
    add(r.bill_transfer, "bill_transfer");
    add(r.bank_name, "bank_name");
    add(r.offset_amount, "offset_amount");
    add(r.transfer_amount, "transfer_amount");
    add(r.depo_date1, "depo_date1");
    add(r.bill_amount2, "bill_amount2");
    add(r.depo_date2, "depo_date2");
    add(r.cash, "cash");
    add(r.depo_date3, "depo_date3");
    add(r.check_amount, "check_amount");
    add(r.depo_date4, "depo_date4");

    tr.onclick = () => openModalForEdit(r);
    tbody.appendChild(tr);
  });
}


// =============================
// モーダル：編集
// =============================
function openModalForEdit(r) {
  modal.classList.remove("hidden");

  Object.keys(r).forEach(k => {
    const el = document.getElementById(k);
    if (!el) return;

    if (dateFields.includes(k)) {
      el.value = formatDateForInput(r[k]);
    } else if (amountFields.includes(k) && r[k] != null) {
      el.value = Number(r[k]).toLocaleString("ja-JP", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
    } else {
      el.value = r[k] ?? "";
    }
  });

  saveBtn.classList.add("hidden");
  updateBtn.classList.remove("hidden");
  deleteBtn.classList.remove("hidden");
}

// =============================
// 保存（POST）
// =============================
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
    alert("登録に失敗しました");
    return;
  }

  alert("登録しました");
  closeModal();
  loadLedgerList();
}

// =============================
// 更新（PUT）
// =============================
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
    alert("上書き保存に失敗しました");
    return;
  }

  alert("上書き保存しました");
  closeModal();
  loadLedgerList();
}

// =============================
// 削除
// =============================
async function onDelete() {
  if (!confirm("削除しますか？")) return;

  const res = await fetch(`/api/ledger/${id.value}`, {
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
    credentials: "include"
  });

  if (!res.ok) {
    alert("削除に失敗しました");
    return;
  }

  alert("削除しました");
  closeModal();
  loadLedgerList();
}

// =============================
// フォーム収集（カンマ除去）
// =============================
function collectForm() {
  const data = {};

  document.querySelectorAll("#orderForm input, #orderForm select")
    .forEach(el => {
      let val = el.value;

      if (amountFields.includes(el.id) && val) {
        val = val.replace(/,/g, "");
      }

      data[el.id] = val || null;
    });

  return data;
}

// =============================
function debounce(fn, ms) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}
