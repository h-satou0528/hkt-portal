// performance-server.js（ESM 完全対応）

import express from "express";

import performanceSheetsRouter from "./routes/performance_sheets.js";
import costsSheetsRouter from "./routes/costs_sheets.js";
import constructionRoutes from "./routes/construction.js";
import pool, { getCurrentFiscalYear } from "./models/db.js";

export default async function performanceServer(app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ルート登録
  app.use("/api/performance_sheets", performanceSheetsRouter);
  app.use("/api/costs", costsSheetsRouter);
  app.use("/api/construction_orders", constructionRoutes);

  console.log("✅ performance-server.js がマウントされました");
}
