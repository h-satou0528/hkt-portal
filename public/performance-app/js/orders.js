// ==============================
// 工事命令書関連 orders.js
// ==============================

// CSRFトークン取得関数（Cookieから）
function getCsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}



// カンマ付き整形
function formatWithCommaSimple(val) {
  if (val == null || isNaN(val)) return "0";
  return Number(val).toLocaleString('ja-JP');
}
function parseNumberSimple(val) {
  if (!val) return 0;
  return Number(String(val).replace(/,/g, '')) || 0;
}

document.addEventListener("DOMContentLoaded", () => {
  // 金額入力欄のフォーマット・自動計算
  const mitsumoriTaxEx = document.getElementById("mitsumori_taxex");
  const contractTaxEx = document.getElementById("contract_taxex");

  if (mitsumoriTaxEx) {
    mitsumoriTaxEx.addEventListener("input", formatAndCalculate);
  }
  if (contractTaxEx) {
    contractTaxEx.addEventListener("input", formatAndCalculate);
  }
});




function formatAndCalculate() {
  const mitInput = document.getElementById('mitsumori_taxex');
  const conInput = document.getElementById('contract_taxex');
  if (!mitInput || !conInput) return;

  const mitRaw = parseNumberSimple(mitInput.value);
  const conRaw = parseNumberSimple(conInput.value);

  mitInput.value = formatWithCommaSimple(mitRaw);
  conInput.value = formatWithCommaSimple(conRaw);

  const mitTaxIn = Math.round(mitRaw * 1.1);
  const conTaxIn = Math.round(conRaw * 1.1);

  document.getElementById('mitsumori_taxin').textContent = formatWithCommaSimple(mitTaxIn);
  document.getElementById('contract_taxin').textContent = formatWithCommaSimple(conTaxIn);
}

let editingId = null;

// ✅ フォーム入力をまとめる
function getFormData() { 
  const safeDate = (val) => !val || val.trim() === "" ? null : val;

  return {
    department: $("#modalForm select[name='department']").val(),  // ← ★追加
    kouji_number: $("#modalForm input[name='kouji_number']").val(),
    mitsumori_number: $("#modalForm input[name='mitsumori_number']").val(),
    hatchuusha: $("#modalForm input[name='hatchuusha']").val(),
    kouji_supplier: $("#modalForm input[name='kouji_supplier']").val(),
    kouji_kenmei: $("#modalForm input[name='kouji_kenmei']").val(),
    order_date: safeDate($("#modalForm input[name='order_date']").val()),
    expected_date: safeDate($("#modalForm input[name='expected_date']").val()),
    done_date: safeDate($("#modalForm input[name='done_date']").val()),
    mitsumori_taxex: parseNumberSimple($("#modalForm #mitsumori_taxex").val()),
    mitsumori_taxin: parseNumberSimple($("#modalForm #mitsumori_taxin").text()),
    contract_taxex: parseNumberSimple($("#modalForm #contract_taxex").val()),
    contract_taxin: parseNumberSimple($("#modalForm #contract_taxin").text()),
    kaichou: $("#modalForm .approval-table tr:eq(1) td:eq(0) select").val(),
    shachou: $("#modalForm .approval-table tr:eq(1) td:eq(1) select").val(),
    torishimariyaku: $("#modalForm .approval-table tr:eq(1) td:eq(2) select").val(),
    soumu: $("#modalForm .approval-table tr:eq(1) td:eq(3) select").val(),
    buchou: $("#modalForm .approval-table tr:eq(1) td:eq(4) select").val(),
    hakkousha: $("#modalForm .approval-table tr:eq(1) td:eq(5) select").val(),
    article: $("#article").val()
  };
}


// ==============================
// モーダル・登録処理
// ==============================
$(function () {
  $(".datepicker").datepicker({ dateFormat: 'yy-mm-dd' });

  $("#modalForm").dialog({
    autoOpen: false,
    modal: true,
    width: 600,
    buttons: [
      {
        text: "登録する",
        class: "register-button",
        click: function () {

         // 工事番号を取得
         const koujiNumber = $("#kouji_number").val().trim();

         if (!koujiNumber) {
         alert("工事番号が未記入です");
         return; // 保存処理を中断
        }


        // 大工番
        const department = $("#department").val();
        if (!department) {
        alert("大工番が選択されていません");
        return;
        }
 

          const formData = getFormData();
          $.ajax({
            url: "/api/construction_orders",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(formData),
              headers: { 'X-CSRF-Token': getCsrfToken() }, // ← これを追加！
            success: function () {
              alert("登録しました！");
              $("#modalForm").dialog("close");
              loadOrders();
            },
            error: function (xhr) {
  if (xhr.status === 403) {
    alert(xhr.responseJSON?.error);
    return;
  }
  alert("登録に失敗しました");
}

          });
        }
      },
       {
      text: "閉じる",              // ← 追加
      class: "close-button",       // 必要ならCSSで装飾
      click: function () {
        $(this).dialog("close");
      }
    },{
  text: "上書き保存",
  class: "update-button",
  click: function () {
    const formData = getFormData();

    // 🔽 kouji_number が空なら補完
    if (!formData.kouji_number) {
      const targetOrder = allOrders.find(o => o.id === editingId);
      if (targetOrder) {
        formData.kouji_number = targetOrder.kouji_number;
      }
    }

    console.log("送信するformData:", formData);

    if (!editingId) {
      alert("編集対象が見つかりません");
      return;
    }

    $.ajax({
      url: `/api/construction_orders/${editingId}`,
      type: "PUT",
      contentType: "application/json",
      data: JSON.stringify(formData),
      headers: { 'X-CSRF-Token': getCsrfToken() },

      success: function () {
        alert("更新しました！");
        $("#modalForm").dialog("close");
        loadOrders();
        editingId = null;
      },

      error: function (xhr) {
        // 🔒 締め年度（ここが核心）
        if (xhr.status === 403) {
          alert(xhr.responseJSON?.error);
          return;
        }
        alert("更新に失敗しました");
        console.error(xhr);
      }
    });
  }
},



      {
  text: "工事完了",
  class: "complete-button",
  click: function () {
    if (!editingId) {
      alert("編集対象が見つかりません");
      return;
    }
    if (confirm("この工事を完了にしますか？")) {
      $.ajax({
        url: `/api/construction_orders/${editingId}/completed`,
        type: "PUT",
        headers: { 'X-CSRF-Token': getCsrfToken() },  // ← 🔥 CSRFトークンを追加！
        success: function () {
          alert("工事を完了にしました！");
          $("#modalForm").dialog("close");
          loadOrders();   // リストを再読み込み
        },
        error: function (xhr) {
    if (xhr.status === 403) {
          alert(xhr.responseJSON?.error);
    return; }
          alert("工事完了の更新に失敗しました");
        }
      });
    }
  }
},

 // 👇 工事完了を取り消す（完了フラグ = 1 のときだけ表示）
      {
        text: "工事完了取消し",
        class: "uncomplete-button",
        click: function () {
          if (!editingId) {
            alert("編集対象が見つかりません");
            return;
          }
          if (confirm("この工事の完了を取り消しますか？")) {
            $.ajax({
              url: `/api/construction_orders/${editingId}/uncomplete`,
              type: "PUT",
              headers: { 'X-CSRF-Token': getCsrfToken() },  // ← 🔥 CSRFトークンを追加！
              success: function () {
                alert("工事完了を取り消しました！");
                $("#modalForm").dialog("close");
                loadOrders();
              },
              error: function (xhr) {
  if (xhr.status === 403) {
    alert(xhr.responseJSON?.error);
    return;
  }
                alert("工事完了の取り消しに失敗しました");
              }
            });
          }
        }
      },




      {
        text: "欠番にする",
        class: "cancel-button",
        click: function () {
          if (!editingId) {
            alert("編集対象が見つかりません");
            return;
          }
          if (confirm("本当に欠番にしますか？")) {
            $.ajax({
              url: `/api/construction_orders/${editingId}/missing`,
              type: "PUT",
              headers: { 'X-CSRF-Token': getCsrfToken() },  // ← 🔥 CSRFトークンを追加！
              success: function (data) {
  console.log("欠番成功:", data);
  $("#modalForm").dialog("close");
  loadOrders();  // ← ここでリスト再読み込み
  editingId = null;
},
              error: function (xhr) {
  if (xhr.status === 403) {
    alert(xhr.responseJSON?.error);
    return;
  }
                alert("欠番に失敗しました");
              }
            });
          }
        }
      },

      {
  text: "欠番取消",
  class: "uncancel-button",
  click: function () {
    if (!editingId) {
      alert("編集対象が見つかりません");
      return;
    }
    if (confirm("欠番を取り消しますか？")) {
      $.ajax({
        url: `/api/construction_orders/${editingId}/unmissing`,
        type: "PUT",
        headers: { 'X-CSRF-Token': getCsrfToken() },  // ← 🔥 CSRFトークンを追加！
        success: function (data) {
          console.log("欠番取消成功:", data);
          $("#modalForm").dialog("close");
          loadOrders();
          editingId = null;
        },
        error: function (xhr) {
  if (xhr.status === 403) {
    alert(xhr.responseJSON?.error);
    return;
  }
          alert("欠番取消に失敗しました");
        }
      });
    }
  }
},

  ]
});

  // 新規登録モーダルを開く
  $("#openModal").on("click", function () {
    editingId = null;
    $("#modalForm input").val("");
    $("#modalForm select[name='department']").val("選択必須");
    $(".approval-table select").val("");
    $("#modalForm").dialog("open");

    setTimeout(() => {
      $(".ui-dialog-buttonpane button:contains('登録する')").show();
      $(".ui-dialog-buttonpane button:contains('上書き保存')").hide();
      $(".ui-dialog-buttonpane button:contains('欠番にする')").hide();     // 新規なので非表示
       $(".ui-dialog-buttonpane button:contains('工事完了')").hide();      // 新規なので非表示
      $(".ui-dialog-buttonpane button:contains('工事完了取消し')").hide(); // 新規なので非表示
      $(".ui-dialog-buttonpane button:contains('欠番取消')").hide();       // 新規なので非表示
    }, 10);
  });
});



// ==============================
// 一覧表示 loadOrders
// ==============================
let allOrders = [];

async function loadOrders() {
  console.log("loadOrders 実行開始");

  try {
    const response = await fetch("/api/construction_orders");
    const data = await response.json();
    console.log("GET /api/construction_orders 成功", data.length, "件");

    // 実績表をマージ
    for (let order of data) {
      try {
        const perfRes = await fetch(`/api/performance_sheets/${order.kouji_number}`);
        const perf = await perfRes.json();
        if (perf && Object.keys(perf).length > 0) {
          // 必要な列を order に追加
          order.soumu_down = perf.soumu_down || "";
          order.hakkousha_down = perf.hakkousha_down || "";
          // 必要なら他の列も追加可能
          // order.kaichou_up = perf.kaichou_up || "";
          // order.buchou_down = perf.buchou_down || "";
        }
      } catch (err) {
        console.warn(`実績表取得失敗: ${order.kouji_number}`, err);
      }
    }

    allOrders = data;
    renderOrderTable(allOrders);

  } catch (err) {
    console.error("GET /api/construction_orders エラー:", err);
  }
}


function renderOrderTable(orders) {
  const tbody = document.querySelector("#orderList tbody");
  tbody.innerHTML = "";

  for (const order of orders) {
    const tr = document.createElement("tr");

    if (order.missing === 1) {
      tr.classList.add("canceled");
    }


    if (order.completed === 1) {
    tr.classList.add("completed");   // ← 完了の背景追加
  }

    // 工事命令書 9列
    let koujiNumberCell = order.kouji_number;
if (order.missing === 1) {
  koujiNumberCell += "（欠番）";   // ← 欠番なら文字を追加
}



     // ✅ sanitize()を適用（innerHTMLでも安全）
    tr.innerHTML = `
      <td>${sanitize(order.department || "")}</td>   <!-- 🔥 追加 -->
      <td>${sanitize(koujiNumberCell)}</td>
      <td>${sanitize(order.kouji_supplier || "")}</td>
      <td>${sanitize(order.kouji_kenmei || "")}</td>
      <td>${sanitize(order.kaichou || "")}</td>
      <td>${sanitize(order.shachou || "")}</td>
      <td>${sanitize(order.torishimariyaku || "")}</td>
      <td>${sanitize(order.soumu || "")}</td>
      <td>${sanitize(order.buchou || "")}</td>
      <td>${sanitize(order.hatchuusha || "")}</td>
    `;

    

    // 実績表データを取得して埋める
    appendPerformanceDataToRow($(tr), order.kouji_number);

    // クリック分岐
    tr.addEventListener("click", (e) => {
      const clickedCell = e.target.closest("td");
      if (!clickedCell) return;

      const colIndex = Array.from(tr.children).indexOf(clickedCell);
      if (colIndex < 9) {
        openOrderModal(order);
      } else {
        openPerformanceModal(order.kouji_number);
      }
    });

    tbody.appendChild(tr);




    // 実績表データを取得して埋める
    fetch(`/api/performance_sheets/${order.kouji_number}`)
      .then(r => r.json())
      .then(perf => {
        if (!perf || Object.keys(perf).length === 0) return;

        const tds = tr.querySelectorAll("td");
        let offset = 10;  // 10列目から実績表
         // textContent は自動でエスケープするので安全
        tds[offset].textContent  = perf.kouji_number || "";
        tds[offset+1].textContent  = perf.kaichou_up || "";
        tds[offset+2].textContent  = perf.shachou_up || "";
        tds[offset+3].textContent  = perf.torishimari_up || "";
        tds[offset+4].textContent  = perf.soumu_up || "";
        tds[offset+5].textContent  = perf.buchou_up || "";
        tds[offset+6].textContent  = perf.hakkousha_up || "";
        tds[offset+7].textContent  = perf.kaichou_down || "";
        tds[offset+8].textContent  = perf.shachou_down || "";
        tds[offset+9].textContent  = perf.torishimari_down || "";
        tds[offset+10].textContent = perf.soumu_down || "";
        tds[offset+11].textContent = perf.buchou_down || "";
        tds[offset+12].textContent = perf.hakkousha_down || "";

    // 差戻/完了スタイル
    // ✅ 差戻なら赤
    if (perf.hakkousha_down === "差戻") {
      tds[offset+12].classList.add("status-sashimodoshi");
    }

    // ✅ 完了なら緑
    if (perf.hakkousha_down === "完了") {
      tds[offset+12].classList.add("status-kanryo");
    }


      })
      .catch(err => console.error("実績表取得失敗:", err));

    // ✅ 材料費データを取得して「済み」表示
fetch(`/api/costs/${order.kouji_number}`)
  .then(r => r.json())
  .then(cost => {
    const tds = tr.querySelectorAll("td");
    const costCell = document.createElement("td");

    if (cost && cost.kouji_number) {
      costCell.textContent = "作成済";
      costCell.classList.add("costs-link"); // スタイル用クラス
      costCell.addEventListener("click", (e) => {
        e.stopPropagation(); // tr クリックとバッティングしないように
        openCostsModal(order.kouji_number); // ← モーダルを開く関数を用意する
      });
    } else {
      costCell.textContent = "";
    }

    tr.appendChild(costCell);
  })
  .catch(err => console.error("コストデータ取得失敗:", err));
  }
}



// ==============================
// 検索フィルター
// ==============================
$('#searchInput').on('input', function () {
  const keyword = $(this).val().toLowerCase();
  const filtered = allOrders.filter(order =>
    (order.department || '').toLowerCase().includes(keyword) ||  // 🔥 追加
    (order.kouji_number || '').toLowerCase().includes(keyword) ||
    (order.kouji_kenmei || '').toLowerCase().includes(keyword) ||
    (order.kouji_supplier || '').toLowerCase().includes(keyword) ||
    (order.soumu_down || '').toLowerCase().includes(keyword) ||
    (order.hakkousha_down || '').toLowerCase().includes(keyword)  // ←追加
  );
  renderOrderTable(filtered);
});

$(document).ready(function () {
  console.log("document.ready 実行");
  loadOrders();
});

// ==============================
// 統一フィルターイベント
// ==============================
$('#searchInput').on('input', applyFilters);
$('#departmentFilter').on('change', applyFilters);



// ==============================
// 大工番で表示
// ==============================
function applyFilters() {
  const keyword = $('#searchInput').val().toLowerCase();
  const selectedDepartment = $('#departmentFilter').val();

  const filtered = allOrders.filter(order => {

    const matchesKeyword =
      (order.department || '').toLowerCase().includes(keyword) ||
      (order.kouji_number || '').toLowerCase().includes(keyword) ||
      (order.kouji_kenmei || '').toLowerCase().includes(keyword) ||
      (order.kouji_supplier || '').toLowerCase().includes(keyword) ||
      (order.soumu_down || '').toLowerCase().includes(keyword) ||
      (order.hakkousha_down || '').toLowerCase().includes(keyword);

    const matchesDepartment =
      !selectedDepartment || order.department === selectedDepartment;

    return matchesKeyword && matchesDepartment;
  });

  renderOrderTable(filtered);
}


  // 行をクリックしたらモーダルに値を反映して開く
function openOrderModal(order) {
  if (!order) return;

  console.log("工事命令書モーダルを開く:", order);
   // ★ これを追加
  $("#modalForm select[name='department']").val(order.department || "");
  $("#modalForm input[name='kouji_number']").val(order.kouji_number || "");
  $("#modalForm input[name='mitsumori_number']").val(order.mitsumori_number || "");
  $("#modalForm input[name='hatchuusha']").val(order.hatchuusha || "");
  $("#modalForm input[name='kouji_supplier']").val(order.kouji_supplier || "");
  $("#modalForm input[name='kouji_kenmei']").val(order.kouji_kenmei || "");
  $("#modalForm input[name='order_date']").val(formatDateForInput(order.order_date));
  $("#modalForm input[name='expected_date']").val(formatDateForInput(order.expected_date));
  $("#modalForm input[name='done_date']").val(formatDateForInput(order.done_date));

  // ✅ 金額の表示
  $("#modalForm input[name='mitsumori_taxex']").val(formatWithCommaSimple(order.mitsumori_taxex));
  $("#mitsumori_taxin").text(formatWithCommaSimple(order.mitsumori_taxin));
  $("#modalForm input[name='contract_taxex']").val(formatWithCommaSimple(order.contract_taxex));
  $("#contract_taxin").text(formatWithCommaSimple(order.contract_taxin));

  // ✅ 承認者
  $(".approval-table tr:eq(1) td:eq(0) select").val(order.kaichou);
  $(".approval-table tr:eq(1) td:eq(1) select").val(order.shachou);
  $(".approval-table tr:eq(1) td:eq(2) select").val(order.torishimariyaku);
  $(".approval-table tr:eq(1) td:eq(3) select").val(order.soumu);
  $(".approval-table tr:eq(1) td:eq(4) select").val(order.buchou);
  $(".approval-table tr:eq(1) td:eq(5) select").val(order.hakkousha);
  // ✅ コメントの取得を追加
  $("#modalForm #article").val(order.article || "");

  editingId = order.id;

  // ✅ モーダルを開く
  $("#modalForm").dialog("open");

  // ✅ ボタン切替
  setTimeout(() => {
    $(".ui-dialog-buttonpane button:contains('登録する')").hide();
    $(".ui-dialog-buttonpane button:contains('上書き保存')").show();
    $(".ui-dialog-buttonpane button:contains('欠番にする')").show();   // ← ここ追加（編集では表示）
    $(".ui-dialog-buttonpane button:contains('欠番取消')").hide();
    // 🔽 completed の値に応じてボタンを切替
    if (order.completed === 0) {
      $(".ui-dialog-buttonpane button:contains('工事完了')").show();
      $(".ui-dialog-buttonpane button:contains('工事完了取消し')").hide();
    } else {
      $(".ui-dialog-buttonpane button:contains('工事完了')").hide();
      $(".ui-dialog-buttonpane button:contains('工事完了取消し')").show();
    }

    // 🔽 missing の値に応じてボタンを切替
  if (order.missing === 0) {
    $(".ui-dialog-buttonpane button:contains('欠番にする')").show();
    $(".ui-dialog-buttonpane button:contains('欠番取消')").hide();
  } else {
    $(".ui-dialog-buttonpane button:contains('欠番にする')").hide();
    $(".ui-dialog-buttonpane button:contains('欠番取消')").show();
  }

  }, 10);
}





function formatDateForInput(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}


// ==============================
// 実績表データを行に追加する
// ==============================
async function appendPerformanceDataToRow(tr, kouji_number) {
  try {
    const res = await fetch(`/api/performance_sheets/${kouji_number}`);
    if (!res.ok) return;

    const perf = await res.json();
    const tds = tr.find("td");

    // ⚠️ HTML のカラム構成に合わせてインデックスを調整
    // 例: 工事番号(0)～発行者(8) が工事命令書 → その右が実績表
    let offset = 10;

    tds.eq(offset).text(perf.kouji_number || "");
    tds.eq(offset+1).text(perf.kaichou_up || "");
    tds.eq(offset+2).text(perf.shachou_up || "");
    tds.eq(offset+3).text(perf.torishimariyaku_up || "");
    tds.eq(offset+4).text(perf.soumu_up || "");
    tds.eq(offset+5).text(perf.buchou_up || "");
    tds.eq(offset+6).text(perf.hakkousha_up || "");
    tds.eq(offset+7).text(perf.kaichou_down || "");
    tds.eq(offset+8).text(perf.shachou_down || "");
    tds.eq(offset+9).text(perf.torishimariyaku_down || "");
    tds.eq(offset+10).text(perf.soumu_down || "");
    tds.eq(offset+11).text(perf.buchou_down || "");
    tds.eq(offset+12).text(perf.hakkousha_down || "");

  } catch (err) {
    console.error("appendPerformanceDataToRow エラー:", err);
  }
}


// ==============================
// 行生成 createOrderRow
// ==============================
function createOrderRow(order) {
  const tr = $("<tr></tr>");

  if (order.missing === 1) {
    tr.addClass("canceled");
  }
  // 🔹 大工番（追加）
  tr.append(`<td>${order.department || ""}</td>`);
  // 工事命令書部分（1〜9列）
  tr.append(`<td>${order.kouji_number}</td>`);
  tr.append(`<td>${order.kouji_supplier || ""}</td>`);
  tr.append(`<td>${order.kouji_kenmei || ""}</td>`);
  tr.append(`<td>${order.kaichou || ""}</td>`);
  tr.append(`<td>${order.shachou || ""}</td>`);
  tr.append(`<td>${order.torishimariyaku || ""}</td>`);
  tr.append(`<td>${order.soumu || ""}</td>`);
  tr.append(`<td>${order.buchou || ""}</td>`);
  tr.append(`<td>${order.hakkousha || ""}</td>`);

  // ⚠️ 実績表の列は HTML にすでにあるので追加しない
  // ここで空列は作らず、そのまま appendPerformanceDataToRow で埋める

  appendPerformanceDataToRow(tr, order.kouji_number);

  // クリックイベント
  tr.find("td").on("click", function (e) {
    e.stopPropagation();
    const colIndex = $(this).index();
    if (colIndex <= 9) {
      openOrderModal(order);
    } else {
      openPerformanceModal(order.kouji_number);
    }
  });

  return tr;
}

//「欠番にする」ボタン処理
$("#cancelOrderBtn").on("click", async function () {
  if (!currentOrderId) return;

  if (confirm("本当に欠番にしますか？")) {
    try {
      const res = await fetch(`/api/orders/${currentOrderId}/missing`, {
        method: "PUT"
      });
      if (!res.ok) throw new Error("API更新失敗");

      // ✅ 成功したらリストを更新
      $(`.order-item[data-id="${currentOrderId}"]`).addClass("canceled");

      alert("工事命令書を欠番にしました。");
      $("#orderModal").hide();
    } catch (err) {
      console.error("欠番エラー:", err);
      alert("欠番更新に失敗しました");
    }
  }
});


function createOrderRow(order) {
  const tr = $("<tr></tr>");

  if (order.missing === 1) {
    tr.addClass("canceled");   // ← 欠番ならクラス追加
  }
  // 🔥 ここを追加（最重要）
  tr.append(`<td>${order.department || ""}</td>`);
  // 工事命令書 (1〜9列)
  tr.append(`<td>${order.kouji_number}</td>`);
  tr.append(`<td>${order.kouji_supplier}</td>`);
  tr.append(`<td>${order.kouji_kenmei}</td>`);
  tr.append(`<td>${order.kaichou}</td>`);
  tr.append(`<td>${order.shachou}</td>`);
  tr.append(`<td>${order.torishimariyaku}</td>`);
  tr.append(`<td>${order.soumu}</td>`);
  tr.append(`<td>${order.buchou}</td>`);
  tr.append(`<td>${order.hakkousha}</td>`);

  // 実績表 (10〜22列)
  appendPerformanceDataToRow(tr, order.kouji_number);

  // クリック分岐
  tr.find("td").on("click", function (e) {
    e.stopPropagation();
    const colIndex = $(this).index();
    if (colIndex <= 9) {
      openOrderModal(order);
    } else {
      openPerformanceModal(order.kouji_number);
    }
  });

  return tr;
}


// ==============================
// 工事番号パース＆ソート
// ==============================
function parseKoujiNumber(koujiNumber) {
  if (!koujiNumber) return [0, 0, 0];
  const parts = koujiNumber.split("-");
  const year = parseInt(parts[0], 10) || 0;
  const main = parseInt(parts[1], 10) || 0;
  const branch = parts.length > 2 ? parseInt(parts[2], 10) || 0 : 0;
  return [year, main, branch];
}

function sortOrders(orders, direction = "asc") {
  return orders.slice().sort((a, b) => {
    const [ya, ma, ba] = parseKoujiNumber(a.kouji_number);
    const [yb, mb, bb] = parseKoujiNumber(b.kouji_number);

    if (ya !== yb) return direction === "asc" ? ya - yb : yb - ya;
    if (ma !== mb) return direction === "asc" ? ma - mb : mb - ma;
    return direction === "asc" ? ba - bb : bb - ba;
  });
}

// ==============================
// ソート用プルダウンイベント
// ==============================
$("#sortSelect").on("change", function () {
  const direction = $(this).val(); // "asc" or "desc"
  const sorted = sortOrders(allOrders, direction);
  renderOrderTable(sorted);
});

