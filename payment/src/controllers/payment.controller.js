const paymentModel = require("../models/payment.model");
const axios = require("axios")


require('dotenv').config();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy',
});

async function createPayment(req, res) {

    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    try {
        const orderId = req.params.orderId;
        // const payment = await paymentModel.create({
        //     orderId,
        //     user: req.user.id
        // });

        const orderResponse = await axios.get("http://localhost:3003/api/orders/" + orderId, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log("Order Service Response Data:", orderResponse.data);

        const price = orderResponse.data.totalAmount;
        const order = await razorpay.orders.create({
            amount: Math.round(price * 100), // amount in the smallest currency unit (paise), must be an integer
            currency: "INR",
            receipt: `receipt_${orderId}`
        });

        const payment = await paymentModel.create({
            order: orderId,
            razorpayOrderId: order.id,
            user: req.user.id,
            price: {
                amount: order.amount,
                currency: order.currency
            }
        });

        return res.status(201).json({ message: "payment initiat", payment });

    } catch (error) {
        console.error("Payment Creation Error:", error);
        const statusCode = error.statusCode || 500;
        const errorMessage = error.error?.description || error.message || "Internal Server Error";
        res.status(statusCode).json({ error: errorMessage });
    }
}

async function verifyPayment(req, res) {
    const { razorpayOrderId, paymentId, signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET

    try {
        const crypto = require("crypto");
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(razorpayOrderId + "|" + paymentId);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature === signature) {
            await paymentModel.findOneAndUpdate(
                { razorpayOrderId },
                { status: "completed", paymentId, signature },
                { new: true }
            );
            res.status(200).json({ message: "Payment verified successfully" });
        } else {
            res.status(400).json({ error: "Invalid signature" });
        }
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: "Payment verification failed" });
    }
}

module.exports = {
    createPayment,
    verifyPayment
}