// public/js/logout.js
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      const res = await fetch("/logout", {
        method: "POST",
        headers: {
          "CSRF-Token": getCsrfToken()
        },
        credentials: "include"
      });

      if (res.ok) {
        location.href = "/login.html";
      } else {
        alert("ログアウトに失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("通信エラー");
    }
  });
});

// Cookie から CSRF トークン取得
function getCsrfToken() {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
}
