// models/fiscal.js
import pool from "./db.js";

export async function getCurrentFiscalYear(companyId, db) {
  const { rows } = await db.query(
    `SELECT current_fiscal_year FROM company_settings WHERE company_id = $1`,
    [companyId]
  );
  return rows[0]?.current_fiscal_year ?? null;
}