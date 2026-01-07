const express = require("express");
const router = express.Router();
const { createAuthMiddleware } = require("../middlewares/auth.middleware")
const controller = require("../controllers/seller.controller")

router.get("/metrics", createAuthMiddleware(["seller"]), controller.getMetrics);
router.get("/orders", createAuthMiddleware(["seller"]), controller.getOrders);
router.get("/products", createAuthMiddleware(["seller"]), controller.getProducts);

module.exports = router;