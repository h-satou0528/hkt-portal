// routes/construction.js
import express from "express";
import db from "../models/db.js";
import { checkFiscalOpen } from "../middlewares/checkFiscalOpen.js";


const router = express.Router();

router.use((req, res, next) => {
  if (!req.session?.company_id) {
    return res.status(403).json({ error: "company not set" });
  }
  next();
});


/* =========================
   POST 新規登録
========================= */
router.post(
  '/',
  checkFiscalOpen,
  async (req, res) => {
    const fiscalYear = req.fiscalYear;
    const companyId = req.session.company_id;

    const {
      department,
      kouji_number, mitsumori_number, hatchuusha, kouji_supplier, kouji_kenmei,
      order_date, expected_date, done_date,
      mitsumori_taxex, mitsumori_taxin, contract_taxex, contract_taxin,
      kaichou, shachou, torishimariyaku, soumu, buchou, hakkousha, article,

      // 🔥 フラグ
      reflectPerformance,
      reflectEntries,
      reflectLedger   // ← これ追加

    } = req.body;

    try {

      // ===============================
      // ✅ 追加デバッグ（🔥ここ！！）
      // ===============================
      //console.log("fiscalYear:", fiscalYear);
      //console.log("companyId:", companyId);


      // ===============================
      // ✅ デバッグ
      // ===============================
      //console.log("=== POST DEBUG ===");
      //console.log("reflectPerformance:", reflectPerformance);
      //console.log("reflectEntries:", reflectEntries);

      //console.log("companyId:", req.session.company_id);
      //console.log("session:", req.session);

      // 🔥 boolean化
      const reflectPerformanceFlag = reflectPerformance === true || reflectPerformance === "true";
      const reflectEntriesFlag = reflectEntries === true || reflectEntries === "true";
      const reflectLedgerFlag = reflectLedger === true || reflectLedger === "true";

      // ===============================
      // ① 工事命令書 登録
      // ===============================
      try {

  await db.query(
    `INSERT INTO construction_orders (
      department,
      kouji_number, mitsumori_number, hatchuusha, kouji_supplier,
      kouji_kenmei, order_date, expected_date, done_date,
      mitsumori_taxex, mitsumori_taxin, contract_taxex, contract_taxin,
      kaichou, shachou, torishimariyaku, soumu, buchou, hakkousha, article,
      fiscal_year, company_id
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,
      $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
    )`,
    [
      department || null,
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
      fiscalYear,
      companyId
    ]
  );

  

} catch (err) {

  // 🔥 重複登録を避ける
  if (err.code === "23505") {
  const koujiNumber = req.body.kouji_number || "";

  return res.status(400).json({
    error: `登録する工事番号「${koujiNumber}」は既に登録されている番号と重複しています`
  });
}

  console.error(err);
  res.status(500).json({ error: "登録エラー" });
}

      // ===============================
      // ② 実績表 反映
      // ===============================
      if (reflectPerformanceFlag) {

        const updateResult = await db.query(`
          UPDATE performance_sheets
          SET kouji_supplier = $1,
              kouji_kenmei = $2,
              contract_amount = $3
          WHERE kouji_number = $4 AND company_id = $5
        `, [
          kouji_supplier,
          kouji_kenmei,
          contract_taxin,
          kouji_number,
          companyId
        ]);

        if (updateResult.rowCount === 0) {
          await db.query(`
  INSERT INTO performance_sheets (
    kouji_number,
    company_id,
    kouji_supplier,
    kouji_kenmei,
    contract_amount,

    f1, l1,
    f2, l2,
    f3, l3,
    f4, l4,
    f5, l5,
    f6, l6,
    f7, h7, l7, n7,
    f8, l8,
    f9, h9, l9, n9,
    f10, l10,
    f11, l11,
    f12, l12,
    f13, l13,
    f14, l14,
    f15, l15,
    f16, h16, l16, n16,
    f17, l17,
    a18, b18,
    a19, c19, e19, g19, j19, l19, m19
  )
  VALUES (
    $1,$2,$3,$4,$5,

    '平日(日中)', '平日(日中)',
    '平日(残業)', '平日(残業)',
    '平日(夜間)', '平日(夜間)',
    '休日(日中)', '休日(日中)',
    '休日(残業)', '休日(残業)',
    '休日(夜間)', '休日(夜間)',

    '工数(H)　計', '━━━━━━', '工数(H)　計', '━━━━━━',

    '労務費　計', '労務費　計',

    '工数H　(管理)',
    '代理人及び監督費',
    '工数H　(管理)',
    '代理人及び監督費',

    '平日(日中)', '平日(日中)',
    '平日(残業)', '平日(残業)',
    '平日(夜間)', '平日(夜間)',
    '休日(日中)', '休日(日中)',
    '休日(残業)', '休日(残業)',
    '休日(夜間)', '休日(夜間)',

    '工数(H)　計', '━━━━━━', '工数(H)　計', '━━━━━━',

    '現場経費2　計', '現場経費2　計',

    '小　　計',
    '━━━━━',

    '合　　計',
    '× 1.02 ＝ ',
    '実効予算/予算上限額',
    '　＝　',
    '× 1.02 - ',
    '実効予算/予算上限額',
    '　＝　'
  )
`, [
  kouji_number,
  companyId,
  kouji_supplier,
  kouji_kenmei,
  contract_taxin
]);
        }
      }

      // ===============================
      // ③ entries 反映
      // ===============================
      if (reflectEntriesFlag) {

        const updateResult = await db.query(`
          UPDATE entries
          SET title = $1
          WHERE bandai = $2
        `, [
          kouji_kenmei,
          kouji_number
        ]);

        if (reflectEntriesFlag) {
  await db.query(
    `INSERT INTO entries (
      bandai,
      title,
      fiscal_year,
      company_id
    )
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (bandai) DO NOTHING`,
    [
      kouji_number,
      kouji_kenmei,
      fiscalYear,
      companyId
    ]
  );
}
      }


// ===============================
// ④ ledger 反映（修正版🔥）
// ===============================
if (reflectLedgerFlag) {

  await db.query(`
    INSERT INTO ledger (
      department,
      kouji_number,
      client,
      construction,
      fiscal_year,
      company_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    department || null,
    kouji_number,
    kouji_supplier,
    kouji_kenmei,
    fiscalYear,
    companyId
  ]);
}

      res.sendStatus(200);

    } catch (err) {
      console.error("POST ERROR:", err);
      res.status(500).send("保存エラー");
    }
  }
);

/* =========================
   GET 一覧取得（年度別）
========================= */
router.get('/', async (req, res) => {
  const fiscalYear = req.fiscalYear;
  const companyId = req.session.company_id;

  try {
    const result = await db.query(`
      SELECT
  co.*,

  -- 実績表（全部エイリアス付き）
  ps.kouji_number AS ps_kouji_number,  -- ← ★これ追加
  ps.kaichou_up AS ps_kaichou_up,
  ps.shachou_up AS ps_shachou_up,
  ps.torishimari_up AS ps_torishimari_up,
  ps.soumu_up AS ps_soumu_up,
  ps.buchou_up AS ps_buchou_up,
  ps.hakkousha_up AS ps_hakkousha_up,

  ps.kaichou_down AS ps_kaichou_down,
  ps.shachou_down AS ps_shachou_down,
  ps.torishimari_down AS ps_torishimari_down,
  ps.soumu_down AS ps_soumu_down,
  ps.buchou_down AS ps_buchou_down,
  ps.hakkousha_down AS ps_hakkousha_down,

  -- コスト
  CASE WHEN cs.kouji_number IS NOT NULL THEN true ELSE false END AS cost_exists

FROM construction_orders co

LEFT JOIN performance_sheets ps
  ON co.kouji_number = ps.kouji_number
  AND co.company_id = ps.company_id

LEFT JOIN costs cs
  ON co.kouji_number = cs.kouji_number
  AND co.company_id = cs.company_id

WHERE co.fiscal_year = $1
AND co.company_id = $2

ORDER BY co.id DESC
    `, [fiscalYear, companyId]);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("データ取得エラー");
  }
});

/* =========================
  工事番号の重複チェック 
========================= */
// ===============================
// 工事番号 重複チェックAPI
// ===============================
router.get("/check/:kouji_number", async (req, res) => {
  const { kouji_number } = req.params;

  try {
    const result = await db.query(
      `SELECT 1 FROM construction_orders
       WHERE kouji_number = $1
       LIMIT 1`,
      [kouji_number]
    );

    res.json({
      exists: result.rows.length > 0
    });

  } catch (err) {
    console.error("重複チェックエラー:", err);
    res.status(500).json({ error: "チェック失敗" });
  }
});




/* =========================
   PUT 更新（年度ガード）
========================= */
router.put(
  '/:id',
  checkFiscalOpen,
  async (req, res) => {
    const { id } = req.params;
    const fiscalYear = req.fiscalYear;
    const companyId = req.session.company_id;

    const {
      department,
      kouji_number, mitsumori_number, hatchuusha, kouji_supplier, kouji_kenmei,
      order_date, expected_date, done_date,
      mitsumori_taxex, mitsumori_taxin, contract_taxex, contract_taxin,
      kaichou, shachou, torishimariyaku, soumu, buchou, hakkousha, article,

      // 🔥 追加（超重要）
      reflectPerformance,
      reflectEntries,
      reflectLedger   // ← これ追加

    } = req.body;

    try {

      // ===============================
      // ✅ デバッグ
      // ===============================
      //console.log("=== PUT DEBUG ===");
      //console.log("reflectPerformance:", reflectPerformance);
      //console.log("reflectEntries:", reflectEntries);

      // 🔥 boolean化
      const reflectPerformanceFlag = reflectPerformance === true || reflectPerformance === "true";
      const reflectEntriesFlag = reflectEntries === true || reflectEntries === "true";
      const reflectLedgerFlag = reflectLedger === true || reflectLedger === "true";

      // ===============================
      // ① 工事命令書 更新
      // ===============================
      const result = await db.query(
        `UPDATE construction_orders SET
          department = $1,
          kouji_number = $2,
          mitsumori_number = $3,
          hatchuusha = $4,
          kouji_supplier = $5,
          kouji_kenmei = $6,
          order_date = $7,
          expected_date = $8,
          done_date = $9,
          mitsumori_taxex = $10,
          mitsumori_taxin = $11,
          contract_taxex = $12,
          contract_taxin = $13,
          kaichou = $14,
          shachou = $15,
          torishimariyaku = $16,
          soumu = $17,
          buchou = $18,
          hakkousha = $19,
          article = $20
        WHERE id = $21 AND fiscal_year = $22 AND company_id = $23
        RETURNING *`,
        [
          department || null,
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
          fiscalYear,
          companyId
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "対象データなし" });
      }

      // ===============================
      // ② 実績表 反映
      // ===============================
      if (reflectPerformanceFlag) {

        const updateResult = await db.query(`
          UPDATE performance_sheets
          SET kouji_supplier = $1,
              kouji_kenmei = $2,
              contract_amount = $3
          WHERE kouji_number = $4 AND company_id = $5
        `, [
          kouji_supplier,
          kouji_kenmei,
          contract_taxin,
          kouji_number,
          companyId
        ]);

        if (updateResult.rowCount === 0) {
          await db.query(`
  INSERT INTO performance_sheets (
    kouji_number,
    company_id,
    kouji_supplier,
    kouji_kenmei,
    contract_amount,

    f1, l1,
    f2, l2,
    f3, l3,
    f4, l4,
    f5, l5,
    f6, l6,
    f7, h7, l7, n7,
    f8, l8,
    f9, h9, l9, n9,
    f10, l10,
    f11, l11,
    f12, l12,
    f13, l13,
    f14, l14,
    f15, l15,
    f16, h16, l16, n16,
    f17, l17,
    a18, b18,
    a19, c19, e19, g19, j19, l19, m19
  )
  VALUES (
    $1,$2,$3,$4,$5,

    '平日(日中)', '平日(日中)',
    '平日(残業)', '平日(残業)',
    '平日(夜間)', '平日(夜間)',
    '休日(日中)', '休日(日中)',
    '休日(残業)', '休日(残業)',
    '休日(夜間)', '休日(夜間)',

    '工数(H)　計', '━━━━━━', '工数(H)　計', '━━━━━━',

    '労務費　計', '労務費　計',

    '工数H　(管理)',
    '代理人及び監督費',
    '工数H　(管理)',
    '代理人及び監督費',

    '平日(日中)', '平日(日中)',
    '平日(残業)', '平日(残業)',
    '平日(夜間)', '平日(夜間)',
    '休日(日中)', '休日(日中)',
    '休日(残業)', '休日(残業)',
    '休日(夜間)', '休日(夜間)',

    '工数(H)　計', '━━━━━━', '工数(H)　計', '━━━━━━',

    '現場経費2　計', '現場経費2　計',

    '小　　計',
    '━━━━━',

    '合　　計',
    '× 1.02 ＝ ',
    '実効予算/予算上限額',
    '　＝　',
    '× 1.02 - ',
    '実効予算/予算上限額',
    '　＝　'
  )
`, [
  kouji_number,
  companyId,
  kouji_supplier,
  kouji_kenmei,
  contract_taxin
]);
        }
      }

      // ===============================
// ③ entries 反映
// ===============================
if (reflectEntriesFlag) {

  await db.query(
    `INSERT INTO entries (
      bandai,
      title,
      created_at,
      fiscal_year,
      company_id
    )
    VALUES ($1, $2, NOW(), $3, $4)
    ON CONFLICT (bandai)
    DO UPDATE SET
      title = EXCLUDED.title,
      fiscal_year = EXCLUDED.fiscal_year`,
    [
      kouji_number,
      kouji_kenmei,
      fiscalYear,
      companyId
    ]
  );

// ===============================
// ④ ledger 反映
// ===============================
// ===============================
// ④ ledger 反映（PUT 修正版🔥）
// ===============================
if (reflectLedgerFlag) {

  const exists = await db.query(
    `SELECT 1 FROM ledger WHERE kouji_number = $1 AND company_id = $2`,
    [kouji_number, companyId]
  );

  if (exists.rowCount === 0) {
    // 🔥 なければINSERT
    await db.query(`
      INSERT INTO ledger (
        department,
        kouji_number,
        client,
        construction,
        fiscal_year,
        company_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      department || null,
      kouji_number,
      kouji_supplier,
      kouji_kenmei,
      fiscalYear,
      companyId
    ]);
  } else {
    // 🔥 あればUPDATE
    await db.query(`
      UPDATE ledger SET
        department = $1,
        client = $2,
        construction = $3,
        updated_at = NOW()
      WHERE kouji_number = $4 AND company_id = $5
    `, [
      department || null,
      kouji_supplier,
      kouji_kenmei,
      kouji_number,
      companyId
    ]);
  }
}
}
      // ===============================
      // ✅ レスポンス
      // ===============================
      res.json(result.rows[0]);

    } catch (err) {
      console.error("PUT ERROR:", err);
      res.status(500).send("更新エラー");
    }
  }
);

/* =========================
   欠番 / 完了フラグ系
========================= */
router.put("/:id/unmissing", checkFiscalOpen, async (req, res) => {
  const { id } = req.params;
  const fiscalYear = req.fiscalYear;
  const companyId = req.session.company_id;

  await db.query(
    "UPDATE construction_orders SET missing = 0 WHERE id = $1 AND fiscal_year = $2 AND company_id = $3",
    [id, fiscalYear, companyId]
  );
  res.json({ success: true });
});

router.put(
  "/:id/missing",
  checkFiscalOpen,   // 🔒 締め年度ガード
  async (req, res) => {
    const { id } = req.params;
    const fiscalYear = req.fiscalYear;
    const companyId = req.session.company_id;

    await db.query(
      "UPDATE construction_orders SET missing = 1 WHERE id = $1 AND fiscal_year = $2 AND company_id = $3",
      [id, fiscalYear, companyId]
    );

    res.json({ success: true });
  }
);

router.put("/:id/completed", checkFiscalOpen, async (req, res) => {
  const { id } = req.params;
  const fiscalYear = req.fiscalYear;
  const companyId = req.session.company_id;

  await db.query(
    "UPDATE construction_orders SET completed = 1 WHERE id = $1 AND fiscal_year = $2 AND company_id = $3",
    [id, fiscalYear, companyId]
  );
  res.json({ success: true });
});

router.put("/:id/uncomplete", checkFiscalOpen, async (req, res) => {
  const { id } = req.params;
  const fiscalYear = req.fiscalYear;
  const companyId = req.session.company_id;

  await db.query(
    "UPDATE construction_orders SET completed = 0 WHERE id = $1 AND fiscal_year = $2 AND company_id = $3",
    [id, fiscalYear, companyId]
  );
  res.json({ success: true });
});

export default router;

