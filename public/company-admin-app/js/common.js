export async function loadCompanyName() {
  const res = await fetch("/api/company/me", {
    credentials: "include"
  });

  const data = await res.json();

  const el = document.getElementById("companyName");
  if (el) {
    el.innerText = `🏢 ${data.name}`;
  }
}