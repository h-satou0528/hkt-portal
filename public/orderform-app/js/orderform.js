// script.js 
let csrfToken = '';
document.addEventListener('DOMContentLoaded', async () => {
  await fetchCsrf();
  bindUI();
  await loadList();
  // 👇 ここに「後から追加した機能」を全部集約
  //setupCdSearch();

});

async function fetchCsrf() {
  const resp = await fetch('/api/csrf-token', { credentials: 'include' });
  const data = await resp.json();
  csrfToken = data.csrfToken;
}

//cd検索用
// orderform.js の一番上
//function setupCdSearch() {
//  const btn = document.getElementById("searchByCdBtn");
//  if (!btn) return;

//  btn.addEventListener("click", () => {
//    loadList();   // ← ここ重要
//  });
//}








// 整数（小数なし）にする
function fmtInt(v) {
  if (v === null || v === undefined || v === "") return "";
  return Math.round(parseFloat(v)).toString();
}

// 小数 1 桁にフォーマット
function fmt1(v) {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toFixed(1);
}




function bindUI() {
  document.getElementById('openFormBtn').addEventListener('click', openModalForNew);
  document.getElementById('closeBtn').addEventListener('click', closeModal);
  document.getElementById('saveBtn').addEventListener('click', onSave);
  document.getElementById('updateBtn').addEventListener('click', onUpdate);
  document.getElementById('deleteBtn').addEventListener('click', onDelete);

  // ★↓↓↓↓ ここ追加 ↓↓↓↓
  document.getElementById("searchByCdBtn")
    .addEventListener("click", loadList);
  // ★↑↑↑↑ ここ追加 ↑↑↑↑

  document.getElementById('supplier').addEventListener('input', e => {
    const value = e.target.value;
    if (value && value.includes('在庫')) document.getElementById('category').value = '出庫';
  });


  document.getElementById('supplier').addEventListener('input', e => {
    const value = e.target.value;
    if (value && value.includes('在庫')) document.getElementById('category').value = '出庫';
  });
  document.getElementById('kouji_number').addEventListener('input', e => {
    const value = e.target.value;
    if (value && value.includes('在庫')) document.getElementById('category').value = '入庫';
  });



 document.getElementById('delivery_date').addEventListener('change', e => {
  const v = e.target.value.trim(); // expecting yy/mm/dd
  const parts = v.split('/');
  if (parts.length >= 2) {
    const yyLastDigit = parts[0].slice(-1);        // 年の下1桁
    const mm = parts[1].padStart(2, '0');          // 月を2桁に補正
    document.getElementById('M').value = `${yyLastDigit}${mm}`;
  } else {
    document.getElementById('M').value = '';
  }
});




  document.getElementById('C_select').addEventListener('change', e => {
  // C_text が存在する場合のみセット（将来追加されても安全）
  const el = document.getElementById('C_text');
  if (el) el.value = e.target.value;
});


  document.getElementById('searchInput').addEventListener('input', debounce(() => loadList(), 300));
  document.getElementById('sortSelect').addEventListener('change', () => loadList());
}

function openModalForNew(){
  // reset form
  document.getElementById('orderForm').reset();
  document.getElementById('id').value = '';
  document.getElementById('saveBtn').classList.remove('hidden');
  document.getElementById('updateBtn').classList.add('hidden');
  document.getElementById('deleteBtn').classList.add('hidden');
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal(){
  document.getElementById('modal').classList.add('hidden');
}

async function loadList() {
  const q = document.getElementById("searchInput").value.trim();
  const cd = document.getElementById("cdSelect").value;
  const sort = document.getElementById("sortSelect").value;

  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (cd) params.append("cd", cd);
  if (sort) params.append("sort", sort);

  const resp = await fetch(`/api/orderdata?${params.toString()}`, {
    credentials: "include"
  });
  const rows = await resp.json();
  renderTable(rows);
}




function renderTable(rows) {
  const tbody = document.querySelector('#orderTable tbody');
  tbody.innerHTML = '';

  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.dataset.id = r.id;

    const addCell = (txt) => {
      const td = document.createElement('td');
      td.textContent =
        typeof txt === 'boolean'
          ? (txt ? 'あり' : 'なし')
          : (txt === null || txt === undefined ? '' : String(txt));
      tr.appendChild(td);
    };

    addCell(r.department);
    addCell(r.kouji_number);
    addCell(r.category);
    addCell(r.cd);
    
    addCell(r.supplier);
    addCell(r.orderer);
    addCell(formatDateForView(r.order_date));
    addCell(r.maker);
    addCell(r.product_name);
    addCell(r.model);
    addCell(fmtInt(r.quantity));      // 数量 → 整数
    addCell(r.unit);                  // 単位（そのまま）
    addCell(fmtMoney(r.unit_price));      // 単価 → 小数1桁
    addCell(fmtMoney(r.amount_ex));       // 金額（税抜）→ 小数1桁
    addCell(fmtMoney(r.amount_inc));      // 金額（税込）→ 小数1桁
    addCell(fmtMoney(r.list_price));
    addCell(formatDateForView(r.delivery_date));
    addCell(r.m);
    addCell(r.c);
    addCell(formatDateForView(r.invoice_date));
    addCell(r.notes);

    tr.addEventListener('click', () => openModalForEdit(r));
    tbody.appendChild(tr);
  }
}



function openModalForEdit(row) {
  document.getElementById('modal').classList.remove('hidden');

  function fmt(d) {
    if (!d) return "";
    return d.substring(0, 10).replace(/-/g, "/");
  }

  // 生データをセット（フォーマットしない）
  document.getElementById('id').value = row.id ?? "";
  document.getElementById('department').value = row.department ?? "";
  document.getElementById('kouji_number').value = row.kouji_number ?? "";
  document.getElementById('category').value = row.category ?? "";
  document.getElementById('cd').value = row.cd ?? "";
  
  document.getElementById('supplier').value = row.supplier ?? "";
  document.getElementById('orderer').value = row.orderer ?? "";
  document.getElementById('order_date').value = fmt(row.order_date);
  document.getElementById('maker').value = row.maker ?? "";
  document.getElementById('product_name').value = row.product_name ?? "";
  document.getElementById('model').value = row.model ?? "";

  // ★ 数値は "生のまま" 入れる（fmtInt / fmt1 を使わない）
  document.getElementById('quantity').value = row.quantity ?? "";
  document.getElementById('unit').value = row.unit ?? "";
  document.getElementById('unit_price').value = row.unit_price ?? "";
  document.getElementById('amount_ex').value = row.amount_ex ?? "";
  document.getElementById('amount_inc').value = row.amount_inc ?? "";
  document.getElementById('list_price').value = row.list_price ?? "";

  document.getElementById('delivery_date').value = fmt(row.delivery_date);
  document.getElementById('M').value = row.m ?? "";
  document.getElementById('C_select').value = row.c ?? "";
  document.getElementById('invoice_date').value = fmt(row.invoice_date);
  document.getElementById('notes').value = row.notes ?? "";

  // ボタン切替
  document.getElementById('saveBtn').classList.add('hidden');
  document.getElementById('updateBtn').classList.remove('hidden');
  document.getElementById('deleteBtn').classList.remove('hidden');
  // ★ 新規として登録ボタンを表示
  document.getElementById('cloneSaveBtn').classList.remove('hidden');
  // ✅ 追加：税計算のリセット
  resetTaxCalculation();
}

//リストから呼出しクローンを新規登録にする
document.getElementById('cloneSaveBtn').addEventListener('click', () => {
  // ★ IDを消す → 新規扱いになる
  document.getElementById('id').value = "";

  // ★ 既存の「登録（POST）」処理をそのまま使う
  onSave(); // ← saveBtn が使っている関数
});


async function onSave() {
  const payload = collectForm();

  if (!payload.kouji_number) return alert("工事番号は必須です");
  if (!payload.department) return alert("部門は必須です");

  payload.order_date = formatDateForSQL(payload.order_date);
  payload.delivery_date = formatDateForSQL(payload.delivery_date);
  payload.invoice_date = formatDateForSQL(payload.invoice_date);

  try {
    const resp = await fetch('/api/orderdata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    // 🔒 締め年度（ここが核心）
    if (resp.status === 403) {
      const err = await resp.json();
      alert(err.error);
      return;
    }

    if (!resp.ok) {
      alert("登録に失敗しました");
      return;
    }

    alert("登録しました");
    closeModal();
    loadList();

  } catch (err) {
    console.error(err);
    alert("登録に失敗しました");
  }
}



async function onUpdate() {
  const id = document.getElementById('id').value;
  const payload = collectForm();

  payload.order_date = formatDateForSQL(payload.order_date);
  payload.delivery_date = formatDateForSQL(payload.delivery_date);
  payload.invoice_date = formatDateForSQL(payload.invoice_date);

  try {
    const resp = await fetch(`/api/orderdata/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    // 🔒 締め年度
    if (resp.status === 403) {
      const err = await resp.json();
      alert(err.error);
      return;
    }

    if (!resp.ok) {
      alert("上書きに失敗しました");
      return;
    }

    alert("上書きしました");
    closeModal();
    loadList();

  } catch (err) {
    console.error(err);
    alert("上書きに失敗しました");
  }
}

async function onDelete() {
  const id = document.getElementById('id').value;
  if (!confirm("削除してよろしいですか？")) return;

  try {
    const resp = await fetch(`/api/orderdata/${id}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include'
    });

    // 🔒 締め年度
    if (resp.status === 403) {
      const err = await resp.json();
      alert(err.error);
      return;
    }

    if (!resp.ok) {
      alert("削除に失敗しました");
      return;
    }

    alert("削除しました");
    closeModal();
    loadList();

  } catch (err) {
    console.error(err);
    alert("削除に失敗しました");
  }
}





function collectForm() {
  function valOrNull(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const v = el.value.trim();
    return v === '' ? null : v;
  }

  function numStrOrNull(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    let v = el.value.trim();
    if (v === '') return null;
    // カンマを除去して文字列で返す
    v = v.replace(/,/g, '');
    return v;
  }

  return {
    department: valOrNull('department'),
    kouji_number: valOrNull('kouji_number'),
    category: valOrNull('category'),
    cd: valOrNull('cd'),
    
    supplier: valOrNull('supplier'),
    orderer: valOrNull('orderer'),
    order_date: valOrNull('order_date'),
    maker: valOrNull('maker'),
    product_name: valOrNull('product_name'),
    model: valOrNull('model'),
    quantity: numStrOrNull('quantity'),      // ← カンマ削除
    unit: valOrNull('unit'),
    unit_price: numStrOrNull('unit_price'),  // ← カンマ削除
    amount_ex: numStrOrNull('amount_ex'),
    amount_inc: numStrOrNull('amount_inc'),
    list_price: numStrOrNull('list_price'),
    delivery_date: valOrNull('delivery_date'),
    M: valOrNull('M'),
    C: valOrNull('C_select'),
    invoice_date: valOrNull('invoice_date'),
    notes: valOrNull('notes')
  };
}






// simple debounce
function debounce(fn, ms){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

//モーダル内カンマを付ける（3桁区切り）
function formatNumber(num) {
  if (num === "" || num == null || isNaN(num)) return "";
  return Number(num).toLocaleString('ja-JP');
}

// カンマを外す（内部計算用）
function unformatNumber(str) {
  return Number(str.replace(/,/g, ""));
}

//単価（unit_price）
const unitPriceInput = document.getElementById("unit_price");

// 入力中：カンマを消して通常入力
unitPriceInput.addEventListener("input", () => {
  let raw = unitPriceInput.value.replace(/,/g, "");
  if (!isNaN(raw)) {
    unitPriceInput.value = raw;
  }
  calculateAmount();
});

// フォーカス外れた時にカンマ付け
unitPriceInput.addEventListener("blur", () => {
  unitPriceInput.value = formatNumber(unitPriceInput.value);
});

//定価（list_price）
const listPriceInput = document.getElementById("list_price");

listPriceInput.addEventListener("input", () => {
  let raw = listPriceInput.value.replace(/,/g, "");
  if (!isNaN(raw)) {
    listPriceInput.value = raw;
  }
});

listPriceInput.addEventListener("blur", () => {
  listPriceInput.value = formatNumber(listPriceInput.value);
});


//数量 × 単価 → 税抜 → 税込 計算
document.getElementById("quantity").addEventListener("input", calculateAmount);
document.getElementById("unit_price").addEventListener("input", calculateAmount);

function calculateAmount() {
  const quantity = unformatNumber(document.getElementById("quantity").value || "0");
  const unitPrice = unformatNumber(document.getElementById("unit_price").value || "0");

  const amountEx = quantity * unitPrice;
  const amountInc = Math.floor(amountEx * 1.1);

  document.getElementById("amount_ex").value = formatNumber(amountEx);
  document.getElementById("amount_inc").value = formatNumber(amountInc);
}


function formatDateForView(dateStr) {
  if (!dateStr) return "";

  // ISO形式(yyyy-mm-ddT...) のとき先頭10文字だけ使う
  const d = dateStr.substring(0, 10);   // yyyy-mm-dd

  return d.replace(/-/g, "/");          // yyyy/mm/dd に変換
}


// 任意の入力（ISO、yyyy-mm-dd、yyyy/mm/dd、yyyy-mm-ddT...）に対応して
// 表示用に "yy/mm/dd" を返す（例: 2025-12-05 -> "25/12/05"）
function formatDateForView(dateInput) {
  if (!dateInput) return "";

  // 文字列化
  const s = String(dateInput);

  // ISO の先頭10文字 (yyyy-mm-dd) を抽出できれば使う
  let ymd;
  if (s.includes("T")) {
    ymd = s.substring(0, 10); // yyyy-mm-dd
  } else if (s.includes("-")) {
    // yyyy-mm-dd
    ymd = s.split(" ")[0];
  } else if (s.includes("/")) {
    // 既に yyyy/mm/dd か yy/mm/dd の可能性 -> normalize to parts
    const p = s.split("/");
    if (p.length === 3) {
      // if first part is 4-digit year, keep; else assume it's already yy
      const year = p[0].length === 4 ? p[0] : ('20' + p[0]); // normalize to yyyy
      return `${String(year).slice(-2)}/${p[1].padStart(2,'0')}/${p[2].padStart(2,'0')}`;
    }
    return s;
  } else {
    return s;
  }

  const parts = ymd.split("-");
  if (parts.length !== 3) return "";
  const yyyy = parts[0];
  const mm = parts[1].padStart(2, "0");
  const dd = parts[2].padStart(2, "0");
  return `${String(yyyy).slice(-2)}/${mm}/${dd}`;
}


// 表示された値（yy/mm/dd または yyyy/mm/dd）を DB 用の yyyy-mm-dd に変換
function formatDateForSQL(displayDate) {
  if (!displayDate) return null;
  const s = String(displayDate).trim();
  const parts = s.split("/");
  if (parts.length !== 3) return null;

  let y = parts[0];
  const m = parts[1].padStart(2, "0");
  const d = parts[2].padStart(2, "0");

  // yy -> 20yy（例: 25 -> 2025）。必要ならロジックを拡張。
  if (y.length === 2) {
    y = "20" + y;
  } else if (y.length === 4) {
    // keep
  } else {
    return null;
  }

  return `${y}-${m}-${d}`; // yyyy-mm-dd
}

//金額表示（3桁カンマ, 小数点2桁）
function fmtMoney(v) {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toLocaleString("ja-JP", { minimumFractionDigits: 1 });
}



//モーダル開閉
// ---------- summaryModal: 開閉・表示処理（統一版） ----------

// （前の重複定義・古い style.display 操作・重複イベント登録はすべて置き換えてください）

// open: .hidden クラスを外す（モーダル表示）
function openSummaryModal() {
  const modal = document.getElementById("summaryModal");
  if (!modal) return;
  modal.classList.remove("hidden");
}

// close: .hidden クラスを付ける（モーダル非表示） + リセット処理
function closeSummaryModal() {
  const modal = document.getElementById("summaryModal");
  if (modal) modal.classList.add("hidden");

  // 工事番号入力欄のリセット
  const input = document.getElementById("summaryKoujiNumber");
  if (input) input.value = "";

  // 小計テーブルのリセット
  const container = document.getElementById("summaryTableContainer");
  if (container) container.innerHTML = "";

  // 内部保持データがあればクリア（任意）
  if (typeof currentSummaryData !== "undefined") currentSummaryData = [];
}

// （イベントリスナはここで1回だけ登録）
// 既存の duplicate addEventListener 行はすべて削除しておいてください。
const closeBtn = document.getElementById("closeSummaryModal");
if (closeBtn) {
  // remove previous listeners if any (defensive)
  closeBtn.replaceWith(closeBtn.cloneNode(true));
  const newCloseBtn = document.getElementById("closeSummaryModal");
  newCloseBtn.addEventListener("click", closeSummaryModal);
}

// -------------------------
// 小計テーブル：モーダル表示（検索ボタン）
// -------------------------

document.getElementById("showSummaryBtn").addEventListener("click", async () => {
  const input = document.getElementById("summaryKoujiNumber");
  const kouji = input.value.trim();

  if (!kouji) {
    alert("工事番号を入力してください");
    return;
  }

  try {
    const res = await fetch(
      `/api/orderdata/summary/${encodeURIComponent(kouji)}`,
      { credentials: "include" }
    );

    if (!res.ok) {
      alert("データ取得に失敗しました");
      return;
    }

    const data = await res.json();

    renderSummaryTable(data);
    openSummaryModal();

  } catch (e) {
    console.error(e);
    alert("通信エラーが発生しました");
  }
});





// ------------------------------------------------------------
//  小計テーブル HTML 生成（Excel 風）
// ------------------------------------------------------------
function generateSummaryTable(items) {

  // 発注先ごとにグループ
  const grouped = {};
  items.forEach(row => {
    const vendor = row.supplier || "不明";
    if (!grouped[vendor]) grouped[vendor] = [];
    grouped[vendor].push(row);
  });

  let html = `
    <table class="summary-table">
      <thead>
        <tr>
          <th>工事番号</th>
          <th>発注者</th>
          <th>発注日</th>
          <th>納品日</th>
          <th>メーカー名</th>
          <th>品名</th>
          <th>形式</th>
          <th>数量</th>
          <th>単位</th>
          <th>単価</th>
          <th>金額（税抜）</th>
          <th>金額（税込）</th>
        </tr>
      </thead>
      <tbody>
  `;

  let koujiTotalEx = 0;
  let koujiTotalIn = 0;

  for (const vendor in grouped) {
    let vendorTotalEx = 0;
    let vendorTotalIn = 0;

    // 発注先タイトル行（グレー背景）
    html += `
      <tr class="subtotal-row">
        <td colspan="12">${vendor}</td>
      </tr>
    `;

    grouped[vendor].forEach(r => {
      const qty = Number(r.quantity) || 0;
      const price = Number(r.unit_price) || 0;

      const amountEx = qty * price;
      const amountIn = Math.round(amountEx * 1.1);

      vendorTotalEx += amountEx;
      vendorTotalIn += amountIn;

      koujiTotalEx += amountEx;
      koujiTotalIn += amountIn;

      html += `
        <tr>
          <td>${r.kouji_number || ""}</td>
          <td>${r.orderer || ""}</td>
          <td>${r.order_date ? r.order_date.substring(0,10) : ""}</td>
          <td>${r.delivery_date ? r.delivery_date.substring(0,10) : ""}</td>
          <td>${r.maker || ""}</td>
          <td>${r.product_name || ""}</td>
          <td>${r.model || ""}</td>
          <td>${qty}</td>
          <td>${r.unit || ""}</td>
          <td>${price.toLocaleString()}</td>
          <td>${amountEx.toLocaleString()}</td>
          <td>${amountIn.toLocaleString()}</td>
        </tr>
      `;
    });

    // 発注先小計
    html += `
      <tr class="subtotal-row">
        <td colspan="10">${vendor} 小計</td>
        <td>${vendorTotalEx.toLocaleString()}</td>
        <td>${vendorTotalIn.toLocaleString()}</td>
      </tr>
    `;
  }

  // 工事番号全体小計
  html += `
    <tr class="subtotal-row">
      <td colspan="10">工事番号 小計</td>
      <td>${koujiTotalEx.toLocaleString()}</td>
      <td>${koujiTotalIn.toLocaleString()}</td>
    </tr>
  `;

  html += `</tbody></table>`;
  return html;
}

//summaryModalの統一
function renderSummaryTable(data) {
  const html = generateSummaryTable(data);
  document.getElementById("summaryTableContainer").innerHTML = html;
}


//オプションの軽減税率、インボイス計算
function calcTax() {
  const qty = Number(document.getElementById("quantity").value) || 0;
  const price =
    Number(document.getElementById("unit_price").value.replace(/,/g, "")) || 0;

  const base = qty * price; // 税抜金額
  const option = document.getElementById("taxOption").value;
  const resultEl = document.getElementById("taxResult");

  if (!option || base === 0) {
    resultEl.value = "";
    return;
  }

  if (option === "reduced") {
    // 軽減税率 8%
    const tax = Math.floor(base * 0.08);
    const total = base + tax;
    resultEl.value = `税込（8%）: ${total.toLocaleString()}円`;
  }

  if (option === "invoice") {
    // ===== インボイス計算（要件通り） =====

    // ① 税抜価格（1円未満切り捨て）
    const taxExcluded = Math.floor(base / 1.1);

    // ② 消費税額
    const tax = base - taxExcluded;

    // ③ 控除額（80%・切り捨て）
    const deductible = Math.floor(tax * 0.8);

    // ✅ 表示は「控除額」だけ
    resultEl.value = `控除額(80%): ${deductible.toLocaleString()}円`;
  }
}


["quantity", "unit_price", "taxOption"].forEach(id => {
  document.getElementById(id).addEventListener("input", calcTax);
  document.getElementById(id).addEventListener("change", calcTax);
});


// ===== インボイス計算（純粋関数）=====
function calcInvoiceTax(amountInc) {
  const inc = Number(amountInc) || 0;
  if (inc === 0) {
    return { ex: 0, tax: 0, deductible: 0 };
  }

  // 税抜（1円未満切り捨て）
  const ex = Math.floor(inc / 1.1);

  // 消費税
  const tax = inc - ex;

  // 控除額（80%・切り捨て）
  const deductible = Math.floor(tax * 0.8);

  return { ex, tax, deductible };
}




function updateInvoiceTax() {
  const amountIncEl = document.getElementById("amount_inc");
  if (!amountIncEl) return;

  const amountInc = amountIncEl.value.replace(/,/g, "");
  const result = calcInvoiceTax(amountInc);

  document.getElementById("invoice_ex").textContent =
    result.ex.toLocaleString();

  document.getElementById("invoice_tax").textContent =
    result.tax.toLocaleString();

  document.getElementById("invoice_deductible").textContent =
    result.deductible.toLocaleString();
}

document.addEventListener("DOMContentLoaded", () => {
  const amountIncEl = document.getElementById("amount_inc");
  if (!amountIncEl) return;

  amountIncEl.addEventListener("input", updateInvoiceTax);
  amountIncEl.addEventListener("change", updateInvoiceTax);
});


//プルダウン、計算結果クリア
function resetTaxCalculation() {
  const taxOption = document.getElementById("taxOption");
  const taxResult = document.getElementById("taxResult");

  if (taxOption) taxOption.value = ""; // プルダウンを初期状態へ
  if (taxResult) taxResult.value = ""; // 計算結果クリア
}

