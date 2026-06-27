DEVANA-FINDING: v1
Priority: P1 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/admin.tsx:443-454 | Slug: portabletext-external-value-race

# Portable-text blur can overwrite a newer external `value` with stale DOM content

## Finding

`PortableTextPropField` syncs inbound `value` changes in a `useEffect` keyed by `valueKey`, but skips updating `editorRef.current.innerHTML` when the editor is focused. `commit()` on blur always reads the DOM via `editorHtmlToPortableText(editorRef.current)`. If the parent updates `value` while the field is focused, blur can commit pre-update DOM content and overwrite the newer external value.

## Violated Invariant Or Contract

When the `value` prop changes from outside, the field should reflect that source of truth; blur must not persist editor content that predates the external update.

## Oracle

Controlled-field pattern elsewhere (`JsonLikePropField` resyncs draft from `valueKey`); effect guard at admin.tsx:446 explicitly avoids clobbering focused editors.

## Counterexample

1. Mount with `value = V1`; user focuses and edits (DOM diverges; not yet committed).
2. Parent passes `value = V2` → `valueKey` changes.
3. Effect runs `setHtml(portableTextToEditorHtml(V2))` but skips `innerHTML` update because `activeElement === editorRef.current`.
4. User blurs without further edits.
5. `commit()` reads stale DOM → `onChange(stalePortableText)`; parent ends up with stale content, not `V2`.

## Why It Might Matter

Concurrent admin updates (autosave echo, undo, or another field mutating the same entry) can be lost when the portable-text field blurs after an external value push.

## Proof

**State transition mismatch:** external `value` advances to `V2` while focused DOM remains on pre-`V2` edits.

**Control-flow trace:** `useEffect` partial sync (html state only) → focused guard blocks DOM update → `onBlur` → `commit()` reads DOM not `value` prop.

**Dataflow trace:** parent `V2` → skipped `innerHTML` → blur → `onChange(stale)` → parent reverts.

## Counterevidence Checked

- Toolbar `runCommand` commits immediately after edits; that path is intentional for formatting, not for external value races.
- When the editor is not focused, the effect updates both `html` state and `innerHTML`.
- No `commit` runs on `valueKey` change while focused.

## Suggested Next Step

On external `value` change while focused, either update the DOM and reset the edit session, or mark the field dirty and skip blur commit when `valueKey` changed since focus.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Added an `externalUpdateWhileFocusedRef`. The value-sync effect sets it when `valueKey` changes while the editor is focused (DOM not overwritten). `commit()` (called on blur) checks the flag: if set, it resyncs the DOM to the latest external value and returns without calling `onChange`, so stale pre-update content can no longer overwrite the newer value. The flag is cleared on `onFocus`, `onInput`, and `runCommand` so that deliberate user edits remain authoritative and commit normally. Typecheck and build pass.

DEVANA-KEY: src/admin.tsx:443-454 | P1 | portabletext-external-value-race
DEVANA-SUMMARY: Status=fixed | P1 high src/admin.tsx:443-454 - Blur now detects an external value update that landed during the focus session and resyncs to it instead of committing stale DOM; fresh user edits clear the flag and commit normally.