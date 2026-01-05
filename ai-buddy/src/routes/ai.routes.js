const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { agent } = require("../agent/agent");
const { HumanMessage } = require("@langchain/core/messages");
const { canCallAI } = require("../utils/aiRateLimiter");

router.post("/chat", async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: "Token missing" });
        }

        jwt.verify(token, process.env.JWT_SECRET);

        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Message required" });
        }

        const userId = req.user.id;
        if (!canCallAI(userId)) {
            return res.status(429).json({ error: "Too many requests" });
        }

        const result = await agent.invoke({
            messages: [new HumanMessage({ content: message })],
        }, {
            configurable: { token }
        });

        const lastMessage = result.messages.at(-1);
        res.json({ reply: lastMessage.content });

    } catch (error) {
        console.error("AI error:", error.message);
        res.status(500).json({ error: "AI service unavailable" });
    }
});

module.exports = router;
