DEVANA-FINDING: v1
DEVANA-STATE: fixed | P0 | high | security=yes
DEVANA-KEY: src/linkProtocols.ts:18-22 | link-percent-encoded-scheme-bypass

# Percent-encoded colon bypasses link scheme validation

## Finding

`isSafeLinkHref` detects dangerous schemes only when a literal ASCII colon appears in the compacted href. Percent-encoded colons (`%3A`, `%3a`) and other non-literal colon forms break the start-anchored scheme regex, so values such as `javascript%3Aalert(1)` are accepted as safe relative URLs and can be persisted in portable-text link marks.

## Violated Invariant Or Contract

Only `http:`, `https:`, `mailto:`, `tel:`, and safe relative URLs should pass link validation. Obfuscated `javascript:` targets must be rejected the same as literal `javascript:` URLs.

## Oracle

`test/linkProtocols.test.mjs` rejects literal `javascript:alert(1)` but does not cover percent-encoded scheme separators. `safeLinkHref` is used on markdown links, editor link creation, HTML-to-portable-text conversion, and portable-text HTML rendering.

## Counterexample

`isSafeLinkHref("javascript%3Aalert(1)")` returns `true` because `compactSchemeCandidate` leaves `%3A` intact, the regex `/^[a-zA-Z][a-zA-Z\d+.-]*:/` never sees a literal `:`, `scheme` is `undefined`, and the function falls through to `return true`. The same class of bypass applies to mid-token splitters such as `java\u200dscript:alert(1)` where U+200D breaks the scheme character class before the literal colon.

## Why It Might Matter

Persisted portable-text link marks with these hrefs can reach admin and frontend renderers. A click in the admin session or on a site that emits stored `href` values without re-validation can execute attacker-controlled `javascript:` navigation.

## Proof

Contract mismatch / dataflow trace: user or importer supplies `href: "javascript%3Aalert(1)"` via markdown `[x](javascript%3Aalert(1))`, link prompt, pasted `<a href="javascript%3Aalert(1)">`, or raw JSON `markDefs` → `safeLinkHref` returns the string unchanged → stored in block JSON → rendered as `<a href="javascript%3Aalert(1)">` by `spansToHtml`.

## Counterevidence Checked

Existing P0 reports cover leading invisible-prefix and control-character protocol-relative bypasses; they do not cover encoded-colon or mid-token ZWJ splitters. `getAttribute("href")` on paste may decode some entities, but markdown and stored JSON paths accept the encoded form directly. README treats admin as trusted, but imported/migrated portable text is a realistic write path.

## Suggested Next Step

Normalize or decode percent-encoding (and other colon homoglyphs) before scheme detection, or reject any href whose decoded form contains a disallowed scheme.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Added `decodePercentEncoding` to the validation normalization in `isSafeLinkHref` (now `stripInvisibleCharacters(decodePercentEncoding(decodeHtmlEntities(href)))`). Percent-encoded scheme separators (`%3A`/`%3a`) and encoded slashes (`%2F%2F`) are decoded before the start-anchored scheme and `//` checks, so `javascript%3Aalert(1)` and `%2F%2Fevil.com` now reject. The ZWJ/mid-token splitter vector (`java‍script:`) was already covered by the earlier `stripInvisibleCharacters` (`\p{Cf}`) change. `decodeURIComponent` is wrapped in try/catch with a well-formed-octet fallback so a stray `%` cannot abort. Regression tests added for all four counterexamples. Suite passes.

DEVANA-KEY: src/linkProtocols.ts:18-22 | link-percent-encoded-scheme-bypass
DEVANA-SUMMARY: fixed | P0 | high | isSafeLinkHref now percent-decodes (plus the existing entity-decode/invisible-strip) before scheme and // detection, so encoded-colon and encoded-slash javascript:/protocol-relative bypasses are rejected. Regression tests added.