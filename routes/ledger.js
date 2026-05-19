// routes/ledger.js
import express from "express";
import pool from "../models/db.js";  // ← index.js ではなく db.js を参照
import { getCurrentFiscalYear, isFiscalYearClosed } from "../models/fiscal.js";

const router = express.Router();

// 🔹 全件取得・検索・ソート
router.get("/", async (req, res) => {
  const q = req.query.q || "";
  const sort = req.query.sort || "created_desc";
  const department = req.query.department || ""; // ← 追加
  const limit = parseInt(req.query.limit, 10) || 100;

  let orderBy = "created_at DESC";
  if (sort === "created_asc") orderBy = "created_at ASC";
  if (sort === "kouji_asc") orderBy = "kouji_number ASC";
  if (sort === "kouji_desc") orderBy = "kouji_number DESC";

  try {
    const fiscalYear = req.fiscalYear;

    const sql = `
      SELECT *
      FROM ledger
      WHERE fiscal_year = $1

      -- 🔥 部門フィルタ追加
      AND ($2 = '' OR department = $2)

      -- 🔥 検索
      AND (
        kouji_number ILIKE $3
        OR client ILIKE $3
        OR construction ILIKE $3
      )

      ORDER BY ${orderBy}
      LIMIT $4
    `;

    const { rows } = await pool.query(sql, [
      fiscalYear,
      department,
      `%${q}%`,
      limit
    ]);

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "データ取得エラー" });
  }
});


// 🔹 新規登録
router.post("/", async (req, res) => {
  const data = req.body;

  const year =
    Number(data.kouji_number?.slice(0, 4)) ||
    await getCurrentFiscalYear();

  if (await isFiscalYearClosed(year)) {
    return res.status(403).json({ error: "締め年度のデータは編集できません" });
  }

  try {
    const allowedColumns = [
      "department",
      "kouji_number",
      "remarks",
      "hkt39number",
      "reciveday",
      "client",
      "construction",
      "shipnumber",
      "tec_dep",
      "incharge",
      "comp_date1",
      "note",
      "p_amount",
      "transport_ex",
      "o_amount",
      "determ_amount",
      "comp_date2",
      "claim",
      "pub_date",
      "d_amount",
      "bill_amount",
      "deposit_total",
      "bill_transfer",
      "bank_name",
      "offset_amount",
      "transfer_amount",
      "depo_date1",
      "bill_amount2",
      "depo_date2",
      "cash",
      "depo_date3",
      "check",
      "depo_date4"
    ];

    // ⭐ ① whitelist
    const keys = Object.keys(data).filter(k =>
      allowedColumns.includes(k)
    );

    // ⭐ ② values は keys から作る
    const values = keys.map(k => data[k]);

    // ⭐ ③ placeholders
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      INSERT INTO ledger (${keys.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

    const { rows } = await pool.query(sql, values);

    res.json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "登録エラー" });
  }
});


// 🔹 更新
// 🔹 更新
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const year =
    Number(data.kouji_number?.slice(0, 4)) ||
    await getCurrentFiscalYear();

  if (await isFiscalYearClosed(year)) {
    return res.status(403).json({
      error: "締め年度のデータは編集できません"
    });
  }

  try {
    const allowedColumns = [
      "department",
      "kouji_number",
      "remarks",
      "hkt39number",
      "reciveday",
      "client",
      "construction",
      "shipnumber",
      "tec_dep",
      "incharge",
      "comp_date1",
      "note",
      "p_amount",
      "transport_ex",
      "o_amount",
      "determ_amount",
      "comp_date2",
      "claim",
      "pub_date",
      "d_amount",
      "bill_amount",
      "deposit_total",
      "bill_transfer",
      "bank_name",
      "offset_amount",
      "transfer_amount",
      "depo_date1",
      "bill_amount2",
      "depo_date2",
      "cash",
      "depo_date3",
      "check",
      "depo_date4"
    ];

    // ⭐ whitelist
    const keys = Object.keys(data).filter(k =>
      allowedColumns.includes(k)
    );

    if (!keys.length) {
      return res.status(400).json({ error: "更新対象がありません" });
    }

    // ⭐ valuesをkeys順で生成
    const values = keys.map(k => data[k]);

    // ⭐ SET句生成
    const setClause = keys
      .map((k, i) => `${k}=$${i + 1}`)
      .join(", ");

    // ⭐ id追加
    values.push(id);

    const sql = `
      UPDATE ledger
      SET ${setClause},
          updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;

    const { rows } = await pool.query(sql, values);

    res.json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "更新エラー" });
  }
});

// 🔹 削除
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query("SELECT kouji_number FROM ledger WHERE id=$1", [id]);
    if (!rows.length) return res.status(404).json({ error: "データが存在しません" });

    const year =
  Number(rows[0].kouji_number?.slice(0, 4)) ||
  await getCurrentFiscalYear();
    if (await isFiscalYearClosed(year)) {
      return res.status(403).json({ error: "締め年度のデータは削除できません" });
    }

    await pool.query("DELETE FROM ledger WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "削除エラー" });
  }
});

export default router;
