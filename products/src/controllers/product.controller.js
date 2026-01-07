const imagekit = require("../utils/imagekit");
const Product = require("../models/product.model");
const mongoose = require("mongoose");
const { publishQueue } = require("../broker/broker");


const createProduct = async (req, res) => {
    try {
        const { title, description, price, category, stock } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "At least one product image is required" });
        }

        const seller = req.user.id;

        // Upload all images to ImageKit concurrently
        const uploadPromises = req.files.map(file =>
            imagekit.upload({
                file: file.buffer,
                fileName: `${Date.now()}-${file.originalname}`,
                folder: "/products"
            })
        );

        const uploadResponses = await Promise.all(uploadPromises);

        const images = uploadResponses.map(res => ({
            url: res.url,
            thumbnail: res.thumbnailUrl,
            id: res.fileId
        }));

        const newProduct = new Product({
            title,
            description,
            price: typeof price === 'string' ? JSON.parse(price) : price,
            category,
            stock,
            seller,
            images
        });

        await publishQueue("PRODUCTS_SELLER_DASHBOARD.PRODUCT_CREATED", newProduct);

        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getProducts = async (req, res) => {
    try {
        const { q, minprice, maxprice, skip = 0, limit = 10, sort } = req.query;

        const filter = {}

        if (q) {
            filter.$text = { $search: q }
        }

        if (minprice || maxprice) {
            filter['price.amount'] = {};
            if (minprice) filter['price.amount'].$gte = Number(minprice);
            if (maxprice) filter['price.amount'].$lte = Number(maxprice);
        }

        const sortObj = {};
        if (sort) {
            sortObj['price.amount'] = Number(sort) === -1 ? -1 : 1;
        }

        const products = await Product.find(filter)
            .skip(Number(skip))
            .limit(Number(limit))
            .sort(sortObj);

        return res.status(200).json(products);
    } catch (error) {
        console.error("Error in getProducts:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getProductById = async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json(product);
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Authorization: Admin can update anything, Seller can only update their own
        if (req.user.role !== 'admin' && product.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to update this product" });
        }

        const allowedUpdate = ['title', 'description', 'price', 'category', 'stock'];
        const updates = Object.keys(req.body);

        for (const key of updates) {
            if (!allowedUpdate.includes(key)) {
                return res.status(400).json({ message: `Invalid update field: ${key}` });
            }
            // Handle price parsing if it's a string (though PATCH usually sends JSON)
            if (key === 'price' && typeof req.body[key] === 'string') {
                product[key] = JSON.parse(req.body[key]);
            } else {
                product[key] = req.body[key];
            }
        }

        await product.save();
        return res.status(200).json(product);
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Authorization: Admin can delete anything, Seller can only delete their own
        if (req.user.role !== 'admin' && product.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to delete this product" });
        }

        await Product.findByIdAndDelete(id);
        return res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getProductsBySeller = async (req, res) => {
    try {
        const { skip = 0, limit = 10 } = req.query;
        const products = await Product.find({ seller: req.user.id }).skip(Number(skip)).limit(Math.min(limit, 20));
        return res.status(200).json(products);
    } catch (error) {
        console.error("Error getting products by seller:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct, getProductsBySeller };
