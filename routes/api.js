// routes/api.js
import express from "express";
import axios from "axios";

const router = express.Router();

const API_BASE = process.env.API_BASE || "https://sementara.site/api";
const API_TOKEN = process.env.API_TOKEN;

function mustHaveToken(res) {
  if (!API_TOKEN) {
    res.status(500).json({
      error: "Missing API_TOKEN",
      hint: "Pastikan .env kebaca dan dotenv.config() dipanggil sebelum import routes",
    });
    return false;
  }
  return true;
}

function defaultHeaders() {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/123 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  };
}

function sendUpstreamError(res, e) {
  const status = e?.response?.status || 500;
  res.status(status).json({
    error: "Upstream error",
    status,
    message: e?.response?.data?.message || e.message,
    upstream: e?.response?.data || null,
  });
}

/**
 * ✅ POST /api/watch/player
 * upstream: POST https://sementara.site/api/watch/player?lang=in
 * body: {"bookId":"...","chapterIndex":10,"lang":"in"}
 */
router.post("/watch/player", async (req, res) => {
  try {
    if (!mustHaveToken(res)) return;

    const r = await axios.post(`${API_BASE}/watch/player?lang=in`, req.body, {
      headers: {
        ...defaultHeaders(),
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    res.status(r.status).json(r.data);
  } catch (e) {
    sendUpstreamError(res, e);
  }
});

/**
 * ✅ GET proxy generic
 * contoh: /api/foryou/1?lang=in
 */
router.get("/:endpoint(*)", async (req, res) => {
  try {
    if (!mustHaveToken(res)) return;

    const endpoint = req.params.endpoint; // contoh: "foryou/1"
    const url = `${API_BASE}/${endpoint}`;

    const r = await axios.get(url, {
      params: req.query,
      headers: defaultHeaders(),
      timeout: 20000,
    });

    res.status(r.status).json(r.data);
  } catch (e) {
    sendUpstreamError(res, e);
  }
});

export default router;
