const cartModel = require("../models/cart.model");
const axios = require("axios");

async function getCart(req, res) {
    try {
        const userId = req.user.id;
        let cart = await cartModel.findOne({ userId });
        if (!cart) {
            return res.status(200).json({ items: [], totalAmount: 0 });
        }

        // Recompute prices from Product Service
        let totalAmount = 0;
        const updatedItems = await Promise.all(cart.items.map(async (item) => {
            try {
                const product = await axios.get(`http://localhost:3001/api/products/${item.productId}`);
                item.priceAtAdd = product.data.price.amount;
                totalAmount += item.priceAtAdd * item.qty;
                return item;
            } catch (error) {
                // If product not found or service down, keep current price or handle error
                totalAmount += item.priceAtAdd * item.qty;
                return item;
            }
        }));

        cart.items = updatedItems;
        cart.totalAmount = totalAmount;
        await cart.save();

        return res.status(200).json(cart);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

async function addItemToCart(req, res) {
    try {
        const { productId, qty } = req.body;
        const userId = req.user.id;

        let cart = await cartModel.findOne({ userId });
        if (!cart) {
            cart = new cartModel({ userId, items: [], totalAmount: 0 });
        }

        const productResponse = await axios.get(`http://localhost:3001/api/products/${productId}`);
        const product = productResponse.data;

        if (product.stock < qty) {
            return res.status(400).json({ message: "Insufficient stock" });
        }

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex > -1) {
            cart.items[itemIndex].qty += qty;
        } else {
            cart.items.push({ productId, qty, priceAtAdd: product.price.amount });
        }

        // Recalculate total
        cart.totalAmount = cart.items.reduce((acc, item) => acc + (item.priceAtAdd * item.qty), 0);

        await cart.save();
        return res.status(201).json(cart);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

async function updateItemQuantity(req, res) {
    try {
        const { productId } = req.params;
        const { qty } = req.body;
        const userId = req.user.id;

        const cart = await cartModel.findOne({ userId });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        if (qty <= 0) {
            cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        } else {
            const item = cart.items.find(item => item.productId.toString() === productId);
            if (!item) return res.status(404).json({ message: "Item not found in cart" });

            // Check stock
            const productResponse = await axios.get(`http://localhost:3001/api/products/${productId}`);
            if (productResponse.data.stock < qty) {
                return res.status(400).json({ message: "Insufficient stock" });
            }

            item.qty = qty;
            item.priceAtAdd = productResponse.data.price.amount;
        }

        cart.totalAmount = cart.items.reduce((acc, item) => acc + (item.priceAtAdd * item.qty), 0);
        await cart.save();
        return res.status(200).json(cart);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

async function removeItem(req, res) {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        const cart = await cartModel.findOne({ userId });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        cart.totalAmount = cart.items.reduce((acc, item) => acc + (item.priceAtAdd * item.qty), 0);

        await cart.save();
        return res.status(200).json(cart);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

async function clearCart(req, res) {
    try {
        const userId = req.user.id;
        const cart = await cartModel.findOne({ userId });
        if (cart) {
            cart.items = [];
            cart.totalAmount = 0;
            await cart.save();
        }
        return res.status(200).json(cart || { items: [], totalAmount: 0 });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

module.exports = {
    getCart,
    addItemToCart,
    updateItemQuantity,
    removeItem,
    clearCart
};
