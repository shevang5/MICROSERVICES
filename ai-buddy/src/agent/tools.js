const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const axios = require("axios");

const searchProduct = tool(async ({ name, token }) => {


    try {
        const response = await axios.get(
            `http://localhost:3001/api/products?name=${name}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return JSON.stringify(response.data);
    } catch (err) {
        return "Product service unavailable.";
    }

}, {
    name: "search_product",
    description: "use this tool to search for a product in the database. Product name is required.",
    schema: z.object({
        name: z.string().describe("The name of the product"),
    }).passthrough()

})


const addProductToCart = tool(async ({ productId, qty = 1, token }) => {
    const response = await axios.post(`http://localhost:3002/api/cart`, {
        productId,
        qty
    }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    return `Added product with id ${productId} (qty: ${qty}) to cart`;

}, {
    name: "add_product_to_cart",
    description: "use this tool to add a product to the cart",
    schema: z.object({
        productId: z.string().describe("The id of the product"),
        qty: z.number().describe("The quantity of the product").default(1),
    }).passthrough()
})


module.exports = { searchProduct, addProductToCart };