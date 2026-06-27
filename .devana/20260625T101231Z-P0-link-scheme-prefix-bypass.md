DEVANA-FINDING: v1
Priority: P0 | Confidence: high | Security-sensitive: yes | Status: fixed
Location: src/linkProtocols.ts:12-22 | Slug: link-scheme-prefix-bypass

# Link validator accepts dangerous schemes hidden behind non-letter prefixes

## Finding

`isSafeLinkHref` only detects URL schemes when the compacted href begins with `[a-zA-Z]…:`. Prefix characters that survive `trim()` and `compactSchemeCandidate()` but precede the real scheme token cause validation to fall through to `return true`, so obfuscated `javascript:` URLs are accepted and persisted in portable-text `markDefs`.

## Violated Invariant Or Contract

Only `http:`, `https:`, `mailto:`, `tel:`, and relative/root-relative URLs should be accepted for link `href` values. Tests in `test/linkProtocols.test.mjs` reject plain `javascript:alert(1)` and whitespace-stripped variants.

## Oracle

`test/linkProtocols.test.mjs` rejected list; `safeLinkHref` usage in `parseInlineMarkdown`, `spansToHtml`, and `PortableTextPropField.createLink`.

## Counterexample

- `isSafeLinkHref("&#106;avascript:alert(1)")` returns `true` because the string starts with `&`, not a scheme letter.
- `isSafeLinkHref("\u200Bjavascript:alert(1)")` returns `true` because U+200B is kept by compaction and blocks the start-anchored scheme regex.

Both values are returned unchanged by `safeLinkHref` and can be stored in `markDefs[].href`, then emitted into editor HTML via `spansToHtml`.

## Why It Might Matter

Unsafe link targets can be stored in block JSON and survive portable-text round-trips. Frontend renderers that output stored `href` values without re-sanitizing may expose XSS or unwanted navigation when browsers decode entity-encoded or prefixed schemes.

## Proof

**Counterexample value:** `&#106;avascript:alert(1)` and `\u200Bjavascript:alert(1)`.

**Dataflow trace:** markdown/portable-text input → `safeLinkHref(href)` in `parseInlineMarkdown` (adminTransforms.ts:364) → accepted `markDefs` entry → `portableTextToEditorHtml` → `spansToHtml` re-validates with the same function (adminTransforms.ts:440) → `<a href="…">` emitted with the obfuscated href.

**Control-flow trace:** `compactSchemeCandidate` keeps `&`, `#`, digits, and U+200B; scheme regex is anchored at index 0 only (linkProtocols.ts:19); no scan of remainder for disallowed schemes.

## Counterevidence Checked

- `java\nscript:alert(1)` is rejected because the newline is stripped and exposes `javascript:` at the start.
- `JaVaScRiPt:alert(1)` is rejected via lowercased scheme detection.
- `editorHtmlToPortableText` re-validates anchor `href` with the same function, so poisoned values round-trip instead of being stripped on ingest.
- Tests do not cover entity-encoded or invisible-prefix variants.

## Suggested Next Step

Reject hrefs whose compacted form contains any disallowed scheme substring, or normalize/decode HTML entities and strip Unicode format characters before scheme detection.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `isSafeLinkHref` now decodes HTML entities (numeric, hex, and scheme-relevant named entities like `&colon;`/`&sol;`) and strips Unicode control/format/zero-width characters before start-anchored scheme detection. Added regression tests for `&#106;avascript:`, `&#x6a;avascript:`, `javascript&colon;`, U+200B-prefixed, and U+FEFF-prefixed `javascript:` variants in test/linkProtocols.test.mjs. Full suite passes (17 tests).

DEVANA-KEY: src/linkProtocols.ts:12-22 | P0 | link-scheme-prefix-bypass
DEVANA-SUMMARY: Status=fixed | P0 high src/linkProtocols.ts:12-22 - Scheme validation now decodes HTML entities and strips invisible characters before start-anchored scheme detection, so entity-encoded and invisible-prefix javascript: URLs are rejected. Regression tests added.