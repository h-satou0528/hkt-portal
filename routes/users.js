import express from "express";
import bcrypt from "bcrypt";

const router = express.Router();

// ==========================
// 一覧
// ==========================
router.get("/", async (req, res) => {

  const companyId = req.session.company_id;

  const { rows } = await req.db.query(
    "SELECT id, username, role FROM users WHERE company_id = $1 ORDER BY id",
    [req.session.company_id]
  );

  res.json(rows);
});

// ==========================
// 作成
// ==========================
router.post("/", async (req, res) => {

  const { username, password, role } = req.body;
  const companyId = req.session.company_id;

  const hash = await bcrypt.hash(password, 10);

  // 🔥 ここ追加
  let account_type = "company_user";
  if (role === "admin") {
    account_type = "company_admin";
  }

  const { rows } = await req.db.query(
    `
    INSERT INTO users (username, password_hash, company_id, role, account_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, username, role, account_type
    `,
    [username, hash, companyId, role, account_type]
  );

  res.json(rows[0]);
});

// ==========================
// 更新
// ==========================
router.put("/:id", async (req, res) => {

  const id = Number(req.params.id);
  const { username, role } = req.body;
  const companyId = req.session.company_id;

  const { rows } = await req.db.query(
    `
    UPDATE users
    SET username = $1, role = $2
    WHERE id = $3 AND company_id = $4
    RETURNING id, username, role
    `,
    [username, role, id, companyId]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "not found" });
  }

  res.json(rows[0]);
});

// ==========================
// 削除
// ==========================
router.delete("/:id", async (req, res) => {

  const id = Number(req.params.id);
  const companyId = req.session.company_id;

  const result = await req.db.query(
    "DELETE FROM users WHERE id = $1 AND company_id = $2",
    [id, companyId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: "not found" });
  }

  res.sendStatus(204);
});

export default router;