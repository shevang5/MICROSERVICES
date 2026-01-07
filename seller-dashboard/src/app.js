const express = require("express");
const cookieParser = require("cookie-parser");
const sellerRoutes = require("./routes/seller.routes");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/seller/dashboard", sellerRoutes);


app.get("/", (req, res) => {
    res.status(200).json({ message: "Seller Dashboard" })
})

module.exports = app;