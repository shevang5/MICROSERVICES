const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const validateAddItemResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const validateAddToCart = () => {
    return [
        body("productId")
            .isMongoId()
            .custom((value) => {
                return mongoose.Types.ObjectId.isValid(value);
            })
            .withMessage("Invalid product ID"),
        body("qty")
            .isInt({ min: 1 })
            .withMessage("Quantity must be at least 1"),
        validateAddItemResult
    ];
};


module.exports = {
    validateAddToCart
}
