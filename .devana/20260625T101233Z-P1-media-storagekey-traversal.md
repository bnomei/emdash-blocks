DEVANA-FINDING: v1
Priority: P1 | Confidence: medium | Security-sensitive: yes | Status: fixed
Location: src/adminTransforms.ts:233-235 | Slug: media-storagekey-traversal

# `encodeStorageKey` preserves `..` segments in constructed media URLs

## Finding

`mediaUrl` builds `/_emdash/api/media/file/${encodeStorageKey(storageKey)}` when a media value carries `meta.storageKey`. `encodeStorageKey` percent-encodes each slash-separated segment but leaves `.` and `..` unchanged, so parent-directory segments survive into the final URL.

## Violated Invariant Or Contract

Media file URLs constructed from stored block props should not contain traversable `..` path segments that resolve outside the intended `/file/` namespace.

## Oracle

`mediaUrl` tests in `test/admin-transformations.test.mjs` expect encoding of spaces and slashes in normal keys (`uploads/hero image.png`, `asset/id`), but do not cover `..` segments.

## Counterexample

```ts
mediaUrl({ id: "x", meta: { storageKey: "../../sensitive" } })
// "/_emdash/api/media/file/../../sensitive"
```

Browser path normalization can resolve this outside the `/file/` prefix (for example toward `/_emdash/sensitive`).

## Why It Might Matter

Block JSON props are user-editable (including raw JSON fallback). A crafted or migrated `storageKey` with `..` segments yields client-side URLs that traverse the API path. Impact depends on server canonicalization, but the library actively constructs the traversal URL and uses it as `<img src>` in the admin UI.

## Proof

**Counterexample value:** `meta.storageKey = "../../sensitive"`.

**Dataflow trace:** stored media prop → `isMediaValue` accepts any object with string `id` or `src` → `mediaStorageKey` reads `meta.storageKey` → `encodeStorageKey` returns `../../sensitive` → `mediaUrl` prefixes `/_emdash/api/media/file/` → `MediaPropField` renders `<img src={mediaUrl(item)}>` (admin.tsx:382-383).

**Contract mismatch:** `encodeURIComponent("asset/id")` in the `id`-only path encodes `/`, but the `storageKey` path preserves directory semantics including `..`.

## Counterevidence Checked

- `mediaUrl({ id: "asset/id" })` encodes `/` as `%2F`; only the `storageKey` branch preserves `..`.
- `previewUrl` / external `src` bypass is intentional for CDN assets.
- No in-repo server-side path canonicalization was found to rely on as a mitigator.

## Suggested Next Step

Reject `storageKey` values containing `.` or `..` segments, or normalize them before URL construction; align `storageKey` handling with the safer `id` encoding path.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `encodeStorageKey` now drops empty, `.`, and `..` path segments before percent-encoding, so a stored `storageKey` like `../../sensitive` collapses to `sensitive` instead of producing a traversal URL. Regression tests added for `../../sensitive` and `uploads/../../etc/passwd`. Suite passes.

DEVANA-KEY: src/adminTransforms.ts:233-235 | P1 | media-storagekey-traversal
DEVANA-SUMMARY: Status=fixed | P1 medium src/adminTransforms.ts:233-235 - encodeStorageKey now strips empty/./.. segments before encoding, neutralizing path-traversal in media file URLs. Regression tests added.