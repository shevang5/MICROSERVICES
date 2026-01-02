const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../src/app");
const Product = require("../src/models/product.model");
const imagekit = require("../src/utils/imagekit");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

let mongoServer;
const JWT_SECRET = process.env.JWT_SECRET || "test_secret";

// Mock ImageKit upload
jest.mock("../src/utils/imagekit", () => ({
    upload: jest.fn()
}));

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
    await Product.deleteMany({});
    jest.clearAllMocks();
});

describe("POST /api/products", () => {
    const validToken = generateToken({ id: new mongoose.Types.ObjectId().toString(), role: "seller" });

    it("should create a new product with an image and valid auth", async () => {
        imagekit.upload.mockResolvedValue({
            url: "https://ik.imagekit.io/test/image.jpg",
            thumbnailUrl: "https://ik.imagekit.io/test/tr:ot-test/image.jpg",
            fileId: "test_file_id"
        });

        const testImagePath = path.join(__dirname, "test-image.jpg");
        if (!fs.existsSync(testImagePath)) {
            fs.writeFileSync(testImagePath, "test image content");
        }

        const productData = {
            title: "Valid Product Title",
            description: "This is a valid product description with enough length",
            price: JSON.stringify({ amount: 100, currency: "INR" }),
            category: "Electronics",
            stock: 10
        };

        const response = await request(app)
            .post("/api/products")
            .set("Authorization", `Bearer ${validToken}`)
            .field("title", productData.title)
            .field("description", productData.description)
            .field("price", productData.price)
            .field("category", productData.category)
            .field("stock", productData.stock)
            .attach("image", testImagePath);

        expect(response.status).toBe(201);
        expect(response.body.title).toBe(productData.title);

        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
        }
    });

    it("should return 400 if validation fails (e.g., title too short)", async () => {
        const response = await request(app)
            .post("/api/products")
            .set("Authorization", `Bearer ${validToken}`)
            .field("title", "Ab")
            .field("description", "Too short")
            .field("price", JSON.stringify({ amount: -10, currency: "INVALID" }))
            .field("category", "")
            .field("stock", -5);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Validation failed");
        expect(response.body.errors).toBeDefined();
    });

    it("should return 401 if unauthorized (no token)", async () => {
        const response = await request(app)
            .post("/api/products")
            .field("title", "Some Title");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Unauthorized");
    });
});

describe("GET /api/products", () => {
    beforeEach(async () => {
        // Seed some products
        const sellerId = new mongoose.Types.ObjectId();
        await Product.create([
            {
                title: "Apple iPhone 15",
                description: "Latest smartphone from Apple with regular features",
                price: { amount: 80000, currency: "INR" },
                category: "Electronics",
                stock: 50,
                seller: sellerId,
                images: [{ url: "test1.jpg" }]
            },
            {
                title: "Samsung Galaxy S24",
                description: "Premium Android smartphone with AI features",
                price: { amount: 75000, currency: "INR" },
                category: "Electronics",
                stock: 30,
                seller: sellerId,
                images: [{ url: "test2.jpg" }]
            },
            {
                title: "MacBook Pro",
                description: "Powerful laptop for professionals",
                price: { amount: 150000, currency: "INR" },
                category: "Electronics",
                stock: 20,
                seller: sellerId,
                images: [{ url: "test3.jpg" }]
            }
        ]);
        // Ensure indexes are created for text search
        await Product.syncIndexes();
    });

    it("should return all products by default", async () => {
        const response = await request(app).get("/api/products");
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(3);
    });

    it("should search products by query q", async () => {
        const response = await request(app).get("/api/products?q=iPhone");
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0].title).toBe("Apple iPhone 15");
    });

    it("should filter products by minprice and maxprice", async () => {
        const response = await request(app).get("/api/products?minprice=70000&maxprice=90000");
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2); // iPhone and Samsung
    });

    it("should handle pagination (limit)", async () => {
        const response = await request(app).get("/api/products?limit=1");
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
    });

    it("should sort products by price", async () => {
        const response = await request(app).get("/api/products?sort=1"); // Ascending
        expect(response.status).toBe(200);
        expect(response.body[0].price.amount).toBe(75000); // Samsung is cheapest

        const responseDesc = await request(app).get("/api/products?sort=-1"); // Descending
        expect(responseDesc.status).toBe(200);
        expect(responseDesc.body[0].price.amount).toBe(150000); // MacBook is most expensive
    });
});

describe("GET /api/products/:id", () => {
    let productId;

    beforeEach(async () => {
        const product = await Product.create({
            title: "Test Product ID",
            description: "Testing single product retrieval by ID",
            price: { amount: 500, currency: "INR" },
            category: "Test",
            stock: 10,
            seller: new mongoose.Types.ObjectId(),
            images: [{ url: "test_id.jpg" }]
        });
        productId = product._id.toString();
    });

    it("should return a product by valid ID", async () => {
        const response = await request(app).get(`/api/products/${productId}`);
        expect(response.status).toBe(200);
        expect(response.body.title).toBe("Test Product ID");
    });

    it("should return 404 for a non-existent ID", async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await request(app).get(`/api/products/${fakeId}`);
        expect(response.status).toBe(404);
        expect(response.body.message).toBe("Product not found");
    });

    it("should return 500 for an invalid ID format", async () => {
        const response = await request(app).get("/api/products/invalid-id");
        expect(response.status).toBe(500);
    });
});

describe("PATCH /api/products/:id", () => {
    let productId;
    const sellerId = new mongoose.Types.ObjectId().toString();
    const otherSellerId = new mongoose.Types.ObjectId().toString();

    const sellerToken = generateToken({ id: sellerId, role: "seller" });
    const otherSellerToken = generateToken({ id: otherSellerId, role: "seller" });
    const adminToken = generateToken({ id: new mongoose.Types.ObjectId().toString(), role: "admin" });

    beforeEach(async () => {
        const product = await Product.create({
            title: "Original Title",
            description: "Original description of the product",
            price: { amount: 1000, currency: "INR" },
            category: "Electronics",
            stock: 10,
            seller: sellerId,
            images: [{ url: "original.jpg" }]
        });
        productId = product._id.toString();
    });

    it("should allow seller to update their own product", async () => {
        const response = await request(app)
            .patch(`/api/products/${productId}`)
            .set("Authorization", `Bearer ${sellerToken}`)
            .send({ title: "Updated Title", stock: 20 });

        expect(response.status).toBe(200);
        expect(response.body.title).toBe("Updated Title");
        expect(response.body.stock).toBe(20);
    });

    it("should allow admin to update any product", async () => {
        const response = await request(app)
            .patch(`/api/products/${productId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ price: { amount: 2000, currency: "INR" } });

        expect(response.status).toBe(200);
        expect(response.body.price.amount).toBe(2000);
    });

    it("should return 403 if seller tries to update someone else's product", async () => {
        const response = await request(app)
            .patch(`/api/products/${productId}`)
            .set("Authorization", `Bearer ${otherSellerToken}`)
            .send({ title: "Hacked!" });

        expect(response.status).toBe(403);
    });

    it("should return 400 if validation fails", async () => {
        const response = await request(app)
            .patch(`/api/products/${productId}`)
            .set("Authorization", `Bearer ${sellerToken}`)
            .send({ stock: -5 });

        expect(response.status).toBe(400);
    });

    it("should return 404 if product does not exist", async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .patch(`/api/products/${fakeId}`)
            .set("Authorization", `Bearer ${sellerToken}`)
            .send({ title: "New Title" });

        expect(response.status).toBe(404);
    });
});

describe("DELETE /api/products/:id", () => {
    let productId;
    const sellerId = new mongoose.Types.ObjectId().toString();
    const otherSellerId = new mongoose.Types.ObjectId().toString();

    const sellerToken = generateToken({ id: sellerId, role: "seller" });
    const otherSellerToken = generateToken({ id: otherSellerId, role: "seller" });
    const adminToken = generateToken({ id: new mongoose.Types.ObjectId().toString(), role: "admin" });

    beforeEach(async () => {
        const product = await Product.create({
            title: "Product to Delete",
            description: "Some description",
            price: { amount: 1000, currency: "INR" },
            category: "Electronics",
            stock: 10,
            seller: sellerId,
            images: [{ url: "delete.jpg" }]
        });
        productId = product._id.toString();
    });

    it("should allow seller to delete their own product", async () => {
        const response = await request(app)
            .delete(`/api/products/${productId}`)
            .set("Authorization", `Bearer ${sellerToken}`);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Product deleted successfully");

        const deletedProduct = await Product.findById(productId);
        expect(deletedProduct).toBeNull();
    });

    it("should allow admin to delete any product", async () => {
        const response = await request(app)
            .delete(`/api/products/${productId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        const deletedProduct = await Product.findById(productId);
        expect(deletedProduct).toBeNull();
    });

    it("should return 403 if seller tries to delete someone else's product", async () => {
        const response = await request(app)
            .delete(`/api/products/${productId}`)
            .set("Authorization", `Bearer ${otherSellerToken}`);

        expect(response.status).toBe(403);
    });

    it("should return 404 if product does not exist", async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await request(app)
            .delete(`/api/products/${fakeId}`)
            .set("Authorization", `Bearer ${sellerToken}`);

        expect(response.status).toBe(404);
    });
});

describe("GET /api/products/seller", () => {
    const sellerId = new mongoose.Types.ObjectId().toString();
    const otherSellerId = new mongoose.Types.ObjectId().toString();

    const sellerToken = generateToken({ id: sellerId, role: "seller" });
    const otherSellerToken = generateToken({ id: otherSellerId, role: "seller" });

    beforeEach(async () => {
        // Seed products for multiple sellers
        await Product.create([
            {
                title: "Seller 1 Product 1",
                description: "Product belonging to seller 1",
                price: { amount: 100, currency: "INR" },
                category: "Test",
                stock: 10,
                seller: sellerId,
                images: [{ url: "s1p1.jpg" }]
            },
            {
                title: "Seller 1 Product 2",
                description: "Another product belonging to seller 1",
                price: { amount: 200, currency: "INR" },
                category: "Test",
                stock: 5,
                seller: sellerId,
                images: [{ url: "s1p2.jpg" }]
            },
            {
                title: "Seller 2 Product 1",
                description: "Product belonging to seller 2",
                price: { amount: 300, currency: "INR" },
                category: "Test",
                stock: 20,
                seller: otherSellerId,
                images: [{ url: "s2p1.jpg" }]
            }
        ]);
    });

    it("should return only products belonging to the logged-in seller", async () => {
        const response = await request(app)
            .get("/api/products/seller")
            .set("Authorization", `Bearer ${sellerToken}`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
        expect(response.body.every(p => p.seller.toString() === sellerId)).toBe(true);
    });

    it("should return an empty array if the seller has no products", async () => {
        const newSellerToken = generateToken({ id: new mongoose.Types.ObjectId().toString(), role: "seller" });
        const response = await request(app)
            .get("/api/products/seller")
            .set("Authorization", `Bearer ${newSellerToken}`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(0);
    });

    it("should return 401 if unauthorized (no token)", async () => {
        const response = await request(app).get("/api/products/seller");
        expect(response.status).toBe(401);
    });
});




