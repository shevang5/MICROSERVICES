const express = require("express");
const router = require("./routes/cart.routes");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/", router);

app.get("/", (req, res) => {
    res.status(200).json({ message: "Cart Service" })
})

module.exports = app;