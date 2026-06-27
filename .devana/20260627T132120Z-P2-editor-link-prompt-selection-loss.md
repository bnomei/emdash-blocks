DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | high | security=no
DEVANA-KEY: src/admin.tsx:462-470,548 | editor-link-prompt-selection-loss

# Link prompt clears selection before createLink runs

## Finding

The portable-text link toolbar calls `window.prompt` synchronously. Opening the prompt moves focus away from the `contentEditable` surface, which triggers `onBlur` → `commit()`, and the text selection needed for `document.execCommand("createLink")` is lost before the command runs.

## Violated Invariant Or Contract

The link control should wrap the user's selected text with the prompted URL. `execCommand("createLink")` requires an active range in the editor target.

## Oracle

`createLink` calls `runCommand("createLink", safeHref)` after validation. `editorCommandAdapter.dispatchCommand` focuses the target then calls `execCommand`. `PortableTextPropField` commits on every blur (`onBlur={commit}`).

## Counterexample

1. User selects the word "click" in the portable-text editor.
2. User clicks the Link toolbar button (`onMouseDown` preventDefault does not survive `prompt()`).
3. `requestLinkHref()` opens `prompt("Link URL")`; focus leaves the editor.
4. `onBlur` fires → `commit()` serializes current DOM without the intended link on the selection.
5. User enters `https://example.com`; `execCommand("createLink")` runs with no active selection.
6. The link is not applied to the originally highlighted text, but `commit()` still persists the editor HTML.

## Why It Might Matter

Editors believe they linked highlighted text, but the stored portable-text value omits the link. The failure is silent because protocol errors alert while command failure does not.

## Proof

Control-flow / event-order trace: `click Link` → `prompt()` (sync modal) → `blur` → `commit()` → `prompt return` → `focus()` → `execCommand` without prior selection.

## Counterevidence Checked

Unsafe href paths show `linkProtocolError` alert. `runCommand` ignoring `execCommand` return false is a separate concern; here the selection is already gone before the command runs. Link scheme bypass reports cover validation, not selection lifecycle.

## Suggested Next Step

Save and restore `window.getSelection()` ranges around the prompt, or collect the URL before blur (custom modal) so `createLink` runs while the selection is still active.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `createLink` now captures the active selection range (`getSelection().getRangeAt(0).cloneRange()`) BEFORE calling `requestLinkHref()` (which opens the blocking `prompt` that blurs the editor and clears the selection). After validating the href, it refocuses the editor and restores the saved range before `runCommand("createLink", ...)`, so `execCommand` applies the link to the originally highlighted text. All `getSelection` access is optional-chained for non-DOM environments. Typecheck and build pass. (UI/DOM-event path; no node test harness for selection lifecycle.)

DEVANA-KEY: src/admin.tsx:462-470,548 | editor-link-prompt-selection-loss
DEVANA-SUMMARY: fixed | P2 | high | createLink saves the selection range before the prompt and restores it (with focus) before execCommand, so highlighted text is linked instead of the selection being lost on prompt blur.