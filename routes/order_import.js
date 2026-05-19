import express from "express";
import multer from "multer";
import iconv from "iconv-lite";  //Shift_JIS自動判定するので残す
import { parse } from "csv-parse/sync";
import pool from "../models/db.js";

const router = express.Router();

// ==============================
// multer設定（メモリ保持）
// ==============================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ==============================
// CSVアップロード
// ==============================
router.post(
  "/csv",
  upload.single("csvfile"),
  async (req, res) => {

    try {

      if (!req.session?.company_id) {
        return res.status(403).json({
          error: "company_id がありません"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "CSVファイルがありません"
        });
      }

      console.log("CSV受信:", req.file.originalname);
      console.log("サイズ:", req.file.size);

      // ==============================
      // UTF8でupload
      // ==============================
      const csvText = req.file.buffer.toString("utf-8");

      // ==============================
      // CSV解析
      // ==============================
      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        bom: true
      });

      console.log("CSV行数:", records.length);

      let inserted = 0;
      let skipped = 0;

       for (const row of records) {

  const orderDate =
    parseDate(row["発注日"]);

  const fiscalYear =
  await getCurrentFiscalYear(
    req.session.company_id
  );

  const result = await pool.query(
    `
    INSERT INTO orderdata (
      department,
      category,
      cd,
      kouji_number,
      supplier,
      orderer,
      order_date,
      maker,
      product_name,
      model,
      quantity,
      unit,
      unit_price,
      amount_ex,
      amount_inc,
      list_price,
      delivery_date,
      m,
      c,
      notes,
      fiscal_year,
      company_id
    )
    VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,
      $16,$17,$18,$19,$20,
      $21,$22
    )

    ON CONFLICT (
      company_id,
      kouji_number,
      supplier,
      order_date,
      product_name,
      model,
      quantity
    )
    DO NOTHING
    `,
    [
      "CSV",
      row["区分"] || null,
      row["CD"],
      row["工事番号"],
      row["発 注 先"],
      row["発注者"],
      orderDate,
      row["メーカー名"],
      row["品   名"],
      row["型   式"],
      parseNumber(row["数量"]),
      row["単位"],
      parseNumber(row["単   価"]),
      parseNumber(row["金額(税抜)"]),
      parseNumber(row["金額(税込)"]),
      parseNumber(row["定価(単価）"]),
      parseDate(row["納品日"]),
      row["M"],
      row["C"],
      row["備考"],
      fiscalYear,
      req.session.company_id
    ]
  );

  if (result.rowCount === 1) {
    inserted++;
  } else {
    skipped++;
  }
}


  res.json({
  success: true,
  filename: req.file.originalname,
  totalRows: records.length,
  inserted,
  skipped
});

    } catch (err) {
      console.error("CSV取込エラー:", err);

      res.status(500).json({
        error: "CSV取込失敗"
      });
    }
  }
);

function parseNumber(val) {
  if (!val) return null;

  return Number(
    String(val).replace(/,/g, "")
  ) || null;
}

function parseDate(val) {
  if (!val) return null;

  // 25/03/04 → 2025-03-04
  const parts = val.split("/");

  if (parts.length !== 3) return null;

  const yy = Number(parts[0]);
  const yyyy = yy >= 70 ? 1900 + yy : 2000 + yy;

  return `${yyyy}-${parts[1]}-${parts[2]}`;
}

//① helper追加（会社別年度）
async function getCurrentFiscalYear(companyId) {

  const result = await pool.query(
    `
    SELECT current_fiscal_year
    FROM company_settings
    WHERE company_id = $1
    `,
    [companyId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].current_fiscal_year;
}



export default router;