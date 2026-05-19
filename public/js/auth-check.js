async function checkLogin() {

  try {

    const res = await fetch("/api/auth/me");
    const data = await res.json();

    if (!data.loggedIn) {

      // 未ログイン
      window.location.href = "/login.html";

    }

  } catch (err) {

    console.error("Auth check error:", err);
    window.location.href = "/login.html";

  }

}

checkLogin();