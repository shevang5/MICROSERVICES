require("dotenv").config();

const app = require("./src/app");


const connectDB = require("./src/db/db");
connectDB();

app.listen(process.env.PORT || 3004, () => {
    console.log("Server started on port 3004");
});