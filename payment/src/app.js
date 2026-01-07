const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
// const paymentController = require("./controllers/payment.controller");
const paymentRoutes = require("./routes/payment.routes");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use("/api/payments", paymentRoutes);

app.get("/", (req, res) => {
    res.status(200).json({ message: "Payment Service" })
})


module.exports = app;
