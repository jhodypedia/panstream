import express from "express";
import axios from "axios";

const router = express.Router();
const API_BASE = process.env.API_BASE || "https://sementara.site/api";

function getToken() {
  return process.env.API_TOKEN;
}

function defaultHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
    "User-Agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
    Accept: "application/json",
  };
}

router.post("/watch/player", async (req, res) => {
  try {
    const token = getToken();
    if (!token) {
      return res.status(500).json({
        error: "Missing API_TOKEN",
        reason: "process.env.API_TOKEN empty at request time",
      });
    }

    const r = await axios.post(
      `${API_BASE}/watch/player?lang=in`,
      req.body,
      { headers: defaultHeaders(), timeout: 20000 }
    );

    res.json(r.data);
  } catch (e) {
    res.status(e?.response?.status || 500).json({
      error: "Upstream error",
      message: e?.response?.data || e.message,
    });
  }
});

router.get("/:endpoint(*)", async (req, res) => {
  try {
    const token = getToken();
    if (!token) {
      return res.status(500).json({
        error: "Missing API_TOKEN",
        reason: "process.env.API_TOKEN empty at request time",
      });
    }

    const r = await axios.get(`${API_BASE}/${req.params.endpoint}`, {
      params: req.query,
      headers: defaultHeaders(),
      timeout: 20000,
    });

    res.json(r.data);
  } catch (e) {
    res.status(e?.response?.status || 500).json({
      error: "Upstream error",
      message: e?.response?.data || e.message,
    });
  }
});

export default router;
