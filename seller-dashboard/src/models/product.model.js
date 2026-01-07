const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            required: true,
            enum: ["INR", "USD"],
            default: "INR"
        }
    },
    images: [
        {
            url: String,
            thumbnail: String,
            id: String
        }
    ],
    category: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
});

productSchema.index({ title: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;