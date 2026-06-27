DEVANA-FINDING: v1
DEVANA-STATE: fixed | P1 | high | security=no
DEVANA-KEY: src/adminTransforms.ts:260-266,394-396,425-446 | portabletext-malformed-children-crash

# Malformed stored portable-text crashes the BlocksField editor on open

## Finding

`portableTextToEditorHtml` builds editor HTML from a stored portable-text value with no shape validation beyond `_type`/`_key`. A stored portable-text block whose `children` is not an array (or whose span `text` is not a string, or whose `markDefs` is not an array) reaches `.map` / `.replace` / `.find` calls that throw a `TypeError` during React render. Because the value is read inside the `useState` initializer of `PortableTextPropField` (`src/admin.tsx:441`) and re-read in its effect (`:444`), the throw happens while rendering the field and takes down the whole `BlocksField` widget for that document, with no recovery path to repair the data.

## Violated Invariant Or Contract

`BlocksField` is the field-widget entry point and receives an arbitrary persisted JSON `value` (untrusted). The widget already treats stored values as untrusted and degrades gracefully elsewhere: `normalizeEditorBlocks` returns `[]` for a non-array (`src/adminTransforms.ts:117-118`) and `render.ts` guards block shape. The portable-text rendering path must likewise tolerate a malformed stored value rather than throw during render.

## Oracle

`portableTextBlocks` (`src/adminTransforms.ts:265-269`) is the only gate before the HTML builder, and it filters with `isPortableTextBlock` (`:260-263`), which checks **only** that `_type` and `_key` are strings. It never checks that `children` is an array, that each `span.text` is a string, or that `markDefs` is an array — but `spansToHtml` (`:425-446`) and `escapeHtml` (`:567-573`) assume all three.

## Counterexample

`BlocksField` `value`:

```json
[{ "id": "b1", "type": "text", "props": { "text": [ { "_type": "block", "_key": "k1", "children": "oops" } ] } }]
```

- `normalizeEditorBlock` keeps `props.text` as-is (it only coerces block-level `props` to an object, not nested array elements).
- Block type `text` → default definition field `text` is `portableText` → `PortableTextPropField` mounts.
- `useState(() => portableTextToEditorHtml(value))` (`src/admin.tsx:441`) runs → `portableTextBlocks` accepts the block (valid `_type`/`_key`) → `spansToHtml(block.children ?? [], ...)` is called with `children = "oops"` → inside `spansToHtml`, `"oops".map(...)` → **`TypeError: spans.map is not a function`** thrown during render.

Secondary variants through the same sink: `children: [{ "_type": "span", "text": 5 }]` → `escapeHtml(5 ?? "")` → `(5).replace is not a function` (`:568`); `markDefs: "x"` with a non-empty `marks` array → `"x".find is not a function` (`:430`).

## Why It Might Matter

Opening a document whose stored block JSON was produced by an import, migration, API write, or hand edit crashes the entire block editor for that document. The crash is in a render-time initializer, so there is no in-app way to view or fix the offending block — the field is unusable until the data is repaired out of band.

## Proof

Entry-point-to-sink control-flow trace: untrusted `value` → `admin.tsx:869 normalizeEditorBlocks` → `:972 renderPropsEditor` → `:691/675-685 renderPropField` (portableText) → `:441 portableTextToEditorHtml(value)` (in `useState` initializer) → `adminTransforms.ts:394 spansToHtml(block.children ?? [], ...)` → `:425 spans.map(...)` throws on a non-array `children`. Concrete input value given above.

## Counterevidence Checked

- `asRecord` / `normalizeEditorBlock` (`adminTransforms.ts:96-115`) coerce only the **block-level** `props` to an object — they do not validate nested portable-text array members.
- `block.children ?? []` and `span.text ?? ""` guard only `null`/`undefined`, not wrong-typed values (a string or number passes through).
- `isPortableTextBlock` exists but validates only `_type`/`_key`.
- There is no `try/catch` around `portableTextToEditorHtml` in `PortableTextPropField` (`admin.tsx:441,444`).
- Strongest reason this might be false: one could argue stored portable text is always well-formed because this widget's own serializer (`editorHtmlToPortableText`) produces it. That does not hold — `BlocksField`'s contract is to accept an arbitrary persisted `value` (the codebase already has a filed bug, `visibleblocks-non-array-throws`, acknowledging malformed stored input as in-scope), and migrations/imports/API writes can persist a portable-text array whose members are malformed. The render-time throw is unrecoverable regardless of producer.

## Suggested Next Step

In `spansToHtml`/`portableTextToEditorHtml`, coerce defensively (`Array.isArray(block.children) ? block.children : []`, `typeof span.text === "string" ? span.text : ""`, `Array.isArray(markDefs) ? markDefs : []`), or tighten `isPortableTextBlock` to drop blocks with a non-array `children`/`markDefs`. Confirm the counterexample no longer throws on open.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Defensive coercion added along the render path so malformed stored portable text degrades instead of throwing: (1) `portableTextToEditorHtml` now passes `Array.isArray(block.children) ? block.children : []` and the same guard for `block.markDefs` into `spansToHtml`; (2) `spansToHtml` coerces `spans`/`markDefs` to arrays, treats a non-array `span.marks` as `[]`, uses `span?.text` only when it is a string (else ""), guards `definition?._key` against non-object markDefs, and only calls `safeLinkHref` when `link.href` is a string. All the report's counterexamples (non-array children, non-string text, non-array/`"x"` markDefs, null span, non-string href) now render without throwing. Regression test added (`assert.doesNotThrow` over all variants + a "kept" content check). Full suite passes (24 tests).

DEVANA-KEY: src/adminTransforms.ts:260-266,394-396,425-446 | portabletext-malformed-children-crash
DEVANA-SUMMARY: fixed | P1 | high | portableTextToEditorHtml/spansToHtml now coerce children/marks/markDefs to arrays, text to string, and guard non-string href, so malformed stored portable text no longer throws during render and crashes the BlocksField editor. Regression test added.
