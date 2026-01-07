require("dotenv").config();
const app = require("./src/app");
const mongoose = require("mongoose");
const { connect } = require("./src/broker/broker");
const jwt = require("jsonwebtoken");
const connectDB = require("./src/db/db");

// const expressValidator = require("express-validator");


// app.use(expressValidator());

connectDB();
connect();

app.listen(process.env.PORT || 3003, () => {
    console.log("Server started on port 3003");
});
