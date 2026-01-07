const orderModel = require("../models/order.model");
const { publishQueue } = require('../broker/broker');

async function createOrder(req, res) {
    try {
        const { items, shippingAddress } = req.body;

        // 1. Copies priced items and computes taxes/shipping
        // Simplified calculation: tax = 10%, shipping = 100 fixed
        const taxRate = 0.1;
        const shippingCharge = 100;

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount + shippingCharge;

        const order = await orderModel.create({
            userId: req.user.id,
            items,
            totalAmount,
            shippingAddress,
            status: "pending"
        });

        // 2. Reserves inventory (placeholder)
        console.log(`Reserving inventory for order ${order._id}`);

        // 3. Emits order.created event (placeholder)
        console.log(`Emitting order.created for order ${order._id}`);
        publishQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", order);

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getOrderById(req, res) {
    try {
        const order = await orderModel.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getMyOrders(req, res) {
    try {
        const orders = await orderModel.find({ userId: req.user.id });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function cancelOrder(req, res) {
    try {
        const order = await orderModel.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.status !== "pending" && order.status !== "confirmed") {
            return res.status(400).json({ message: "Order cannot be cancelled" });
        }
        order.status = "cancelled";
        await order.save();
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateOrderAddress(req, res) {
    try {
        const order = await orderModel.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.status !== "pending") {
            return res.status(400).json({ message: "Address can only be updated for pending orders" });
        }
        order.shippingAddress = req.body.shippingAddress;
        await order.save();
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    createOrder,
    getOrderById,
    getMyOrders,
    cancelOrder,
    updateOrderAddress
}
