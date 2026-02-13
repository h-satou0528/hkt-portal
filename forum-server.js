// forum-server.js（ESM 完全対応）

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import postsRouter from "./routes/posts.js";
import pool, { getCurrentFiscalYear } from "./models/db.js";


// __dirname を ESM で再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function forumServer(app) {
  app.use(cors());
  app.use(express.json());

  // ★ 年度注入ミドルウェア（最重要）
  app.use(async (req, res, next) => {
    try {
      req.fiscalYear = await getCurrentFiscalYear();
      next();
    } catch (err) {
      console.error("Failed to get fiscal year", err);
      res.status(500).json({ error: "Fiscal year error" });
    }
  });

  
  // forum API
  app.use("/api/posts", postsRouter);
}
