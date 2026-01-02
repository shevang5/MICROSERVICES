const app = require("./src/app");
const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./src/db/db");
connectDB();

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});