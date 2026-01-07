const express = require("express");
const orderRoutes = require("./routes/order.routes");
const cookieParser = require("cookie-parser");
const app = express();

app.use(cookieParser());
app.use(express.json());

app.use("/api/orders", orderRoutes);

app.get("/", (req, res) => {
    res.status(200).json({ message: "Order Service" })
})

module.exports = app;