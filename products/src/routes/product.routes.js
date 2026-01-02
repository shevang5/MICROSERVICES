const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multer.middleware");
const ProductController = require("../controllers/product.controller");
const createAuthMiddleware = require("../middlewares/auth.middleware");
const { createProductValidator } = require("../validators/product.validator");
const { validateProduct, validateProductUpdate, validate } = require("../middlewares/validator.middleware");

router.post(
    "/",
    upload.array("image", 5),
    createAuthMiddleware(["admin", "seller"]),
    validateProduct,
    validate,
    ProductController.createProduct
);

router.get(
    "/", ProductController.getProducts
);

router.get(
    "/seller", createAuthMiddleware(["seller"]), ProductController.getProductsBySeller
)


router.patch(
    "/:id", createAuthMiddleware(["admin", "seller"]), validateProductUpdate, validate, ProductController.updateProduct
)

router.delete(
    "/:id", createAuthMiddleware(["admin", "seller"]), ProductController.deleteProduct
)


router.get(
    "/:id", ProductController.getProductById
)


module.exports = router;

