import express from "express";
const router = express.Router();

// 自社情報取得
router.get("/me", async (req, res) => {

  const result = await req.db.query(
    `SELECT name FROM companies WHERE id = $1`,
    [req.session.company_id]
  );

  res.json(result.rows[0]);
});

export default router;