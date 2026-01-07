const express = require("express");
const { connect, subscribeToQueue } = require("./broker/broker");
const setListners = require("./broker/listner");
const app = express();

connect().then(() => {
    setListners();
})


app.get("/", (req, res) => {
    res.status(200).json({ message: "Notification Service" })
})



module.exports = app