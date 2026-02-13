    // ページ読み込み時にCSRFトークンを取得
    async function loadCsrfToken() {
      const res = await fetch("/api/csrf-token");
      const data = await res.json();
      document.getElementById("csrfToken").value = data.csrfToken;
    }

    // フォーム送信処理
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = e.target.username.value;
      const password = e.target.password.value;
      const csrfToken = document.getElementById("csrfToken").value;

      const res = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken, // ✅ トークンをヘッダーに送信
        },
        body: JSON.stringify({ username, password }),
      });

       if (res.redirected) {
    // リダイレクト時の入れ子防止：必ず top にリダイレクトさせる
    window.top.location.href = res.url;
  } else {
    alert("ログインに失敗しました。");
  }
});

    // ページロード時にCSRFトークン取得実行
    loadCsrfToken();
