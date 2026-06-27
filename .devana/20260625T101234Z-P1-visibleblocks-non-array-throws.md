DEVANA-FINDING: v1
Priority: P1 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/render.ts:27-32 | Slug: visibleblocks-non-array-throws

# `visibleBlocks` throws when stored JSON is a non-array truthy value

## Finding

`normalizeBlocks` calls `(blocks ?? []).map(...)` without verifying that `blocks` is an array. Any non-array truthy stored value (for example a single block object) causes `TypeError: … .map is not a function` in frontend render helpers.

## Violated Invariant Or Contract

Frontend helpers documented in README (`visibleBlocks(entry.blocks)`) should tolerate malformed runtime JSON at least as safely as the admin editor, which returns an empty list for non-array input via `normalizeEditorBlocks`.

## Oracle

README “Frontend Rendering” example; `test/render-transformations.test.mjs` covers `null`/`undefined` only; admin path in `adminTransforms.ts:117-118` guards with `Array.isArray`.

## Counterexample

```ts
visibleBlocks({ id: "hero-1", type: "heading", props: { text: "Hi" } } as any)
// TypeError: (blocks ?? []).map is not a function
```

`normalizeBlocks` and `visibleBlocks` share the same failure mode.

## Why It Might Matter

Corrupted, migrated, or mistakenly saved JSON fields can be a single object instead of an array. A frontend page that calls `visibleBlocks` during render will crash instead of degrading to an empty block list.

## Proof

**Counterexample value:** a single block object instead of an array.

**Cross-entry mismatch:** `normalizeEditorBlocks(value)` returns `[]` for non-arrays; `normalizeBlocks(blocks)` throws for the same shape.

**Control-flow trace:** `(blocks ?? []).map` only substitutes `null`/`undefined`, not other truthy non-arrays (render.ts:28).

## Counterevidence Checked

- `visibleBlocks(null)` and `visibleBlocks(undefined)` return `[]` via `?? []`.
- Type declarations describe an array, but runtime JSON is not schema-validated before these helpers run.
- `isBlockBuilderBlock` is not used as a guard in the render path.

## Suggested Next Step

Mirror the admin guard: `Array.isArray(blocks) ? blocks.map(normalizeBlock) : []` in `normalizeBlocks`.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `normalizeBlocks` now guards with `Array.isArray(blocks)` and returns `[]` for any non-array value, mirroring the admin `normalizeEditorBlocks` behaviour. `visibleBlocks` inherits the guard. Regression tests added for a single-object input and a string input. Suite passes.

DEVANA-KEY: src/render.ts:27-32 | P1 | visibleblocks-non-array-throws
DEVANA-SUMMARY: Status=fixed | P1 high src/render.ts:27-32 - normalizeBlocks now guards with Array.isArray and returns [] for non-array stored JSON, so visibleBlocks degrades gracefully instead of throwing. Regression tests added.