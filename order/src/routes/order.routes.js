const express = require("express");
const createAuthMiddleware = require("../middleware/auth.middleware");
const { createOrder, getOrderById, getMyOrders, cancelOrder, updateOrderAddress } = require("../controllers/order.controller")
const router = express.Router();

router.post("/", createAuthMiddleware(["user"]), createOrder);
router.get("/me", createAuthMiddleware(["user"]), getMyOrders);
router.get("/:id", createAuthMiddleware(["user"]), getOrderById);
router.post("/:id/cancel", createAuthMiddleware(["user"]), cancelOrder);
router.patch("/:id/address", createAuthMiddleware(["user"]), updateOrderAddress);

module.exports = router;