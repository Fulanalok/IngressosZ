import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as admin from "firebase-admin";

// Mock firebase-admin before importing index
jest.mock("firebase-admin", () => {
  const firestoreMock = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    update: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runTransaction: jest.fn(async (callback: any) => {
      // Mock transaction object
      const tx = {
        get: jest.fn().mockImplementation(() =>
          Promise.resolve({
            exists: false, // Simulate no previous rate limit
            data: () => ({}),
          })
        ),
        set: jest.fn(),
        update: jest.fn(),
      };
      return callback(tx);
    }),
    add: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ id: "order_123", update: jest.fn() })
      ),
  };
  return {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => firestoreMock),
    auth: jest.fn(() => ({
      verifyIdToken: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ uid: "test_user_id", email: "test@example.com" })
        ),
    })),
    messaging: jest.fn(),
  };
});

// Mock mercadopago
jest.mock("mercadopago", () => {
  return {
    MercadoPagoConfig: jest.fn(),
    Preference: jest.fn(() => ({
      create: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ id: "pref_123", init_point: "http://test.com" })
        ),
    })),
    Payment: jest.fn(),
  };
});

// Set environment variables before importing
process.env.FUNCTIONS_EMULATOR = "true";
process.env.MERCADOPAGO_ACCESS_TOKEN = "test_token"; // Also needed to pass MP check

// Import functions after mocking
import { mercadoPagoCreatePreference } from "../src/index";

describe("mercadoPagoCreatePreference", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let req: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let res: any;

  beforeEach(() => {
    // Setup generic request/response mocks
    req = {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        authorization: "Bearer test_token",
      },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      set: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 400 if missing parameters", async () => {
    req.body = {}; // Empty body

    await mercadoPagoCreatePreference(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/Campos obrigatórios/),
      })
    );
  });

  it("should return 400 for invalid ticket type", async () => {
    req.body = {
      eventId: "123",
      ticketType: "invalid_type",
    };

    await mercadoPagoCreatePreference(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/Tipo de ingresso inválido/),
      })
    );
  });

  it("should create preference successfully", async () => {
    req.body = {
      eventId: "event_123",
      ticketType: "standard",
      quantity: 2,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firestoreMock = admin.firestore() as any;
    (firestoreMock.get as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        exists: true,
        data: () => ({
          title: "Test Event",
          price: 100,
          pricing: { standard: 100 },
        }),
      })
    );

    await mercadoPagoCreatePreference(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        preferenceId: "pref_123",
        init_point: "http://test.com",
      })
    );
  });
});
