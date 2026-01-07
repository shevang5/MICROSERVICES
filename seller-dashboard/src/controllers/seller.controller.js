const Order = require("../models/order.model");
const Product = require("../models/product.model");
const mongoose = require("mongoose");

const getMetrics = async (req, res) => {
    try {
        // Auth middleware attaches the decoded token to req.user
        // Token payload often contains 'id' or '_id' depending on auth service
        const sellerId = req.user.id || req.user._id || req.user.userId;

        if (!sellerId) {
            return res.status(403).json({ message: "Seller ID not found in request" });
        }

        const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

        // Aggregation to get Sales (total items sold) and Revenue (total value sold)
        const salesAndRevenue = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $match: {
                    "product.seller": sellerObjectId
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$items.qty" },
                    totalRevenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } }
                }
            }
        ]);

        const sales = salesAndRevenue.length > 0 ? salesAndRevenue[0].totalSales : 0;
        const revenue = salesAndRevenue.length > 0 ? salesAndRevenue[0].totalRevenue : 0;

        // Aggregation to get Top Products
        const topProducts = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $match: {
                    "product.seller": sellerObjectId
                }
            },
            {
                $group: {
                    _id: "$items.productId",
                    name: { $first: "$product.title" }, // Using product title
                    image: { $first: { $arrayElemAt: ["$product.images.url", 0] } },
                    totalSold: { $sum: "$items.qty" },
                    revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        res.status(200).json({
            sales,
            revenue,
            topProducts
        });

    } catch (error) {
        console.error("Error fetching seller metrics:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

const getOrders = async (req, res) => {
    try {
        const sellerId = req.user.id || req.user._id || req.user.userId;

        // Find products belonging to this seller
        const products = await Product.find({ seller: sellerId }).select('_id');
        const productIds = products.map(p => p._id);

        // Find orders containing these products
        // Note: This returns the full order. A more advanced version might show only seller's items.
        const orders = await Order.find({ "items.productId": { $in: productIds } }).sort({ createdAt: -1 });

        res.status(200).json(orders);
    } catch (error) {
        console.error("Error fetching seller orders:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

const getProducts = async (req, res) => {
    try {
        const sellerId = req.user.id || req.user._id || req.user.userId;
        const products = await Product.find({ seller: sellerId }).sort({ createdAt: -1 });
        res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching seller products:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

module.exports = {
    getMetrics,
    getOrders,
    getProducts
};
