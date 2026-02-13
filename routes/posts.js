import express from "express";
import db from "../models/db.js";
import { checkFiscalOpen } from "../middlewares/checkFiscalOpen.js";

const router = express.Router();

// ==============================
// GET 全件取得（年度別）
// ※ 閲覧は締め年度でもOK
// ==============================
router.get("/", async (req, res) => {
  const fiscalYear = req.fiscalYear;

  try {
    const result = await db.query(
      "SELECT * FROM posts WHERE fiscal_year = $1 ORDER BY created_at DESC",
      [fiscalYear]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/posts エラー:", err);
    res.status(500).json({ error: "サーバーエラー" });
  }
});


// ==============================
// POST 新規作成（年度付き）
// 🔒 締め年度は 403
// ==============================
router.post("/", checkFiscalOpen, async (req, res) => {



  const { title, author, content } = req.body;
  const fiscalYear = req.fiscalYear;

  try {
    const result = await db.query(
      `INSERT INTO posts (title, author, content, fiscal_year)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, author, content, fiscalYear]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/posts エラー:", err);
    res.status(500).json({ error: "投稿の作成に失敗しました。" });
  }
});

// ==============================
// PUT 投稿を更新（同一年度のみ）
// 🔒 締め年度は 403
// ==============================
router.put("/:id", checkFiscalOpen, async (req, res) => {
  const { id } = req.params;
  const { title, author, content } = req.body;
  const fiscalYear = req.fiscalYear;

  try {
 
    const result = await db.query(
      `UPDATE posts
       SET title = $1, author = $2, content = $3, updated_at = NOW()
       WHERE id = $4 AND fiscal_year = $5
       RETURNING *`,
      [title, author, content, id, fiscalYear]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "指定された投稿が見つかりません。" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/posts/:id エラー:", err);
    res.status(500).json({ error: "記事の更新に失敗しました。" });
  }
});

// ==============================
// DELETE 削除（同一年度のみ）
// 🔒 締め年度は 403
// ==============================
router.delete("/:id", checkFiscalOpen, async (req, res) => {
  const { id } = req.params;
  const fiscalYear = req.fiscalYear;

  try {
    await db.query(
      "DELETE FROM posts WHERE id = $1 AND fiscal_year = $2",
      [id, fiscalYear]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("DELETE /api/posts/:id エラー:", err);
    res.status(500).json({ error: "削除に失敗しました。" });
  }
});

export default router;
