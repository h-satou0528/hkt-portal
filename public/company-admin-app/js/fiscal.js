import { loadCompanyName } from "./common.js";

loadCompanyName();

async function loadFiscal() {
  const res = await fetch("/api/company/fiscal", {
    credentials: "include"
  });

  const data = await res.json();

  document.getElementById("currentYear").innerText = data.year;

  // ⭐ プルダウン生成
  const select = document.getElementById("yearSelect");
  select.innerHTML = "";

  for (let y = data.year - 2; y <= data.year + 2; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = `${y}年度`;

    if (y === data.year) opt.selected = true;

    select.appendChild(opt);
  }

  document.getElementById("status").innerText =
    data.closed ? "状態: 締め済み 🔒" : "状態: 開放中 🔓";
}

async function updateYear() {
  const year = document.getElementById("yearSelect").value;

  await fetch("/api/company/fiscal", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ year })
  });

  alert("年度を切替しました");
  loadFiscal();
}

async function toggleClose() {
  await fetch("/api/company/fiscal/close", {
    method: "POST",
    credentials: "include"
  });

  alert("状態を変更しました");
  loadFiscal();
}

loadFiscal();

// 一番下に追加
window.updateYear = updateYear;
window.toggleClose = toggleClose;