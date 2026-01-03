const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
});

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        // ref: "User",
        required: true
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                // ref: "Product",
                required: true
            },
            qty: {
                type: Number,
                required: true
            },
            price: {
                type: Number,
                required: true,
                currency: {
                    type: String,
                    required: true,
                    enum: ["INR", "USD"],
                    default: "INR"
                }
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true,
        currency: {
            type: String,
            required: true,
            enum: ["INR", "USD"],
            default: "INR"
        }
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
        default: "pending"
    },
    shippingAddress: addressSchema,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const orderModel = mongoose.model("Order", orderSchema);

module.exports = orderModel;
