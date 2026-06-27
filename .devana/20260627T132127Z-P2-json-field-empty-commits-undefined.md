DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | medium | security=no
DEVANA-KEY: src/admin.tsx:688-691,758-762 | json-field-empty-commits-undefined

# Json prop field empty draft commits undefined

## Finding

Schema `json` prop fields use `JsonLikePropField`, which commits successful parses from `parseJsonDraft` without guarding against empty drafts. Clearing the textarea to `""` or whitespace-only text produces `undefined` via `parseJsonDraft`, and that `undefined` is written into block props.

## Violated Invariant Or Contract

`json` fields advertise a JSON value/object in help text (`jsonValue`). Clearing the field should commit an empty object, `null`, or reject the edit—not silently remove the prop key semantics by storing `undefined`.

## Oracle

`repeater-empty-commits-undefined` covers the repeater/array contract. `parseJsonDraft("")` returns `{ ok: true, value: undefined }` per `test/json-draft.test.mjs`. `json` fields share the same commit path but expect object-shaped values.

## Counterexample

`json` prop stores `{ "meta": true }`. User clears the textarea to `""` and blurs. `parseJsonDraft("")` → `{ ok: true, value: undefined }` → `onChange(undefined)` → prop becomes `undefined` rather than `{}` or an explicit empty JSON value.

Whitespace-only draft `"   "` trims to `""` and follows the same path.

## Why It Might Matter

Renderers and validators expecting an object record can break when a cleared json prop becomes `undefined` after blur, especially when the prop key remains in the schema as required.

## Proof

Control-flow trace: blur → `commit("")` → `parseJsonDraft` success with `undefined` → `onChange(undefined)` → merged props lose typed object shape.

## Counterevidence Checked

Raw props fallback uses `parseProps`, which rejects non-objects; this is specific to schema `json` fields. Distinct from `repeater-empty-commits-undefined` array contract.

## Suggested Next Step

For `type === "json"`, map empty/whitespace drafts to `{}` or show a validation error instead of committing `undefined`.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `JsonLikePropField.commit` now maps a cleared `json` field (parse result `undefined`, which covers `""` and whitespace-only drafts since `parseJsonDraft` trims) to `{}` instead of committing `undefined`, preserving the object shape implied by the field's help text. Empty/whitespace → `{}`; valid JSON (including explicit `null` or primitives) still commits as authored for `json` type. The repeater branch (separate report) already maps empty→`[]`. Typecheck/build and i18n render test pass.

DEVANA-KEY: src/admin.tsx:688-691,758-762 | json-field-empty-commits-undefined
DEVANA-SUMMARY: fixed | P2 | medium | Clearing a json prop field now commits {} instead of undefined, preserving its object shape.