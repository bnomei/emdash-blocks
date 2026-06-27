DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | high | security=no
DEVANA-KEY: src/adminTransforms.ts:112,src/render.ts:22 | hidden-string-not-coerced

# String hidden flags are coerced to visible on read

## Finding

`normalizeEditorBlock` and `normalizeBlock` keep `hidden` only when `typeof hidden === "boolean"`. Migrated JSON with string sentinels such as `"true"` or `"yes"` becomes `hidden: undefined`, so blocks render as visible in the admin and pass `visibleBlocks` even though the stored JSON still says they are hidden.

## Violated Invariant Or Contract

README and `BlockBuilderBlock` type `hidden` as an optional boolean. Truthy string hidden values from migration should not silently display as visible without editor acknowledgment.

## Oracle

`test/admin-transformations.test.mjs` and `test/render-transformations.test.mjs` encode `hidden: "yes"` → `undefined` as current behavior, but that behavior drops migration semantics for common string booleans.

## Counterexample

Stored block `{ "id": "x", "type": "text", "hidden": "true", "props": {} }`. `normalizeEditorBlock` sets `hidden: undefined`. Admin shows the block as visible (no hidden styling, eye icon shows visible). User saves without touching visibility; the string `"true"` was dropped on read and never surfaced for correction.

Related hazard: consumers filtering raw stored JSON with `!block.hidden` (without normalization) treat `"false"` as truthy and incorrectly hide blocks, because `"false"` is a non-empty string.

## Why It Might Matter

Imported CMS data often uses string booleans. Editors see blocks they believe are published while stored JSON still marks them hidden, or downstream raw filters mis-hide blocks when `"false"` is truthy.

## Proof

Dataflow trace: stored `hidden: "true"` → normalize → `hidden: undefined` → admin visible styling → `visibleBlocks` includes block. Cross-entry mismatch: `visibleBlocks` normalizes first (safe) vs raw `!block.hidden` (unsafe for `"false"`).

## Counterevidence Checked

`prepareBlocksForChange` intentionally maps `hidden: false` to `undefined`; that is separate boolean normalization on write. This report is about non-boolean string inputs on read.

## Suggested Next Step

Coerce common string hidden sentinels (`"true"`, `"false"`, `"1"`, `"0"`) to booleans during normalization, or surface a migration warning when `hidden` is not boolean.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Added a shared `normalizeHidden(value)` helper in render.ts (exported) and imported it into adminTransforms.ts so both `normalizeBlock` and `normalizeEditorBlock` coerce `hidden` consistently: real booleans pass through; string sentinels are trimmed/lower-cased and mapped (`"false"`/`"0"`/`"no"`/`"off"` → false, empty string and non-string/non-boolean → undefined, any other non-empty string e.g. `"true"`/`"yes"`/`"1"` → true). So migrated `hidden: "true"` now hides the block (admin styling + excluded by visibleBlocks) instead of silently rendering visible, and `"false"` resolves to a real boolean false rather than a truthy string. Updated the render test that encoded the old `"yes"`→undefined behavior to expect `true`, and added coercion regression tests on both the render and admin paths. Full suite (22 tests) passes.

DEVANA-KEY: src/adminTransforms.ts:112,src/render.ts:22 | hidden-string-not-coerced
DEVANA-SUMMARY: fixed | P2 | high | A shared normalizeHidden helper now coerces string hidden sentinels to booleans in both normalizeBlock and normalizeEditorBlock, so migrated "true"/"false"/"1"/"0"/"yes" values resolve correctly instead of dropping to undefined. Regression tests added.