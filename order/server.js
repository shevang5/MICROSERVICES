require("dotenv").config();
const app = require("./src/app");
const mongoose = require("mongoose");

// const expressValidator = require("express-validator");
const jwt = require("jsonwebtoken");
const connectDB = require("./src/db/db");


// app.use(expressValidator());

connectDB();

app.listen(process.env.PORT || 3003, () => {
    console.log("Server started on port 3003");
});
