import { describe, expect, it } from "vitest";
import { keepStoredSecrets } from "../src/config/config-manager";

describe("keepStoredSecrets", () => {
  it("keeps a stored key when the update sends it blank", () => {
    expect(keepStoredSecrets({ apiKey: "sk-live", baseURL: "a" }, { apiKey: "", baseURL: "b" })).toEqual({
      apiKey: "sk-live",
      baseURL: "b",
    });
  });

  it("keeps a stored key the update leaves out", () => {
    expect(keepStoredSecrets({ apiKey: "sk-live" }, { baseURL: "b" })).toEqual({ apiKey: "sk-live", baseURL: "b" });
  });

  it("takes a new key when one is sent", () => {
    expect(keepStoredSecrets({ apiKey: "sk-old" }, { apiKey: "sk-new" })).toEqual({ apiKey: "sk-new" });
  });

  it("does not carry over non-credential fields", () => {
    expect(keepStoredSecrets({ baseURL: "a", apiKeyUrl: "u" }, {})).toEqual({});
  });
});
