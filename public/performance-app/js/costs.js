// ==============================
// コスト関連 costs.js
// ==============================
// ==============================
// ✅ CookieからCSRFトークンを取得
// ==============================
function getCsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}


// ✅ 新規登録
function createCosts() {
  const koujiNumber = document.getElementById("kouji_number_cost").value.trim();
  if (!koujiNumber) {
    alert("工事番号を入力してください。");
    return;
  }

  // ✅ すべて sanitizeHTML を使用（DOMPurifyでHTML構造を保持）
  const materials = sanitizeHTML(document.getElementById("pasteArea1").innerHTML);
  const labor = sanitizeHTML(document.getElementById("pasteArea2").innerHTML);
  const outsourcing = sanitizeHTML(document.getElementById("pasteArea3").innerHTML);

  fetch("/api/costs", {
    method: "POST",
    headers: { "Content-Type": "application/json",
     'X-CSRF-Token': getCsrfToken() // ← 🔒 CSRFトークンを追加！     
     },
       credentials: 'include', // ← 🔑 Cookieを送信（セッション維持に必要）
    body: JSON.stringify({ kouji_number: koujiNumber, materials, labor, outsourcing })
  })
  .then(async res => {
    // 🔒 締め年度
    if (res.status === 403) {
      const err = await res.json();
      alert(err.error);
      return;
    }

    if (!res.ok) {
      throw new Error("保存失敗");
    }

    return res.json();
  })
  .then(() => {
    alert("保存しました！");
    closeCostsModal();
    if (typeof loadOrders === "function") loadOrders();
  })
  .catch(err => {
    console.error("保存エラー:", err);
    alert("保存に失敗しました");
  });
}


// ✅ 上書き保存（UPDATE）
function updateCosts() {
  const koujiNumber = document.getElementById("kouji_number_cost").value.trim();

  // ✅ sanitizeHTML で安全にHTML構造を保持
  const materials = sanitizeHTML(document.getElementById("pasteArea1").innerHTML);
  const labor = sanitizeHTML(document.getElementById("pasteArea2").innerHTML);
  const outsourcing = sanitizeHTML(document.getElementById("pasteArea3").innerHTML);

  fetch(`/api/costs/${koujiNumber}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json",
      'X-CSRF-Token': getCsrfToken() // ← 🔒 CSRFトークンを追加！    
     },
    credentials: 'include', // ← 🔑 Cookieを送信（セッション維持に必要）   
    body: JSON.stringify({ materials, labor, outsourcing })
  })
  .then(async res => {
    // 🔒 締め年度
    if (res.status === 403) {
      const err = await res.json();
       throw new Error("締め年度"); // ← ★ ここがポイント
    }

    if (!res.ok) {
      throw new Error("更新失敗");
    }

    return res.json();
  })
  .then(() => {
    alert("上書き保存しました！");
    closeCostsModal();
  })
  .catch(err => {
    console.error("更新エラー:", err);
    // 403 はすでに alert 済みなので、ここでは何もしなくてもOK
  });
}

// ✅ モーダルを開く（新規 or 編集）
function openCostsModal(koujiNumber) {
  console.log("openCostsModal 実行:", koujiNumber);

  const modal = document.getElementById("modalOverlayCosts");
  if (!modal) {
    console.error("モーダルが見つかりません");
    return;
  }
  modal.style.display = "flex";

  document.getElementById("kouji_number_cost").value = koujiNumber || "";

  // DBから既存データを取得
  fetch(`/api/costs/${koujiNumber}`)
    .then(res => res.json())
    .then(cost => {
      if (cost && cost.kouji_number) {
        // ✅ HTML構造を再構築（タグを許可）
        document.getElementById("pasteArea1").innerHTML = sanitizeHTML(cost.materials || "");
        document.getElementById("pasteArea2").innerHTML = sanitizeHTML(cost.labor || "");
        document.getElementById("pasteArea3").innerHTML = sanitizeHTML(cost.outsourcing || "");

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
    .catch(err => console.error("取得エラー:", err));
}



// ✅ モーダルを閉じる
function closeCostsModal() {
  document.getElementById("modalOverlayCosts").style.display = "none";
}


// ✅ 貼り付けエリアの縮小処理
document.querySelectorAll(".pasteArea").forEach(area => {
  area.addEventListener("paste", () => {
    setTimeout(() => {
      const content = area.firstElementChild;
      if (content) {
        const areaWidth = area.clientWidth;
        const contentWidth = content.scrollWidth;
        if (contentWidth > areaWidth) {
          const scale = areaWidth / contentWidth;
          content.style.transformOrigin = "top left";
          content.style.transform = `scale(${scale})`;
        } else {
          content.style.transform = "scale(1)";
        }
      }
    }, 100);
  });
});
