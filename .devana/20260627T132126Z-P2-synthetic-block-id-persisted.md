DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | medium | security=no
DEVANA-KEY: src/adminTransforms.ts:110,src/admin.tsx:869-873 | synthetic-block-id-persisted

# First edit persists synthetic ids for imported id-less blocks

## Finding

`normalizeEditorBlocks` assigns fallback ids such as `block-1` in memory when stored blocks omit `id` or have empty/non-string ids. The parent `value` remains id-less until the user edits. The first `onChange` from any prop or reorder writes those synthetic ids into persisted JSON as if user-authored.

## Violated Invariant Or Contract

Imported blocks without ids should not gain new ids unless the editor explicitly assigns them. Display normalization should not silently mutate stored identity on the first unrelated edit.

## Oracle

`normalizeEditorBlock` line 110: `typeof record.id === "string" && record.id ? record.id : \`block-${index + 1}\``. `BlocksField` calls `onChange(prepareBlocksForChange(nextBlocks))` on every edit.

## Counterexample

1. Import `[{ "type": "text", "props": { "text": "Hello" } }]` with no `id`.
2. Render assigns in-memory `id: "block-1"`; parent value is still id-less.
3. User edits the text prop.
4. `onChange` emits `[{ "id": "block-1", "type": "text", "props": { ... } }]`.
5. Originally id-less content now permanently carries a synthetic index-based id.

Variants: `"id": ""`, `"id": 123` (number), or missing `id` all synthesize `block-${index+1}`.

## Why It Might Matter

Migration pipelines and external systems keyed on absent ids or stable external keys see unexpected id injection after the first admin touch, complicating round-trips and merge tooling.

## Proof

State transition: read normalize (memory-only id) → first write via `prepareBlocksForChange` → persisted JSON includes synthetic `id`.

## Counterevidence Checked

`duplicate-block-id-keys` covers duplicate explicit ids, not synthetic id injection. Index-based remount churn when parent reorders id-less arrays is a related but distinct lifecycle concern.

## Suggested Next Step

Persist synthetic ids only when the user performs an explicit id-affecting action, or keep normalization display-only until the user saves with a dedicated normalize-on-save pass.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `prepareBlocksForChange` (the single write chokepoint before `onChange`) now drops ids matching `SYNTHETIC_BLOCK_ID` (`^block-\d+$`) — the exact shape `normalizeEditorBlock` synthesizes for imported id-less blocks. So an unrelated first edit no longer injects `block-1`/`block-2` into stored JSON; the content stays id-less and the id is re-synthesized for display/React keys on the next read. Explicitly-authored ids and created-block ids are untouched: `createBlockForDefinition` uses `randomId` (a UUID in browsers, or `block-<base36>-<rand>` in the node fallback), neither of which matches `^block-\d+$` (the second hyphen/letters break it). Read-path dedup (duplicate-block-id-keys) and React-key stability are unaffected since they use the in-memory synthetic ids. Regression tests added (synthetic id dropped, explicit id kept, id-less normalize→prepare round-trip stays id-less). Full suite (23 tests) passes.

  Known narrow limitation: a user who imported a literal id of the exact form `block-7` would have it dropped on persist (treated as synthetic). This collision is pathological and such an id is itself index-like; preferred over a uglier internal-prefix synthetic id that would leak into the block-header UI.

DEVANA-KEY: src/adminTransforms.ts:110,src/admin.tsx:869-873 | synthetic-block-id-persisted
DEVANA-SUMMARY: fixed | P2 | medium | prepareBlocksForChange now strips synthetic block-N ids on persist so imported id-less blocks stay id-less in stored JSON; explicit/created ids are preserved. Regression tests added.