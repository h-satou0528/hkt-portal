// orderform-server.js（ESM 完全対応）

import express from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import csrf from "csurf";
import cookieParser from "cookie-parser";
import { body, query, param, validationResult } from "express-validator";

import pool from "./models/db.js";
import { checkFiscalOpen } from "./middlewares/checkFiscalOpen.js";

// ------------------------------
// バリデーションエラー共通処理
// ------------------------------
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

export default async function orderformServer(app, csrfProtection) {

  const router = express.Router();

  // ------------------------------
  // セキュリティ系（Router 単位）
  // ------------------------------
  router.use(cookieParser());

  router.use(
    helmet({
      contentSecurityPolicy: false, // app.js 側で管理するため
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

  // ------------------------------
  // 現在年度を取得する
  // ------------------------------
// ------------------------------
// 現在の年度を取得
// ------------------------------
async function getCurrentFiscalYear() {
  const { rows } = await pool.query(
    "SELECT current_fiscal_year FROM settings LIMIT 1"
  );
  return rows[0]?.current_fiscal_year ?? null;
}


  // ------------------------------
  // ① GET: /api/orderdata（一覧）
  // ------------------------------
  router.get(
  "/orderdata",
  csrfProtection,
  [
    query("q").optional().trim().escape(),
    query("cd").optional().trim().escape(),   // ★ 追加
    query("sort")
      .optional()
      .isIn(["created_desc", "created_asc", "kouji_asc", "kouji_desc"]),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const q = req.query.q || "";
    const cd = req.query.cd || "";   // ★ 追加
    const sort = req.query.sort || "created_desc";
    const limit = parseInt(req.query.limit, 10) || 100;

    const fiscalYear = await getCurrentFiscalYear();

    let orderBy = "created_at DESC";
    if (sort === "created_asc") orderBy = "created_at ASC";
    if (sort === "kouji_asc") orderBy = "kouji_number ASC";
    if (sort === "kouji_desc") orderBy = "kouji_number DESC";

    let params = [fiscalYear];
    let where = `WHERE fiscal_year = $1`;

    // ----------------
    // CD検索
    // ----------------
    if (cd) {
      params.push(cd);
      where += ` AND cd = $${params.length}`;
    }

    // ----------------
    // フリーワード検索
    // ----------------
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where += `
        AND (
          lower(department) LIKE $${params.length}
          OR lower(kouji_number) LIKE $${params.length}
          OR lower(supplier) LIKE $${params.length}
          OR lower(orderer) LIKE $${params.length}
          OR lower(product_name) LIKE $${params.length}
          OR lower(model) LIKE $${params.length}
        )
      `;
    }

    params.push(limit);

    const sql = `
      SELECT *
      FROM orderdata
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length}
    `;

    try {
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "DB error" });
    }
  }
);


  // ------------------------------
  // 工事番号単位取得
  // ------------------------------
  router.get("/orderdata/summary/:kouji_number", async (req, res) => {
    const { kouji_number } = req.params;

    try {
      const result = await pool.query(
        `
        SELECT *
        FROM orderdata
        WHERE kouji_number LIKE $1
        ORDER BY supplier, order_date, id
        `,
        [`${kouji_number}%`]
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "DBエラー" });
    }
  });

  // ------------------------------
  // ② POST: 新規登録
  // ------------------------------
  router.post(
  "/orderdata",
  csrfProtection,
  checkFiscalOpen, // ← ★ これを必ず入れる
  [body("department").trim().isIn(["1技", "2技", "函館", "三久"])],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const f = req.body;
    const fiscalYear = await getCurrentFiscalYear();

    const { rows } = await pool.query(
      `
      INSERT INTO orderdata (
        fiscal_year, department, category, cd, kouji_number, supplier, orderer,
        order_date, maker, product_name, model, quantity, unit,
        unit_price, amount_ex, amount_inc, list_price,
        delivery_date, M, C, invoice_date, notes
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
      )
      RETURNING *
      `,
      [
        fiscalYear,
        f.department, f.category, f.cd, f.kouji_number, f.supplier,
        f.orderer, f.order_date, f.maker, f.product_name, f.model,
        f.quantity, f.unit, f.unit_price, f.amount_ex, f.amount_inc,
        f.list_price, f.delivery_date, f.M, f.C, f.invoice_date, f.notes
      ]
    );

    res.status(201).json(rows[0]);
  }
);


  // ------------------------------
  // ③ PUT: 更新
  // ------------------------------
  router.put(
  "/orderdata/:id",
  csrfProtection,
  checkFiscalOpen, // ← ★ これだけでOK
  [param("id").isInt()],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const id = Number(req.params.id);
    const fields = req.body;

    const set = [];
    const values = [];
    let i = 1;

    for (const k in fields) {
      set.push(`${k} = $${i++}`);
      values.push(fields[k]);
    }
    values.push(id);

    const { rows } = await pool.query(
      `
      UPDATE orderdata
      SET ${set.join(", ")}, updated_at = now()
      WHERE id = $${i}
      RETURNING *
      `,
      values
    );

    res.json(rows[0]);
  }
);



  // ------------------------------
  // ④ DELETE
  // ------------------------------
  router.delete(
  "/orderdata/:id",
  csrfProtection,
  checkFiscalOpen, // ← ★ ここも
  [param("id").isInt()],
  async (req, res) => {
    await pool.query(
      "DELETE FROM orderdata WHERE id = $1",
      [Number(req.params.id)]
    );
    res.sendStatus(204);
  }
);



  // ------------------------------
  // Router mount
  // ------------------------------
  app.use("/api", router);

  console.log("🟢 orderform-server.js がマウントされました");
}
