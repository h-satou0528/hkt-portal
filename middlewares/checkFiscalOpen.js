import pool from "../models/db.js";

export async function checkFiscalOpen(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT fiscal_year_closed FROM settings WHERE id = 1`
    );

    if (result.rows[0].fiscal_year_closed) {
      return res.status(403).json({
        error: "この年度は締められているため操作できません"
      });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "年度状態の確認に失敗しました" });
  }
}
