const express = require("express");
const cookieParser = require("cookie-parser");
const aiRoutes = require("./routes/ai.routes");
const app = express();


app.use(cookieParser());
app.use(express.json());

app.use("/api/ai", aiRoutes);

module.exports = app;