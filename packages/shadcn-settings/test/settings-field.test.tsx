import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsField } from "../src/components/settings-field";
import { SettingsList } from "../src/components/settings-list";
import type { SettingsFieldSchema } from "../src/types";

describe("SettingsField", () => {
  it("renders a string field and commits on blur", () => {
    const field: SettingsFieldSchema = {
      name: "SearXNG URL",
      key: "searxngURL",
      type: "string",
      description: "The URL of your SearXNG instance",
    };
    const onCommit = vi.fn();
    render(
      <SettingsField field={field} value="" onCommit={onCommit} />,
    );

    expect(screen.getByText("SearXNG URL")).toBeDefined();
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "http://localhost:4000" } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith("http://localhost:4000");
  });

  it("keeps typed text visible when the host doesn't wire onChange", () => {
    // `onChange` is documented as optional. Without it, `value` never changes,
    // so the input must track edits locally instead of reverting on every
    // keystroke (a controlled input with a static `value` would otherwise
    // snap back, dropping whatever the user typed before blur).
    const field: SettingsFieldSchema = {
      name: "SearXNG URL",
      key: "searxngURL",
      type: "string",
    };
    render(<SettingsField field={field} value="" onCommit={vi.fn()} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "http://localhost:4000" } });
    expect(input.value).toBe("http://localhost:4000");
  });

  it("syncs the field when the external value changes", () => {
    const field: SettingsFieldSchema = {
      name: "SearXNG URL",
      key: "searxngURL",
      type: "string",
    };
    const { rerender } = render(
      <SettingsField field={field} value="a" onCommit={vi.fn()} />,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("a");

    rerender(<SettingsField field={field} value="b" onCommit={vi.fn()} />);
    expect(input.value).toBe("b");
  });

  it("renders a switch field and commits on toggle", () => {
    const field: SettingsFieldSchema = {
      name: "Background Art",
      key: "showBackgroundArt",
      type: "switch",
      default: true,
    };
    const onCommit = vi.fn();
    render(
      <SettingsField field={field} value={undefined} onCommit={onCommit} />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(onCommit).toHaveBeenCalledWith(false);
  });

  it("falls back to the unknown renderer for unregistered types", () => {
    const field: SettingsFieldSchema = {
      name: "Theme",
      key: "theme",
      type: "theme",
    };
    render(<SettingsField field={field} value={undefined} />);
    expect(screen.getByText(/Unsupported field type: theme/)).toBeDefined();
  });

  it("uses an injected custom renderer for a new type", () => {
    const field: SettingsFieldSchema = {
      name: "Theme",
      key: "theme",
      type: "theme",
    };
    render(
      <SettingsField
        field={field}
        value={undefined}
        renderers={{
          theme: ({ field }) => <div>custom:{field.name}</div>,
        }}
      />,
    );
    expect(screen.getByText("custom:Theme")).toBeDefined();
  });
});

describe("SettingsList", () => {
  it("renders every field and wires commit to the right field", () => {
    const fields: SettingsFieldSchema[] = [
      { name: "A", key: "a", type: "string" },
      { name: "B", key: "b", type: "string" },
    ];
    const onCommit = vi.fn();
    render(
      <SettingsList
        fields={fields}
        getValue={() => ""}
        onCommit={onCommit}
      />,
    );
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[1], { target: { value: "x" } });
    fireEvent.blur(inputs[1]);
    expect(onCommit).toHaveBeenCalledWith(fields[1], "x");
  });
});
