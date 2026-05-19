// routes/admin.js（ESM）
import express from "express";
import pool from "../models/db.js";

const router = express.Router();

// 🔐 company 必須ガード
router.use((req, res, next) => {
  if (!req.session?.company_id) {
    return res.status(403).json({ error: "company not selected" });
  }
  next();
});


// ==============================
// 現在の設定取得
// ==============================
router.get("/settings", async (req, res) => {
  try {
    const companyId = req.session.company_id;

    const result = await pool.query(
      `
      SELECT 
        cs.current_fiscal_year,
        cs.fiscal_year_closed,
        c.fiscal_start_month
      FROM company_settings cs
      JOIN companies c ON c.id = cs.company_id
      WHERE cs.company_id = $1
      `,
      [companyId]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});


// ==============================
// 年度切替
// ==============================
router.post("/fiscal-year/switch", async (req, res) => {
  const { newYear } = req.body;
  const companyId = req.session.company_id;

  //console.log("年度切替:", newYear);
  //console.log("company_id:", companyId);

  if (!newYear) {
    return res.status(400).json({ message: "newYear が必要です" });
  }

  await pool.query(
    `UPDATE company_settings
     SET current_fiscal_year = $1
     WHERE company_id = $2`,
    [newYear, companyId]
  );

  res.json({ message: `年度を ${newYear} に切り替えました` });
});


// ==============================
// 年度状態取得
// ==============================
router.get("/fiscal-status", async (req, res) => {
  const companyId = req.session.company_id;

  try {
    const result = await pool.query(
      `
      SELECT current_fiscal_year, fiscal_year_closed
      FROM company_settings
      WHERE company_id = $1
      `,
      [companyId]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});


// ==============================
// 年度締め
// ==============================
router.post("/close-year", async (req, res) => {
  const companyId = req.session.company_id;

  try {
    await pool.query(
      `
      UPDATE company_settings
      SET fiscal_year_closed = true
      WHERE company_id = $1
      `,
      [companyId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});


// ==============================
// 年度締め解除
// ==============================
router.post("/open-year", async (req, res) => {
  const companyId = req.session.company_id;

  try {
    await pool.query(
      `
      UPDATE company_settings
      SET fiscal_year_closed = false
      WHERE company_id = $1
      `,
      [companyId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});


// ==============================
// 会社を選択
// ==============================
router.get("/companies", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name FROM companies ORDER BY id"
  );
  res.json(rows);
});

router.post("/select-company", (req, res) => {
  if (req.session.role !== "super_admin") {
    return res.status(403).send("forbidden");
  }

  req.session.company_id = Number(req.body.company_id);
  res.json({ success: true });
});







export default router;