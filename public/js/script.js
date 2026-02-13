document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");

  let current = new Date();
  let currentMonth = current.getMonth();
  let currentYear = current.getFullYear();

  // 祝日（簡易版）: key = 'YYYY-MM-DD'
  const holidays = {
    '2025-01-01': '元日',
    '2025-01-13': '成人の日',
    '2025-02-11': '建国記念の日',
    '2025-02-23': '天皇誕生日',
    '2025-03-20': '春分の日',
    '2025-04-29': '昭和の日',
    '2025-05-03': '憲法記念日',
    '2025-05-04': 'みどりの日',
    '2025-05-05': 'こどもの日',
    '2025-07-21': '海の日',
    '2025-08-11': '山の日',
    '2025-09-15': '敬老の日',
    '2025-09-23': '秋分の日',
    '2025-10-13': 'スポーツの日',
    '2025-11-03': '文化の日',
    '2025-11-23': '勤労感謝の日',
  };

  function pad(n) {
    return n < 10 ? '0' + n : n;
  }

  function renderCalendar(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月",
                        "7月", "8月", "9月", "10月", "11月", "12月"];
    const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];

    let html = `<div style="display: flex; justify-content: space-between; align-items: center;">
                  <button id="prevMonth">&lt;</button>
                  <h3>${year}年 ${monthNames[month]}</h3>
                  <button id="nextMonth">&gt;</button>
                </div>`;

    html += `<table style="width: 100%; border-collapse: collapse; text-align: center;">`;
    html += "<thead><tr>";
    for (let d of daysOfWeek) {
      html += `<th>${d}</th>`;
    }
    html += "</tr></thead><tbody><tr>";

    // 空白挿入
    for (let i = 0; i < firstDay.getDay(); i++) {
      html += "<td></td>";
    }

    // 日付の描画
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const dayOfWeek = date.getDay(); // 0=日曜, 6=土曜

      // 日付を "YYYY-MM-DD" 形式に変換
      const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
      const isHoliday = holidays.hasOwnProperty(dateStr);

      let color = "#000"; // デフォルト黒
      if (isHoliday || dayOfWeek === 0) {
        color = "red";
      } else if (dayOfWeek === 6) {
        color = "blue";
      }

      html += `<td style="color: ${color};${isToday ? ' background-color: #cce5ff; font-weight: bold;' : ''}">${day}</td>`;

      if (dayOfWeek === 6 && day !== lastDay.getDate()) {
        html += "</tr><tr>";
      }
    }

    html += "</tr></tbody></table>";
    calendarEl.innerHTML = html;

    document.getElementById("prevMonth").onclick = () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar(currentYear, currentMonth);
    };

    document.getElementById("nextMonth").onclick = () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar(currentYear, currentMonth);
    };
  }

  renderCalendar(currentYear, currentMonth);
});
