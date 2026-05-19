// routes/orderdata.js

import express from "express";
import pool from "../models/db.js";

const router = express.Router();


// --------------------
// ① 注文一覧取得
// --------------------
router.get("/", async (req, res) => {
  try {

    const q = req.query.q || "";
    const search = `%${q}%`;

    const sql = `
      SELECT *
      FROM orderdata
      WHERE company_id = $1
        AND fiscal_year = $2
        AND (
          $3 = '' OR
          kouji_number ILIKE $3 OR
          supplier ILIKE $3 OR
          product_name ILIKE $3
        )
      ORDER BY id DESC
      LIMIT 200
    `;

    const result = await pool.query(sql, [
      req.session.company_id,
      req.fiscalYear,
      q === "" ? "" : search
    ]);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "database error" });
  }
});


// --------------------
// ② 新規注文登録
// --------------------
router.post("/", async (req, res) => {

  try {

    const {
      order_name,
      order_date,
      amount
    } = req.body;

    const sql = `
      INSERT INTO orderdata
      (order_name, order_date, amount, company_id, fiscal_year)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(sql, [
      order_name,
      order_date,
      amount,
      req.session.company_id, req.fiscalYear
    ]);

    res.status(201).json(result.rows[0]);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "insert error" });

  }

});


// --------------------
// ③ 注文更新
// --------------------
router.put("/:id", async (req, res) => {

  try {

    const id = Number(req.params.id);
    const fields = req.body;

    const set = [];
    const values = [];
    let i = 1;

    for (const k in fields) {

      // company_id 書き換え禁止
      if (k === "company_id") continue;

      set.push(`${k} = $${i++}`);
      values.push(fields[k]);

    }

    values.push(id);
    values.push(req.session.company_id);

    const sql = `
      UPDATE orderdata
      SET ${set.join(", ")}, updated_at = now()
      WHERE id = $${i} AND company_id = $${i + 1}
      RETURNING *
    `;

    const result = await pool.query(sql, values);

    if (!result.rows[0]) {
      return res.status(404).json({ error: "data not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "update error" });

  }

});


// --------------------
// ④ 注文削除
// --------------------
router.delete("/:id", async (req, res) => {

  try {

    const result = await pool.query(
      "DELETE FROM orderdata WHERE id = $1 AND company_id = $2",
      [Number(req.params.id), req.session.company_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "data not found" });
    }

    res.sendStatus(204);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "delete error" });

  }

});

export default router;