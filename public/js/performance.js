
//ここから実績表のエリア*************************************************************************************

// ✅ グローバル関数として置く
// フォーカス外れ時のフォーマット（¥付き）
function formatWithYenComma(input) {
  let val = input.value.replace(/[^\d]/g, ''); // 数字だけ抽出
  if (val === '') val = '0';
  input.value = '¥' + Number(val).toLocaleString();
}

// フォーカス時は数字だけに戻す
function unformatWithComma(input) {
  input.value = input.value.replace(/[^\d]/g, '');
}




//連携処理を追加
$(function () {
  // 実績表モーダルの定義（jQuery UI ダイアログ）
  $("#performanceModal").dialog({
    autoOpen: false,
    modal: true,
    width: 500
  });

  // 実績表を作成ボタンクリック時の処理
  $("#openPerformanceBtn").on("click", function () {
    const koujiNumber = $("input[name='kouji_number']").val();
    const koujiSupplier = $("input[name='kouji_supplier']").val();
    const koujiKenmei = $("input[name='kouji_kenmei']").val();

    // 実績表モーダルに値を転送
    $("input[name='p_kouji_number']").val(koujiNumber);
    $("input[name='p_kouji_supplier']").val(koujiSupplier);
    $("input[name='p_kouji_kenmei']").val(koujiKenmei);

    // モーダルを開く
    $("#performanceModal").dialog("open");
  });

});


//✅ 基本方針（jQuery）
//入力イベントにリスナーを設定
$(document).ready(function () {
  // 金額関連セルにblurイベントを設定
  const watchedCells = [
    ...generateIds('c', 1, 17),
    ...generateIds('d', 1, 17),
    ...generateIds('e', 1, 17),
    ...generateIds('i', 1, 17),
    ...generateIds('j', 1, 17),
    ...generateIds('k', 1, 17),
    ...generateIds('g', 1, 6),
    ...generateIds('g', 10, 15),
    ...generateIds('m', 1, 6),
    ...generateIds('m', 10, 15)
  ];

  watchedCells.forEach(id => {
    $(`#${id}`).on('blur', function () {
      updateSumAndFormat(); // 入力後に計算実行
    });
  });

  // 初期読み込みでも実行しておくと見た目整う
  updateSumAndFormat();
});


//金額カンマ区切り関数
function formatNumber(val) {
  return val.toLocaleString('ja-JP');
}

//数値取得補助
function getNumericValue(id) {
  const val = $(`#${id}`).text().replace(/,/g, '').trim();
  return isNaN(val) || val === "" ? 0 : parseFloat(val);
}

//✅ すべての計算関数：updateSumAndFormat()
function updateSumAndFormat() {
  // 材料費・外注費・現場経費
  sumColumn('c', 1, 17, 'c18');
  sumColumn('d', 1, 17, 'd18');
  sumColumn('e', 1, 17, 'e18');
  sumColumn('i', 1, 17, 'i18');
  sumColumn('j', 1, 17, 'j18');
  sumColumn('k', 1, 17, 'k18');

  // 工数Hの計算
  sumColumn('g', 1, 6, 'g7');
  sumColumn('g', 10, 15, 'g16');
  sumColumn('m', 1, 6, 'm7');
  sumColumn('m', 10, 15, 'm16');

  // 労務費 H列
  multiplyRow('g', 1, 2500, 'h1');
  multiplyRow('g', 2, 3125, 'h2');
  multiplyRow('g', 3, 3750, 'h3');
  multiplyRow('g', 4, 3125, 'h4');
  multiplyRow('g', 5, 3750, 'h5');
  multiplyRow('g', 6, 4375, 'h6');
  sumColumn('h', 1, 6, 'h8');

  // 労務費 H列(下段)
  multiplyRow('g', 10, 2500, 'h10');
  multiplyRow('g', 11, 3125, 'h11');
  multiplyRow('g', 12, 3750, 'h12');
  multiplyRow('g', 13, 3125, 'h13');
  multiplyRow('g', 14, 3750, 'h14');
  multiplyRow('g', 15, 4375, 'h15');
  sumColumn('h', 10, 15, 'h17');

  // 労務費 N列
  multiplyRow('m', 1, 2500, 'n1');
  multiplyRow('m', 2, 3125, 'n2');
  multiplyRow('m', 3, 3750, 'n3');
  multiplyRow('m', 4, 3125, 'n4');
  multiplyRow('m', 5, 3750, 'n5');
  multiplyRow('m', 6, 4375, 'n6');
  sumColumn('n', 1, 6, 'n8');

  multiplyRow('m', 10, 2500, 'n10');
  multiplyRow('m', 11, 3125, 'n11');
  multiplyRow('m', 12, 3750, 'n12');
  multiplyRow('m', 13, 3125, 'n13');
  multiplyRow('m', 14, 3750, 'n14');
  multiplyRow('m', 15, 4375, 'n15');
  sumColumn('n', 10, 15, 'n17');

  // 実効予算 左
  const b19_total = getSum(['c18','d18','e18','h8','h17']);
  $('#b19').text(formatNumber(b19_total));

  const d19_total = b19_total * 1.02;
  $('#d19').text(formatNumber(d19_total));

  const budgetLimit = parseInt($('#limitAmount').text().replace(/[^\d]/g, ''), 10) || 0;
if (budgetLimit > 0) {
  $('#h19').text((d19_total / budgetLimit * 100).toFixed(2) + '%');
}

  // 実績 右
  const i19_total = getSum(['i18','j18','k18','n8','n17']);
  $('#i19').text(formatNumber(i19_total));

  const k19_total = i19_total * 1.02;
  $('#k19').text(formatNumber(k19_total));

  if (budgetLimit > 0) {
    $('#n19').text((k19_total / budgetLimit * 100).toFixed(2) + '%');
  }
}


//補助関数
function sumColumn(col, start, end, targetId) {
  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += getNumericValue(`${col}${i}`);
  }
  $(`#${targetId}`).text(formatNumber(sum));
}

function multiplyRow(col, row, multiplier, targetId) {
  const value = getNumericValue(`${col}${row}`);
  const result = value * multiplier;
  $(`#${targetId}`).text(formatNumber(result));
}

function getSum(ids) {
  return ids.reduce((sum, id) => sum + getNumericValue(id), 0);
}

function generateIds(col, start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) {
    arr.push(`${col}${i}`);
  }
  return arr;
}



// 金額入力フィールドにカンマ付きで表示させる
function formatCurrency(value) {
  const num = parseFloat(value.toString().replace(/,/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('ja-JP');
}

// 対象セルにフォーマット処理を設定
function setupCurrencyInputs() {
  const columns = ['c', 'd', 'e', 'i', 'j', 'k'];
  const maxRows = { c: 18, d: 18, e: 18, i: 17, j: 17, k: 17 };

  columns.forEach((col) => {
    for (let row = 1; row <= maxRows[col]; row++) {
      const cellId = `#${col}${row}`;
      $(cellId)
        .on('blur', function () {
          const rawValue = $(this).text().replace(/,/g, '').trim();
          const formatted = formatCurrency(rawValue);
          $(this).text(formatted);
        })
        .on('focus', function () {
          // 編集時はカンマを除去
          const cleanValue = $(this).text().replace(/,/g, '').trim();
          $(this).text(cleanValue);
        });
    }
  });
}













// 受注金額 → 上限額 計算＋カンマ
function parseNumber(str) {
  return Number(str.replace(/,/g, '')) || 0;
}

// カンマ付き＆¥マーク付きにする
function formatWithYenComma(elem) {
  const raw = elem.value.replace(/[^\d]/g, '');
  if (!raw) {
    elem.value = '';
    return;
  }
  const formatted = Number(raw).toLocaleString('ja-JP');
  elem.value = '¥' + formatted;
}

// フォーカス時に値をプレーンな数値に戻す
function unformatWithComma(elem) {
  elem.value = elem.value.replace(/[^\d]/g, '');
}

// 受注金額 input にフォーカス時・フォーカスアウト時の処理をまとめる
function setupCurrencyInputs() {
  const $amount = $("#amountA");

  // フォーカス時：プレーンな数値に戻す
  $amount.on("focus", function() {
    unformatWithComma(this);
  });

  // フォーカスアウト時：カンマ付き＆¥表示 + 予算上限計算
  $amount.on("blur", function() {
    const val = parseInt($(this).val().replace(/[^\d]/g, ''), 10) || 0;

    // 受注金額をカンマ付き＆¥付きで表示
    $(this).val('¥' + val.toLocaleString('ja-JP'));

    // 予算上限 = 受注金額の85%
    const limit = Math.round(val * 0.85);
    $("#limitAmount").text('¥' + limit.toLocaleString('ja-JP'));
  });
}

// 呼び出しタイミング（DOM構築後）
$(document).ready(function () {
  setupCurrencyInputs(); // ← ここで呼ぶ
  // 他の初期化処理があればここに追記
});

//リスト描画時に kouji_number を使って実績表を取得
async function fetchPerformance(kouji_number) {
  try {
    const res = await fetch(`/api/performance_sheets/${kouji_number}`);
    return await res.json();
  } catch (err) {
    console.error("fetchPerformance エラー:", err);
    return {};
  }
}



// 実績表データを行に追加する関数
// ✅ 使用すべき appendPerformanceDataToRow（実績表 + 工事番号）
async function appendPerformanceDataToRow(rowElement, kouji_number) {
  const perf = await fetchPerformance(kouji_number);

  const getVal = key => perf && perf[key] ? perf[key] : "";

  const cells = [
    kouji_number, // ✅ 工事番号（予算）
    getVal('kaichou_up'),
    getVal('shachou_up'),
    getVal('torishimari_up'),
    getVal('soumu_up'),
    getVal('buchou_up'),
    getVal('hakkousha_up'),

    getVal('kaichou_down'),
    getVal('shachou_down'),
    getVal('torishimari_down'),
    getVal('soumu_down'),
    getVal('buchou_down'),
    getVal('hakkousha_down')
  ];

  // 13個の<td>を作成してrowElementに追加
  cells.forEach(text => {
    const td = document.createElement("td");
    td.textContent = text;
    rowElement.appendChild(td);
  });
}


//右側13列（予算・実績）を表示する
function appendPerformanceDataToRow(row, performanceData) {
  console.log("appendPerformanceDataToRow called:", performanceData);

  const createTd = (text) => {
    const td = document.createElement("td");
    td.textContent = text ?? "";
    return td;
  };

  // 実行予算表（7列）
  row.append(createTd(performanceData.kouji_number));
  row.append(createTd(performanceData.kaichou_up));
  row.append(createTd(performanceData.shachou_up));
  row.append(createTd(performanceData.torishimari_up));
  row.append(createTd(performanceData.soumu_up));
  row.append(createTd(performanceData.buchou_up));
  row.append(createTd(performanceData.hakkousha_up));

  // 実績表（6列）
  row.append(createTd(performanceData.kaichou_down));
  row.append(createTd(performanceData.shachou_down));
  row.append(createTd(performanceData.torishimari_down));
  row.append(createTd(performanceData.soumu_down));
  row.append(createTd(performanceData.buchou_down));
  row.append(createTd(performanceData.hakkousha_down));
}


 function openModal() {
   document.getElementById("modalOverlay").style.display = "flex";
  }

  function closeModal() {
    document.getElementById("modalOverlay").style.display = "none";
    //新規作成時のデータ残りをクリアのためリロード
    location.reload(); // ✅ ページをリロード
  }



// === 新規作成ボタンからモーダルを開くとき ===
$("#openPerformanceBtn").on("click", function () {
  saveMode = "create"; // ✅ 新規モード
  $("#perfSaveBtn").text("登録する"); // ボタンラベル切替
  $("#perfModal input, #perfModal select").val(""); // フォーム初期化
  $("#comments").text(""); // コメント初期化
  $("#modalOverlay").show();
});
  

//performance.js 側で openPerformanceModal(koujiNumber) を実装
// 実績表モーダルを開く処理
// === リストをクリックしてモーダルを開くとき ===
// === 実績表モーダルを開く処理 ===
function openPerformanceModal(koujiNumber) {
  console.log("✅ openPerformanceModal 呼び出し:", koujiNumber);

  // APIから実績表データを取得
  $.get(`/api/performance_sheets/${koujiNumber}`, function (data) {
    console.log("✅ 実績表APIレス:", data);

    const modal = $("#perfModal");

    // ✅ APIレスにidがあれば hidden にセット
    if (data.id) {
      modal.find("input[name='perf_id']").val(data.id);
      $("#perfSaveBtn").text("上書き保存");
      
    } else {
      modal.find("input[name='perf_id']").val(""); // 新規の場合は空
      $("#perfSaveBtn").text("新規保存");
    }

    // フォームにデータをセット
    modal.find("input[name='perf_id']").val(data.id || "");


    modal.find("input[name='kouji_number']").val(data.kouji_number || "");
    modal.find("input[name='kouji_supplier']").val(data.kouji_supplier || "");
    modal.find("input[name='kouji_kenmei']").val(data.kouji_kenmei || "");
    modal.find("input[name='start_date']").val(data.start_date || "");
    modal.find("input[name='end_date']").val(data.end_date || "");
    modal.find("input[name='contract_amount']").val(data.contract_amount || "");
    $("#limitAmount").text(data.budget_limit || 0);
    modal.find("input[name='effective_date']").val(data.effective_date || "");
    modal.find("input[name='result_date']").val(data.result_date || "");
    $("#comments").text(data.comments || "");

    // 承認・発行12項目
    ["kaichou","shachou","torishimari","soumu","buchou","hakkousha"].forEach(name => {
      modal.find(`select[name='${name}_up']`).val(data[`${name}_up`] || "");
      modal.find(`select[name='${name}_down']`).val(data[`${name}_down`] || "");
    });

    // スプレッドシート a1～n19
    for (let row = 1; row <= 19; row++) {
      for (let col of "abcdefghijklmn") {
        const cellId = col + row;
        if (data[cellId] !== undefined) {
          $("#" + cellId).text(data[cellId]);
        }
      }
    }


// 金額系の初期表示をフォーマットしてセット
$("#amountA").val('¥' + Number(data.contract_amount || 0).toLocaleString());
$("#limitAmount").text('¥' + Number(data.budget_limit || 0).toLocaleString());




// ✅ 日付カラムは yyyy-mm-dd に変換してセット
function formatDate(dateStr) {
  if (!dateStr) return "";
  return dateStr.split("T")[0];  // "2025-09-04T15:00:00.000Z" → "2025-09-04"
}

//日付を取得して表示
modal.find("input[name='start_date']").val(formatDate(data.start_date));
modal.find("input[name='end_date']").val(formatDate(data.end_date));
modal.find("input[name='effective_date']").val(formatDate(data.effective_date));
modal.find("input[name='result_date']").val(formatDate(data.result_date));



    // モーダルを表示させ中央に配置する
    document.getElementById("modalOverlay").style.display = "flex";
  });
}

// === 実績表保存処理 ===
// === 実績表保存処理 === 
$("#perfSaveBtn").on("click", function () {
  const modal = $("#perfModal");
  const recordId = modal.find("input[name='perf_id']").val(); // hidden input の値を取得
  const koujiNumber = modal.find("input[name='kouji_number']").val().trim(); // ✅ trim追加

  // ✅ 工事番号が未入力ならアラートを出して処理中断
  if (!koujiNumber) {
    alert("工事番号が未記入です");
    return; // 保存処理を止める
  }

  // 数字以外を削除して整数に変換するユーティリティ
  function parseYenNumber(str) {
    if (!str) return 0;
    const num = str.replace(/[^\d]/g, ''); // ¥や,などを除去
    return num ? parseInt(num, 10) : 0;
  }

  // 保存データ作成
  const data = {
    kouji_number: koujiNumber,   // ✅ 上でtrimしたものをセット
    kouji_supplier: modal.find("input[name='kouji_supplier']").val(),
    kouji_kenmei: modal.find("input[name='kouji_kenmei']").val(),
    start_date: modal.find("input[name='start_date']").val(),
    end_date: modal.find("input[name='end_date']").val(),
    contract_amount: parseYenNumber(modal.find("input[name='contract_amount']").val()),
    budget_limit: parseYenNumber($("#limitAmount").text()),
    effective_date: modal.find("input[name='effective_date']").val(),
    result_date: modal.find("input[name='result_date']").val(),
    comments: $("#comments").text()
  };

  // 承認・発行12項目
  ["kaichou","shachou","torishimari","soumu","buchou","hakkousha"].forEach(name => {
    data[`${name}_up`]   = modal.find(`select[name='${name}_up']`).val();
    data[`${name}_down`] = modal.find(`select[name='${name}_down']`).val();
  });

  // スプレッドシート a1～n19
  for (let row = 1; row <= 19; row++) {
    for (let col of "abcdefghijklmn") {
      const cellId = col + row;
      data[cellId] = $("#" + cellId).text();
    }
  }

  console.log("送信データ:", data);

  if (recordId) {
    // === 既存レコード → PUT ===
    $.ajax({
      url: `/api/performance_sheets/${recordId}`,
      type: "PUT",
      contentType: "application/json",
      data: JSON.stringify(data),
      success: function (res) {
        alert("上書き保存成功");
        $("#modalOverlay").hide();
if (typeof loadOrders === "function") {
loadOrders();   // リストをリロード
   //新規作成時のデータ残りをクリアのためリロード
location.reload(); // ✅ ページをリロード
}
      },
      error: function (err) {
        console.error("保存エラー:", err);
        alert("保存に失敗しました");
      }
    });
    } 
    else {
    // === 新規レコード → POST ===
    $.ajax({
      url: `/api/performance_sheets`,
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(data),
      success: function (res) {
        alert("新規保存成功");
        modal.find("input[name='perf_id']").val(res.id);
        $("#modalOverlay").hide();
        if (typeof loadOrders === "function") {
          loadOrders();   // リストをリロード
           }
      },
      error: function (err) {
        console.error("保存エラー:", err);
        alert("保存に失敗しました");
      }
    });
  }
});







