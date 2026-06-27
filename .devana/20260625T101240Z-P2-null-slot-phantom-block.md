DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/adminTransforms.ts:102-118 | Slug: null-slot-phantom-block

# `null` array entries are synthesized into editable phantom text blocks

## Finding

`normalizeEditorBlocks` maps every array element without filtering. `normalizeEditorBlock(null, index)` calls `asRecord(null)` which yields `{}`, then assigns default `id`, `type: "text"`, and empty `props`. The admin UI renders and can persist this synthesized block even though the user never created it.

## Violated Invariant Or Contract

Invalid or placeholder entries in a blocks array should not materialize as new editable, persistable blocks.

## Oracle

`isBlockBuilderBlock(null)` is `false`; tests cover malformed objects inside blocks but not `null` slots.

## Counterexample

Stored value:

```json
[{ "id": "hero-1", "type": "hero", "props": { "title": "Hi" } }, null]
```

`normalizeEditorBlocks` returns two blocks; the second is `{ id: "block-2", type: "text", props: {} }`.

## Why It Might Matter

Sparse or corrupted JSON arrays (common after partial migrations or hand edits) gain an extra empty text block that gets written back on save, polluting stored content.

## Proof

**Counterexample value:** `[validBlock, null]`.

**Control-flow trace:** `value.map(normalizeEditorBlock)` with no filter → `asRecord(null)` → `{}` → default block factory (adminTransforms.ts:102-114).

**Dataflow trace:** phantom block → `BlocksField` render → `updateBlocks` → `onChange` persists synthesized entry.

## Counterevidence Checked

- Non-array top-level values become `[]` (different failure mode).
- `normalizeBlocks` in `render.ts` has the same map-without-filter pattern for array elements.
- Empty-string `id`/`type` are replaced with index-based defaults, but `null` is not rejected.

## Suggested Next Step

Skip non-object array elements in `normalizeEditorBlock` / `normalizeEditorBlocks`, or filter them out before mapping.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `normalizeEditorBlocks` now filters array elements through `isBlockRecord` (non-null object, non-array) before mapping, so null/primitive/array slots are dropped instead of becoming phantom empty text blocks. The same fix was applied to `normalizeBlocks` in render.ts (counterevidence flagged the identical map-without-filter pattern). Regression tests added in both admin and render suites. Suite passes.

DEVANA-KEY: src/adminTransforms.ts:102-118 | P2 | null-slot-phantom-block
DEVANA-SUMMARY: Status=fixed | P2 high src/adminTransforms.ts:102-118 - normalizeEditorBlocks (and render normalizeBlocks) now drop non-object array slots, so null entries no longer become persisted phantom blocks. Regression tests added.