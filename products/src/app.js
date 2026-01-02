const express = require("express");
const cookieParser = require("cookie-parser");
const productRoutes = require("./routes/product.routes");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/products", productRoutes);





module.exports = app;