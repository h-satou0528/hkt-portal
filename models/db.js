// models/db.js（Azure PostgreSQL 対応）
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

// --------------------
// 接続設定
// --------------------
const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.PGHOST || "localhost",       // Azure PostgreSQL のホスト名
      user: process.env.PGUSER || "postgres",       // ユーザー名
      password: process.env.PGPASSWORD || "pass",   // パスワード
      database: process.env.PGDATABASE || "kouban_db", // DB名
      port: Number(process.env.PGPORT) || 5432,     // ポート
      ssl: process.env.PGHOST ? { rejectUnauthorized: false } : false, // Azure 用 SSL
    };

// --------------------
// Pool 作成
// --------------------
const pool = new Pool(config);

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
// 現在年度取得（settings 1行固定）
// --------------------
export async function getCurrentFiscalYear() {
  const result = await pool.query(
    "SELECT current_fiscal_year FROM settings LIMIT 1"
  );
  return result.rows[0].current_fiscal_year;
}

// --------------------
// export
// --------------------
export default pool;
