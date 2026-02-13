import pool from '../models/db.js';
import express from "express";
import { checkFiscalOpen } from "../middlewares/checkFiscalOpen.js";

const router = express.Router();

// 保存（新規作成 or 上書き）
router.post(
  "/", 
  checkFiscalOpen, // 🔒 追加
  async (req, res) => {
  const { kouji_number, materials, labor, outsourcing } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO costs (kouji_number, materials, labor, outsourcing)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (kouji_number) DO UPDATE
       SET materials = EXCLUDED.materials,
           labor = EXCLUDED.labor,
           outsourcing = EXCLUDED.outsourcing,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [kouji_number, materials, labor, outsourcing]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("保存エラー");
  }
});

// 更新（PUT）
router.put(
  "/:kouji_number", 
  checkFiscalOpen, // 🔒 追加
  async (req, res) => {
  const { kouji_number } = req.params;
  const { materials, labor, outsourcing } = req.body;

  try {
    const result = await pool.query(
      `UPDATE costs
       SET materials = $1,
           labor = $2,
           outsourcing = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE kouji_number = $4
       RETURNING *`,
      [materials, labor, outsourcing, kouji_number]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("対象データがありません");
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("更新エラー");
  }
});

// 取得（GET）
router.get("/:kouji_number", async (req, res) => {
  const { kouji_number } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM costs WHERE kouji_number = $1",
      [kouji_number]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).send("取得エラー");
  }
});

export default router;
