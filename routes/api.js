import express from "express";
import axios from "axios";

const router = express.Router();

const client = axios.create({
  baseURL: process.env.API_BASE,
  headers: {
    Authorization: `Bearer ${process.env.API_TOKEN}`
  },
  timeout: 15000
});

// Generic GET proxy: /api/<anything>
router.get("/:endpoint(*)", async (req, res) => {
  try {
    const { endpoint } = req.params;
    const r = await client.get("/" + endpoint, { params: req.query });
    res.json(r.data);
  } catch (e) {
    res.status(500).json({
      error: "API Error",
      message: e?.response?.data?.message || e.message
    });
  }
});

// POST watch/player (fixed endpoint)
router.post("/watch/player", async (req, res) => {
  try {
    const r = await client.post("/watch/player?lang=in", req.body, {
      headers: { "Content-Type": "application/json" }
    });
    res.json(r.data);
  } catch (e) {
    res.status(500).json({
      error: "Player Error",
      message: e?.response?.data?.message || e.message
    });
  }
});

export default router;
