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

  const amountInputs = [
    document.getElementById("mitsumori_taxex"),
    document.getElementById("contract_taxex")
  ];

  amountInputs.forEach(input => {

    if (!input) return;

    // IME OFF
    input.setAttribute("inputmode", "numeric");
    input.style.imeMode = "disabled";

    // フォーカス時 → カンマ除去
    input.addEventListener("focus", () => {
      input.value = parseNumberSimple(input.value) || "";
    });

    // 入力中
    input.addEventListener("input", () => {

      // 数字以外除去
      let raw = input.value.replace(/[^\d]/g, "");

      // 先頭ゼロ除去
      raw = raw.replace(/^0+(?=\d)/, "");

      input.value = raw;

      formatAndCalculate();
    });

    // フォーカス外れたらカンマ
    input.addEventListener("blur", () => {

      const num = parseNumberSimple(input.value);

      input.value = num
        ? formatWithCommaSimple(num)
        : "";

      formatAndCalculate();
    });
  });
});




function formatAndCalculate() {

  const mitInput = document.getElementById('mitsumori_taxex');
  const conInput = document.getElementById('contract_taxex');

  if (!mitInput || !conInput) return;

  const mitRaw = parseNumberSimple(mitInput.value);
  const conRaw = parseNumberSimple(conInput.value);

  // 税込だけ計算
  const mitTaxIn = Math.round(mitRaw * 1.1);
  const conTaxIn = Math.round(conRaw * 1.1);

  document.getElementById('mitsumori_taxin').textContent =
    formatWithCommaSimple(mitTaxIn);

  document.getElementById('contract_taxin').textContent =
    formatWithCommaSimple(conTaxIn);
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
    article: $("#article").val(),

  reflectPerformance: $("#reflectPerformance").prop("checked"),
  reflectEntries: $("#reflectEntries").prop("checked"),
  // 🔥 これ追加
    reflectLedger: $("#reflectLedger").prop("checked")

  };
}

function isBranchNumber(koujiNumber) {
  return koujiNumber.split("-").length > 2;
}


// ==============================
// モーダル・登録処理（完全版）
// ==============================
$(function () {
  $(".datepicker").datepicker({ dateFormat: 'yy-mm-dd' });

  $("#modalForm").dialog({
    autoOpen: false,
    modal: true,
    width: 600,
    buttons: [

      // ==========================
      // 新規登録
      // ==========================
      {
        text: "登録する",
        class: "register-button",
        click: async function () {

          const formData = getFormData();
          const koujiNumber = formData.kouji_number?.trim();

          if (!koujiNumber) {
            alert("工事番号が未記入です");
            return;
          }

          const isPerformance = formData.reflectPerformance;
          const isEntry = formData.reflectEntries;
          const isBranch = isBranchNumber(koujiNumber);

          if (isBranch && isPerformance) {
            alert("枝番号のため実行予算・実績表及び台帳には作成や反映できません");
            return;
          }

          if (isBranch && isEntry && !isPerformance) {
            const ok = confirm("内川工事番号登録に反映させますか？");
            if (!ok) return;

            await saveToEntriesOnly(formData);
            alert("工事番号を登録しました（内川 + 工事命令書）");
          }

          if (!formData.department) {
            alert("大工番が選択されていません");
            return;
          }

          $.ajax({
            url: "/api/construction_orders",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(formData),
            headers: { 'X-CSRF-Token': getCsrfToken() },

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

              if (xhr.status === 400) {
                alert(xhr.responseJSON?.error || "この工事番号は既に登録されています");
                return;
              }

              alert("登録に失敗しました");
            }
          });
        }
      },

      // ==========================
      // 閉じる
      // ==========================
      {
        text: "閉じる",
        click: function () {
          $(this).dialog("close");
        }
      },

      // ==========================
      // 上書き保存（修正版）
      // ==========================
      {
        text: "上書き保存",
        class: "update-button",
        click: function () {

          const formData = getFormData();

          if (!formData.kouji_number) {
            const targetOrder = allOrders.find(o => o.id === editingId);
            if (targetOrder) {
              formData.kouji_number = targetOrder.kouji_number;
            }
          }

          const koujiNumber = formData.kouji_number?.trim();

          if (!koujiNumber) {
            alert("工事番号が未設定です");
            return;
          }

          const isPerformance = formData.reflectPerformance;
          const isEntry = formData.reflectEntries;
          const isBranch = isBranchNumber(koujiNumber);

          if (isBranch && isPerformance) {
            alert("枝番号のため実行予算・実績表及び工事台帳には反映はできません");
            return;
          }

          if (isBranch && isEntry && !isPerformance) {
            const ok = confirm("内川工事番号登録に反映させますか？");
            if (!ok) return;
          }

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
              if (xhr.status === 403) {
                alert(xhr.responseJSON?.error);
                return;
              }
              alert("更新に失敗しました");
            }
          });
        }
      },

      // ==========================
      // 工事完了
      // ==========================
      {
        text: "工事完了",
        click: function () {
          if (!editingId) return alert("編集対象が見つかりません");

          if (confirm("この工事を完了にしますか？")) {
            $.ajax({
              url: `/api/construction_orders/${editingId}/completed`,
              type: "PUT",
              headers: { 'X-CSRF-Token': getCsrfToken() },
              success: function () {
                alert("完了しました");
                $("#modalForm").dialog("close");
                loadOrders();
              }
            });
          }
        }
      },

      // ==========================
      // 完了取消
      // ==========================
      {
        text: "工事完了取消し",
        click: function () {
          if (!editingId) return alert("編集対象が見つかりません");

          if (confirm("完了を取り消しますか？")) {
            $.ajax({
              url: `/api/construction_orders/${editingId}/uncomplete`,
              type: "PUT",
              headers: { 'X-CSRF-Token': getCsrfToken() },
              success: function () {
                alert("取消しました");
                $("#modalForm").dialog("close");
                loadOrders();
              }
            });
          }
        }
      },

      // ==========================
      // 欠番
      // ==========================
      {
        text: "欠番にする",
        click: function () {
          if (!editingId) return alert("編集対象が見つかりません");

          if (confirm("欠番にしますか？")) {
            $.ajax({
              url: `/api/construction_orders/${editingId}/missing`,
              type: "PUT",
              headers: { 'X-CSRF-Token': getCsrfToken() },
              success: function () {
                alert("欠番にしました");
                $("#modalForm").dialog("close");
                loadOrders();
              }
            });
          }
        }
      },

      // ==========================
      // 欠番取消
      // ==========================
      {
        text: "欠番取消",
        click: function () {
          if (!editingId) return alert("編集対象が見つかりません");

          if (confirm("欠番を取り消しますか？")) {
            $.ajax({
              url: `/api/construction_orders/${editingId}/unmissing`,
              type: "PUT",
              headers: { 'X-CSRF-Token': getCsrfToken() },
              success: function () {
                alert("取消しました");
                $("#modalForm").dialog("close");
                loadOrders();
              }
            });
          }
        }
      }

    ]
  });
});

// ==============================
  // 🔥 工事番号リアルタイム重複チェック（ここが正解位置）
  // ==============================
$(document).ready(function () {

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  const checkKoujiNumber = debounce(async function () {
    const koujiNumber = $("#kouji_number").val()?.trim();
    // 🔥 ここに入れる（最優先）
    if (!koujiNumber) {
        $("#kouji_number").css("background-color", "");
        $("#koujiNumberMsg").text("");
    return;
  }

    // 工事番号の08-とかは無視してその下をチェックする(現在2なので2文字目から)
    if (koujiNumber.length < 2) return;
    
    try {
      const res = await fetch(`/api/construction_orders/check/${koujiNumber}`);
      const data = await res.json();

      if (data.exists) {
        $("#kouji_number").css("background-color", "#ffcccc");
        $("#koujiNumberMsg")
          .text("⚠ この工事番号は既に登録されています")
          .css("color", "red");

      } else {
        $("#kouji_number").css("background-color", "#ccffcc");
        $("#koujiNumberMsg")
          .text("✓ 使用できます")
          .css("color", "green");
      }

    } catch (err) {
      console.error("重複チェック失敗", err);
    }
  }, 500);

  // ⭐ イベント登録
  $("#kouji_number").on("input", checkKoujiNumber);

});



///////////////////////////////////
//saveToEntriesOnly の追加
///////////////////////////////////
async function saveToEntriesOnly(formData) {
  const res = await fetch('/api/save-entry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken()
    },
    credentials: 'include',
    body: JSON.stringify({
      bandai: formData.kouji_number,
      title: formData.kouji_kenmei,
      person: "", // 必要なら追加
      note: "",
      order: "",
      invoice: "",
      performance: ""
    })
  });

  if (!res.ok) {
    throw new Error("entries登録失敗");
  }
}


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




// ==============================
// 一覧表示 loadOrders
// ==============================
let allOrders = [];

async function loadOrders() {
  console.log("loadOrders 実行開始");

  const loader = document.getElementById("loadingOverlay");
  loader.classList.remove("hidden");   // ← 表示ON

  try {
    const response = await fetch("/api/construction_orders");
    const data = await response.json();

    console.log("GET /api/construction_orders 成功", data.length, "件");

    allOrders = data;
    renderOrderTable(allOrders);

  } catch (err) {
    console.error("GET /api/construction_orders エラー:", err);
  } finally {
    loader.classList.add("hidden");   // ← 表示OFF（必ず実行🔥）
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
      tr.classList.add("completed");
    }

    let koujiNumberCell = order.kouji_number;
    if (order.missing === 1) {
      koujiNumberCell += "（欠番）";
    }

    // ==============================
    // 工事命令書（左側）
    // ==============================
    tr.innerHTML = `
      <td>${sanitize(order.department || "")}</td>
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

    const tds = tr.querySelectorAll("td");

    // ==============================
    // 実績表（右側）🔥復活
    // ==============================
    let offset = 10;

    const perfColumns = [
   order.ps_kouji_number,
  order.ps_kaichou_up,
  order.ps_shachou_up,
  order.ps_torishimari_up,
  order.ps_soumu_up,
  order.ps_buchou_up,
  order.ps_hakkousha_up,
  order.ps_kaichou_down,
  order.ps_shachou_down,
  order.ps_torishimari_down,
  order.ps_soumu_down,
  order.ps_buchou_down,
  order.ps_hakkousha_down
];

    perfColumns.forEach(val => {
      const td = document.createElement("td");
      td.textContent = val || "";
      tr.appendChild(td);
    });

    // ==============================
    // ステータス色付け🔥復活
    // ==============================
    const statusCell = tr.querySelectorAll("td")[offset + 12];

    if (order.ps_hakkousha_down === "差戻") {
      statusCell.classList.add("status-sashimodoshi");
    }

    if (order.ps_hakkousha_down === "完了") {
      statusCell.classList.add("status-kanryo");
    }
    
    
    // ==============================
    // コスト列🔥復活
    // ==============================
    const costCell = document.createElement("td");

    if (order.cost_exists) {
      costCell.textContent = "作成済";
      costCell.classList.add("costs-link");

      costCell.addEventListener("click", (e) => {
        e.stopPropagation();
        openCostsModal(order.kouji_number);
      });
    }

    tr.appendChild(costCell);

    // ==============================
    // クリック処理
    // ==============================
    tr.addEventListener("click", (e) => {
      const clickedCell = e.target.closest("td");
      if (!clickedCell) return;

      const colIndex = Array.from(tr.children).indexOf(clickedCell);

      if (colIndex < 10) {
        openOrderModal(order);
      } else if (colIndex < 23) {
        openPerformanceModal(order.kouji_number);
      }
    });

    tbody.appendChild(tr);
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


// ==============================
// debounce（共通ユーティリティ）
// ==============================
function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}
