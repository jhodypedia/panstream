import express from "express";
import axios from "axios";

const router = express.Router();

/**
 * Base API
 * (diambil dari ENV Vercel)
 */
const API_BASE = process.env.API_BASE || "https://sementara.site/api";

/**
 * 🔑 Ambil token SAAT REQUEST
 * (WAJIB untuk Vercel / ESM)
 */
function getToken() {
  return process.env.API_TOKEN;
}

/**
 * Header default (browser-like)
 */
function defaultHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/123 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  };
}

/**
 * Error handler
 */
function sendError(res, err) {
  const status = err?.response?.status || 500;
  res.status(status).json({
    error: "Upstream error",
    status,
    message: err?.response?.data || err.message,
  });
}

/* ======================================================
   POST /api/watch/player
   (WAJIB diletakkan SEBELUM route GET generic)
====================================================== */
router.post("/watch/player", async (req, res) => {
  try {
    const token = getToken();
    if (!token) {
      return res.status(500).json({
        error: "Missing API_TOKEN",
        hint: "Set API_TOKEN di Vercel Environment Variables lalu redeploy",
      });
    }

    const r = await axios.post(
      `${API_BASE}/watch/player?lang=in`,
      req.body,
      {
        headers: {
          ...defaultHeaders(),
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    res.status(r.status).json(r.data);
  } catch (err) {
    sendError(res, err);
  }
});

/* ======================================================
   GENERIC GET PROXY
   contoh:
   /api/foryou/1?lang=in
   /api/new/1?lang=in&pageSize=10
   /api/rank/1?lang=in
====================================================== */
router.get("/:endpoint(*)", async (req, res) => {
  try {
    const token = getToken();
    if (!token) {
      return res.status(500).json({
        error: "Missing API_TOKEN",
        hint: "Set API_TOKEN di Vercel Environment Variables lalu redeploy",
      });
    }

    const endpoint = req.params.endpoint; // ex: "foryou/1"
    const url = `${API_BASE}/${endpoint}`;

    const r = await axios.get(url, {
      params: req.query,
      headers: defaultHeaders(),
      timeout: 20000,
    });

    res.status(r.status).json(r.data);
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
