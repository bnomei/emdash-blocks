DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | medium | security=no
DEVANA-KEY: src/admin.tsx:758-762,688-691 | repeater-null-commits

# Repeater JSON field commits null for literal null draft

## Finding

`JsonLikePropField` commits any successful `parseJsonDraft` result without checking that repeater props stay arrays. Editing a repeater textarea to the JSON literal `null` and blurring persists `null`, breaking the documented array contract.

## Violated Invariant Or Contract

README states repeater props are stored as JSON arrays. Blur commit must not replace an array prop with `null`.

## Oracle

`repeater-empty-commits-undefined` covers empty string → `undefined`. `test/json-draft.test.mjs` shows `parseJsonDraft` accepts primitives; repeater fields have no `Array.isArray` guard before `onChange`.

## Counterexample

Repeater prop currently `[{ "id": 1 }]`. User edits the JSON textarea to `null` and blurs. `parseJsonDraft("null")` returns `{ ok: true, value: null }`. `onChange(null)` persists `prop: null` instead of `[]` or rejecting the edit.

## Why It Might Matter

Frontend renderers and schema consumers expecting an array can throw or skip rendering when a repeater prop becomes `null` after a single blur commit.

## Proof

Control-flow trace: blur → `commit("null")` → `parseJsonDraft` success → `onChange(null)` → parent `{ ...props, [key]: null }`.

## Counterevidence Checked

`parseProps` returns `null` for non-objects but is not used by repeater fields. Empty-string commits are covered by the existing `repeater-empty-commits-undefined` report; this is the distinct JSON `null` literal path.

## Suggested Next Step

For `type === "repeater"`, reject commits where the parsed value is not an array (treat `null` as `[]` or show a parse error).

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `JsonLikePropField.commit` was reworked for repeater fields: `undefined`/`null` commit `[]`; any other non-array (object/primitive) is rejected with a new localized `repeaterMustBeArray` error instead of persisting a non-array. (The literal-`null`→`[]` part was already introduced by the repeater-empty-commits-undefined fix; this report's distinct object/primitive shape hole is now closed too.) The error rendering was refactored so `parseError` holds the final localized message (syntax errors are wrapped via `invalidJson` at set time), keeping the `repeaterMustBeArray` message from being double-wrapped. Added the `repeaterMustBeArray` i18n key. Typecheck/build and i18n render test pass.

DEVANA-KEY: src/admin.tsx:758-762,688-691 | repeater-null-commits
DEVANA-SUMMARY: fixed | P2 | medium | Repeater commits now coerce undefined/null to [] and reject any other non-array value with a repeaterMustBeArray error, enforcing the array contract.