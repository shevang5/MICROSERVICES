const paymentModel = require("../models/payment.model");
const axios = require("axios")
const publishQueue = require("../broker/broker").publishQueue;


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

        const orderItems = orderResponse.data.items || [];
        const productTitles = orderItems.map(item => item.name).filter(Boolean).join(", ");
        const paymentTitle = productTitles || `Order ${orderId}`;

        const payment = await paymentModel.create({
            order: orderId,
            razorpayOrderId: order.id,
            user: req.user.id,
            title: paymentTitle,
            price: {
                amount: order.amount,
                currency: order.currency
            }
        });

        publishQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", payment);
        publishQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_INITIATED", {
            email: req.user.email,
            firstname: req.user.firstname,
            lastname: req.user.lastname,
            orderId: orderId,
            paymentId: payment.id,
            userId: req.user.id,
            amount: payment.price.amount,
            currency: payment.price.currency,
            title: payment.title
        });

        return res.status(201).json({ message: "payment initiat", payment });

    } catch (error) {
        console.error("Payment Creation Error:", error);
        const statusCode = error.statusCode || 500;
        const errorMessage = error.error?.description || error.message || "Internal Server Error";
        res.status(statusCode).json({ error: errorMessage });
    }
}

const crypto = require("crypto");

async function verifyPayment(req, res) {
    const { razorpayOrderId, paymentId, signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    try {
        if (!razorpayOrderId || !paymentId || !signature) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        console.log("Verify Payment Debug - req.user:", req.user); // DEBUG LOG


        // ✅ Generate signature FIRST
        const generatedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${razorpayOrderId}|${paymentId}`)
            .digest("hex");

        // ✅ DEBUG LOGS (now safe)
        console.log("---- SIGNATURE DEBUG ----");
        console.log("Order ID:", razorpayOrderId);
        console.log("Payment ID:", paymentId);
        console.log("Secret:", secret);
        console.log("Expected Signature:", generatedSignature);
        console.log("Received Signature:", signature.trim());
        console.log("-------------------------");

        // ✅ Compare signatures
        if (generatedSignature !== signature.trim()) {
            return res.status(400).json({ error: "Invalid signature" });
        }

        const updatedPayment = await paymentModel.findOneAndUpdate(
            { razorpayOrderId },
            {
                status: "completed",
                paymentId,
                signature: signature.trim()
            },
            { new: true }
        );

        if (!updatedPayment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        await publishQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", {
            email: req.user.email,
            firstname: req.user.firstname, // From updated JWT
            lastname: req.user.lastname,   // From updated JWT
            orderId: razorpayOrderId,
            paymentId,
            signature: signature.trim(),
            userId: req.user.id,
            amount: updatedPayment.price.amount,
            currency: updatedPayment.price.currency,
            title: updatedPayment.title || `Order ${updatedPayment.order}` // Use saved title or fallback
        });

        return res.status(200).json({ message: "Payment verified successfully" });

    } catch (error) {
        console.error("Verification error:", error);

        await publishQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", {
            email: req.user?.email,
            firstname: req.user?.firstname,
            lastname: req.user?.lastname,
            orderId: razorpayOrderId,
            paymentId,
            signature,
            userId: req.user?.id
        });

        return res.status(500).json({ error: "Payment verification failed" });
    }
}




module.exports = {
    createPayment,
    verifyPayment
}