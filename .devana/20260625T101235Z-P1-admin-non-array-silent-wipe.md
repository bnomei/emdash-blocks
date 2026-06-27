DEVANA-FINDING: v1
Priority: P1 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/adminTransforms.ts:117-118 | Slug: admin-non-array-silent-wipe

# Admin editor shows empty blocks for non-array stored values and can overwrite the original payload

## Finding

`normalizeEditorBlocks` returns `[]` for any non-array `value`. `BlocksField` treats that as authoritative state. The first user edit persists a new array through `onChange`, silently replacing a non-empty but mis-shaped stored value.

## Violated Invariant Or Contract

Opening the block editor must not present an empty block list and enable persistence that discards an existing non-array payload without explicit user intent to reset.

## Oracle

README stored value shape is an array; admin ingest uses `unknown` without surfacing coercion errors.

## Counterexample

Stored field value (not wrapped in an array):

```json
{ "id": "hero-1", "type": "heading", "props": { "text": "Hello", "level": "h2" } }
```

1. `normalizeEditorBlocks(value)` → `[]`
2. UI shows zero blocks while the original object remains on disk until mutation.
3. User adds or edits any block → `updateBlocks` → `onChange(prepareBlocksForChange([...]))` persists only the new array, dropping the original object.

## Why It Might Matter

Single-object JSON is a plausible migration or corruption shape. The UI misrepresents content as empty, then enables silent data loss on the first save.

## Proof

**Counterexample value:** one block object stored where an array is expected.

**Dataflow trace:** stored JSON → `normalizeEditorBlocks` (`Array.isArray` false branch) → `[]` → `BlocksField` state → first `updateBlocks` → `onChange` writes replacement array.

**Cross-entry mismatch:** same malformed value crashes `visibleBlocks` (see separate report) while admin shows empty.

## Counterevidence Checked

- If the user never edits blocks, `onChange` is not called and the alien shape remains on disk.
- Valid arrays normalize and render correctly.
- No warning UI exists for non-array coercion.

## Suggested Next Step

Coerce a single valid block object into a one-element array, or surface a blocking error when the stored shape is not an array.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `normalizeEditorBlocks` now coerces a single stored block object (a record with a non-empty string `type`) into a one-element list, so the editor shows and preserves the content instead of presenting it as empty and overwriting it on the first edit. Non-block values (e.g. `{foo:"bar"}`, `null`, strings) still degrade to `[]`. Note: the read-only frontend path (`render.ts` normalizeBlocks, separate report visibleblocks-non-array-throws) intentionally returns `[]` for the same shape; only the editor needs to preserve. Regression test added.

DEVANA-KEY: src/adminTransforms.ts:117-118 | P1 | admin-non-array-silent-wipe
DEVANA-SUMMARY: Status=fixed | P1 high src/adminTransforms.ts:117-118 - normalizeEditorBlocks coerces a single stored block object into a one-element list, preventing silent data loss on first edit. Non-block values still degrade to []. Regression test added.