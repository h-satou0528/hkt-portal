// routes/performance_sheets.js
import express from "express";
import pool from "../models/db.js";
import { checkFiscalOpen } from "../middlewares/checkFiscalOpen.js";


const router = express.Router();

router.use((req, res, next) => {
  if (!req.session?.company_id) {
    return res.status(403).json({ error: "company not set" });
  }
  next();
});

// ------------------------
// 新規保存 (INSERT)
// ------------------------
router.post(
  "/", 
  checkFiscalOpen, // 🔒 追加
  async (req, res) => {
    const companyId = req.session.company_id;

    //console.log("POST /api/performance_sheets 実行", req.body.kouji_number);

  try {
    let {
      kouji_number,
      kouji_supplier,
      kouji_kenmei,
      start_date,
      end_date,
      contract_amount,
      budget_limit,
      effective_date,
      result_date,
      kaichou_up, kaichou_down,
      shachou_up, shachou_down,
      torishimari_up, torishimari_down,
      soumu_up, soumu_down,
      buchou_up, buchou_down,
      hakkousha_up, hakkousha_down,
      comments
    } = req.body;

    // ✅ 空文字なら null にする（PostgreSQLのDATE対策）
    start_date     = start_date     === "" ? null : start_date;
    end_date       = end_date       === "" ? null : end_date;
    effective_date = effective_date === "" ? null : effective_date;
    result_date    = result_date    === "" ? null : result_date;

    // ✅ セルの値収集
    const columnList = [];
    const cellValues = [];

    for (let row = 1; row <= 19; row++) {
      for (let col of "abcdefghijklmn") {
        const key = `${col}${row}`;
        columnList.push(key);
        cellValues.push(req.body[key] || "");
      }
    }

    
    // ✅ INSERT文の発行
    await pool.query(
      `INSERT INTO performance_sheets (
        kouji_number, kouji_supplier, kouji_kenmei,
        start_date, end_date, contract_amount, budget_limit,
        effective_date, result_date,
        kaichou_up, kaichou_down,
        shachou_up, shachou_down,
        torishimari_up, torishimari_down,
        soumu_up, soumu_down,
        buchou_up, buchou_down,
        hakkousha_up, hakkousha_down,
        comments,
        company_id,   -- ★追加
        ${columnList.join(", ")}
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23,
        ${cellValues.map((_, idx) => `$${idx + 24}`).join(", ")}
      )`,
      [
        kouji_number,
        kouji_supplier,
        kouji_kenmei,
        start_date,
        end_date,
        contract_amount,
        budget_limit,
        effective_date,
        result_date,
        kaichou_up, kaichou_down,
        shachou_up, shachou_down,
        torishimari_up, torishimari_down,
        soumu_up, soumu_down,
        buchou_up, buchou_down,
        hakkousha_up, hakkousha_down,
        comments, companyId,
        ...cellValues
      ]
    );

    res.status(201).json({ message: "保存成功" });
  } catch (err) {
    console.error("保存エラー:", err);
    res.status(500).json({ error: "DBエラー" });
  }
});





// ------------------------
// 上書き保存 (UPDATE)
// ------------------------
router.put(
  "/:id", 
  checkFiscalOpen, // 🔒 追加
  async (req, res) => {
  const { id } = req.params;
  const companyId = req.session.company_id;
  //console.log("PUT /api/performance_sheets 実行 id", id);

  try {
    let {
      kouji_supplier,
      kouji_kenmei,
      start_date,
      end_date,
      contract_amount,
      budget_limit,
      effective_date,
      result_date,
      kaichou_up, kaichou_down,
      shachou_up, shachou_down,
      torishimari_up, torishimari_down,
      soumu_up, soumu_down,
      buchou_up, buchou_down,
      hakkousha_up, hakkousha_down,
      comments
    } = req.body;

    // === 空文字は null に変換 ===
    start_date     = start_date     || null;
    end_date       = end_date       || null;
    effective_date = effective_date || null;
    result_date    = result_date    || null;

    // integer のみ数値 or null にする
    contract_amount = contract_amount ? parseInt(contract_amount, 10) : null;
    budget_limit    = budget_limit ? parseInt(budget_limit, 10) : null;

    // スプレッドシート用
    const columnList = [];
    const cellValues = [];
    for (let row = 1; row <= 19; row++) {
      for (let col of "abcdefghijklmn") {
        const key = `${col}${row}`;
        columnList.push(`${key} = $${cellValues.length + 22}`);
        let val = req.body[key];
        // 空文字は null に
        cellValues.push(val === "" ? null : val);
      }
    }

    await pool.query(
      `UPDATE performance_sheets SET
        kouji_supplier=$1, kouji_kenmei=$2,
        start_date=$3, end_date=$4,
        contract_amount=$5, budget_limit=$6,
        effective_date=$7, result_date=$8,
        kaichou_up=$9, kaichou_down=$10,
        shachou_up=$11, shachou_down=$12,
        torishimari_up=$13, torishimari_down=$14,
        soumu_up=$15, soumu_down=$16,
        buchou_up=$17, buchou_down=$18,
        hakkousha_up=$19, hakkousha_down=$20,
        comments=$21,
        ${columnList.join(", ")}
      WHERE id=$${22 + cellValues.length}
      AND company_id=$${23 + cellValues.length}`,
      [
        kouji_supplier,
        kouji_kenmei,
        start_date, end_date,
        contract_amount, budget_limit,
        effective_date, result_date,
        kaichou_up, kaichou_down,
        shachou_up, shachou_down,
        torishimari_up, torishimari_down,
        soumu_up, soumu_down,
        buchou_up, buchou_down,
        hakkousha_up, hakkousha_down,
        comments,
        ...cellValues,
        id,   // ✅ id は最後
        companyId   // ★最後に追加
      ]
    );

    res.json({ message: "更新成功", id });

  } catch (err) {
    console.error("更新エラー:", err);
    res.status(500).json({ error: "DBエラー" });
  }
});




// ------------------------
// 個別取得（最新1件・全カラム）
// ------------------------
//router.get("/:kouji_number", async (req, res) => {
//  try {
//    const { kouji_number } = req.params;
//    const companyId = req.session.company_id; // ★必須

//    const result = await pool.query(
//      `SELECT *
//       FROM performance_sheets
//       WHERE kouji_number = $1
//         AND company_id = $2
//       ORDER BY id DESC
//       LIMIT 1`,
//      [kouji_number, companyId]
//    );

//    if (result.rows.length === 0) {
//      return res.json({});
//    }

//    res.json(result.rows[0]);
//  } catch (err) {
//    console.error("GETエラー:", err);
//    res.status(500).json({ error: "DBエラー" });
//  }
//});

// ------------------------
// 全件リスト取得（工事番号 + 承認・発行12項目）
// ------------------------
//router.get("/", async (req, res) => {
//  try {
//    const companyId = req.session.company_id; // ★必須

//    const result = await pool.query(
//      `SELECT 
//        kouji_number,
//        kaichou_up, shachou_up, torishimari_up, soumu_up, buchou_up, hakkousha_up,
//        kaichou_down, shachou_down, torishimari_down, soumu_down, buchou_down, hakkousha_down
//       FROM performance_sheets
//       WHERE company_id = $1
//       ORDER BY id DESC`,
//      [companyId]
//    );

//    res.json(result.rows);
//  } catch (err) {
//    console.error("一覧取得エラー:", err);
//    res.status(500).json({ error: "DBエラー" });
//  }
//});

// ------------------------
// 全件リスト取得（軽量版）
// ------------------------
router.get("/", async (req, res) => {
  try {
    const companyId = req.session.company_id;

    const result = await pool.query(
      `SELECT 
        kouji_number,
        kouji_kenmei,
        kaichou_up, shachou_up, torishimari_up, soumu_up, buchou_up, hakkousha_up,
        kaichou_down, shachou_down, torishimari_down, soumu_down, buchou_down, hakkousha_down
       FROM performance_sheets
       WHERE company_id = $1
       ORDER BY id DESC`,
      [companyId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("一覧取得エラー:", err);
    res.status(500).json({ error: "DBエラー" });
  }
});


// ------------------------
// 詳細取得（モーダル用）
// ------------------------
router.get("/detail/:kouji_number", async (req, res) => {
  try {
    const { kouji_number } = req.params;
    const companyId = req.session.company_id;

    const result = await pool.query(
      `SELECT *
       FROM performance_sheets
       WHERE kouji_number = $1
         AND company_id = $2
       ORDER BY id DESC
       LIMIT 1`,
      [kouji_number, companyId]
    );

    if (result.rows.length === 0) {
      return res.json({});
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("詳細取得エラー:", err);
    res.status(500).json({ error: "DBエラー" });
  }
});






export default router;