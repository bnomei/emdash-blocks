DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/adminTransforms.ts:477-482,506,546-561 | Slug: nested-list-merged-into-parent-text

# Nested `<ul>/<ol>` inside an `<li>` is flattened into the parent item's text and lost

## Finding

When `editorHtmlToPortableText` processes a list whose `<li>` contains a nested
`<ul>`/`<ol>`, the nested list items are not emitted as their own portable-text
blocks. Instead their text is concatenated onto the parent item's spans, and the
nested list structure disappears. A two-level bullet list commits as a single
bullet block whose text is the parent and child glued together.

## Violated Invariant Or Contract

Each visible list item in the contentEditable surface must serialize to a
distinct portable-text block. Converting `<li>parent<ul><li>child</li></ul></li>`
must not merge "child" into "parent" or drop the child item.

## Oracle

`appendPortableTextNode` deliberately models lists by emitting one block per list
item (`querySelectorAll(":scope > li")`, lines 477-484), and `inlineNodesToSpans`
handles a fixed whitelist of inline tags (`strong`, `em`, `code`, `s`, `a`, `br`)
— it has no case for `ul`/`ol`/`li`, so any nested list falls through to the
generic "recurse into childNodes" path (line 561) and is treated as inline text.
The intended behavior is one block per item, not text concatenation.

## Counterexample

Editor DOM after indenting a second bullet (what `insertUnorderedList` + Tab
produces in a contentEditable):

```html
<ul><li>Parent<ul><li>Child</li></ul></li></ul>
```

On blur, `commit()` → `editorHtmlToPortableText` yields a single block:

```json
{ "_type": "block", "listItem": "bullet", "level": 1,
  "children": [ { "text": "Parent" }, { "text": "Child" } ] }
```

The "Child" list item is gone as a block and renders as `ParentChild`.

## Why It Might Matter

Opening the portable-text editor on content that contains nested lists and then
blurring silently corrupts stored JSON: a list item is destroyed and its text is
fused (with no separator) onto its parent. This is reachable from the browser's
own `insertUnorderedList`/`insertOrderedList` with indentation, and from pasting
nested-list HTML. The loss is persisted via `onChange` and is not undoable in the
widget.

## Proof

**Control-flow / dataflow trace:**
- `appendPortableTextNode` ul/ol branch (477-484) iterates only `:scope > li`, so a
  nested `<li>` is never visited as a top-level list item → child block lost.
- The parent `<li>` is turned into one block by `elementToTextBlock` (line 481 →
  509-524), which calls `inlineNodesToSpans(Array.from(element.childNodes), …)`
  over *all* children including the nested `<ul>`.
- `inlineNodesToSpans` (526-561) has no `ul`/`ol`/`li` handling; the `<ul>` node
  hits the final `spans.push(...inlineNodesToSpans(node.childNodes, …))` (561),
  recursing through the nested `<li>` down to its text node (534-536), appending a
  `"Child"` span to the parent block.

## Counterevidence Checked

- The whitespace-only block filter (458-461) does not save the child: "Child" is
  non-empty, so it survives — fused into the parent block rather than dropped.
- `portableTextToEditorHtml` never emits nested lists, so this input shape arrives
  only from the browser's execCommand or pasted HTML, both of which reach the
  commit path.
- This is distinct from `list-level-roundtrip-loss` (which is about the `level`
  field on already-flat sibling blocks); here whole list items are merged/lost.

## Suggested Next Step

In `inlineNodesToSpans` (or before `elementToTextBlock`), detect a nested
`ul`/`ol` child of an `<li>` and recurse into `appendPortableTextNode` so nested
items become their own blocks instead of inline text.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Added `appendListItem`, which builds a list-item block from its INLINE children only (excluding any nested `<ul>`/`<ol>`), then recurses into each nested list via `appendPortableTextNode` at `itemLevel + 1`, so nested items become their own blocks instead of being fused into the parent's text. `appendPortableTextNode` now threads a structural `level` (default 1), and `listItemLevel(element, fallback)` prefers an explicit `data-level` attribute (our export's round-trip marker) but otherwise uses the structural nesting depth. `elementToTextBlock` was simplified (its now-unused listItem/level params removed). Regression test added: `<ul><li>Parent<ul><li>Child</li></ul></li></ul>` → two blocks (Parent level 1, Child level 2). Existing data-level round-trip and list-render tests still pass; full suite 21 tests pass.

DEVANA-KEY: src/adminTransforms.ts:477-482,506,546-561 | P2 | nested-list-merged-into-parent-text
DEVANA-SUMMARY: Status=fixed | P2 high src/adminTransforms.ts:477-482,506,546-561 - Nested lists inside an <li> now serialize each child item to its own block at the next level (via appendListItem) instead of fusing child text into the parent. Regression test added.
