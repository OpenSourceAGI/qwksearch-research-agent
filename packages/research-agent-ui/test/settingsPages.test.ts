import { describe, expect, it } from "vitest";
import { getSettingsPages, settingsSections } from "../src/settings";

describe("getSettingsPages", () => {
  it("exposes every settings section as a page under the base path, in order", () => {
    const pages = getSettingsPages("/settings/research");
    expect(pages.map((p) => p.key)).toEqual(settingsSections.map((s) => s.key));
    for (const page of pages) expect(page.href).toBe(`/settings/research/${page.key}`);
  });

  it("tolerates a trailing slash and defaults to /settings", () => {
    expect(getSettingsPages("/x/")[0].href).toBe(`/x/${settingsSections[0].key}`);
    expect(getSettingsPages()[0].href).toBe(`/settings/${settingsSections[0].key}`);
  });
});
