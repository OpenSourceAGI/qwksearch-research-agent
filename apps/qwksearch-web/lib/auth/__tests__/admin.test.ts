import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: getSessionMock,
}));

/**
 * getAdminEmails is wrapped in React's cache(), so each scenario re-imports
 * a fresh module to avoid memoized results leaking between env setups.
 */
const loadAdmin = async () => {
  vi.resetModules();
  return import("../admin");
};

describe("admin access control", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    getSessionMock.mockReset();
  });

  it("grants access only to emails listed in ADMIN_EMAILS", async () => {
    vi.stubEnv("ADMIN_EMAILS", "root@example.com, other@example.com");
    vi.stubEnv("ADMIN_EMAIL", "");
    const { isAdmin, getAdminEmails } = await loadAdmin();

    expect(await getAdminEmails()).toEqual([
      "root@example.com",
      "other@example.com",
    ]);
    expect(await isAdmin("root@example.com")).toBe(true);
    expect(await isAdmin("Root@Example.com")).toBe(true);
    expect(await isAdmin("intruder@example.com")).toBe(false);
  });

  it("merges legacy ADMIN_EMAIL with ADMIN_EMAILS", async () => {
    vi.stubEnv("ADMIN_EMAIL", "legacy@example.com");
    vi.stubEnv("ADMIN_EMAILS", "new@example.com");
    const { getAdminEmails } = await loadAdmin();

    expect(await getAdminEmails()).toEqual([
      "legacy@example.com",
      "new@example.com",
    ]);
  });

  it("grants access to nobody when no admin env var is set", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_EMAILS", "");
    const { isAdmin, getAdminEmails } = await loadAdmin();

    expect(await getAdminEmails()).toEqual([]);
    // Even a real signed-in user is not an admin without the env var —
    // there is no first-registered-user fallback.
    expect(await isAdmin("anyone@example.com")).toBe(false);
  });

  it("assertAdmin returns 401 without a session and 403 for non-admins", async () => {
    vi.stubEnv("ADMIN_EMAILS", "root@example.com");
    const { assertAdmin } = await loadAdmin();

    getSessionMock.mockResolvedValueOnce(null);
    const unauthorized = await assertAdmin();
    expect(unauthorized?.status).toBe(401);

    getSessionMock.mockResolvedValueOnce({
      user: { email: "intruder@example.com" },
    });
    const forbidden = await assertAdmin();
    expect(forbidden?.status).toBe(403);

    getSessionMock.mockResolvedValueOnce({
      user: { email: "root@example.com" },
    });
    const allowed = await assertAdmin();
    expect(allowed).toBeNull();
  });
});
