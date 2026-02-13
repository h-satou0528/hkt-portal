  let posts = [];
  let selectedIndex = null;
  let isEditMode = false;


// ==============================
// ✅ CookieからCSRFトークンを取得
// ==============================
function getCsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}


  async function fetchPosts() {
  try {
    const res = await fetch('/api/posts');
    const data = await res.json();

    // データが配列でなければエラー扱いにする
    if (!Array.isArray(data)) {
      console.error('APIから配列が返ってきませんでした:', data);
      return;
    }

    posts = data;
    renderList();
  } catch (err) {
    console.error('fetchPostsエラー:', err);
  }
}





  function renderList() {
  const list = document.getElementById("postList");
  list.innerHTML = "";
  posts.forEach((post, index) => {
    const createdAt = new Date(post.created_at);
    const formattedDate = `${createdAt.getFullYear()}/${createdAt.getMonth() + 1}/${createdAt.getDate()}`;

    const div = document.createElement("div");
    div.className = "post-item";
    div.innerHTML = `<strong>${post.title}</strong><br>${formattedDate} / ${post.author}`;
    div.onclick = () => showDetail(index);
    if (index === selectedIndex) {
      div.style.backgroundColor = "#ddd";
    }
    list.appendChild(div);
  });
}





 function showDetail(index) {
  selectedIndex = index;
  const post = posts[index];
  const createdAt = new Date(post.created_at);
  const formattedCreated = `${createdAt.getFullYear()}/${createdAt.getMonth() + 1}/${createdAt.getDate()}`;

  let detailText = `投稿日: ${formattedCreated}`;
  if (post.updated_at) {
    const updatedAt = new Date(post.updated_at);
    const formattedUpdated = `${updatedAt.getFullYear()}/${updatedAt.getMonth() + 1}/${updatedAt.getDate()}`;
    detailText += `（更新日: ${formattedUpdated}）`;
  }

  document.getElementById("detailTitle").innerText = post.title;
  document.getElementById("detailAuthor").innerText = `投稿者: ${post.author}`;
  document.getElementById("detailDate").innerText = detailText;
  document.getElementById("detailContent").innerText = post.content;
  renderList();
}






  function openModal() {
    document.getElementById("postModal").style.display = "flex";
  }

  function closeModal() {
  document.getElementById("postModal").style.display = "none";
  document.getElementById("newTitle").value = "";
  document.getElementById("newAuthor").value = "";
  document.getElementById("newContent").value = "";
  isEditMode = false;
}


async function submitPost() {
  const title = document.getElementById("newTitle").value.trim();
  const author = document.getElementById("newAuthor").value.trim();
  const content = document.getElementById("newContent").value.trim();

  if (!title || !author || !content)
    return alert("すべての項目を入力してください。");

  const csrfToken = getCsrfToken();

  if (isEditMode && selectedIndex !== null) {
    // ===== PUT =====
    const post = posts[selectedIndex];
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ title, author, content }),
    });

    if (res.status === 403) {
      const err = await res.json();
      alert(err.error);
      return;
    }

    if (!res.ok) {
      alert("記事の更新に失敗しました。");
      return;
    }

    const updatedPost = await res.json();
    posts[selectedIndex] = updatedPost;
    renderList();
    showDetail(selectedIndex);
    alert("記事を更新しました。");

  } else {
    // ===== POST =====
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ title, author, content }),
    });

    if (res.status === 403) {
      const err = await res.json();
      alert(err.error);
      return;
    }

    if (!res.ok) {
      alert("投稿に失敗しました。");
      return;
    }

    const newPost = await res.json();
    posts.unshift(newPost);
    renderList();
    alert("投稿しました。");
  }

  closeModal();
  isEditMode = false;
}




function openEditModal() {
  if (selectedIndex === null) {
    alert("編集する投稿を選択してください。");
    return;
  }

  const post = posts[selectedIndex];
  document.getElementById("newTitle").value = post.title;
  document.getElementById("newAuthor").value = post.author;
  document.getElementById("newContent").value = post.content;

  isEditMode = true; // 編集モードON
  document.getElementById("postModal").style.display = "flex";
}



async function deleteSelected() {
  if (selectedIndex === null) return alert("削除する投稿を選択してください。");

  const post = posts[selectedIndex];

  if (confirm("本当に削除しますか？")) {
    // ✅ CookieからCSRFトークンを取得
    const csrfToken = getCsrfToken();

    const res = await fetch(`/api/posts/${post.id}`, {
      method: "DELETE",
      headers: {
        "X-CSRF-Token": csrfToken, // ← 🔒 CSRFトークンを送信
        "Content-Type": "application/json"
      },
      credentials: "include" // ← 🔑 Cookieを一緒に送る（セッション維持）
    });

    if (res.status === 403) {
  const err = await res.json();
  alert(err.error);
  return;
}


    if (res.ok) {
      posts.splice(selectedIndex, 1);
      selectedIndex = null;
      renderList();
      alert("削除しました。");
    } else {
      alert("削除に失敗しました。");
      console.error("削除エラー:", await res.text());
    }
  }
}


window.onload = () => {
  fetchPosts();

  // ✅ ボタンイベントを安全に登録（CSP対応）
  document.getElementById("openModalBtn").addEventListener("click", openModal);
  document.getElementById("editPostBtn").addEventListener("click", openEditModal);
  document.getElementById("deleteBtn").addEventListener("click", deleteSelected);
  document.getElementById("submitPostBtn").addEventListener("click", submitPost);
  document.getElementById("cancelModalBtn").addEventListener("click", closeModal);
};



//window.onload = fetchPosts;