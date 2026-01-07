const { subscribeToQueue } = require("./broker");
const userModel = require("../models/user.model");
const ProductModel = require("../models/product.model");
const orderModel = require("../models/order.model")
const paymentModel = require("../models/payment.model")

module.exports = () => {
    subscribeToQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", async (newUser) => {
        try {
            console.log("Received new user event:", newUser);
            // Check if user already exists to avoid duplicates (idempotency)
            const existingUser = await userModel.findById(newUser.id || newUser._id);

            if (!existingUser) {
                // Ensure _id is manually set if passed, or handled by mongoose if not. 
                // Usually messages pass plain objects. Mongoose .create() might generate a NEW _id if we don't handle it.
                // We want to sync IDs.

                const userToSave = {
                    ...newUser,
                    _id: newUser.id || newUser._id // Ensure we use the same ID from auth service
                };

                await userModel.create(userToSave);
                console.log(`User ${userToSave.username} synced to seller-dashboard.`);
            } else {
                console.log(`User ${newUser.username} already exists in seller-dashboard.`);
            }
        } catch (error) {
            console.error("Error syncing user to seller-dashboard:", error);
        }
    });

    subscribeToQueue("PRODUCTS_SELLER_DASHBOARD.PRODUCT_CREATED", async (newProduct) => {
        try {
            console.log("Received new product event:", newProduct);
            // Check if product already exists to avoid duplicates (idempotency)
            const existingProduct = await ProductModel.findById(newProduct.id || newProduct._id);

            if (!existingProduct) {
                // Ensure _id is manually set if passed, or handled by mongoose if not. 
                // Usually messages pass plain objects. Mongoose .create() might generate a NEW _id if we don't handle it.
                // We want to sync IDs.

                const productToSave = {
                    ...newProduct,
                    _id: newProduct.id || newProduct._id // Ensure we use the same ID from auth service
                };

                await ProductModel.create(productToSave);
                console.log(`Product ${productToSave.title} synced to seller-dashboard.`);
            } else {
                console.log(`Product ${newProduct.title} already exists in seller-dashboard.`);
            }
        } catch (error) {
            console.error("Error syncing product to seller-dashboard:", error);
        }
    });

    subscribeToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", async (newOrder) => {
        try {
            console.log("Received new order event:", newOrder);
            // Check if order already exists to avoid duplicates (idempotency)
            const existingOrder = await orderModel.findById(newOrder.id || newOrder._id);

            if (!existingOrder) {
                // Ensure _id is manually set if passed, or handled by mongoose if not. 
                // Usually messages pass plain objects. Mongoose .create() might generate a NEW _id if we don't handle it.
                // We want to sync IDs.

                const orderToSave = {
                    ...newOrder,
                    _id: newOrder.id || newOrder._id // Ensure we use the same ID from auth service
                };

                await orderModel.create(orderToSave);
                console.log(`Order ${orderToSave._id} synced to seller-dashboard.`);
            } else {
                console.log(`Order ${newOrder._id} already exists in seller-dashboard.`);
            }
        } catch (error) {
            console.error("Error syncing order to seller-dashboard:", error);
            const fs = require('fs');
            fs.appendFileSync('listener_errors.log', `[${new Date().toISOString()}] Order Sync Error: ${error.message}\nStack: ${error.stack}\n`);
        }
    });

    subscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", async (newPayment) => {
        try {
            console.log("Received new payment event:", newPayment);
            // Check if payment already exists to avoid duplicates (idempotency)
            const existingPayment = await paymentModel.findById(newPayment.id || newPayment._id);

            if (!existingPayment) {
                // Ensure _id is manually set if passed, or handled by mongoose if not. 
                // Usually messages pass plain objects. Mongoose .create() might generate a NEW _id if we don't handle it.
                // We want to sync IDs.

                const paymentToSave = {
                    ...newPayment,
                    _id: newPayment.id || newPayment._id // Ensure we use the same ID from auth service
                };

                await paymentModel.create(paymentToSave);
                console.log(`Payment ${paymentToSave._id} synced to seller-dashboard.`);
            } else {
                console.log(`Payment ${newPayment._id} already exists in seller-dashboard.`);
            }
        } catch (error) {
            console.error("Error syncing payment to seller-dashboard:", error);
        }
    });
    subscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_COMPLETED", async (newPayment) => {
        await paymentModel.findOneAndUpdate({ _id: newPayment.id || newPayment._id }, { status: "completed" });
    });
};