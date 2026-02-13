let currentEditingRow = null; // グローバルに宣言


// ==============================
// ✅ CookieからCSRFトークンを取得
// ==============================
function getCsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}


//リストのnullの表示を空欄に処理
  const displayValue = value => value == null ? '' : value;

// 和暦変換（例：2025 → {label: "令和7年", code: "07"}）
function convertToWareki(year) {
  const eras = [
    { name: '令和', start: 2019, code: '07' },
    { name: '平成', start: 1989, code: '06' },
    { name: '昭和', start: 1926, code: '05' },
  ];
  for (let era of eras) {
    if (year >= era.start) {
      const eraYear = year - era.start + 1;
      return { label: `${era.name}${eraYear}年`, code: era.code };
    }
  }
  return { label: '不明', code: '00' };
}

// データ保存
async function saveEntry() {
  const selectedYear = parseInt(document.getElementById("yearSelect").value, 10);
  const era = convertToWareki(selectedYear); // ← ここでeraを取得
  const eraCode = era.code; // ← ここでeraCodeに取得！

  const selectedBandai = document.querySelector('input[name="bandai"]:checked');
  if (!selectedBandai) {
    alert('番台を選択してください');
    return;
  }
  const bandaiRange = selectedBandai.value;
  const [start, end] = bandaiRange.split('-').map(Number);

 
  const title = document.getElementById('title').value.trim();
  const person = document.getElementById('person').value.trim();
  const note = document.getElementById('note').value.trim();
  const order = document.getElementById('order').value.trim();
  const invoice = document.getElementById('invoice').value.trim();
  const performance = document.getElementById('performance').value.trim();
  
  


  // 最新の登録リストをサーバから取得
  const res = await fetch('/api/entries');
  const entries = await res.json();

  const usedNumbers = entries.map(e => parseInt(e.bandai.split('-')[1], 10));

  let newNumber = null;
  for (let i = start; i <= end; i++) {
    if (!usedNumbers.includes(i)) {
      newNumber = i;
      break;
    }
  }
  if (newNumber === null) {
    alert('この番台はすべて使用済みです');
    return;
  }

  const bandai = `${eraCode}-${newNumber}`;

  const saveRes = await fetch('/api/save-entry', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken() // ← 🔒 CSRFトークンを追加！
  },
  credentials: 'include', // ← 🔑 Cookieを送信（セッション維持に必要）
    
  
    
    body: JSON.stringify({
    
      bandai,
      title,
      person,
      note,
      order,
      invoice,
      performance
    })
  });

  // 🔒 締め年度
if (saveRes.status === 403) {
  const err = await saveRes.json();
  alert(err.error);
  throw new Error("fiscal closed");
}

if (!saveRes.ok) {
  throw new Error("save failed");
}

// 成功時のみ
document.getElementById('saveMessage').style.display = 'block';
setTimeout(() => {
  document.getElementById('saveMessage').style.display = 'none';
}, 2000);

clearForm();
loadEntries();
}

// フォームクリア
function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("person").value = "";
  document.getElementById("note").value = "";
  document.getElementById("order").value = "";
  document.getElementById("invoice").value = "";
  document.getElementById("performance").value = "";
}

// 登録一覧読み込み
async function loadEntries() {
  const res = await fetch('/api/entries');
  const entries = await res.json();
  renderEntryList(entries);
}

// 登録一覧描画


//欠番の処理　4.30
function renderEntryList(entries) {

  const list = document.getElementById("entryList");
  list.innerHTML = '';

  entries.forEach(entry => {
    const row = document.createElement("tr");

    // 欠番の表示設定
    if (entry.missing === 1 || entry.missing === true) {
      row.classList.add("strikeout");
    }

    
    
    const bandaiText = (entry.missing === 1 || entry.missing === true)
      ? `${entry.bandai}（欠番）`
      : entry.bandai;
    
// XSS防御のため、innerHTMLに代入する全ての値をsanitize()
  row.innerHTML = `
  <td>${sanitize(bandaiText)}</td>
  <td>${sanitize(displayValue(entry.title))}</td>
  <td>${sanitize(displayValue(entry.person))}</td>
  <td>${sanitize(displayValue(entry.note))}</td>
  <td>${sanitize(displayValue(entry.order))}</td>
  <td>${sanitize(displayValue(entry.invoice))}</td>
  <td>${sanitize(displayValue(entry.performance))}</td>
`;



    row.onclick = () => openEditModal(entry, row); // ← rowも渡すように修正
    list.appendChild(row);
  });
}




//試験はここまで

// 編集モーダルを開く
function openEditModal(entry) {
 
  document.getElementById("editBandai").value = entry.bandai;
  document.getElementById("editBandai").dataset.oldValue = entry.bandai; // ←ここ重要
  document.getElementById("editTitle").value = entry.title;
  document.getElementById("editPerson").value = entry.person;
  document.getElementById("editNote").value = entry.note;
  document.getElementById("editOrder").value = entry.order;
  document.getElementById("editInvoice").value = entry.invoice;
  document.getElementById("editPerformance").value = entry.performance;
  document.getElementById("editModal").style.display = "block";
}

// 編集モーダル閉じる
function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

// 編集を保存
async function saveEdit() {

//試験追加
const newBandai = document.getElementById('editBandai').value;
const oldBandai = document.getElementById('editBandai').dataset.oldValue;


  const bandai = document.getElementById("editBandai").value;
  const title = document.getElementById("editTitle").value;
  const person = document.getElementById("editPerson").value;
  const note = document.getElementById("editNote").value;
  const order = document.getElementById("editOrder").value;
  const invoice = document.getElementById("editInvoice").value;
  const performance = document.getElementById("editPerformance").value;

  fetch('/api/update-entry', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken()
  },
  credentials: 'include',
  body: JSON.stringify({ newBandai, oldBandai, title, person, note, order, invoice, performance })
})
.then(async res => {
  if (res.status === 403) {
    const err = await res.json();
    alert(err.error);
    throw new Error("fiscal closed");
  }

  if (!res.ok) {
    throw new Error("update failed");
  }

  return res.json();
})
.then(data => {
  alert('更新が完了しました');
  loadEntries();
  closeEditModal();
})
.catch(err => {
  console.error(err);
});

}

// バンダイ検索
async function searchEntry() {
  const keyword = document.getElementById("searchBandai").value;
  const res = await fetch(`/api/search-entry?keyword=${encodeURIComponent(keyword)}`);
  const entries = await res.json();
  renderEntryList(entries);
}

// 初期化
window.onload = () => {
  loadEntries();

  document.getElementById("yearSelect").addEventListener("change", (e) => {
    const year = parseInt(e.target.value, 10);
    const era = convertToWareki(year);
    document.getElementById("eraLabel").textContent = era.label;
  });

  // 初期表示
  const initYear = parseInt(document.getElementById("yearSelect").value, 10);
  const era = convertToWareki(initYear);
  document.getElementById("eraLabel").textContent = era.label;
};





function openEditModal(entry, rowElement) {
  currentEditingRow = rowElement;

  // 編集フォームに値をセット
  document.getElementById("editBandai").value = entry.bandai;
  document.getElementById("editBandai").dataset.oldValue = entry.bandai;
  document.getElementById("editTitle").value = entry.title;
  document.getElementById("editPerson").value = entry.person;
  document.getElementById("editNote").value = entry.note;
  document.getElementById("editOrder").value = entry.order;
  document.getElementById("editInvoice").value = entry.invoice;
  document.getElementById("editPerformance").value = entry.performance;

  // モーダルを表示
  document.getElementById("editModal").style.display = "block";
}



function markCurrentEditingRowAsMissing() {
  if (currentEditingRow) {
    markAsMissing(currentEditingRow);
    closeModal();
  }
}



async function markAsMissing(rowElement) {
  if (!rowElement) return;

  const bandaiCell = rowElement.querySelector("td:first-child");
  if (!bandaiCell) return;

  const bandai = bandaiCell.textContent.replace("（欠番）", "").trim();

  // 表示更新
  rowElement.classList.add("strikeout");
  if (!bandaiCell.textContent.includes("（欠番）")) {
    bandaiCell.textContent += "（欠番）";
  }

  // サーバーに送信
  const res = await fetch('/mark-missing', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken()
  },
  credentials: 'include',
  body: JSON.stringify({ bandai })
});

// 🔒 締め年度
if (res.status === 403) {
  const err = await res.json();
  alert(err.error);
  throw new Error("fiscal closed");
}

if (!res.ok) {
  throw new Error("missing failed");
}

// ← 成功してから表示更新（今の設計ならここでOK）
rowElement.classList.add("strikeout");
if (!bandaiCell.textContent.includes("（欠番）")) {
  bandaiCell.textContent += "（欠番）";
}

}



//更に試験追加4.30-1
async function fetchEntries() {
  try {
    const response = await fetch('/api/entries');
    const data = await response.json();

    const listContainer = document.getElementById('entry-list');
    listContainer.innerHTML = ''; // 一度クリア

    data.forEach(entry => {
      const row = document.createElement('div');
      row.textContent = `${entry.bandai}: ${entry.title} / ${entry.person}`;
      listContainer.appendChild(row);
    });
  } catch (err) {
    console.error('一覧取得エラー:', err);
  }
}

function closeEditModal() {
  // モーダルを非表示にする処理
  const modal = document.getElementById("editModal");
  if (modal) {
    modal.style.display = "none";
  } else {
    console.error("editModal が見つかりません");
  }
}

//試験追加5.1-1
  function updateSelectColor(selectId) {
    const select = document.getElementById(selectId);
    const value = select.value;
    if (value === "〇") {
      select.style.backgroundColor = "lightgreen";
    } else if (value === "△") {
      select.style.backgroundColor = "lightyellow";
    } else {
      select.style.backgroundColor = "";
    }
  }

  // 複数のセレクトに適用
  ["order", "invoice", "performance", "editOrder", "editInvoice", "editPerformance"].forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.addEventListener("change", () => updateSelectColor(id));
      // 初期化時にも色を反映
      updateSelectColor(id);
    }
  });



  //モーダル登録用
  function openRegisterModal() {
    document.getElementById("registerModal").style.display = "block";
  }
  
  function closeRegisterModal() {
    document.getElementById("registerModal").style.display = "none";
  }
  
  window.onclick = function(event) {
    const modal = document.getElementById("registerModal");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  }
  
  // 登録モーダル閉じる
function outModal() {
  document.getElementById("registerModal").style.display = "none";
}

//ｓｑｌから番台リストの取得
// SQLから番台リストの取得
function showBandaiList() {
  const selectedBandai = document.querySelector('input[name="bandai"]:checked')?.value;
  if (!selectedBandai) {
    alert("番台を選択してください。");
    return;
  }

  // 例: "2001-2049" → ["2001", "2049"]
  const [from, to] = selectedBandai.split("-");
  const warekiCode = "07-";

  // 正しくエンコードされたURLを生成
  const params = new URLSearchParams({
    prefix: warekiCode,
    from: from,
    to: to
  });

  // paramsを使ってfetch送信
  fetch(`/getBandaiList?${params.toString()}`)
    .then(response => {
    console.log("HTTP status:", response.status);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log("受け取ったデータ:", data); // これを追加
      populateBandaiModal(data);
      openBandaiModal();
    })
    .catch(error => {
      console.error("データ取得失敗:", error);
      alert("データの取得に失敗しました");
    });
}



//sqlからの番台リストを中に入れる
function openBandaiModal() {
  const modal = document.getElementById("bandaiModal");
  if (modal) {
    modal.style.display = "block";
  }
}

function closeBandaiModal() {
  const modal = document.getElementById("bandaiModal");
  if (modal) {
    modal.style.display = "none";
  }
}


function populateBandaiModal(data) {
  const modalBody = document.getElementById("bandaiModalBody");
  if (!modalBody) return;

  // ヘッダー行作成
  let html = `
    <table border="1" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th>工作番号</th><th>件名</th><th>担当者</th><th>摘要</th><th>工事命令書</th><th>請求書</th><th>実績表</th>
        </tr>
      </thead>
      <tbody>
  `;

  // 各データ行をループして追加
  data.forEach(entry => {
  html += `
    <tr>
      <td>${sanitize(entry.bandai)}</td>
      <td>${sanitize(entry.title || '')}</td>
      <td>${sanitize(entry.person || '')}</td>
      <td>${sanitize(entry.note || '')}</td>
      <td>${sanitize(entry.order || '')}</td>
      <td>${sanitize(entry.invoice || '')}</td>
      <td>${sanitize(entry.performance || '')}</td>
    </tr>
  `;
});


  html += `
      </tbody>
    </table>
  `;

  modalBody.innerHTML = html;
}


function openBandaiModal() {
  const modal = document.getElementById("bandaiModal");
  if (modal) {
    modal.style.display = "block";
  }
}

//枝番号のモーダルを開く（元番号をセット）
function openBranchModal() {
  document.getElementById("baseBandaiInput").value = '';
  document.getElementById("branchTitle").value = '';
  document.getElementById("branchPerson").value = '';
  document.getElementById("branchNote").value = '';
  document.getElementById("branchModal").style.display = "block";
}


// モーダルを閉じる
function closeBranchModal() {
  document.getElementById("branchModal").style.display = "none";
}

// 枝番号保存処理
async function saveBranchEntry() {
  const baseBandai = document.getElementById("baseBandaiInput").value;
  const title = document.getElementById("branchTitle").value;
  const person = document.getElementById("branchPerson").value;
  const note = document.getElementById("branchNote").value;

  try {
    const response = await fetch("/save-sub-entry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": getCsrfToken(), // 🔒
      },
      credentials: "include", // 🔑
      body: JSON.stringify({ baseBandai, title, person, note }),
    });

    // 🔒 締め年度
    if (response.status === 403) {
      const err = await response.json();
      alert(err.error || "この年度は締められているため操作できません");
      return;
    }

    if (!response.ok) {
      throw new Error("branch save failed");
    }

    const data = await response.json();

    if (data.success) {
      alert("枝番号を追加しました"); // ✅ 追加
      await loadEntries();
      closeBranchModal();
    } else {
      alert("枝番号の追加に失敗しました");
    }
  } catch (err) {
    console.error("枝番号保存エラー:", err);
    alert("枝番号登録中にエラーが発生しました");
  }
}


// （中略）既存コードはそのままでOK


// --- 👇 ここから下を差し替え（543行目以降を全て置き換え） ---

// 枝番号リスト描画を統合した loadEntries
async function loadEntries() {
  try {
    const res = await fetch('/api/entries');
    const entries = await res.json();

    // 表示順を調整（枝番号を親の下に）
    entries.sort((a, b) => {
      const parse = bandai => {
        const parts = bandai.split('-');
        return {
          era: parseInt(parts[0]),
          number: parseInt(parts[1]),
          branch: parts[2] ? parseInt(parts[2]) : 0
        };
      };
      const A = parse(a.bandai);
      const B = parse(b.bandai);
      return A.era - B.era || A.number - B.number || A.branch - B.branch;
    });

    // DOMへの描画（テーブル側とdiv側の両方対応）
    renderEntryList(entries); // 既存のテーブル描画関数を再利用

    // 追加：枝番号登録ボタン付きリスト描画
    const listContainer = document.getElementById("entry-list");
    if (listContainer) {
      listContainer.innerHTML = "";
      entries.forEach(entry => {
        const row = document.createElement("div");
        row.textContent = entry.bandai + " - " + entry.title;

        // 枝番号登録ボタンを表示（枝番号が付いていない行のみ）
        if (!entry.bandai.includes('-') || entry.bandai.match(/-\d+$/) === null) {
          const button = document.createElement("button");
          button.textContent = "枝番号登録";
          button.onclick = () => openBranchModal(entry.bandai);
          row.appendChild(button);
        }

        listContainer.appendChild(row);
      });
    }

  } catch (err) {
    console.error("工番リストの取得エラー:", err);
  }
}


// 🟢 ページ読み込み時に実行
window.addEventListener("DOMContentLoaded", () => {
  loadEntries();

  const yearSelect = document.getElementById("yearSelect");
  if (yearSelect) {
    yearSelect.addEventListener("change", e => {
      const year = parseInt(e.target.value, 10);
      const era = convertToWareki(year);
      document.getElementById("eraLabel").textContent = era.label;
    });

    // 初期表示
    const initYear = parseInt(yearSelect.value, 10);
    const era = convertToWareki(initYear);
    document.getElementById("eraLabel").textContent = era.label;
  }
});
























//CSPエラー回避
document.addEventListener("DOMContentLoaded", () => {
  // 全ての「工事番号登録」ボタンを取得
  const registerButtons = document.querySelectorAll(".openRegisterBtn");

  // それぞれのボタンにクリックイベントを追加
  registerButtons.forEach(button => {
    button.addEventListener("click", openRegisterModal);
  });



   // 2️⃣ 番台リスト表示ボタン（2か所対応）
  document.querySelectorAll(".showBandaiListBtn").forEach(btn => {
    btn.addEventListener("click", showBandaiList);
  });

  // 3️⃣ 枝番号登録ボタン（2か所対応）
  document.querySelectorAll(".openBranchModalBtn").forEach(btn => {
    btn.addEventListener("click", openBranchModal);
  });

  // 保存ボタン・閉じるボタン
  const saveBtn = document.querySelector("button[onclick='saveEntry()']");
  if (saveBtn) {
    saveBtn.removeAttribute("onclick");
    saveBtn.addEventListener("click", saveEntry);
  }

  const closeBtns = document.querySelectorAll("button[onclick='outModal()'], button[onclick='closeBranchModal()']");
  closeBtns.forEach(btn => {
    btn.removeAttribute("onclick");
    btn.addEventListener("click", e => {
      if (e.target.textContent.includes("閉じる")) {
        outModal();
      } else {
        closeBranchModal();
      }
    });
  });

  // 編集モーダル関連
  const saveEditBtn = document.querySelector("button[onclick='saveEdit()']");
  if (saveEditBtn) {
    saveEditBtn.removeAttribute("onclick");
    saveEditBtn.addEventListener("click", saveEdit);
  }

  const closeModalBtn = document.querySelector("button[onclick='closeModal()']");
  if (closeModalBtn) {
    closeModalBtn.removeAttribute("onclick");
    closeModalBtn.addEventListener("click", closeModal);
  }

  const markMissingBtn = document.querySelector("button[onclick='markCurrentEditingRowAsMissing()']");
  if (markMissingBtn) {
    markMissingBtn.removeAttribute("onclick");
    markMissingBtn.addEventListener("click", markCurrentEditingRowAsMissing);
  }

  const searchBtn = document.querySelector("button[onclick='searchEntry()']");
  if (searchBtn) {
    searchBtn.removeAttribute("onclick");
    searchBtn.addEventListener("click", searchEntry);
  }

  const closeBandaiBtns = document.querySelectorAll("button[onclick='closeBandaiModal()']");
  closeBandaiBtns.forEach(btn => {
    btn.removeAttribute("onclick");
    btn.addEventListener("click", closeBandaiModal);
  });
});


document.addEventListener("DOMContentLoaded", () => {
  // 保存ボタン
  document.querySelectorAll(".saveEntryBtn").forEach(btn => {
    btn.addEventListener("click", saveEntry);
  });

  // 閉じるボタン
  document.querySelectorAll(".outModalBtn").forEach(btn => {
    btn.addEventListener("click", outModal);
  });

  // 読み込みボタン
  document.querySelectorAll(".loadEntriesBtn").forEach(btn => {
    btn.addEventListener("click", loadEntries);
  });
});


document.addEventListener("DOMContentLoaded", () => {
  // 「保存」ボタン
  document.querySelectorAll(".branch-save-btn").forEach(btn => {
    btn.addEventListener("click", saveBranchEntry);
  });

  // 「閉じる」ボタン
  document.querySelectorAll(".branch-close-btn").forEach(btn => {
    btn.addEventListener("click", closeBranchModal);
  });
});


document.addEventListener("DOMContentLoaded", () => {
  // 「閉じる」ボタン（複数箇所に対応）
  document.querySelectorAll(".closeBandaiModalBtn").forEach(btn => {
    btn.addEventListener("click", closeBandaiModal);
  });
});
