// forum-server.js（ESM 完全対応）

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import postsRouter from "./routes/posts.js";
import pool from "./models/db.js";
import { getCurrentFiscalYear } from "./models/fiscal.js";


// __dirname を ESM で再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function forumServer(app) {
  app.use(cors());
  app.use(express.json());

  // forum API
  app.use("/api/posts", postsRouter);
}

  