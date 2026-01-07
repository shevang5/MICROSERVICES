const { subscribeToQueue } = require("./broker");
const sendEmail = require("../email");

module.exports = async function () {
    subscribeToQueue("AUTH_NOTIFICATION_USER_CREATED", async (data) => {
        console.log("Recived data from queue", data);

        const emailHTMLTemplate = `
        <h1>Registration Successful</h1>
        <p>Dear ${data.firstname} ${data.lastname},</p>
        <p>Thank you for registering with our service.</p>
        <p>Best regards</p>
        <p>Team</p>
        `;

        await sendEmail(data.email, "Registration Successful", "", emailHTMLTemplate);
    })

    subscribeToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_INITIATED", async (data) => {
        console.log("Recived data from queue", data);

        const emailHTMLTemplate = `
        <h1>Payment Initiated</h1>
        <p>Dear ${data.firstname} ${data.lastname},</p>
        <p>We have initiated your payment of ${data.amount} ${data.currency} for order ${data.title}</p>
        <p>Best regards</p>
        <p>Team</p>
        `;

        await sendEmail(data.email, "Payment Initiated", "", emailHTMLTemplate);
    })

    subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async (data) => {
        console.log("Recived data from queue", data);

        const emailHTMLTemplate = `
        <h1>Payment Successful</h1>
        <p>Dear ${data.firstname} ${data.lastname},</p>
        <p>We have recived your payment of ${data.amount} ${data.currency} for order ${data.title}</p>
        <p>Best regards</p>
        <p>Team</p>
        `;

        await sendEmail(data.email, "Payment Successful", "", emailHTMLTemplate);
    })

    subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", async (data) => {
        console.log("Recived data from queue", data);

        const emailHTMLTemplate = `
        <h1>Payment Failed</h1>
        <p>Dear ${data.firstname} ${data.lastname},</p>
        <p>We have failed to recive your payment of ${data.amount} ${data.currency} for order ${data.orderId}</p>
        <p>Best regards</p>
        <p>Team</p>
        `;

        await sendEmail(data.email, "Payment Failed", "", emailHTMLTemplate);
    })
}