// orderform-server.js（ESM 完全対応）

import express from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import csrf from "csurf";
import cookieParser from "cookie-parser";
import { body, query, param, validationResult } from "express-validator";

import pool from "./models/db.js";
import { checkFiscalOpen } from "./middlewares/checkFiscalOpen.js";

//console.log("🚨 orderform-server LOADED");

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
//console.log("🚨 router作成された");
  // ------------------------------
  // セキュリティ系（Router 単位）
  // ------------------------------
  //router.use(cookieParser());

  //router.use(
  //  helmet({
  //    contentSecurityPolicy: false, // app.js 側で管理するため
  //  })
 // );

//  router.use(
//  rateLimit({
//    windowMs: 15 * 60 * 1000,
//    max: 300,
//    keyGenerator: (req) => ipKeyGenerator(req),
//  })
//);



// ✅ ① 一番最初にこれ！！（超重要）
router.use(async (req, res, next) => {

  if (req.fiscalYear !== undefined) {
    return next();
  }

  const companyId = req.session?.company_id;

  //console.log("🧪 [router] companyId:", companyId);

  if (!companyId) {
    req.fiscalYear = null;
    return next();
  }

  const { rows } = await req.db.query(
    `SELECT current_fiscal_year 
     FROM company_settings 
     WHERE company_id = $1`,
    [companyId]
  );

  const year = rows[0]?.current_fiscal_year ?? null;

  //console.log("🧪 [router] fiscalYear:", year);

  req.fiscalYear = year;

  next();
});

// ✅ ② その後にこれ
router.use((req, res, next) => {

  if (!req.originalUrl.startsWith("/api/orderdata")) {
    return next();
  }

  //console.log("👉 originalUrl:", req.originalUrl);
  //console.log("👉 baseUrl:", req.baseUrl);
  //console.log("👉 path:", req.path);
  //console.log("🔥 orderform 通過:", req.method, req.url);

  //console.log("🧪 req.session.company_id:", req.session?.company_id);
  //console.log("🧪 req.fiscalYear:", req.fiscalYear);

  if (!req.session?.company_id) {
    console.log("⛔ sessionなしリクエスト遮断");
    return res.status(403).send("会社未設定");
  }

  

  next();
});


// ------------------------------
// ① GET: /api/orderdata（一覧）
// ------------------------------
router.get(
  "/",
  [
    query("q").optional().trim().escape(),
    query("cd").optional().trim().escape(),
    query("sort")
      .optional()
      .isIn(["created_desc", "created_asc", "kouji_asc", "kouji_desc"]),
  ],
  async (req, res) => {

    if (handleValidationErrors(req, res)) return;

    const q = req.query.q || "";
    const cd = req.query.cd || "";
    const sort = req.query.sort || "created_desc";
    const limit = parseInt(req.query.limit, 10) || 100;

    const companyId = req.session.company_id;

    // ✅ middlewareから取得（これが正解）
    const fiscalYear = req.fiscalYear;

    //console.log("🔥 orderform fiscalYear:", fiscalYear);

    let orderBy = "created_at DESC";
    if (sort === "created_asc") orderBy = "created_at ASC";
    if (sort === "kouji_asc") orderBy = "kouji_number ASC";
    if (sort === "kouji_desc") orderBy = "kouji_number DESC";

    let params = [fiscalYear, companyId];
    let where = `WHERE fiscal_year = $1 AND company_id = $2`;

    // CD検索
    if (cd) {
      params.push(cd);
      where += ` AND cd = $${params.length}`;
    }

    // フリーワード検索
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
      const { rows } = await req.db.query(sql, params);
      res.json(rows);
    } catch (err) {
      console.error("❌ DB error:", err);
      res.status(500).json({ error: "DB error" });
    }
  }
);


  // ------------------------------
  // 工事番号単位取得
  // ------------------------------
  router.get("/summary/:kouji_number", async (req, res) => {
    const { kouji_number } = req.params;
    const companyId = req.session.company_id;

    try {
      const result = await req.db.query(
        `
        SELECT *
        FROM orderdata
        WHERE kouji_number LIKE $1
        AND company_id = $2
        ORDER BY supplier, order_date, id
        `,
        [`${kouji_number}%`, companyId]
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
  "/",
  //csrfProtection,
  checkFiscalOpen, // ← ★ これを必ず入れる
  [body("department").trim().isIn(["1技", "2技", "函館", "三久"])],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const f = req.body;
    const fiscalYear = req.fiscalYear;

    const { rows } = await req.db.query(
      `
      INSERT INTO orderdata (
        fiscal_year, company_id, department, category, cd, kouji_number, supplier, orderer,
        order_date, maker, product_name, model, quantity, unit,
        unit_price, amount_ex, amount_inc, list_price,
        delivery_date, M, C, invoice_date, notes
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
      )
      RETURNING *
      `,
      [
        fiscalYear,
        req.session.company_id,
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
// ⑤ 一括登録（クローン保存）🔥
// ------------------------------
router.post(
  "/bulkInsert",
  checkFiscalOpen,
  async (req, res) => {

    const rows = req.body.rows;
    const fiscalYear = req.fiscalYear;
    const companyId = req.session.company_id;

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "データなし" });
    }

    try {

      const results = [];

      for (const f of rows) {

        const { rows: inserted } = await req.db.query(
          `
          INSERT INTO orderdata (
            fiscal_year, company_id,
            department, category, cd, kouji_number,
            supplier, orderer, order_date,
            maker, product_name, model,
            quantity, unit,
            unit_price, amount_ex, amount_inc, list_price,
            delivery_date, M, C, invoice_date, notes
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,
            $19,$20,$21,$22,$23
          )
          RETURNING *
          `,
          [
            fiscalYear,
            companyId,
            f.department,
            f.category,
            f.cd,
            f.kouji_number,
            f.supplier,
            f.orderer,
            f.order_date,
            f.maker,
            f.product_name,
            f.model,
            f.quantity,
            f.unit,
            f.unit_price,
            f.amount_ex,
            f.amount_inc,
            f.list_price,
            f.delivery_date,
            f.M,
            f.C,
            f.invoice_date,
            f.notes
          ]
        );

        results.push(inserted[0]);
      }

      res.status(201).json(results);

    } catch (err) {
      console.error("❌ bulkInsert error:", err);
      res.status(500).json({ error: "bulk insert error" });
    }
  }
);

  // ------------------------------
  // ③ PUT: 更新
  // ------------------------------
  router.put(
  "/:id",
  //csrfProtection,
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

  if (k === "company_id" || k === "fiscal_year") continue;

  set.push(`${k} = $${i++}`);
  values.push(fields[k]);
}
    values.push(id);
    values.push(req.session.company_id);

    const { rows } = await req.db.query(
      `
      UPDATE orderdata
      SET ${set.join(", ")}, updated_at = now()
      WHERE id = $${i} AND company_id = $${i + 1}
      RETURNING *
      `,
      values
    );

    if (!rows[0]) {
  return res.status(404).json({ error: "データが見つかりません" });
}

    res.json(rows[0]);
  }
);



// ------------------------------
// ④ DELETE
// ------------------------------
router.delete(
  "/:id",
  //csrfProtection,
  checkFiscalOpen,
  [param("id").isInt()],
  async (req, res) => {

    // バリデーションエラー確認
    if (handleValidationErrors(req, res)) return;

    try {

      const result = await req.db.query(
        "DELETE FROM orderdata WHERE id = $1 AND company_id = $2",
        [Number(req.params.id), req.session.company_id]
      );

      // 削除対象が無い場合
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "データが見つかりません" });
      }

      res.sendStatus(204);

    } catch (err) {

      console.error(err);
      res.status(500).json({ error: "DB error" });

    }

  }
);

//サーバー側にログ追加（確認用)
router.post("/bulkInsert", async (req, res) => {

  //console.log("🔥 req.body:", req.body);

  const rows = req.body.rows;

  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: "データなし" });
  }

  res.json({ ok: true });
});



  // ------------------------------
  // Router mount
  // ------------------------------
  app.use("/api/orderdata", router);

  console.log("🟢 orderform-server.js がマウントされました");
}
