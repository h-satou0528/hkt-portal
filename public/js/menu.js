document.addEventListener("DOMContentLoaded", () => {
  // 時計更新
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const clockElement = document.getElementById("clock");
    if (clockElement) {
      clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // iframe切替（ボタンにdata-path属性を使う）
  const buttons = document.querySelectorAll("button[data-path]");
  const frame = document.getElementById("content-frame");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const path = btn.getAttribute("data-path");
      if (frame && path) {
        frame.src = path;
      }
    });
  });
});
