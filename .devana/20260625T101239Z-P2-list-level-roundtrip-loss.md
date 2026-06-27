DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/adminTransforms.ts:398-405,519-521 | Slug: list-level-roundtrip-loss

# Nested portable-text list `level` is lost on editor HTML round-trip

## Finding

`portableTextToEditorHtml` renders list items as flat `<ul>/<ol><li>` entries and ignores `level`. `editorHtmlToPortableText` hardcodes `level: 1` for every list item. Markdown import can create `level: 2` blocks (tested), but opening the portable-text editor and blurring collapses nesting to `level: 1`.

## Violated Invariant Or Contract

Portable-text list blocks with `level > 1` should survive editor display → blur → persistence.

## Oracle

`test/admin-transformations.test.mjs` asserts markdown import produces `level: 2` for nested bullets; rendered HTML test uses only flat list items.

## Counterexample

Two bullet blocks:

```json
[
  { "_type": "block", "_key": "a", "listItem": "bullet", "level": 1, "children": [{ "_type": "span", "_key": "s1", "text": "One" }], "markDefs": [] },
  { "_type": "block", "_key": "b", "listItem": "bullet", "level": 2, "children": [{ "_type": "span", "_key": "s2", "text": "Two" }], "markDefs": [] }
]
```

After `portableTextToEditorHtml` → `editorHtmlToPortableText`, both blocks have `level: 1`.

## Why It Might Matter

Nested list structure from imports or API-fed content is flattened on any editor session, changing list semantics in stored JSON and frontend render output.

## Proof

**Counterexample value:** adjacent bullet blocks with `level: 1` and `level: 2`.

**Dataflow trace:** PT with levels → flat HTML (level not emitted) → parse sets `level: 1` for all list items → `PortableTextPropField` blur commits flattened structure.

**Contract mismatch:** markdown import creates multi-level blocks; editor round-trip cannot preserve them.

## Counterevidence Checked

- Flat list HTML rendering test passes without levels.
- No HTML nesting or `data-level` attribute is emitted during PT→HTML conversion.
- `elementToTextBlock` always spreads `{ listItem, level: 1 }` for list items.

## Suggested Next Step

Encode `level` in HTML (nested lists or data attributes) and restore it on parse, or document that nested levels are import-only.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `portableTextToEditorHtml` now emits `data-level="N"` on `<li>` for blocks with `level > 1`, and `editorHtmlToPortableText` restores the level via a new `listItemLevel(element)` helper (reads/validates the `data-level` attribute, defaults to 1). `elementToTextBlock` gained a `level` parameter. Flat lists are unchanged (no attribute emitted for level 1), so existing render assertions still pass. Regression test covers both export (data-level emitted) and import (level restored). Suite passes.

DEVANA-KEY: src/adminTransforms.ts:398-405,519-521 | P2 | list-level-roundtrip-loss
DEVANA-SUMMARY: Status=fixed | P2 high src/adminTransforms.ts:398-405,519-521 - Nested list level now round-trips via a data-level attribute on <li>; flat lists are unchanged. Regression test added.