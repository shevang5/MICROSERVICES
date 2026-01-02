const express = require("express");
const router = express.Router();
const createAuthMiddleware = require("../middlewares/auth.middleware");
const cartController = require("../controllers/cart.controller");
const { validateAddToCart } = require("../middlewares/validateAddItemResult");

router.get("/cart", createAuthMiddleware(["user"]), cartController.getCart);
router.post("/cart/items", createAuthMiddleware(["user"]), validateAddToCart(), cartController.addItemToCart);
router.patch("/cart/items/:productId", createAuthMiddleware(["user"]), cartController.updateItemQuantity);
router.delete("/cart/items/:productId", createAuthMiddleware(["user"]), cartController.removeItem);
router.delete("/cart", createAuthMiddleware(["user"]), cartController.clearCart);

module.exports = router;