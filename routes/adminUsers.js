import express from "express";
import bcrypt from "bcrypt";

const router = express.Router();

// ==========================
// 一覧（全社）
/*
  users + companies JOIN
*/
// ==========================
router.get("/", async (req, res) => {

  if (req.session.account_type !== "super_admin") {
    return res.status(403).json({ error: "forbidden" });
  }

  const { rows } = await req.db.query(`
  SELECT 
    u.id,
    u.username AS name,
    u.role,
    u.company_id,
    c.name AS company_name
  FROM users u
  LEFT JOIN companies c ON u.company_id = c.id
  ORDER BY u.id
`);

  res.json(rows);
});

// ==========================
// 作成
// ==========================
router.post("/", async (req, res) => {

  if (req.session.account_type !== "super_admin") {
    return res.status(403).json({ error: "forbidden" });
  }

  const { name, password, company_id, role } = req.body;

  const hash = await bcrypt.hash(password, 10);

  // 🔥 ここ追加
  let account_type = "company_user";
  if (role === "admin") {
    account_type = "company_admin";
  }

  const { rows } = await req.db.query(`
    INSERT INTO users (username, password_hash, company_id, role, account_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, username AS name, company_id, role, account_type
  `, [name, hash, company_id, role, account_type]);

  res.json(rows[0]);
});

// ==========================
// 更新
// ==========================
// ==========================
// 更新（roleのみ）
// ==========================
router.put("/:id", async (req, res) => {

  if (req.session.account_type !== "super_admin") {
    return res.status(403).json({ error: "forbidden" });
  }

  const id = Number(req.params.id);
  const { role } = req.body;

  // 🔥 ここ追加
  let account_type = "company_user";
  if (role === "admin") {
    account_type = "company_admin";
  }

  const { rows } = await req.db.query(`
    UPDATE users
    SET role = $1,
        account_type = $2
    WHERE id = $3
    RETURNING id, username AS name, company_id, role, account_type
  `, [role, account_type, id]);

  if (!rows[0]) {
    return res.status(404).json({ error: "not found" });
  }

  res.json(rows[0]);
});

// ==========================
// 削除
// ==========================
router.delete("/:id", async (req, res) => {

  if (req.session.account_type !== "super_admin") {
    return res.status(403).json({ error: "forbidden" });
  }

  await req.db.query(
    "DELETE FROM users WHERE id=$1",
    [req.params.id]
  );

  res.sendStatus(204);
});

export default router;