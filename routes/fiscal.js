import express from "express";
const router = express.Router();

// ------------------------------
// GET 現在年度
// ------------------------------
router.get("/", async (req, res) => {

  const result = await req.db.query(
    `SELECT current_fiscal_year, fiscal_year_closed
     FROM company_settings
     WHERE company_id = $1`,
    [req.session.company_id]
  );

  const row = result.rows[0];

  res.json({
    year: row.current_fiscal_year,
    closed: row.fiscal_year_closed
  });
});

// ------------------------------
// PUT 年度変更
// ------------------------------
router.put("/", async (req, res) => {

  const { year } = req.body;

  await req.db.query(
    `UPDATE company_settings
     SET current_fiscal_year = $1
     WHERE company_id = $2`,
    [year, req.session.company_id]
  );

  res.json({ ok: true });
});

// ------------------------------
// POST 締め切替
// ------------------------------
router.post("/close", async (req, res) => {

  await req.db.query(
    `UPDATE company_settings
     SET fiscal_year_closed = NOT fiscal_year_closed
     WHERE company_id = $1`,
    [req.session.company_id]
  );

  res.json({ ok: true });
});

export default router;