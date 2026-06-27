DEVANA-FINDING: v1
Priority: P3 | Confidence: medium | Security-sensitive: no | Status: fixed
Location: src/adminTransforms.ts:200-203,219-221 | Slug: empty-media-identity-collision

# `isMediaValue` accepts empty-string identifiers, so `mediaIdentity` returns "" and collapses distinct media

## Finding

`isMediaValue` admits a value if `id` *or* `src` is a string — including the empty
string `""`. For such a value `mediaIdentity` falls through all four candidates and
returns `""`. In `MediaPropField`, `mediaIdentity` is the dedup key, the React
`key`, and the argument to `removeMedia`, so two selected media that both yield
`""` collapse into one, share a duplicate React key, and are removed together.

## Violated Invariant Or Contract

`mediaIdentity` must produce a stable, unique, non-empty key per selected media.
A value that passes `isMediaValue` (and is therefore kept by `mediaValues`) must
have a usable identity.

## Oracle

`mediaIdentity` (219-221) is `value.id || mediaStorageKey(value) || value.src ||
value.previewUrl || ""` — the trailing `|| ""` shows the author expects a
non-empty result in practice, and the consumers (`selectedKeys` Set, React `key`,
`removeMedia` filter) all assume per-item uniqueness.

## Counterexample

A `media-list` prop value (e.g. authored via the raw JSON props editor, or
migrated/legacy data) such as:

```json
[ { "id": "" }, { "src": "" } ]
```

Both entries pass `isMediaValue` (`typeof "" === "string"`), survive
`mediaValues`, and have `mediaIdentity` === `""`. In `MediaPropField`:
- `selectedKeys` (admin.tsx:296) collapses both to a single `""` key.
- both `<div key={identity}>` (admin.tsx:379-381) render with `key=""` (React
  duplicate-key collision).
- `removeMedia("")` (admin.tsx:364-367) filters `mediaIdentity(item) !== ""`,
  deleting **both** entries at once instead of the one clicked.

## Why It Might Matter

Distinct selected media silently merge in the picker, render with colliding React
keys, and a single "remove" deletes all empty-identity entries together,
corrupting the stored media-list prop. Reachable only with malformed/empty
identifiers, so likelihood is low, but the data loss is concrete.

## Proof

**Contract mismatch:** `isMediaValue` (200-203) accepts `{ id: "" }` / `{ src: "" }`
while `mediaIdentity` (219-221) cannot derive a non-empty key from it.

**Dataflow trace:** stored prop → `mediaValues` (keeps empty-id entries) →
`mediaIdentity` returns `""` → `Set`/React-`key`/`removeMedia` keyed on `""` →
dedup collapse, key collision, and remove-all.

## Counterevidence Checked

- `mediaValueFromItem` always sets a real `id`, so library-selected media never
  hit this; the trigger is externally-authored or migrated prop values.
- `{}` (no id/src) is rejected by `isMediaValue`, so the value must explicitly
  carry an empty-string `id` or `src` to slip through.
- Not covered by `media-storagekey-traversal` (that concerns path traversal in
  `encodeStorageKey`) or `duplicate-block-id-keys` (block ids, not media).

## Suggested Next Step

Require a non-empty `id`/`src` in `isMediaValue`, or have `mediaIdentity` fall
back to a generated key when all candidates are empty, so distinct selections stay
distinct.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `isMediaValue` still gates on a string `id`/`src` (media shape) but now additionally requires a non-empty identity source among `id`, `src`, `previewUrl`, and `meta.storageKey` — the same sources `mediaIdentity` derives from. So `{ id: "" }` / `{ src: "" }` are filtered out by `mediaValues` and can no longer collapse onto a shared `""` dedup/React key (which made `removeMedia("")` delete every empty-identity entry). Values with a non-empty identity from any source (e.g. `{ id: "", src: "..." }`, `{ id: "", meta: { storageKey: "k" } }`) are still kept. Regression tests added. Typecheck/build/suite pass.

DEVANA-KEY: src/adminTransforms.ts:200-203,219-221 | P3 | empty-media-identity-collision
DEVANA-SUMMARY: Status=fixed | P3 medium src/adminTransforms.ts:200-203,219-221 - isMediaValue now requires a non-empty identity source, so empty-id/src media values are filtered instead of collapsing onto a shared "" key. Regression tests added.
