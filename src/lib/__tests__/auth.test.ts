// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function createToken(
  payload: Record<string, unknown>,
  { expired = false } = {}
) {
  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt();

  if (expired) {
    builder.setExpirationTime(0);
  } else {
    builder.setExpirationTime("7d");
  }

  return builder.sign(JWT_SECRET);
}

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sets a cookie with a valid JWT containing userId and email", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-456", "alice@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
    const [name, token, options] = mockCookieStore.set.mock.calls[0];

    expect(name).toBe("auth-token");
    expect(typeof token).toBe("string");

    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-456");
    expect(payload.email).toBe("alice@example.com");
    expect(payload.exp).toBeDefined();
  });

  test("sets cookie with correct security options", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-456", "alice@example.com");

    const options = mockCookieStore.set.mock.calls[0][2];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toBeInstanceOf(Date);
  });

  test("sets expiration ~7 days in the future", async () => {
    const before = Date.now();
    const { createSession } = await import("@/lib/auth");
    await createSession("user-456", "alice@example.com");
    const after = Date.now();

    const options = mockCookieStore.set.mock.calls[0][2];
    const expiresMs = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs);
  });
});

describe("deleteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("deletes the auth-token cookie", async () => {
    const { deleteSession } = await import("@/lib/auth");
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledTimes(1);
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRequest(token?: string) {
    return {
      cookies: {
        get: vi.fn((name: string) =>
          name === "auth-token" && token ? { value: token } : undefined
        ),
      },
    } as unknown as import("next/server").NextRequest;
  }

  test("returns null when no cookie exists on the request", async () => {
    const { verifySession } = await import("@/lib/auth");
    const session = await verifySession(mockRequest());
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await createToken({
      userId: "user-789",
      email: "bob@example.com",
    });
    const { verifySession } = await import("@/lib/auth");
    const session = await verifySession(mockRequest(token));

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-789");
    expect(session!.email).toBe("bob@example.com");
  });

  test("returns null for an expired token", async () => {
    const token = await createToken(
      { userId: "user-789", email: "bob@example.com" },
      { expired: true }
    );
    await new Promise((r) => setTimeout(r, 1000));
    const { verifySession } = await import("@/lib/auth");
    const session = await verifySession(mockRequest(token));
    expect(session).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    const token = await createToken({
      userId: "user-789",
      email: "bob@example.com",
    });
    const { verifySession } = await import("@/lib/auth");
    const session = await verifySession(mockRequest(token + "tampered"));
    expect(session).toBeNull();
  });

  test("returns null for a token signed with wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "user-789", email: "bob@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(wrongSecret);
    const { verifySession } = await import("@/lib/auth");
    const session = await verifySession(mockRequest(token));
    expect(session).toBeNull();
  });

  test("returns null for garbage string", async () => {
    const { verifySession } = await import("@/lib/auth");
    const session = await verifySession(mockRequest("not-a-jwt"));
    expect(session).toBeNull();
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no cookie exists", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
    expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
  });

  test("returns session payload for a valid token", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = await createToken({
      userId: "user-123",
      email: "test@example.com",
      expiresAt: expiresAt.toISOString(),
    });
    mockCookieStore.get.mockReturnValue({ value: token });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-123");
    expect(session!.email).toBe("test@example.com");
  });

  test("returns null for an expired token", async () => {
    const token = await createToken(
      { userId: "user-123", email: "test@example.com" },
      { expired: true }
    );
    // small delay so the token is definitely expired
    await new Promise((r) => setTimeout(r, 1000));
    mockCookieStore.get.mockReturnValue({ value: token });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    const token = await createToken({
      userId: "user-123",
      email: "test@example.com",
    });
    mockCookieStore.get.mockReturnValue({ value: token + "tampered" });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for a token signed with wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "user-123", email: "test@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(wrongSecret);
    mockCookieStore.get.mockReturnValue({ value: token });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for garbage string", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not-a-jwt" });

    const { getSession } = await import("@/lib/auth");
    const session = await getSession();

    expect(session).toBeNull();
  });
});
