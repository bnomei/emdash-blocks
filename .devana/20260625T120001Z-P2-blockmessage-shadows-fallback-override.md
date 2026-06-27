DEVANA-FINDING: v1
Priority: P2 | Confidence: medium | Security-sensitive: no | Status: fixed
Location: src/i18n.ts:144-150 | Slug: blockmessage-shadows-fallback-override

# `blockMessage` returns the built-in English default before checking later fallback-chain locales

## Finding

`blockMessage` walks the fallback chain and, as soon as it reaches the
`DEFAULT_LOCALE` ("en") position, returns the built-in English string if there is
no `en` override — even when a *later* locale in the chain carries a real override
for that key. The configured translation is silently ignored. `localizedString`,
the sibling resolver, does not have this bug: it checks the whole chain first and
only falls back to the default afterwards.

## Violated Invariant Or Contract

A user-supplied message override for any locale in the fallback chain must take
precedence over the package's built-in English default. The chain is ordered
most-specific → least-specific; resolution must not short-circuit to a built-in
default before consulting later chain entries that hold an override.

## Oracle

`localizedString` (src/i18n.ts:124-135) is the neighboring implementation of the
same concept: it iterates the full `localeFallbacks` chain returning the first
non-empty translation, and only consults `DEFAULT_LOCALE` / first-available
*after* the loop. `blockMessage` should resolve identically; the divergence is the
defect.

## Counterexample

```js
const i18n = {
  locale: "en",
  defaultLocale: "en",
  fallback: { en: "brand" },
  messages: { brand: { addBlock: "Block hinzufügen" } },
};
blockMessage("addBlock", i18n); // => "Add Block"  (expected "Block hinzufügen")
```

`localeFallbacks` returns `["en", "brand"]`. The loop visits `"en"` first: no `en`
override exists, then `locale === DEFAULT_LOCALE && defaultMessage` is true, so it
returns the built-in `"Add Block"` and never visits `"brand"`. The same happens
for any multi-tier chain that passes through `"en"` before an override-bearing
locale, e.g. `fallback: { "en-GB": "en", "en": "brand" }`.

## Why It Might Matter

A configured label override is silently dropped and the English built-in is shown
instead, for any i18n configuration whose fallback chain routes through `"en"`
before reaching the locale that actually defines the override. It is a correctness
bug in a shipped public API (`blockMessage`, re-exported from the package root),
config-dependent so impact is uncertain, but the failure is silent.

## Proof

**Cross-path mismatch:** `localizedString` (124-135) checks the full chain before
the default; `blockMessage` (144-150) returns the default mid-loop at the `"en"`
position. Same intent, different result for the same chain.

**Control-flow trace:** loop iteration for `locale === "en"`: line 145 finds no
override; line 148 reads the built-in; line 149 `locale === DEFAULT_LOCALE &&
defaultMessage` short-circuits `return defaultMessage`, skipping every later chain
locale (including the one with the override). The post-loop fallbacks (152-155)
are never reached.

## Counterevidence Checked

- The common configs are unaffected: `defaultLocale:"en"` + `locale:"de"` +
  `fallback:{de:"en"}` produces chain `["de","en"]`, so `"de"` (with the override)
  is visited before `"en"`. The bug needs `"en"` to precede an override locale.
- `localeFallbacks` always appends the config default locale, but that does not
  insert the `DEFAULT_LOCALE` "en" unless `defaultLocale` is "en" or a fallback
  edge points to it — exactly the triggering shapes above.
- `fallback` is typed `Record<string,string>` with no restriction preventing a
  chain through `"en"`, so the config is valid, not malformed.

## Suggested Next Step

Mirror `localizedString`: collect overrides across the whole chain first and only
fall back to the built-in English default after the loop, instead of returning it
mid-loop at the `DEFAULT_LOCALE` position.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Removed the mid-loop `locale === DEFAULT_LOCALE && defaultMessage` short-circuit in `blockMessage`. The loop now scans the entire fallback chain for a configured override first; only after the loop does it fall back to a DEFAULT_LOCALE override and finally the built-in English default — mirroring `localizedString`. Regression test added (chain `["en","brand"]` with the override on `brand` now resolves correctly; an unoverridden key still returns the built-in default). i18n suite passes.

DEVANA-KEY: src/i18n.ts:144-150 | P2 | blockmessage-shadows-fallback-override
DEVANA-SUMMARY: Status=fixed | P2 medium src/i18n.ts:144-150 - blockMessage now scans the full fallback chain before the built-in English default, so an override on a later chain locale is no longer shadowed. Regression test added.
