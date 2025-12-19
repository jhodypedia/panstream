import express from "express";
import axios from "axios";

const router = express.Router();

const API_BASE = process.env.API_BASE || "https://sementara.site/api";
const API_TOKEN = process.env.API_TOKEN;

const client = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

function authHeaders() {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
  };
}

// Debug helper
function sendAxiosError(res, e) {
  const status = e?.response?.status || 500;
  const data = e?.response?.data || null;

  console.error("UPSTREAM ERROR:", {
    status,
    url: e?.config?.baseURL + e?.config?.url,
    params: e?.config?.params,
    data,
    message: e.message,
  });

  res.status(status).json({
    error: "Upstream error",
    status,
    upstream: data,
    message: e?.response?.data?.message || e.message,
  });
}

// Generic GET proxy
router.get("/:endpoint(*)", async (req, res) => {
  try {
    if (!API_TOKEN) {
      return res.status(500).json({
        error: "Missing API_TOKEN",
        hint: "Cek .env dan pastikan dotenv.config() dipanggil sebelum import routes",
      });
    }

    const endpoint = "/" + req.params.endpoint;
    const r = await client.get(endpoint, {
      params: req.query,
      headers: authHeaders(),
    });

    res.json(r.data);
  } catch (e) {
    sendAxiosError(res, e);
  }
});

// POST watch/player
router.post("/watch/player", async (req, res) => {
  try {
    if (!API_TOKEN) {
      return res.status(500).json({
        error: "Missing API_TOKEN",
        hint: "Cek .env dan pastikan dotenv.config() dipanggil sebelum import routes",
      });
    }

    const r = await client.post("/watch/player?lang=in", req.body, {
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
    });

    res.json(r.data);
  } catch (e) {
    sendAxiosError(res, e);
  }
});

export default router;
