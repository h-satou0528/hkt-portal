// routes/construction.js
import express from "express";
import db from "../models/db.js";
import { checkFiscalOpen } from "../middlewares/checkFiscalOpen.js";


const router = express.Router();


/* =========================
   POST 新規登録
========================= */
router.post(
  '/',
  checkFiscalOpen, // 🔒 追加
  async (req, res) => {
  const fiscalYear = req.fiscalYear;

  const {
    kouji_number, mitsumori_number, hatchuusha, kouji_supplier, kouji_kenmei,
    order_date, expected_date, done_date,
    mitsumori_taxex, mitsumori_taxin, contract_taxex, contract_taxin,
    kaichou, shachou, torishimariyaku, soumu, buchou, hakkousha, article
  } = req.body;

  try {
    await db.query(
      `INSERT INTO construction_orders (
        kouji_number, mitsumori_number, hatchuusha, kouji_supplier,
        kouji_kenmei, order_date, expected_date, done_date,
        mitsumori_taxex, mitsumori_taxin, contract_taxex, contract_taxin,
        kaichou, shachou, torishimariyaku, soumu, buchou, hakkousha, article,
        fiscal_year
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )`,
      [
        kouji_number,
        mitsumori_number,
        hatchuusha,
        kouji_supplier,
        kouji_kenmei,
        order_date || null,
        expected_date || null,
        done_date || null,
        mitsumori_taxex,
        mitsumori_taxin,
        contract_taxex,
        contract_taxin,
        kaichou,
        shachou,
        torishimariyaku,
        soumu,
        buchou,
        hakkousha,
        article || null,
        fiscalYear
      ]
    );

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("保存エラー");
  }
});

/* =========================
   GET 一覧取得（年度別）
========================= */
router.get('/', async (req, res) => {
  const fiscalYear = req.fiscalYear;

  try {
    const result = await db.query(
      `SELECT *
       FROM construction_orders
       WHERE fiscal_year = $1
       ORDER BY id DESC`,
      [fiscalYear]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("データ取得エラー");
  }
});

/* =========================
   PUT 更新（年度ガード）
========================= */
router.put(
  '/:id', 
  checkFiscalOpen, // 🔒 追加
  async (req, res) => {
  const { id } = req.params;
  const fiscalYear = req.fiscalYear;

  const {
    kouji_number, mitsumori_number, hatchuusha, kouji_supplier, kouji_kenmei,
    order_date, expected_date, done_date,
    mitsumori_taxex, mitsumori_taxin, contract_taxex, contract_taxin,
    kaichou, shachou, torishimariyaku, soumu, buchou, hakkousha, article
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE construction_orders SET
        kouji_number = $1,
        mitsumori_number = $2,
        hatchuusha = $3,
        kouji_supplier = $4,
        kouji_kenmei = $5,
        order_date = $6,
        expected_date = $7,
        done_date = $8,
        mitsumori_taxex = $9,
        mitsumori_taxin = $10,
        contract_taxex = $11,
        contract_taxin = $12,
        kaichou = $13,
        shachou = $14,
        torishimariyaku = $15,
        soumu = $16,
        buchou = $17,
        hakkousha = $18,
        article = $19
       WHERE id = $20 AND fiscal_year = $21
       RETURNING *`,
      [
        kouji_number,
        mitsumori_number,
        hatchuusha,
        kouji_supplier,
        kouji_kenmei,
        order_date || null,
        expected_date || null,
        done_date || null,
        mitsumori_taxex,
        mitsumori_taxin,
        contract_taxex,
        contract_taxin,
        kaichou,
        shachou,
        torishimariyaku,
        soumu,
        buchou,
        hakkousha,
        article || null,
        id,
        fiscalYear
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "対象データなし" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("更新エラー");
  }
});

/* =========================
   欠番 / 完了フラグ系
========================= */
router.put("/:id/unmissing", checkFiscalOpen, async (req, res) => {
  const { id } = req.params;
  const fiscalYear = req.fiscalYear;

  await db.query(
    "UPDATE construction_orders SET missing = 0 WHERE id = $1 AND fiscal_year = $2",
    [id, fiscalYear]
  );
  res.json({ success: true });
});

router.put(
  "/:id/missing",
  checkFiscalOpen,   // 🔒 締め年度ガード
  async (req, res) => {
    const { id } = req.params;
    const fiscalYear = req.fiscalYear;

    await db.query(
      "UPDATE construction_orders SET missing = 1 WHERE id = $1 AND fiscal_year = $2",
      [id, fiscalYear]
    );

    res.json({ success: true });
  }
);

router.put("/:id/completed", checkFiscalOpen, async (req, res) => {
  const { id } = req.params;
  const fiscalYear = req.fiscalYear;

  await db.query(
    "UPDATE construction_orders SET completed = 1 WHERE id = $1 AND fiscal_year = $2",
    [id, fiscalYear]
  );
  res.json({ success: true });
});

router.put("/:id/uncomplete", checkFiscalOpen, async (req, res) => {
  const { id } = req.params;
  const fiscalYear = req.fiscalYear;

  await db.query(
    "UPDATE construction_orders SET completed = 0 WHERE id = $1 AND fiscal_year = $2",
    [id, fiscalYear]
  );
  res.json({ success: true });
});

export default router;

