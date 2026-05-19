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
import connectPgSimple from "connect-pg-simple";
import koubanServer from "./kouban-server.js";
import forumServer from "./forum-server.js";
import performanceServer from "./performance-server.js";
import orderformServer from "./orderform-server.js";
import adminRouter from "./routes/admin.js";
import pool from "./models/db.js"; // ← ★Poolはここからだけ使う
// 既存ルートの下あたりに追加
import ledgerServer from "./ledger-server.js";
import authRoutes from "./routes/auth.js";
import companiesRoutes from "./routes/companies.js"; // ⭐ここ追加
import { companyFilter } from "./middlewares/companyFilter.js";
//import orderdataRoutes from "./routes/orderdata.js";
import { getCurrentFiscalYear } from "./models/fiscal.js";
import usersRoutes from "./routes/users.js";
import companyRoutes from "./routes/company.js";
// ⭐ これを追加
import adminUsersRouter from "./routes/adminUsers.js";
import orderImportRouter from "./routes/order_import.js";


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

//app.use("/api/admin/companies", companiesRoutes);


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

export default app;




// --------------------
// Session
// --------------------

const PgStore = connectPgSimple(session);

const isProd = process.env.NODE_ENV === "production";

app.use(
  session({
    store: new PgStore({
      pool: pool,
      tableName: "user_sessions"
    }),
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      //secure: isProd,
      //sameSite: isProd ? "none" : "lax",
      secure: false,      // ← ★ここ固定
      sameSite: "lax",    // ← ★これ
      maxAge: 1000 * 60 * 45
    },
  })
);

app.use(async (req, res, next) => {

  const client = await pool.connect();

  try {
    req.db = client;

    if (req.session?.company_id) {
      await client.query(
        "SELECT set_config('app.company_id', $1, false)",
        [String(req.session.company_id)]
      );
    }

    next();

  } catch (err) {

    console.error("DB connection error:", err);
    client.release();
    res.status(500).send("DB error");

  }

  res.on("finish", () => {
    client.release();
  });

});


// --------------------
// company_id を PostgreSQL に渡す
// --------------------
app.use(async (req, res, next) => {

  if (!req.session?.company_id) {
    return next();
  }

  try {

    await pool.query(
      "SELECT set_config('app.company_id', $1, false)",
      [String(req.session.company_id)]
    );

  } catch (err) {
    console.error("RLS SET ERROR:", err);
  }

  next();

});


// --------------------
// fiscal middleware
// --------------------
// ✅ 年度（ここ）
app.use(async (req, res, next) => {

  const companyId = req.session?.company_id;

  //console.log("🧪 fiscal middleware companyId:", companyId);

  if (!companyId) {
    req.fiscalYear = null;
    return next();
  }

  const year = await getCurrentFiscalYear(companyId, req.db);

  //console.log("🧪 fiscal middleware result:", year);

  req.fiscalYear = year;

  next();
});


// --------------------
// CSRF（一般フォームのみ）
// --------------------
const csrfProtection = csrf({ cookie: true });

//app.use(csrfProtection);
// ★ APIは除外！！
app.use((req, res, next) => {

  // ✅ APIは除外
  if (req.path.startsWith("/api/")) {
    return next();
  }

  // ✅ ログインも除外（超重要）
  if (["/login", "/logout"].includes(req.path)) {
  return next();
  }

  csrfProtection(req, res, next);
});

// トークン発行
app.use((req, res, next) => {

  // ★ csrfTokenが存在する時だけ実行
  if (typeof req.csrfToken === "function") {
    res.cookie("XSRF-TOKEN", req.csrfToken());
  }

  next();
});

app.get("/api/csrf-token", (req, res) => {

  if (typeof req.csrfToken !== "function") {
    return res.json({ csrfToken: null });
  }

  res.json({ csrfToken: req.csrfToken() });
});




// --------------------
// ⭐⭐⭐ ここに移動（正しい位置）
// super_admin 専用 admin/companies API
// --------------------
app.use("/api/admin/companies", companiesRoutes);
app.use("/api/admin/users", adminUsersRouter);    // ← ★ここに追加
// --------------------
// API ROUTES
// --------------------

app.use("/api/auth", authRoutes);
// ⭐ ここに追加
app.use("/api/users", usersRoutes);
// ⭐⭐⭐ ここに追加（超重要）

koubanServer(app, csrfProtection);
forumServer(app, csrfProtection);
performanceServer(app, csrfProtection);
orderformServer(app, csrfProtection);
ledgerServer(app, csrfProtection);

// --------------------
// company情報取得API
// --------------------
app.get("/api/company", (req, res) => {

  if (!req.session?.loggedIn) {
    return res.status(401).json({ error: "not logged in" });
  }

  res.json({
    company_id: req.session.company_id
  });

});

// ⭐ super_admin 制限
app.use("/api/companies", (req, res, next) => {

  if (req.session?.account_type !== "super_admin") {
    return res.status(403).json({ error: "forbidden" });
  }

  next();

});


app.use("/api/companies", companiesRoutes); // ⭐ここ


// --------------------
// fiscalRutes
// --------------------
import fiscalRoutes from "./routes/fiscal.js";

app.use("/api/company/fiscal", fiscalRoutes);

// --------------------
// Login / Logout
// --------------------

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});


app.post("/login", async (req, res) => {

  const { username, password } = req.body;

  try {

    // ==========================
    // ① システム管理者 (admins)
    // ==========================
    const adminResult = await pool.query(
      "SELECT * FROM admins WHERE username = $1",
      [username]
    );

    if (adminResult.rows.length > 0) {

      const admin = adminResult.rows[0];

      const match = await bcrypt.compare(password, admin.password_hash);

      if (match) {

        req.session.loggedIn = true;
        req.session.role = admin.role || "admin";
        req.session.company_id = admin.company_id || null;
        req.session.user_id = admin.id;
        // ⭐ これを追加
        req.session.account_type = "super_admin";
        //req.session.account_type = user.account_type; // ⭐ これ追加

        //console.log("LOGIN SESSION:", req.session);

        return req.session.save(() => {
          res.redirect("/menu");
        });

      }

    }


    // ==========================
    // ② 会社ユーザー (users)
    // ==========================
    const userResult = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND is_active = true",
      [username]
    );

    if (userResult.rows.length > 0) {

      const user = userResult.rows[0];

      const match = await bcrypt.compare(password, user.password_hash);

      if (match) {

        req.session.loggedIn = true;
  req.session.user_id = user.id;
  req.session.role = user.role;
  req.session.company_id = user.company_id;

  // ⭐ 超重要
  req.session.account_type = user.account_type;

  //console.log("LOGIN SESSION:", req.session);

  // ⭐ 分岐
  if (user.account_type === "company_admin") {
    return req.session.save(() => {
      res.redirect("/company-admin-app/company-admin-portal.html");
    });
  }

  return req.session.save(() => {
    res.redirect("/menu");
  });
}
    }

    // ==========================
    // ログイン失敗
    // ==========================
    res.redirect("/login.html?error=1");

  } catch (err) {

    console.error("Login error:", err);
    res.redirect("/login.html?error=1");

  }

});


// --------------------
// Logout
// --------------------
app.post("/logout", (req, res) => {

  req.session.destroy(() => {

    res.json({ ok: true });

  });

});

// --------------------
// Admin API（CSRFなし）
// --------------------
app.use("/api/admin", adminRouter);

// --------------------
// order API
// --------------------
// ★ここ追加
app.use("/api/order-import", orderImportRouter);

// --------------------
// company_id を PostgreSQL に渡す
// --------------------
//app.use(async (req, res, next) => {

//  if (!req.session?.company_id) {
//    return next();
//  }

//  try {

//    await pool.query(
//      "SELECT set_config('app.company_id', $1, false)",
//      [String(req.session.company_id)]
//    );

//  } catch (err) {
//    console.error("RLS SET ERROR:", err);
//  }

//  next();

//});


// --------------------
// CSRF（一般フォームのみ）
// --------------------
//const csrfProtection = csrf({ cookie: true });

//app.use(csrfProtection);
// ★ APIは除外！！
//app.use((req, res, next) => {

//  if (req.path.startsWith("/api/")) {
//    return next(); // ← APIはスルー
//  }

//  csrfProtection(req, res, next);

//});

// トークン発行
//app.use((req, res, next) => {

  // ★ csrfTokenが存在する時だけ実行
//  if (typeof req.csrfToken === "function") {
//    res.cookie("XSRF-TOKEN", req.csrfToken());
//  }

//  next();
//});

//app.get("/api/csrf-token", (req, res) => {

//  if (typeof req.csrfToken !== "function") {
//    return res.json({ csrfToken: null });
//  }

//  res.json({ csrfToken: req.csrfToken() });
//});

// --------------------
// admin-app は ⭐ super_admin 専用
// --------------------

app.use("/super-admin-app", (req, res, next) => {

  if (!req.session?.loggedIn) {
    return res.redirect("/login.html");
  }

  if (req.session.account_type !== "super_admin") {
    return res.status(403).send("Forbidden");
  }

  next();

});

// 👇👇👇 ここに追加👇👇👇

// --------------------
// company-admin-app は company_admin 専用
// --------------------
app.use("/company-admin-app", (req, res, next) => {

  if (!req.session?.loggedIn) {
    return res.redirect("/login.html");
  }

  if (req.session.account_type !== "company_admin") {
    return res.status(403).send("Forbidden");
  }

  next();

});

// --------------------
// Static
// --------------------
app.use(express.static(path.join(__dirname, "public")));

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

app.use((req, res, next) => {

  if (!req.session.loggedIn) {
    return next();
  }

  if (req.session.role === "super_admin") {
    return next();
  }

  if (req.session.company_id === undefined || req.session.company_id === null) {
    console.error("🚨 company_id missing in session");
    return res.status(500).send("Company context error");
  }

  next();
});

app.use("/api/company", companyRoutes);


// ⭐ company filter
//app.use(companyFilter);







// --------------------
// Menu
// --------------------
app.get("/menu", (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/login.html");

  if (req.session.role === "admin") {
    return res.sendFile(path.join(__dirname, "public/super-admin-portal.html"));
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
  if (req.session.role === "buser") {
    return res.sendFile(path.join(__dirname, "public/index4.html"));
  }
  
  res.redirect("/login.html");
});

// --------------------
// API：年度締め（落ちない版）
// --------------------
app.post("/api/admin/close-fiscal-year", async (req, res) => {
  try {

    await pool.query(
      `UPDATE settings
       SET fiscal_year_closed = true,
           updated_at = NOW()
       WHERE company_id = $1`,
      [req.session.company_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.warn("⚠️ settings テーブル未作成 or DB未準備");
    res.status(200).json({ success: false });
  }
});
// --------------------
//super-adminのAPI追加
// --------------------
app.post("/api/admin/switch-company", (req, res) => {

  if (req.session.account_type !== "super_admin") {
    return res.status(403).json({ error: "forbidden" });
  }

  const { company_id } = req.body;

  req.session.company_id = company_id;

  res.json({ success: true });

});

app.get("/api/admin/current-company", async (req, res) => {

  const companyId = req.session.company_id;

  if (!companyId) {
    return res.json({ id: null, name: "未選択" });
  }

  const { rows } = await pool.query(
    "SELECT id, name FROM companies WHERE id = $1",
    [companyId]
  );

  res.json(rows[0]);
});


// --------------------
// サブアプリは後から初期化（失敗しても落ちない）
// --------------------
//(async () => {
//  try {
//    await koubanServer(app, csrfProtection);
//    await forumServer(app, csrfProtection);
//    await performanceServer(app, csrfProtection);
//    await orderformServer(app, csrfProtection);
    // ⭐ ここに追加
//    await ledgerServer(app, csrfProtection);
//    console.log("✅ Sub apps initialized");
//  } catch (err) {
//    console.error("⚠️ Sub app init failed:", err);
//  }
//})();

// --------------------
// Start Server（最優先）
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

