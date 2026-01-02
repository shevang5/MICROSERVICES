const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../src/app");
const Cart = require("../src/models/cart.model");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");

let mongoServer;
const JWT_SECRET = process.env.JWT_SECRET || "test_secret";
const mockAxios = new MockAdapter(axios);

const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET);
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Cart.deleteMany({});
    mockAxios.reset();
});

describe("Cart API Tests", () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const userToken = generateToken({ id: userId, role: "user" });
    const productId = new mongoose.Types.ObjectId().toString();

    describe("GET /cart", () => {
        it("should fetch current cart and recompute prices", async () => {
            // Seed cart
            await Cart.create({
                userId,
                items: [{ productId, qty: 2, priceAtAdd: 100 }],
                totalAmount: 200
            });

            // Mock Product Service response for price recomputation
            mockAxios.onGet(`http://localhost:3001/api/products/${productId}`).reply(200, {
                _id: productId,
                price: { amount: 150, currency: "INR" }
            });

            const response = await request(app)
                .get("/cart")
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.totalAmount).toBe(300); // 150 * 2
            expect(response.body.items[0].priceAtAdd).toBe(150);
        });

        it("should return empty cart if none exists", async () => {
            const response = await request(app)
                .get("/cart")
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(0);
        });
    });

    describe("POST /cart/items", () => {
        it("should add item to cart", async () => {
            mockAxios.onGet(`http://localhost:3001/api/products/${productId}`).reply(200, {
                _id: productId,
                price: { amount: 100, currency: "INR" },
                stock: 10
            });

            const response = await request(app)
                .post("/cart/items")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ productId, qty: 1 });

            expect(response.status).toBe(201);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].productId).toBe(productId);
        });

        it("should return 400 if stock is insufficient", async () => {
            mockAxios.onGet(`http://localhost:3001/api/products/${productId}`).reply(200, {
                _id: productId,
                price: { amount: 100, currency: "INR" },
                stock: 0
            });

            const response = await request(app)
                .post("/cart/items")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ productId, qty: 1 });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Insufficient stock");
        });
    });

    describe("PATCH /cart/items/:productId", () => {
        it("should update item quantity", async () => {
            await Cart.create({
                userId,
                items: [{ productId, qty: 1, priceAtAdd: 100 }],
                totalAmount: 100
            });

            mockAxios.onGet(`http://localhost:3001/api/products/${productId}`).reply(200, {
                _id: productId,
                price: { amount: 100, currency: "INR" },
                stock: 10
            });

            const response = await request(app)
                .patch(`/cart/items/${productId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ qty: 5 });

            expect(response.status).toBe(200);
            expect(response.body.items[0].qty).toBe(5);
            expect(response.body.totalAmount).toBe(500);
        });

        it("should remove item if qty <= 0", async () => {
            await Cart.create({
                userId,
                items: [{ productId, qty: 1, priceAtAdd: 100 }],
                totalAmount: 100
            });

            const response = await request(app)
                .patch(`/cart/items/${productId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ qty: 0 });

            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(0);
        });
    });

    describe("DELETE /cart/items/:productId", () => {
        it("should remove line item", async () => {
            await Cart.create({
                userId,
                items: [{ productId, qty: 1, priceAtAdd: 100 }],
                totalAmount: 100
            });

            const response = await request(app)
                .delete(`/cart/items/${productId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(0);
        });
    });

    describe("DELETE /cart", () => {
        it("should clear cart", async () => {
            await Cart.create({
                userId,
                items: [{ productId, qty: 1, priceAtAdd: 100 }],
                totalAmount: 100
            });

            const response = await request(app)
                .delete("/cart")
                .set("Authorization", `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(0);
        });
    });
});
