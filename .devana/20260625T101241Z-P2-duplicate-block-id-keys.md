DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/admin.tsx:901 | Slug: duplicate-block-id-keys

# Duplicate block `id` values break React list identity for stateful editors

## Finding

`BlocksField` renders each block row with `key={block.id}`. `normalizeEditorBlock` preserves explicit duplicate non-empty ids. When two blocks share an id, React reconciles both rows under one key, so stateful child editors (`PortableTextPropField`, `JsonLikePropField`, media picker) can attach to the wrong row.

## Violated Invariant Or Contract

Each block row’s React state and blur commits must map 1:1 to the block at that index in the `value` array.

## Oracle

React list `key` uniqueness expectation; `normalizeEditorBlock` only synthesizes ids for empty/missing ids, not duplicates.

## Counterexample

```json
[
  { "id": "dup", "type": "text", "props": { "text": [{ "_type": "block", "_key": "a", "children": [{ "_type": "span", "_key": "s", "text": "A" }] }] } },
  { "id": "dup", "type": "text", "props": { "text": [{ "_type": "block", "_key": "b", "children": [{ "_type": "span", "_key": "s", "text": "B" }] }] } }
]
```

Both sections use `key="dup"`. Editing block 2 can show or commit block 1’s editor state despite `updateBlock(index, …)` using the correct index closure.

## Why It Might Matter

Imported or merged block data with duplicate ids causes cross-block editor contamination and wrong props saved on blur.

## Proof

**Counterexample value:** two blocks with the same explicit `id: "dup"`.

**Control-flow trace:** duplicate keys → React fiber reuse → stateful child state binds to wrong row; `onBlur` commit uses index from closure but displayed content may belong to the other duplicate.

**State transition mismatch:** `value` array has two distinct blocks; React tree treats them as one keyed instance.

## Counterevidence Checked

- `moveBlock` / `removeBlock` use indices and are correct when keys are unique.
- Empty `id: ""` gets per-index fallback `block-${index+1}`, which dedupes only the missing-id case.
- New blocks use `randomId` / `crypto.randomUUID`, avoiding duplicates on creation.

## Suggested Next Step

Deduplicate ids during normalization (append index suffix) or key rows by index plus id.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Added `dedupeBlockIds` to `normalizeEditorBlocks`: the first occurrence of an id keeps it, and later duplicates get a unique `${id}-${index+1}` suffix (further deduped if needed). Because `key={block.id}` is computed from the normalized blocks on every render and the suffix is index-deterministic, keys are now both stable and unique, so stateful per-block editors (PortableTextPropField, JsonLikePropField, media picker) bind to the correct row. Block content and order are preserved; only colliding ids change (which also repairs the corrupt data on next save). Regression test added. Typecheck/build/suite pass.

DEVANA-KEY: src/admin.tsx:901 | P2 | duplicate-block-id-keys
DEVANA-SUMMARY: Status=fixed | P2 high src/admin.tsx:901 - normalizeEditorBlocks now deduplicates block ids (suffixing later collisions), so React list keys are unique and stateful per-block editors no longer cross-contaminate. Regression test added.