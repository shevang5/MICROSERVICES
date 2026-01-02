const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        qty: {
            type: Number,
            required: true,
            min: 1
        },
        priceAtAdd: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const cartModel = mongoose.model("Cart", CartSchema);

module.exports = cartModel;
