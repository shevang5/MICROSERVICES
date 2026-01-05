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
}