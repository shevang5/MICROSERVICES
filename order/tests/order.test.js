const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../src/app");
const orderModel = require("../src/models/order.model");
const jwt = require("jsonwebtoken");

let mongoServer;
let token;
const userId = new mongoose.Types.ObjectId();
const JWT_SECRET = "testsecret";

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    process.env.JWT_SECRET = JWT_SECRET;
    token = jwt.sign({ id: userId, role: "user" }, JWT_SECRET);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await orderModel.deleteMany({});
});

describe("Order API", () => {
    const sampleOrder = {
        userId: userId,
        items: [
            {
                productId: new mongoose.Types.ObjectId(),
                qty: 2,
                price: 500,
                currency: "INR"
            }
        ],
        totalAmount: 1000,
        shippingAddress: {
            street: "123 Test St",
            city: "Test City",
            state: "Test State",
            country: "Test Country",
            zipCode: "123456"
        }
    };

    describe("POST /api/orders", () => {
        it("should create a new order", async () => {
            const res = await request(app)
                .post("/api/orders")
                .set("Authorization", `Bearer ${token}`)
                .send(sampleOrder);

            expect(res.status).toBe(201);
            expect(res.body.userId).toBe(userId.toString());
            expect(res.body.status).toBe("pending");
            expect(res.body.totalAmount).toBe(1200); // 1000 (subtotal) + 100 (tax) + 100 (shipping)
        });

        it("should return 401 if unauthorized", async () => {
            const res = await request(app)
                .post("/api/orders")
                .send(sampleOrder);

            expect(res.status).toBe(401);
        });
    });

    describe("GET /api/orders/me", () => {
        it("should get user orders", async () => {
            await orderModel.create(sampleOrder);
            const res = await request(app)
                .get("/api/orders/me")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
        });
    });

    describe("GET /api/orders/:id", () => {
        it("should get order by id", async () => {
            const order = await orderModel.create(sampleOrder);
            const res = await request(app)
                .get(`/api/orders/${order._id}`)
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body._id).toBe(order._id.toString());
        });

        it("should return 404 if order not found", async () => {
            const res = await request(app)
                .get(`/api/orders/${new mongoose.Types.ObjectId()}`)
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe("POST /api/orders/:id/cancel", () => {
        it("should cancel a pending order", async () => {
            const order = await orderModel.create(sampleOrder);
            const res = await request(app)
                .post(`/api/orders/${order._id}/cancel`)
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.status).toBe("cancelled");
        });

        it("should not cancel a non-pending/confirmed order", async () => {
            const order = await orderModel.create({ ...sampleOrder, status: "shipped" });
            const res = await request(app)
                .post(`/api/orders/${order._id}/cancel`)
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(400);
        });
    });

    describe("PATCH /api/orders/:id/address", () => {
        it("should update order address", async () => {
            const order = await orderModel.create(sampleOrder);
            const newAddress = {
                shippingAddress: {
                    street: "456 New St",
                    city: "New City",
                    state: "New State",
                    country: "New Country",
                    zipCode: "654321"
                }
            };
            const res = await request(app)
                .patch(`/api/orders/${order._id}/address`)
                .set("Authorization", `Bearer ${token}`)
                .send(newAddress);

            expect(res.status).toBe(200);
            expect(res.body.shippingAddress.street).toBe("456 New St");
        });

        it("should not update address if order is not pending", async () => {
            const order = await orderModel.create({ ...sampleOrder, status: "confirmed" });
            const res = await request(app)
                .patch(`/api/orders/${order._id}/address`)
                .set("Authorization", `Bearer ${token}`)
                .send({ shippingAddress: { street: "No update" } });

            expect(res.status).toBe(400);
        });
    });
});
