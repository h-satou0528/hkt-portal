function createCosts() {
  console.log("createCosts 実行されました");
  // fetch("/api/costs", {...})
}


function openCostModal(koujiNumber = "") {
  document.getElementById("costModalOverlay").style.display = "flex";
  document.getElementById("kouji_number_cost").value = koujiNumber;
}

function closeCostModal() {
  document.getElementById("costModalOverlay").style.display = "none";
}


// ✅ 新規保存
function createCosts() {
  
  console.log("createCosts 実行されました");

  
  const koujiNumber = document.getElementById("kouji_number_cost").value.trim();
  if (!koujiNumber) {
    alert("工事番号を入力してください。");
    return; // 工事番号が空なら保存処理を中断
  }

  const materials = document.getElementById("pasteArea1").innerHTML;
  const labor = document.getElementById("pasteArea2").innerHTML;
  const outsourcing = document.getElementById("pasteArea3").innerHTML;

  fetch("/api/costs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kouji_number: koujiNumber,
      materials,
      labor,
      outsourcing
    })
  })
    .then(res => res.json())
    .then(data => {
      console.log("保存成功:", data);
      alert("保存しました！");
      
      // ✅ モーダルを閉じる
      closeCostsModal();

      // ✅ リストを更新する（orders.js の関数を呼び出し）
      if (typeof loadOrders === "function") {
        loadOrders();
      }
    })
    .catch(err => console.error("保存エラー:", err));
}



//✅ 取得処理（モーダルを開いた時に表示）
function openCostModal(koujiNumber) {
  document.getElementById("costModalOverlay").style.display = "flex";
  document.getElementById("kouji_number_cost").value = koujiNumber;

  // DBからデータを取得
  fetch(`/api/costs/${koujiNumber}`)
    .then(res => res.json())
    .then(data => {
      if (data) {
        document.getElementById("pasteArea1").innerHTML = data.materials || "";
        document.getElementById("pasteArea2").innerHTML = data.labor || "";
        document.getElementById("pasteArea3").innerHTML = data.outsourcing || "";
      }
    })
    .catch(err => console.error("取得エラー:", err));
}



//✅ 上書き保存（UPDATE）
// ✅ 上書き保存
function updateCosts() {
  const koujiNumber = document.getElementById("kouji_number_cost").value;
  const materials = document.getElementById("pasteArea1").innerHTML;
  const labor = document.getElementById("pasteArea2").innerHTML;
  const outsourcing = document.getElementById("pasteArea3").innerHTML;

  fetch(`/api/costs/${koujiNumber}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      materials,
      labor,
      outsourcing
    })
  })
    .then(res => res.json())
    .then(data => {
      console.log("上書き保存成功:", data);
      alert("上書き保存しました！");
      // モーダルを閉じる場合は下記も追加可能
      closeCostsModal();
    })
    .catch(err => console.error("更新エラー:", err));
}



//貼り付けエリアに縮小して表示させる
document.querySelectorAll(".pasteArea").forEach(area => {
  area.addEventListener("paste", () => {
    setTimeout(() => {
      const content = area.firstElementChild; // 最初の子要素(Excelコピー時はtableが多い)
      if (content) {
        const areaWidth = area.clientWidth;
        const contentWidth = content.scrollWidth;

        if (contentWidth > areaWidth) {
          const scale = areaWidth / contentWidth;
          content.style.transformOrigin = "top left";
          content.style.transform = `scale(${scale})`;
        } else {
          // 小さい場合は等倍に戻す
          content.style.transform = "scale(1)";
        }
      }
    }, 100); // 貼り付け処理が終わった直後に実行
  });
});


//ボタンの表示切替
function openCostModal(koujiNumber) {
  document.getElementById("costModalOverlay").style.display = "flex";
  document.getElementById("kouji_number_cost").value = koujiNumber;

  fetch(`/api/costs/${koujiNumber}`)
    .then(res => res.json())
    .then(data => {
      if (data) {
        // 既存データあり → 更新モード
        document.getElementById("pasteArea1").innerHTML = data.materials || "";
        document.getElementById("pasteArea2").innerHTML = data.labor || "";
        document.getElementById("pasteArea3").innerHTML = data.outsourcing || "";
        document.getElementById("createBtn").style.display = "none";
        document.getElementById("updateBtn").style.display = "inline-block";
      } else {
        // 新規モード
        document.getElementById("pasteArea1").innerHTML = "";
        document.getElementById("pasteArea2").innerHTML = "";
        document.getElementById("pasteArea3").innerHTML = "";
        document.getElementById("createBtn").style.display = "inline-block";
        document.getElementById("updateBtn").style.display = "none";
      }
    });
}

function closeCostModal() {
  document.getElementById("costModalOverlay").style.display = "none";
}


//「有」ボタンをクリックしたら自動でデータを読み込み、編集モード
function openCostModal(koujiNumber) {
  document.getElementById("costModalOverlay").style.display = "flex";
  document.getElementById("kouji_number_cost").value = koujiNumber;

  fetch(`/api/costs/${koujiNumber}`)
    .then(res => res.json())
    .then(data => {
      if (data) {
        document.getElementById("pasteArea1").innerHTML = data.materials || "";
        document.getElementById("pasteArea2").innerHTML = data.labor || "";
        document.getElementById("pasteArea3").innerHTML = data.outsourcing || "";

        // 更新モード
        document.getElementById("createBtn").style.display = "none";
        document.getElementById("updateBtn").style.display = "inline-block";
      }
    })
    .catch(err => console.error("取得エラー:", err));
}



// 材料費・工数・外注費モーダルを開く
function openCostsModal(koujiNumber) {
  console.log("openCostsModal 実行:", koujiNumber);

  const modal = document.getElementById("modalOverlayCosts");
  if (!modal) {
    console.error("モーダルが見つかりません");
    return;
  }
  modal.style.display = "flex";

  // 工事番号をモーダル内の input にセット
  // 工事番号が未指定なら空欄にする
  document.getElementById("kouji_number_cost").value = koujiNumber || "";

  // DBから既存データを取得
  fetch(`/api/costs/${koujiNumber}`)
    .then(r => r.json())
    .then(cost => {
      if (cost && cost.kouji_number) {
        document.getElementById("pasteArea1").innerHTML = cost.materials || "";
        document.getElementById("pasteArea2").innerHTML = cost.labor || "";
        document.getElementById("pasteArea3").innerHTML = cost.outsourcing || "";

        // 更新モード
        document.getElementById("createBtn").style.display = "none";
        document.getElementById("updateBtn").style.display = "inline-block";
      } else {
        // 新規モード
        document.getElementById("pasteArea1").innerHTML = "";
        document.getElementById("pasteArea2").innerHTML = "";
        document.getElementById("pasteArea3").innerHTML = "";

        document.getElementById("createBtn").style.display = "inline-block";
        document.getElementById("updateBtn").style.display = "none";
      }
    })
    .catch(err => {
      console.error("コストデータ取得エラー:", err);
      alert("データ取得に失敗しました");
    });
}

//function closeCostsModal() {
//  document.getElementById("costModalOverlay").style.display = "none";
//}


// モーダルを閉じる関数
function closeCostsModal() {
  document.getElementById("modalOverlayCosts").style.display = "none";
}
