import dotenv from "dotenv";
dotenv.config(); // ✅ HARUS DI ATAS SEBELUM import route yang pakai process.env

import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import pageRoutes from "./routes/page.js";
import apiRoutes from "./routes/api.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/", pageRoutes);
app.use("/api", apiRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log(`🔥 http://localhost:${process.env.PORT || 3000}`);
});
