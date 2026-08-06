import { beforeEach, describe, expect, it, vi } from "vitest";

const betterAuthMock = vi.fn();

vi.mock("better-auth", () => ({
  betterAuth: betterAuthMock,
}));

vi.mock("../database", () => ({
  getDB: () => ({})
}));

vi.mock("../cloudflare/context", () => ({
  getCloudflareContext: () => ({ env: {} }),
}));

vi.mock("../cloudflare/ip-geolocation", () => ({
  detectVpnAndLocation: vi.fn().mockResolvedValue({ city: null, state: null, isVpn: false }),
}));

vi.mock("../config/site", () => ({
  config: {
    appName: "Test App",
    appEmail: "noreply@example.com",
    baseUrl: "http://localhost:3000",
  },
}));

describe("auth configuration", () => {
  beforeEach(() => {
    betterAuthMock.mockReset();
    betterAuthMock.mockReturnValue({ api: {} });
  });

  it("enables account deletion in the better-auth config", async () => {
    const { initAuth } = await import("../index");

    await initAuth();

    expect(betterAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          deleteUser: expect.objectContaining({ enabled: true }),
        }),
      }),
    );
  });
});
