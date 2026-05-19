import express from "express";
import pool from "../models/db.js";

const router = express.Router();

// 会社一覧
router.get("/", async (req,res)=>{

  const result = await pool.query(
    "SELECT id, name, fiscal_start_month FROM companies ORDER BY id"
  );

  res.json(result.rows);

});

// 会社追加
router.post("/", async (req,res)=>{
  const {name} = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 会社追加
    const result = await client.query(
      `INSERT INTO companies
       (name, fiscal_start_month)
       VALUES ($1,4)
       RETURNING *`,
      [name]
    );

    const newCompanyId = result.rows[0].id;

    // company_settings 初期作成（例: 今年度を初期値）
    const fiscalYear = new Date().getFullYear();
    await client.query(
      `INSERT INTO company_settings
       (company_id, current_fiscal_year, fiscal_year_closed)
       VALUES ($1, $2, false)`,
      [newCompanyId, fiscalYear]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send("会社追加エラー");
  } finally {
    client.release();
  }
});

// 削除
router.delete("/:id", async (req,res)=>{

  await pool.query(
    "DELETE FROM companies WHERE id=$1",
    [req.params.id]
  );

  res.sendStatus(204);

});

// 会社更新
router.put("/:id", async (req, res) => {
  const { name, fiscal_start_month } = req.body;
  const { id } = req.params;

  const result = await pool.query(
    "UPDATE companies SET name=$1, fiscal_start_month=$2 WHERE id=$3 RETURNING *",
    [name, fiscal_start_month, id]
  );
  res.json(result.rows[0]);
});



export default router;