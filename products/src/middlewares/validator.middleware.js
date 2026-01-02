const { body, validationResult } = require("express-validator");

const validateProduct = [
    body("title").isLength({ min: 3 }).withMessage("Title must be at least 3 characters long"),
    body("description").isLength({ min: 10 }).withMessage("Description must be at least 10 characters long"),
    body("price").custom((value) => {
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            if (!parsed.amount || typeof parsed.amount !== 'number' || parsed.amount < 0) {
                throw new Error("Price must be a non-negative number");
            }
            if (!parsed.currency || !["INR", "USD"].includes(parsed.currency)) {
                throw new Error("Invalid currency");
            }
            return true;
        } catch (e) {
            throw new Error("Invalid price format. Expected { amount, currency }");
        }
    }),

    body("category").isLength({ min: 3 }).withMessage("Category must be at least 3 characters long"),
    body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer")
];

const validateProductUpdate = [
    body("title").optional().isLength({ min: 3 }).withMessage("Title must be at least 3 characters long"),
    body("description").optional().isLength({ min: 10 }).withMessage("Description must be at least 10 characters long"),
    body("price").optional().custom((value) => {
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            if (!parsed.amount || typeof parsed.amount !== 'number' || parsed.amount < 0) {
                throw new Error("Price must be a non-negative number");
            }
            if (!parsed.currency || !["INR", "USD"].includes(parsed.currency)) {
                throw new Error("Invalid currency");
            }
            return true;
        } catch (e) {
            throw new Error("Invalid price format. Expected { amount, currency }");
        }
    }),
    body("category").optional().isLength({ min: 3 }).withMessage("Category must be at least 3 characters long"),
    body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer")
];


const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: "Validation failed",
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

module.exports = { validateProduct, validateProductUpdate, validate };
