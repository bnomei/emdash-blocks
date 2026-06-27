DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/adminTransforms.ts:413-418,497 | Slug: heading-h5-h6-downgrade

# Portable-text editor round-trip downgrades `h5` and `h6` to `h4`

## Finding

`portableTextToEditorHtml` emits `h5` and `h6` tags faithfully from stored `style`, but `editorHtmlToPortableText` caps imported heading levels with `Math.min(Number(tag.slice(1)), 4)`. Opening a portable-text field and blurring without edits commits the downgraded style via `PortableTextPropField.commit`.

## Violated Invariant Or Contract

Loading portable text into the editor and saving without intentional heading changes should preserve each block’s `style` value (`h1`–`h6`).

## Oracle

`portableTextToEditorHtml` uses `block.style` directly for `h1`–`h6`; `editorHtmlToPortableText` test coverage stops at `h2`.

## Counterexample

Stored block:

```json
{ "_type": "block", "_key": "k1", "style": "h5", "children": [{ "_type": "span", "_key": "s1", "text": "Title" }], "markDefs": [] }
```

Round-trip through `portableTextToEditorHtml` → DOM parse → `editorHtmlToPortableText` yields `style: "h4"`.

## Why It Might Matter

Content imported with `h5`/`h6` styles (or edited outside this cap) loses heading level on any editor open/blur cycle, affecting frontend heading semantics after save.

## Proof

**Counterexample value:** `style: "h5"` or `"h6"`.

**Contract mismatch:** export path preserves `h5`/`h6`; import path caps at `h4` (adminTransforms.ts:497).

**Dataflow trace:** stored PT → editor HTML `<h5>` → blur `commit()` → `onChange` with `style: "h4"`.

## Counterevidence Checked

- `h1`–`h4` round-trip consistently.
- Markdown import also caps headings at `h4` in `markdownToPortableText`, but that is one-way import, not an edit round-trip.
- Toolbar only inserts `h3`; does not explain loss on untouched `h5`/`h6` blur.

## Suggested Next Step

Remove the `Math.min(..., 4)` cap in `editorHtmlToPortableText`, or cap consistently in both directions.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Removed the `Math.min(Number(tag.slice(1)), 4)` cap in `appendPortableTextNode`; since the tag already matches `^h[1-6]$`, the block now uses `tag` directly, preserving the full h1-h6 range symmetrically with the export path. Regression test added asserting h5/h6 survive the editor-HTML round-trip. Suite passes.

DEVANA-KEY: src/adminTransforms.ts:413-418,497 | P2 | heading-h5-h6-downgrade
DEVANA-SUMMARY: Status=fixed | P2 high src/adminTransforms.ts:413-418,497 - editorHtmlToPortableText no longer caps heading levels; h5/h6 round-trip without downgrade. Regression test added.