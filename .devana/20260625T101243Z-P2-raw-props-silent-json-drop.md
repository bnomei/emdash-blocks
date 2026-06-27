DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/admin.tsx:834-837 | Slug: raw-props-silent-json-drop

# Raw props fallback silently ignores invalid JSON on blur

## Finding

The raw JSON props textarea (used when `definition?.props` is falsy) calls `parseProps` on blur and only invokes `onChange` when the result is non-null. Invalid JSON, arrays, primitives, and empty strings return `null` from `parseProps`, but this path renders no error UI—unlike `JsonLikePropField`, which surfaces `invalidJson` messages.

## Violated Invariant Or Contract

A blur commit attempt with invalid JSON must not appear to succeed while leaving persisted props unchanged without user-visible feedback.

## Oracle

`test/admin-transformations.test.mjs` asserts `parseProps("[]")`, `parseProps('{"title":')`, and `parseProps("")` return `null`; `JsonLikePropField` pairs the same parser with `setParseError`.

## Counterexample

1. Block uses raw props fallback with stored props `{ "a": 1 }`.
2. User edits textarea to `{"title":` or `[]` or clears all content.
3. On blur: `parseProps` returns `null` → `if (nextProps) onChange(nextProps)` is skipped.
4. No error is shown; persisted props remain `{ "a": 1 }` while the textarea still shows the user’s edit.

## Why It Might Matter

Editors believe invalid edits or attempted clears were saved; stored JSON stays stale with no indication to retry or fix syntax.

## Proof

**Counterexample value:** blur with `{"title":` or `[]` or `""`.

**Control-flow trace:** `onBlur` → `parseProps` → null guard → no `onChange`, no error branch in `renderPropsEditor`.

**Contract mismatch:** `JsonLikePropField.commit` uses the same underlying parser but sets `parseError` UI; raw fallback does not.

## Counterevidence Checked

- `parseProps("{}")` returns `{}` and does commit successfully.
- Schema-backed blocks use per-field editors instead of this fallback.
- `parseProps` intentionally rejects non-objects; the bug is missing caller-side feedback.

## Suggested Next Step

Reuse `JsonLikePropField` or add `parseJsonDraft` error display to the raw props fallback.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `RawPropsField` (the raw props fallback, extracted earlier for raw-props-stale-overwrite) now has a `commit()` that uses `parseJsonDraft` and surfaces feedback: syntax errors show the localized `invalidJson` message; valid-but-non-object JSON (arrays/primitives) shows a new `propsMustBeObject` message; an empty textarea commits `{}` (explicit clear). Errors render in a `role="alert"` `<small>` with `aria-invalid`/`aria-describedby`, and re-validate live while an error is showing — matching `JsonLikePropField`. Added the `propsMustBeObject` i18n key. Removed the now-unused `parseProps` import. Typecheck/build and full suite (20 tests) pass.

DEVANA-KEY: src/admin.tsx:834-837 | P2 | raw-props-silent-json-drop
DEVANA-SUMMARY: Status=fixed | P2 high src/admin.tsx:834-837 - Raw props textarea now surfaces invalid-JSON and non-object errors (and commits {} on clear) instead of silently dropping the edit, matching JsonLikePropField.