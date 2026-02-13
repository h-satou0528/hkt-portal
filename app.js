// app.js（Azure App Service / Node.js コンテナ向け・ESM 安全版）

import express from "express";
import session from "express-session";
import path from "path";
import cookieParser from "cookie-parser";
import csrf from "csurf";
import helmet from "helmet";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

import koubanServer from "./kouban-server.js";
import forumServer from "./forum-server.js";
import performanceServer from "./performance-server.js";
import orderformServer from "./orderform-server.js";
import adminRouter from "./routes/admin.js";
import pool from "./models/db.js"; // ← ★Poolはここからだけ使う
// 既存ルートの下あたりに追加
import ledgerServer from "./ledger-server.js";




dotenv.config();

// --------------------
// __dirname
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// Express
// --------------------
const app = express();

app.set("trust proxy", 1);


// --------------------
// Global Error Log（落とさない）
// --------------------
process.on("uncaughtException", (err) =>
  console.error("UNCAUGHT EXCEPTION:", err)
);
process.on("unhandledRejection", (err) =>
  console.error("UNHANDLED REJECTION:", err)
);

// --------------------
// Helmet
// --------------------
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production",
    crossOriginEmbedderPolicy: false,
  })
);

// --------------------
// Basic Middleware
// --------------------
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());



// --------------------
// Session
// --------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 30
    },
  })
);


// --------------------
// Login / Logout
// --------------------
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // ------------------
  // ⭐ DB管理者チェック
  // ------------------
  try {
    const { rows } = await pool.query(
      "SELECT * FROM admins WHERE username = $1",
      [username]
    );

    if (rows.length > 0) {
      const admin = rows[0];

      const match = await bcrypt.compare(password, admin.password_hash);

      if (match) {
        req.session.loggedIn = true;
        req.session.role = "admin";
        return res.redirect("/menu");
      }
    }
  } catch (err) {
    console.error("Admin認証エラー:", err);
  }

  // ------------------
  // ⭐ マスター管理者 fallback
  // ------------------
  if (
    username === process.env.SYS_ADMIN_USER &&
    password === process.env.SYS_ADMIN_PASS
  ) {
    req.session.loggedIn = true;
    req.session.role = "admin";
    return res.redirect("/menu");
  }

  // ------------------
  // 一般ユーザー
  // ------------------
  if (
    username === process.env.HKT_ALLAPP_USER &&
    password === process.env.HKT_ALLAPP_PASS
  ) {
    req.session.loggedIn = true;
    req.session.role = "allapp";
    return res.redirect("/menu");
  }

  if (
    username === process.env.HKT_USER &&
    password === process.env.HKT_USER_PASS
  ) {
    req.session.loggedIn = true;
    req.session.role = "user";
    return res.redirect("/menu");
  }

  if (
    username === process.env.SOUMU_USER &&
    password === process.env.SOUMU_USER_PASS
  ) {
    req.session.loggedIn = true;
    req.session.role = "soumu";
    return res.redirect("/menu");
  }



  res.redirect("/login.html?error=1");
});



app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// --------------------
// Admin API（CSRFなし）
// --------------------
app.use("/api/admin", adminRouter);

// --------------------
// CSRF（一般フォームのみ）
// --------------------
const csrfProtection = csrf({ cookie: true });

app.use(csrfProtection);
app.use((req, res, next) => {
  res.cookie("XSRF-TOKEN", req.csrfToken());
  next();
});

app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// --------------------
// Auth Middleware
// --------------------
app.use((req, res, next) => {
  const publicPaths = [
    "/login",
    "/login.html",
    "/logout",
    "/api/csrf-token",
  ];

  if (
    publicPaths.includes(req.path) ||
    req.path.match(/\.(css|js|png|jpg|svg|webmanifest)$/)
  ) {
    return next();
  }

  if (req.session.loggedIn) return next();
  res.redirect("/login.html");
});

// --------------------
// Static
// --------------------
app.use(express.static(path.join(__dirname, "public")));

// --------------------
// Menu
// --------------------
app.get("/menu", (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/login.html");

  if (req.session.role === "admin") {
    return res.sendFile(path.join(__dirname, "public/admin-portal.html"));
  }
  if (req.session.role === "allapp") {
    return res.sendFile(path.join(__dirname, "public/index.html"));
  }
  if (req.session.role === "user") {
    return res.sendFile(path.join(__dirname, "public/index2.html"));
  }
if (req.session.role === "soumu") {
    return res.sendFile(path.join(__dirname, "public/index3.html"));
  }
  res.redirect("/login.html");
});

// --------------------
// API：年度締め（落ちない版）
// --------------------
app.post("/api/admin/close-fiscal-year", async (req, res) => {
  try {
    await pool.query(`
      UPDATE settings
      SET fiscal_year_closed = true,
          updated_at = NOW()
      WHERE id = 1
    `);
    res.json({ success: true });
  } catch (err) {
    console.warn("⚠️ settings テーブル未作成 or DB未準備");
    res.status(200).json({ success: false, warning: true });
  }
});

// --------------------
// Start Server（最優先）
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});


// --------------------
// サブアプリは後から初期化（失敗しても落ちない）
// --------------------
(async () => {
  try {
    await koubanServer(app, csrfProtection);
    await forumServer(app, csrfProtection);
    await performanceServer(app, csrfProtection);
    await orderformServer(app, csrfProtection);
    // ⭐ ここに追加
    await ledgerServer(app, csrfProtection);
    console.log("✅ Sub apps initialized");
  } catch (err) {
    console.error("⚠️ Sub app init failed:", err);
  }
})();
