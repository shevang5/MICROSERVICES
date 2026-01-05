const { StateGraph, MessagesAnnotation } = require("@langchain/langgraph");

const { ChatGoogleGenerativeAI } = require("@langchain/google-genai")
const { ToolMessage, AIMessage, HumanMessage } = require("@langchain/core/messages")
const tools = require("./tools")
const toolsByName = Object.fromEntries(Object.values(tools).map(t => [t.name, t]));


const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    temperature: 0.3,
    maxRetries: 0,   // 🔥 VERY IMPORTANT
    apiKey: process.env.GOOGLE_API_KEY
});



const graph = new StateGraph(MessagesAnnotation)
    .addNode("tools", async (state, config) => {
        const lastMessage = state.messages.at(-1);
        const toolCalls = lastMessage.tool_calls ?? [];

        if (toolCalls.length === 0) {
            return { messages: [] };
        }

        const toolResults = await Promise.all(
            toolCalls.map(async (call) => {
                const tool = toolsByName[call.name];
                if (!tool) throw new Error(`Tool ${call.name} not found`);

                const toolOutput = await tool.invoke({
                    ...call.args,
                    token: config.configurable.token
                });

                return new ToolMessage({
                    content: toolOutput,
                    tool_call_id: call.id,
                    name: call.name
                });
            })
        );

        return { messages: toolResults };
    })

    .addNode("chat", async (state, config) => {
        const modelWithTools = model.bindTools(Object.values(tools));
        const response = await modelWithTools.invoke(state.messages);
        state.messages.push(response);
        return { messages: [response] };
    })
    .addEdge("__start__", "chat")
    .addConditionalEdges("chat", async (state) => {
        const lastMessage = state.messages.at(-1);

        if (lastMessage.tool_calls?.length && state.messages.length < 10) {
            return "tools";
        }
        return "__end__";
    })

    .addEdge("tools", "chat")

const agent = graph.compile();


module.exports = { agent }
