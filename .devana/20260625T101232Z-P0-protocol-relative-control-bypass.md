DEVANA-FINDING: v1
Priority: P0 | Confidence: high | Security-sensitive: yes | Status: fixed
Location: src/linkProtocols.ts:15-22 | Slug: protocol-relative-control-bypass

# Protocol-relative URLs bypass guard when a control character prefixes `//`

## Finding

`isSafeLinkHref` rejects literal `//` prefixes on `slashNormalizedHref`, but separately compacts the original string by stripping C0 control characters before scheme detection. A leading control byte before `//` defeats the literal `startsWith("//")` check while the compacted remainder is still protocol-relative, so the function returns `true`.

## Violated Invariant Or Contract

Protocol-relative URLs such as `//evil.test` must be rejected. `test/linkProtocols.test.mjs` asserts `//example.com/protocol-relative` is unsafe.

## Oracle

`test/linkProtocols.test.mjs` rejected list; `linkProtocolError` message promises only http, https, mailto, tel, root-relative, and relative URLs.

## Counterexample

`isSafeLinkHref("\x00//evil.test")` returns `true`.

Trace:
1. `slashNormalizedHref` is `"\x00//evil.test"`; `startsWith("//")` is false.
2. `compactSchemeCandidate` removes `\x00`, yielding `//evil.test`.
3. No scheme token at the start of the compact form; function returns `true`.
4. `safeLinkHref` returns the original string including the leading control character.

## Why It Might Matter

Protocol-relative links resolve against the current site origin. Accepting obfuscated `//host` hrefs in stored portable text can enable unintended cross-origin navigation or mixed-content behavior when the value is rendered in admin or frontend output.

## Proof

**Counterexample value:** `"\x00//evil.test"` (same class applies to other C0 controls before `//`).

**Control-flow trace:** two normalization paths (`slashNormalizedHref` vs `compactSchemeCandidate`) apply different rules to the same input; the `//` guard uses the non-compacted view while the allow decision uses the compacted view.

**Dataflow trace:** accepted href → `markDefs` / `createLink` → `spansToHtml` emits `<a href="…">` with the raw stored value.

## Counterevidence Checked

- Bare `//example.com` is rejected by the literal prefix test.
- `compactSchemeCandidate` intentionally strips controls for `java\nscript:` detection; that same compaction is not applied before the `//` rejection check.
- `escapeAttribute` does not remove `\x00` from emitted href attributes.

## Suggested Next Step

Run the `//` rejection check on `compactSchemeCandidate(href)` (or a single canonical normalized form) so both guards use the same normalized input.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed (alongside link-scheme-prefix-bypass). `isSafeLinkHref` now computes a single canonical `normalizedHref` (decode entities + strip control/format/whitespace) and runs BOTH the `//` protocol-relative check and the scheme check on that same form. `"\x00//evil.test"`, zero-width/BOM-prefixed `//`, and `&sol;&sol;` now reject. Regression tests added.

DEVANA-KEY: src/linkProtocols.ts:15-22 | P0 | protocol-relative-control-bypass
DEVANA-SUMMARY: Status=fixed | P0 high src/linkProtocols.ts:15-22 - The // protocol-relative guard and scheme guard now share one canonical normalized form (control/format chars stripped, entities decoded), so control-prefixed and entity-encoded // URLs are rejected. Regression tests added.