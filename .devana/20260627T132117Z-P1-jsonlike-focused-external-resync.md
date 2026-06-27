DEVANA-FINDING: v1
DEVANA-STATE: fixed | P1 | high | security=no
DEVANA-KEY: src/admin.tsx:753-756 | jsonlike-focused-external-resync

# JsonLikePropField clobbers focused draft on external value change

## Finding

`JsonLikePropField` resyncs its controlled textarea from parent `value` on every `valueKey` change without checking focus. If the parent pushes a new value while the user is editing a `json` or `repeater` field, the in-progress draft is replaced mid-edit and uncommitted edits are lost.

## Violated Invariant Or Contract

Focused prop editors should not discard local draft state until the user blurs/commits. `PortableTextPropField` explicitly skips DOM resync when the editor has focus; JSON fields should follow the same lifecycle contract.

## Oracle

`PortableTextPropField` at `admin.tsx:443-448` guards external resync with `activeElement !== editorRef.current`. `JsonLikePropField` has no equivalent guard at `753-756`.

## Counterexample

1. Mount with `value = { "meta": true }`; user focuses the JSON textarea and edits draft to `{ "meta": false }` without blurring.
2. Parent applies an external update `value = { "meta": true, "version": 2 }` (autosave echo, locale switch, concurrent field).
3. `valueKey` changes; `useEffect` runs `setDraft(JSON.stringify(value, null, 2))`.
4. Controlled `value={draft}` snaps the textarea from the user's draft back to the parent value; edits made after the external update arrived are lost without any commit.

## Why It Might Matter

Editors can lose repeater or JSON prop edits during normal admin flows that update the parent value while a nested field stays focused. The loss is silent and may be persisted on the next unrelated blur elsewhere.

## Proof

State transition trace: `parent onChange(V2)` → child render with stale `draft` → `useEffect` clobber → textarea shows `V2` while user believed they were editing `D_edit`.

## Counterevidence Checked

`portabletext-external-value-race` covers the portable-text blur-overwrite path, not JSON fields. `JsonLikePropField` uses a controlled textarea (`value={draft}`), so the effect directly overwrites visible content; this is not the uncontrolled `defaultValue` pattern from `raw-props-stale-overwrite`.

## Suggested Next Step

Skip draft resync in the `valueKey` effect when the textarea (or a ref to it) is `document.activeElement`, mirroring the portable-text focus guard.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `JsonLikePropField` now tracks focus via a `focusedRef` (set in `onFocus`, cleared in `onBlur`) and the `valueKey` effect skips the `setDraft`/`setParseError` resync while focused, mirroring the portable-text focus guard. The in-progress draft is preserved during editing and committed on blur (the user's active edit wins), so an external value push no longer snaps the textarea away mid-edit. Used a focus ref rather than `activeElement` + element ref to avoid depending on Kumo `Textarea` ref forwarding. Typecheck/build and i18n render test pass. (Per-report invariant: this field preserves the user's draft on blur; the portable-text field — separate report portabletext-external-value-race — instead resyncs to the external value on blur per its own stated contract.)

DEVANA-KEY: src/admin.tsx:753-756 | jsonlike-focused-external-resync
DEVANA-SUMMARY: fixed | P1 | high | JsonLikePropField now skips draft resync while focused (focusedRef guard), preserving in-progress edits and committing them on blur instead of clobbering them on an external value change.