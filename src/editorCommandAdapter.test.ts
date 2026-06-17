import { describe, expect, it, vi } from "@voidzero-dev/vite-plus-test";
import { createEditorCommandAdapter } from "./editorCommandAdapter";

function createEnvironment(promptResult?: string | null) {
  return {
    document: {
      execCommand: vi.fn(() => true),
    },
    prompt: vi.fn(() => promptResult),
  };
}

describe("createEditorCommandAdapter", () => {
  it("focuses the editor target and dispatches document commands", () => {
    const environment = createEnvironment();
    const target = { focus: vi.fn() };
    const adapter = createEditorCommandAdapter(environment);

    const dispatched = adapter.dispatchCommand(target, "formatBlock", "h3");

    expect(dispatched).toBe(true);
    expect(target.focus).toHaveBeenCalledOnce();
    expect(environment.document.execCommand).toHaveBeenCalledWith("formatBlock", false, "h3");
  });

  it("reports false when command dispatch is unavailable", () => {
    const adapter = createEditorCommandAdapter({ prompt: vi.fn() });

    expect(adapter.dispatchCommand(null, "bold")).toBe(false);
  });

  it("returns a prompted link href", () => {
    const environment = createEnvironment("https://example.com");
    const adapter = createEditorCommandAdapter(environment);

    expect(adapter.requestLinkHref()).toBe("https://example.com");
    expect(environment.prompt).toHaveBeenCalledWith("Link URL");
  });

  it.each(["", null, undefined])(
    "normalizes missing prompt result %s to null",
    (promptResult: string | null | undefined) => {
      const environment = createEnvironment(promptResult);
      const adapter = createEditorCommandAdapter(environment);

      expect(adapter.requestLinkHref()).toBeNull();
    },
  );
});
