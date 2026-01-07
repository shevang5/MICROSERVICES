require("dotenv").config();

const app = require("./src/app");
const { connect } = require("./src/broker/broker");


const connectDB = require("./src/db/db");
connect();
connectDB();

app.listen(process.env.PORT || 3004, () => {
    console.log("Server started on port 3004");
});