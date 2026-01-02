const { body } = require("express-validator");

const createProductValidator = [
    body("title")
        .trim()
        .notEmpty().withMessage("Title is required")
        .isLength({ min: 3 }).withMessage("Title must be at least 3 characters long"),

    body("description")
        .trim()
        .notEmpty().withMessage("Description is required")
        .isLength({ min: 10 }).withMessage("Description must be at least 10 characters long"),

    body("price")
        .notEmpty().withMessage("Price is required")
        .custom((value) => {
            try {
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                if (!parsed.amount || typeof parsed.amount !== 'number' || parsed.amount <= 0) {
                    throw new Error("Invalid price amount");
                }
                if (!parsed.currency || !["INR", "USD"].includes(parsed.currency)) {
                    throw new Error("Invalid or unsupported currency");
                }
                return true;
            } catch (e) {
                throw new Error(e.message || "Invalid price format. Expected { amount: number, currency: string }");
            }
        }),

    body("category")
        .trim()
        .notEmpty().withMessage("Category is required"),

    body("stock")
        .notEmpty().withMessage("Stock is required")
        .isInt({ min: 0 }).withMessage("Stock must be a non-negative integer")
];

module.exports = { createProductValidator };
