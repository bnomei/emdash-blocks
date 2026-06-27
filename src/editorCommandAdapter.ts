/**
 * Injectable adapter for contenteditable toolbar commands in the portable-text editor.
 *
 * Wraps `document.execCommand` and the link URL prompt so tests can stub browser
 * APIs without mounting a full DOM.
 */
export type EditorCommandEnvironment = {
  document?: Pick<Document, "execCommand">;
  prompt?: (message?: string, defaultValue?: string) => string | null | undefined;
};

export type EditorCommandTarget = Pick<HTMLElement, "focus"> | null | undefined;

export type EditorCommandAdapter = {
  dispatchCommand: (target: EditorCommandTarget, command: string, commandValue?: string) => boolean;
  requestLinkHref: () => string | null;
};

/** Builds an editor command adapter bound to a browser-like environment. */
export function createEditorCommandAdapter(
  environment: EditorCommandEnvironment = globalThis,
): EditorCommandAdapter {
  return {
    dispatchCommand(target, command, commandValue) {
      target?.focus();
      return environment.document?.execCommand(command, false, commandValue) ?? false;
    },
    requestLinkHref() {
      const href = environment.prompt?.("Link URL");
      return href || null;
    },
  };
}

export const editorCommandAdapter = createEditorCommandAdapter();
