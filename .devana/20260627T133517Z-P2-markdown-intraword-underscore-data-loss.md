DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | medium | security=no
DEVANA-KEY: src/adminTransforms.ts:348,359-360 | markdown-intraword-underscore-data-loss

# Intraword `_` is parsed as emphasis and the underscores are deleted from the text

## Finding

`parseInlineMarkdown` matches emphasis with the regex alternative `_(.+?)_` (`src/adminTransforms.ts:348`) with no word-boundary guard. For any text containing intra-word underscores — `snake_case` identifiers, filenames, table/column names — the parser treats the span between the first and second `_` as emphasis and consumes both underscores, so the rendered text loses the underscore characters entirely.

## Violated Invariant Or Contract

Two expectations are broken: (1) per CommonMark, `_` only opens/closes emphasis at word boundaries, so `foo_bar_baz` must render literally; (2) more fundamentally, a parser must not delete input characters it interprets — non-emphasized underscores must be preserved in the output spans.

## Oracle

CommonMark intraword-emphasis rule (`foo_bar_baz` → literal `foo_bar_baz`), plus the function's own evident intent that unmarked text is byte-preserved (every other branch slices `text` and re-emits the literal slice; only the deleted markers differ). `markdownToPortableText`/`parseInlineMarkdown` is a real, intentionally-supported ingestion path: `portableTextBlocks` (`:265-269`) routes any string-valued portable-text prop through `markdownToPortableText` (`:267`).

## Counterexample

Input string `"foo_bar_baz"` (e.g. a stored markdown value `my_file_name`, an identifier, or `a_b_c`) reaching `portableTextBlocks` → `markdownToPortableText` → `parseInlineMarkdown`:

- Scan starts at 0; chars `f o o` match no alternative.
- At index 3, `_(.+?)_` matches `_bar_` (underscores at indices 3 and 7), `match[4] = "bar"`.
- `match[0] = "_bar_"` is consumed; cursor jumps to 8; `"baz"` is appended.
- Result spans: `[ span("foo"), span("bar", ["em"]), span("baz") ]` → renders `foo` + *bar* + `baz` = displayed **`foobarbaz`** with a spurious italic and **both underscores lost**.

After the editor commits this back via `editorHtmlToPortableText`, the underscores are permanently gone from the stored value.

## Why It Might Matter

Any markdown-sourced content with `word_word` patterns (filenames, code identifiers, snake_case keys) is silently corrupted on ingestion: characters are deleted and unintended italics are introduced. The loss is not visible as an error and becomes permanent after the first editor commit.

## Proof

Counterexample value + dataflow trace: stored string `"foo_bar_baz"` → `portableTextBlocks` (`adminTransforms.ts:267`) → `markdownToPortableText` (`:275`) → `parseInlineMarkdown` regex `_(.+?)_` (`:348`) matches `_bar_`, em branch (`:359-360`) emits `makeSpan("bar", ["em"])`, and `cursor = match.index + match[0].length` (`:376`) skips past both underscores so they are never re-emitted (`:353-354`, `:379`).

## Counterevidence Checked

- Lazy `.+?` bounds the span but does not check word boundaries; the regex has no `\b`/lookaround guard, so intraword underscores fire unconditionally.
- The other alternatives (`**`, backtick, link, `~~`) do not pre-empt the underscore match for this input — none matches at indices 0-2.
- Strongest reason this might be false: this is a deliberately minimal markdown subset, so underscore emphasis could be "as designed." That does not excuse the defect — even a minimal parser must not *delete* characters it fails to interpret as intended; the underscores vanish from the rendered/stored text, which is data loss, not a styling preference. Reachability is via the explicitly-supported string→markdown path (`:267`), so it is intended input being corrupted, distinct from the already-filed list/heading transforms.

## Suggested Next Step

Require word boundaries for `_` emphasis (e.g. only open/close when adjacent to whitespace or string edges), or at minimum re-emit unmatched underscores as literal text. Confirm `foo_bar_baz` round-trips to literal `foo_bar_baz`.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. The `_` emphasis alternative in `parseInlineMarkdown`'s pattern now carries CommonMark-style alphanumeric word-boundary guards: `(?<![A-Za-z0-9])_(.+?)_(?![A-Za-z0-9])`. The lookbehind/lookahead are zero-width, so match[0]/match.index and the capture-group numbering (group 3 outer, group 4 inner) are unchanged; the underscores are still consumed only when a real emphasis match occurs. `foo_bar_baz`/`my_file_name`/snake_case no longer match (preceding/following char is alphanumeric), so the underscores are preserved as literal text. Genuine word-boundary emphasis (`an _italic_ word`, or `_em_` surrounded by spaces) still produces an `em` span. Regression test added (intraword preserved + boundary emphasis still works); existing markdown test (space-surrounded `_em_`) still passes. Full suite (26 tests) passes. Node22 target supports lookbehind.

DEVANA-KEY: src/adminTransforms.ts:348,359-360 | markdown-intraword-underscore-data-loss
DEVANA-SUMMARY: fixed | P2 | medium | The `_` emphasis rule now requires alphanumeric word boundaries, so intraword underscores (snake_case/filenames) are preserved as literal text instead of being parsed as emphasis and deleted; real boundary emphasis still works. Regression test added.
