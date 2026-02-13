document.addEventListener("DOMContentLoaded", function () {
    const table = document.createElement("table");
    table.border = "1";
    table.style.textAlign = "center";

    
    // 今日の日付を取得
    const today = new Date();
    
    // 曜日リスト
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    
    // 左側の固定文字
    const leftColumnLabels = ["日　　付", "曜　　日"];
    
    // 日にちの行を追加
    const dateRow = document.createElement("tr");
    const dateLabel = document.createElement("td");
    dateLabel.rowSpan = 1;
    dateLabel.colSpan = 3;
    dateLabel.textContent = leftColumnLabels[0];
    dateRow.appendChild(dateLabel);



    for (let col = 0; col < 7; col++) {
        const td = document.createElement("td");
        let date = new Date();
        date.setDate(today.getDate() + col);



        td.textContent = weekdays[date.getDay()];  // 曜日を設定

        // ★ 土曜日 (6) → 青色、日曜日 (0) → 赤色
        if (date.getDay() === 6) {
            td.style.backgroundColor = "#8EB8FF";
            td.style.color = "white";  // 文字色を白にすると見やすい
        } else if (date.getDay() === 0) {
            td.style.backgroundColor = "#FFAAFF";
            td.style.color = "white";
        }





        
        td.textContent = `${date.getMonth() + 1}/${date.getDate()}`;
        dateRow.appendChild(td);
    }
    table.appendChild(dateRow);
    
    
    
    
    
    
    // 曜日の行を追加（スケジュールの枠なし）
    const dayRow = document.createElement("tr");
    const dayLabel = document.createElement("td");


    dayLabel.rowSpan = 1;
    dayLabel.colSpan = 3;
    dayLabel.textContent = leftColumnLabels[1];
    dayRow.appendChild(dayLabel);
    for (let col = 0; col < 7; col++) {

        const td = document.createElement("td");
        let date = new Date();
        date.setDate(today.getDate() + col);



        td.textContent = weekdays[date.getDay()];  // 曜日を設定

        // ★ 土曜日 (6) → 青色、日曜日 (0) → 赤色
        if (date.getDay() === 6) {
            td.style.backgroundColor = "#8EB8FF";
            td.style.color = "white";  // 文字色を白にすると見やすい
        } else if (date.getDay() === 0) {
            td.style.backgroundColor = "#FFAAFF";
            td.style.color = "white";
        }




        td.textContent = weekdays[date.getDay()];
        dayRow.appendChild(td);
    }
    table.appendChild(dayRow);
    
    const statuses = ["", "　　　中　　止　　　", "07:40～", "16:00～", "16:30～", "17:00～", "17:30～", "18:00～"];
    const meetingLabels = ["全体ミーティング", "四半期上会議", "月末会議", "週末ミーテイング"];





     
    // 追加する新しい表（全体ミーティング、四半期会議、月末会議、週末ミーテイングミーティング + プルダウン）
    for (let row = 0; row < 4; row++){
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        
        td.textContent = meetingLabels[row];
        td.colSpan = 3;//  各行のセルを 3セル分に結合する

        tr.appendChild(td);


	//ミーティング枠を増やす< 1→0、3→7に変更
        for (let col = 0; col < 7; col++) {
            const td = document.createElement("td");
            const select = document.createElement("select");


            statuses.forEach(status => {


                const option = document.createElement("option");
                option.value = status;
                option.textContent = status;
                select.appendChild(option);
            });
            select.addEventListener("change", function () {
                updateDatabase(`案表-${row}`, col, select.value);
            });
            td.appendChild(select);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    // 元の表（名前 + 勤務状況）
    const mainStatuses = ["", "社内", "現場", "夜勤","出", "休", "夜", "見", "会", "客", "講習", "アナ", "C2", "組", "計"];
    const leftMainHeaders = ["部　　署　　名　", "出 勤 場 所　", "氏　　　　名　", "AM ／ PM", "AM ／ PM", "AM ／ PM", "AM ／ PM", "AM ／ PM", "AM ／ PM", "AM ／ PM"];
    const leftMainValues = [
        ["株斗【総務部】", "本　社", "久夫"],
        ["", "〃", "三美"],
        ["", "内場", "渡都"],
        ["株斗【経理部】", "本　社", "古明"],
        ["", "〃", "永治"],
        ["株斗【営業部】", "本　社", "大文"],
        ["", "内場", "菊雄"],
        ["", "〃", "佐"],
        ["株斗【第術部】", "本　社", "日一"],
        ["", "〃", "若幸"],
        ["", "〃", "丸之"],
        ["", "〃", "槌真"],
        ["", "〃", "宗樹"],
        ["", "〃", "御地"],
        ["", "〃", "佐"],
        ["", "〃", "檜理"],
        ["", "〃", "高央"],
        ["株斗【第術部】", "内川工場", "山之"],
        ["", "〃", "堀貴"],
        ["", "〃", "島彦"],
        ["", "〃", "庄忠"],
        ["", "〃", "陶譲"],
        ["", "〃", "渡彦"],
        ["", "〃", "石之"],
        ["", "〃", "津郎"],
        ["", "〃", "北一"],
        ["", "〃", "大衣"],
        ["", "〃", "大二"],
        ["", "〃", "吉道"],
        ["", "〃", "伊良"],
        ["", "〃", "北人"],
        ["", "〃", "長彦"],
        ["", "〃", "塩夫"],
        ["", "ベース", "遊治"],
        ["", "〃", "山正"],
        ["", "〃", "鈴里"],
        ["", "追　", "市介"],
        ["", "〃", "石一"],
        ["", "〃", "栄志"],
        ["", "〃", "山一"],
        ["", "函所", "長俊"],
        ["", "〃", "渡樹"],
        ["", "〃", "田美"],
        ["", "〃", "星敏"],
        ["有電設", "本社(斗)", "小之"],
        ["", "〃", "高敏"],
        ["", "〃", "山幸"],
        ["", "〃", "中歩"],
        ["", "〃", "三博"],
        ["", "ベース", "菊尚"]
    ];
    
    // ヘッダー行を作成
    const headerRow = document.createElement("tr");
    leftMainHeaders.forEach(header => {
        const th = document.createElement("th");
        th.style.backgroundColor = "#AEFFBD";//MainGeadersの行に色を設定
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    for (let row = 0; row < 49; row++) {
        const tr = document.createElement("tr");

        for (let col = 0; col < 3; col++) {
            const td = document.createElement("td");
            td.textContent = leftMainValues[row][col];
            tr.appendChild(td);
        }
        for (let col = 0; col < 7; col++) {
            const td = document.createElement("td");
            const selectContainer = document.createElement("div");
            selectContainer.style.display = "flex";
            
            for (let i = 0; i < 2; i++) {
                const select = document.createElement("select");
                mainStatuses.forEach(status => {
                    const option = document.createElement("option");
                    option.value = status;
                    option.textContent = status;
                    select.appendChild(option);
                });
                select.addEventListener("change", function () {
                    updateDatabase(`勤務表-${row}`, col, select.value);
                });
                selectContainer.appendChild(select);
            }
            td.appendChild(selectContainer);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    document.body.appendChild(table);



    // 保存
localStorage.setItem("userInput", document.getElementById("myInput").value);

// 取得
document.getElementById("myInput").value = localStorage.getItem("userInput") || "";





});

function updateDatabase(tableId, col, status) {
    fetch("/api/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, col, status })
    })
    .then(response => response.json())
    .then(data => console.log("Updated:", data))
    .catch(error => console.error("Error:", error)); 
}
