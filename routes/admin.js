// routes/admin.js（ESM）
import express from "express";
import pool from "../models/db.js";

const router = express.Router();

// 現在の settings を取得

router.get("/settings", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         current_fiscal_year,
         fiscal_start_month,
         fiscal_year_closed
       FROM settings
       WHERE id = 1`
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});


// 年度切替
router.post("/fiscal-year/switch", async (req, res) => {
  const { newYear } = req.body;

  if (!newYear) {
    return res.status(400).json({ message: "newYear が必要です" });
  }

  await pool.query(
    "UPDATE settings SET current_fiscal_year = $1",
    [newYear]
  );

  res.json({ message: `年度を ${newYear} に切り替えました` });
});






/**
 * 現在の年度状態を取得
 */
router.get("/fiscal-status", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT current_fiscal_year, fiscal_year_closed
       FROM settings
       WHERE id = 1`
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

/**
 * 年度を締める
 */
router.post("/close-year", async (_req, res) => {
  try {
    await pool.query(
      `UPDATE settings
       SET fiscal_year_closed = true
       WHERE id = 1`
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});


/**
 * 年度締め解除
 */
router.post("/open-year", async (_req, res) => {
  try {
    await pool.query(
      `UPDATE settings
       SET fiscal_year_closed = false
       WHERE id = 1`
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});






export default router;




