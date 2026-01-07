
require("dotenv").config();
const app = require("./src/app");
const listener = require("./src/broker/listener");
const { connect } = require("./src/broker/broker");

const connectDB = require("./src/db/db");
connectDB();
connect().then(() => {
    console.log("RabbitMQ connected");
    listener();
}).catch(err => console.log(err));

const PORT = process.env.PORT || 3007;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});