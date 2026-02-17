// ledger-server.js

import express from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import cookieParser from "cookie-parser";
import { body, param, query, validationResult } from "express-validator";

import pool from "./models/db.js";
import { checkFiscalOpen } from "./middlewares/checkFiscalOpen.js";

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

export default async function ledgerServer(app, csrfProtection) {

  const router = express.Router();

  router.use(cookieParser());

  router.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  router.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      keyGenerator: (req) => ipKeyGenerator(req),
    })
  );

  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));


  // ==========================
  // 現在年度取得
  // ==========================
  async function getCurrentFiscalYear() {
    const { rows } = await pool.query(
      "SELECT current_fiscal_year FROM settings LIMIT 1"
    );
    return rows[0]?.current_fiscal_year ?? null;
  }


  // ==========================
  // 一覧取得
  // ==========================
  router.get(
  "/ledger",
  csrfProtection,
  [
    query("q").optional().trim().escape(),
    query("sort").optional().trim()
  ],
  async (req, res) => {

    if (handleValidationErrors(req, res)) return;

    const q = req.query.q || "";
    const sort = req.query.sort || "created_desc";
    const fiscalYear = await getCurrentFiscalYear();

    let params = [fiscalYear];
    let where = `WHERE fiscal_year = $1`;

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where += `
        AND (
          lower(department) LIKE $${params.length}
          OR lower(kouji_number) LIKE $${params.length}
          OR lower(client) LIKE $${params.length}
          OR lower(construction) LIKE $${params.length}
        )
      `;
    }

    // ------------------------
    // 並び替え制御（安全設計）
    // ------------------------
    let orderBy = "ORDER BY created_at DESC";

    switch (sort) {
      case "created_asc":
        orderBy = "ORDER BY created_at ASC";
        break;
      case "kouji_asc":
        orderBy = "ORDER BY kouji_number ASC";
        break;
      case "kouji_desc":
        orderBy = "ORDER BY kouji_number DESC";
        break;
    }

    try {
      const { rows } = await pool.query(
        `
        SELECT *
        FROM ledger
        ${where}
        ${orderBy}
        `,
        params
      );

      res.json(rows);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "DB error" });
    }
  }
);



  // ==========================
  // 新規登録
  // ==========================
  router.post(
    "/ledger",
    csrfProtection,
    checkFiscalOpen,
    [
      body("kouji_number").notEmpty()
    ],
    async (req, res) => {

      if (handleValidationErrors(req, res)) return;

      const f = req.body;
      const fiscalYear = await getCurrentFiscalYear();

      try {
        const { rows } = await pool.query(
          `
          INSERT INTO ledger (
  fiscal_year,
  department,
  kouji_number,
  remarks,
  hkt39number,
  reciveday,
  client,
  construction,
  shipnumber,
  tec_dep,
  incharge,
  comp_date1,
  note,
  p_amount,
  transport_ex,
  o_amount,
  determ_amount,
  comp_date2,
  claim,
  pub_date,
  d_amount,
  bill_amount,
  deposit_total,
  bill_transfer,
  bank_name,
  offset_amount,
  transfer_amount,
  depo_date1,
  bill_amount2,
  depo_date2,
  cash,
  depo_date3,
  check_amount,
  depo_date4
)

          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
            $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
            $31,$32,$33,$34
          )
          RETURNING *
          `,
          [
            fiscalYear,
            f.department,
            f.kouji_number,
            f.remarks,
            f.hkt39number,
            f.reciveday,
            f.client,
            f.construction,
            f.shipnumber,
            f.tec_dep,
            f.incharge,
            f.comp_date1,
            f.note,
            f.p_amount,
            f.transport_ex,
            f.o_amount,
            f.determ_amount,
            f.comp_date2,
            f.claim,
            f.pub_date,
            f.d_amount,
            f.bill_amount,
            f.deposit_total,
            f.bill_transfer,
            f.bank_name,
            f.offset_amount,
            f.transfer_amount,
            f.depo_date1,
            f.bill_amount2,
            f.depo_date2,
            f.cash,
            f.depo_date3,
            f.check_amount,
            f.depo_date4
          ]
        );

        res.status(201).json(rows[0]);

      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "DB error" });
      }
    }
  );



// ==========================
// 更新
// ==========================
router.put(
  "/ledger/:id",
  csrfProtection,
  checkFiscalOpen,
  [param("id").isInt()],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const id = Number(req.params.id);
      const fields = req.body;

      const set = [];
      const values = [];
      let i = 1;

      for (const k in fields) {
        if (k === "id") continue; // idは更新しない

        set.push(`"${k}" = $${i++}`); // ★ カラム名をダブルクォート
        values.push(fields[k]);
      }

      if (set.length === 0) {
        return res.status(400).json({ error: "更新データがありません" });
      }

      values.push(id);

      const { rows } = await pool.query(
        `
        UPDATE ledger
        SET ${set.join(", ")},
            updated_at = now()
        WHERE id = $${i}
        RETURNING *
        `,
        values
      );

      if (!rows.length) {
        return res.status(404).json({ error: "データが見つかりません" });
      }

      res.json(rows[0]);

    } catch (err) {
      console.error("PUT ERROR:", err);
      res.status(500).json({ error: "更新に失敗しました" });
    }
  }
);



  // ==========================
  // 削除
  // ==========================
  router.delete(
    "/ledger/:id",
    csrfProtection,
    checkFiscalOpen,
    [param("id").isInt()],
    async (req, res) => {

      await pool.query(
        "DELETE FROM ledger WHERE id = $1",
        [Number(req.params.id)]
      );

      res.sendStatus(204);
    }
  );


  app.use("/api", router);

  console.log("🟢 ledger-server.js mounted");
}
