const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { agent } = require("../agent/agent");
const { HumanMessage } = require("@langchain/core/messages");
const { canCallAI } = require("../utils/aiRateLimiter");

async function initSocketServer(server) {
    const io = new Server(server);

    io.use((socket, next) => {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) {
            return next(new Error("Authentication error: Cookie not found"));
        }

        // Find the 'token' cookie
        const tokenPart = cookieHeader.split("; ").find(row => row.trim().startsWith("token="));
        const token = tokenPart ? tokenPart.split("=")[1] : null;

        if (!token) {
            return next(new Error("Authentication error: Token not found"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            socket.token = token;
            next();
        } catch (err) {
            return next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        console.log("a user connected:", socket.user ? socket.user.username : "unknown");

        socket.on("message", async (data) => {
            try {
                const userId =
                    socket.user?.id ||
                    socket.user?._id ||
                    socket.user?.userId;

                if (!userId) {
                    return socket.emit("response", "⚠️ User identification failed.");
                }

                if (!canCallAI(userId)) {
                    return socket.emit(
                        "response",
                        "⚠️ Too many requests. Please wait a moment."
                    );
                }

                const agentResponse = await agent.invoke({
                    messages: [new HumanMessage({ content: data })],
                }, {
                    configurable: { token: socket.token }
                });

                const lastMessage = agentResponse.messages.at(-1);
                socket.emit("response", lastMessage.content);

            } catch (error) {
                console.error("Agent error:", error.message);
                socket.emit("response", "⚠️ AI service unavailable.");
            }
        });




        socket.on("disconnect", () => {
            console.log("user disconnected");
        });
    });


}

module.exports = { initSocketServer };