// kouban-server.js（ESM 完全対応）

import cors from "cors";
import bodyParser from "body-parser";

import pool, { getCurrentFiscalYear } from "./models/db.js";
import { checkFiscalOpen } from "./middlewares/checkFiscalOpen.js";



export default async function koubanServer(app) {
  app.use(cors());
  app.use(bodyParser.json());

  // --------------------
  // DB 接続確認（1回）
  // --------------------
  try {
    await pool.query("SELECT 1");
    console.log("🟢 PostgreSQL に kouban-server が接続成功しました");
  } catch (err) {
    console.error("🔴 PostgreSQL 接続エラー:", err);
  }

  // --------------------
  // 次の bandai 番号取得
  // --------------------
  app.post("/next-bandai-number", async (req, res) => {
    const { bandaiStart, eraCode } = req.body;

    const fiscalYear = await getCurrentFiscalYear();

    try {
      const result = await pool.query(
        `SELECT bandai FROM entries WHERE bandai LIKE $1`,
        [`${eraCode}-%`]
      );

      let maxNumber = bandaiStart - 1;
      for (const row of result.rows) {
        const number = Number(row.bandai.split("-")[1]);
        if (number > maxNumber) maxNumber = number;
      }

      res.json({ nextNumber: maxNumber + 1 });
    } catch (err) {
      console.error("次番号取得エラー:", err);
      res.status(500).send("Error calculating next number");
    }
  });

  // --------------------
  // データ保存
  // --------------------
  app.post("/api/save-entry", checkFiscalOpen, async (req, res) => {

  try {
     


    const { bandai, title, person, note, order, invoice, performance } = req.body;

    const fiscalYear = await getCurrentFiscalYear(); // ★追加
    

    await pool.query(
      `INSERT INTO entries
       (bandai, title, person, note, "order", invoice, performance, fiscal_year)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        bandai,
        title,
        person,
        note,
        order,
        invoice,
        performance,
        fiscalYear, // ★必須
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("保存エラー:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// 枝番号保存
// --------------------
app.post("/save-sub-entry", async (req, res) => {
  try {
    // 🔒 年度締めチェック
    const settings = await pool.query(
      "SELECT fiscal_year_closed FROM settings WHERE id = 1"
    );

    if (settings.rows[0].fiscal_year_closed) {
      return res.status(403).json({
        error: "この年度は締められているため操作できません",
      });
    }

    const {
      baseBandai,
      title,
      person,
      note,
      order,
      invoice,
      performance,
    } = req.body;

    // 📅 現在年度取得
    const fiscalYear = await getCurrentFiscalYear();

    // 既存の枝番号取得（元ロジックそのまま）
    const result = await pool.query(
      `SELECT bandai FROM entries WHERE bandai LIKE $1`,
      [`${baseBandai}-%`]
    );

    let maxBranch = 0;
    for (const row of result.rows) {
      const parts = row.bandai.split("-");
      const branchNum = parseInt(parts[2], 10);
      if (!isNaN(branchNum) && branchNum > maxBranch) {
        maxBranch = branchNum;
      }
    }

    const nextBranch = maxBranch + 1;
    const newBandai = `${baseBandai}-${nextBranch}`;

    await pool.query(
      `
      INSERT INTO entries
        (bandai, title, person, note, "order", invoice, performance, fiscal_year)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        newBandai,
        title,
        person,
        note,
        order ?? "",
        invoice ?? "",
        performance ?? "",
        fiscalYear, // ★追加
      ]
    );

    res.json({ success: true, bandai: newBandai });
  } catch (err) {
    console.error("枝番号登録エラー:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


  // --------------------
  // 一覧取得
  // --------------------
  app.get("/api/entries", async (_req, res) => {
  try {
    const fiscalYear = await getCurrentFiscalYear();

    const result = await pool.query(
      `SELECT *
       FROM entries
       WHERE fiscal_year = $1
       ORDER BY bandai`,
      [fiscalYear]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("一覧取得エラー:", err);
    res.status(500).json({ error: err.message });
  }
});


  // --------------------
  // 検索
  // --------------------
  app.get("/api/search-entry", async (req, res) => {
    const keyword = req.query.keyword || "";

    try {
      const result = await pool.query(
        `SELECT bandai, title, person, note, "order", invoice, performance
         FROM entries
         WHERE bandai ILIKE $1 OR title ILIKE $1
         ORDER BY bandai`,
        [`%${keyword}%`]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("検索エラー:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------
  // 更新
  // --------------------
  app.put("/api/update-entry", checkFiscalOpen, async (req, res) => {
     
  const {
    newBandai,
    oldBandai,
    title,
    person,
    note,
    order,
    invoice,
    performance,
  } = req.body;

  try {
    const fiscalYear = await getCurrentFiscalYear(); // ★追加

    await pool.query(
      `UPDATE entries SET
        bandai = $1,
        title = $2,
        person = $3,
        note = $4,
        "order" = $5,
        invoice = $6,
        performance = $7,
        fiscal_year = $8
       WHERE bandai = $9`,
      [
        newBandai,
        title,
        person,
        note,
        order,
        invoice,
        performance,
        fiscalYear, // ★ここ
        oldBandai,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("更新エラー:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


  // --------------------
  // 欠番フラグ
  // --------------------
  app.put("/api/update-entry", checkFiscalOpen, async (req, res) => {
     const fiscalYear = await getCurrentFiscalYear();
    try {
      await pool.query(
        `UPDATE entries SET missing = 1 WHERE bandai = $1`,
        [req.body.bandai]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("欠番エラー:", err);
      res.json({ success: false });
    }
  });

  // --------------------
  // 全件取得
  // --------------------
  app.get("/load-entries", async (_req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM entries ORDER BY bandai ASC"
      );
      res.json(result.rows);
    } catch (err) {
      console.error("取得エラー:", err);
      res.status(500).json({ error: err.message });
    }
  });


  // 欠番一覧取得（旧互換 API）
app.get("/getBandaiList", async (req, res) => {
  const { prefix, from, to } = req.query;

  try {
    const result = await pool.query(
      `
      SELECT bandai, title, person, note, "order", invoice, performance
      FROM entries
      WHERE bandai LIKE $1
        AND split_part(bandai, '-', 2)::int BETWEEN $2 AND $3
      ORDER BY bandai
      `,
      [`${prefix}%`, from, to]
    );

    // ★ここが重要
    res.json(result.rows);
  } catch (err) {
    console.error("getBandaiList error:", err);
    res.status(500).json({ error: "DB error" });
  }
});

}
