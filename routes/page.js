import express from "express";
const router = express.Router();

router.get("/", (req, res) => res.render("index"));

router.get("/partial/:name", (req, res) => {
  const safe = String(req.params.name || "").replace(/[^a-z0-9_-]/gi, "");
  res.render(`partials/${safe}`);
});

export default router;
