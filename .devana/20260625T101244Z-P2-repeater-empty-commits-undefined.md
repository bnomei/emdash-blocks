DEVANA-FINDING: v1
Priority: P2 | Confidence: medium | Security-sensitive: no | Status: fixed
Location: src/admin.tsx:688-691,758-762 | Slug: repeater-empty-commits-undefined

# Clearing a repeater JSON field commits `undefined` instead of an array

## Finding

`repeater` prop fields use `JsonLikePropField`, which commits `parseJsonDraft` results directly. An empty textarea parses to `{ ok: true, value: undefined }` per `test/json-draft.test.mjs`, and `onChange(undefined)` is called on blur. Repeater fields are documented/help-texted as JSON arrays (`jsonStringArray` message).

## Violated Invariant Or Contract

A `repeater` prop should persist an array-shaped value; clearing the field should normalize to `[]`, not `undefined`.

## Oracle

README lists `repeater` stored as a JSON array; `parseProps("[]")` returns `null` in the separate raw-object path, showing array emptiness is modeled differently across editors.

## Counterexample

1. Repeater field stores `["a", "b"]`.
2. User deletes all textarea content and blurs.
3. `parseJsonDraft("")` → `{ ok: true, value: undefined }`.
4. `JsonLikePropField.commit` calls `onChange(undefined)`.
5. Stored prop becomes `undefined` instead of `[]`.

## Why It Might Matter

Downstream renderers or EmDash field consumers that call `.map` or assume an array on repeater props can misbehave after a user clears the field.

## Proof

**Counterexample value:** empty string draft on a `repeater` field.

**Dataflow trace:** blur → `parseJsonDraft("")` → `onChange(undefined)` → persisted props lose array type.

**Contract mismatch:** help text implies string array; commit path allows `undefined`.

## Counterevidence Checked

- `parseJsonDraft('["a","b"]')` commits a valid array.
- `parseProps` path rejects arrays for object-only props; repeater does not use `parseProps`.
- No post-parse coercion from `undefined` to `[]` for repeater type.

## Suggested Next Step

When `field.type === "repeater"`, coerce `undefined` and `null` commit values to `[]`.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `JsonLikePropField.commit` now coerces `undefined`/`null` parse results to `[]` when `field.type === "repeater"`, so clearing a repeater field persists an empty array instead of dropping the array type. The `json` type is unaffected (still allows undefined). Typecheck and build pass. (UI-only commit path; verified via typecheck/build.)

DEVANA-KEY: src/admin.tsx:688-691,758-762 | P2 | repeater-empty-commits-undefined
DEVANA-SUMMARY: Status=fixed | P2 medium src/admin.tsx:688-691,758-762 - Clearing a repeater field now commits [] instead of undefined, preserving the array contract; json fields unchanged.