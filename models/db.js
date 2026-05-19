// models/db.js（ESM・SaaS安全版）

import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

// --------------------
// 接続設定
// --------------------
const config = {
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
  ssl: { rejectUnauthorized: false },

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
};

// --------------------
// Pool 作成
// --------------------
const pool = new Pool(config);

// --------------------
// 接続エラー監視（超重要）
// --------------------
pool.on("error", (err) => {
  console.error("🚨 PostgreSQL Pool Error", err);
});

// --------------------
// 起動時 接続チェック
// --------------------
try {
  await pool.query("SELECT NOW()");
  console.log("🟢 PostgreSQL に db.js が接続成功しました");
} catch (err) {
  console.error("🔴 PostgreSQL 接続エラー:", err);
}



// --------------------
// export
// --------------------
export default pool;