import express from "express";
import pool from "../models/db.js";

const router = express.Router();

// ログイン状態確認 + ユーザー情報
router.get("/me", (req, res) => {

  //console.log("SESSION CHECK:", req.session);

  if (!req.session || !req.session.loggedIn) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    user: {
      role: req.session.role,
      company_id: req.session.company_id
    }
  });
});

router.post("/login", async (req, res) => {

  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ error: "invalid user" });
  }

  // 本来は bcrypt
  if (user.password !== password) {
    return res.status(401).json({ error: "invalid password" });
  }

  req.session.loggedIn = true;
  req.session.role = user.role;
  req.session.company_id = user.company_id;

  res.json({ success: true });

});


export default router;