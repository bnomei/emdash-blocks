DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | high | security=no
DEVANA-KEY: src/adminTransforms.ts:501-503,526-561 | portabletext-p-list-flatten

# Lists inside paragraph tags flatten into one text block

## Finding

When the portable-text editor DOM contains a list nested inside a `<p>` (common after browser paste or formatting), `editorHtmlToPortableText` routes the `<p>` through `elementToTextBlock` → `inlineNodesToSpans`. Nested `<ul>`/`<ol>`/`<li>` nodes are not emitted as list blocks; their text is concatenated into a single `normal` block and list structure is lost on commit.

## Violated Invariant Or Contract

List structure inside the rich-text surface should serialize to distinct portable-text list blocks with `listItem` metadata, consistent with top-level `<ul>`/`<ol>` handling at lines 477-483.

## Oracle

Top-level lists receive per-`<li>` blocks. `inlineNodesToSpans` whitelists only inline tags (`strong`, `em`, `code`, `s`, `a`, `br`) and recurses generically through other elements, including lists.

## Counterexample

Editor DOM after paste:
```html
<p>Intro<ul><li>One</li><li>Two</li></ul></p>
```
`appendPortableTextNode` matches `p` → `elementToTextBlock`. `inlineNodesToSpans` walks into the nested list and appends `"One"` and `"Two"` as spans in the same block. Commit yields one `{ style: "normal", children: [...] }` block with text like `"IntroOneTwo"` and no `listItem` fields.

## Why It Might Matter

Pasted content silently loses bullets/numbering. Editors see lists in the surface until blur, then stored portable text flattens them into plain paragraphs.

## Proof

Control-flow trace: `p` branch → `elementToTextBlock` → `inlineNodesToSpans` sees `ul` → generic child recursion (line 561) → list text merged into parent spans → no `listItem` blocks emitted.

## Counterevidence Checked

`nested-list-merged-into-parent-text` covers `li > ul > li` at the top level, not `p > ul`. `list-level-roundtrip-loss` is about `level` on flat siblings, not item loss inside paragraphs.

## Suggested Next Step

Detect block-level children (`ul`, `ol`, `div`) inside `p`/`div` and split them into separate portable-text blocks before inline span conversion.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. The `p`/`div` branch of `appendPortableTextNode` now calls a new `appendBlockContainer`, which walks the container's children in order, accumulating contiguous inline nodes into a text block and flushing it whenever a block-level child (`ul`/`ol`/`li`/`p`/`div`/`blockquote`/`h1-6`, via `isBlockLevelTag`) is hit — those block-level children are recursed through `appendPortableTextNode` so lists become real `listItem` blocks. Document order is preserved (e.g. `<p>Intro<ul><li>One</li><li>Two</li></ul>After</p>` → paragraph "Intro", two bullet blocks, paragraph "After"). Empty/whitespace-only inline runs are not emitted (matching the prior whitespace-filter behavior). Complements nested-list-merged-into-parent-text (li>ul). Regression test added; full suite (23 tests) passes.

DEVANA-KEY: src/adminTransforms.ts:501-503,526-561 | portabletext-p-list-flatten
DEVANA-SUMMARY: fixed | P2 | high | Lists nested inside <p>/<div> are now split into distinct portable-text list blocks (appendBlockContainer) instead of flattening their items into the paragraph text. Regression test added.