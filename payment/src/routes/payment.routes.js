const express = require("express");
const router = express.Router();
const createAuthMiddleware = require("../middlewares/auth.middleware");
const paymentController = require("../controllers/payment.controller");

router.post("/create/:orderId", createAuthMiddleware(["user"]), paymentController.createPayment);
router.post("/verify", createAuthMiddleware(["user"]), paymentController.verifyPayment)



module.exports = router;