DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | high | security=no
DEVANA-KEY: src/admin.tsx:580-585 | boolean-string-false-coercion

# Boolean prop switch treats string "false" as enabled

## Finding

Boolean prop fields render with `checked={Boolean(value)}`. Any non-empty string is truthy in JavaScript, so imported or hand-authored values such as `"false"` or `"0"` display as enabled even though they represent logical false in migrated JSON.

## Violated Invariant Or Contract

A `boolean` prop control should reflect the logical truth of the stored value. The README documents boolean fields as switches with boolean semantics.

## Oracle

`defaultPropsForDefinition` writes real booleans for new blocks (`test/render-transformations.test.mjs`). The boolean branch in `renderPropField` never coerces string sentinels before rendering.

## Counterexample

Block definition `{ key: "enabled", type: "boolean", defaultValue: false }` with stored props `{ enabled: "false" }` from migration or raw JSON editing. `Boolean("false")` is `true`, so the switch renders ON. The string remains persisted until the user toggles, and any consumer using truthiness also treats the block as enabled.

## Why It Might Matter

Migrated CMS data often serializes booleans as strings. The admin UI misrepresents the stored value and can cause editors to save the wrong enabled state after a toggle based on a misleading initial display.

## Proof

Dataflow trace: imported `props.enabled = "false"` → `renderPropField` boolean branch → `checked={Boolean("false")}` → `true` → switch ON; no `onChange` until user interaction → string `"false"` remains in stored JSON.

## Counterevidence Checked

In-editor toggles write real booleans via `onCheckedChange`. The issue is read-path coercion only, reachable whenever non-boolean JSON shapes enter props without passing through typed creation flows.

## Suggested Next Step

Normalize boolean props on read (for example treat `"false"`, `"0"`, and `""` as false; `"true"` and `"1"` as true) or reject non-boolean stored values before rendering the switch.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. The boolean prop switch now uses `normalizeBooleanValue(value)` instead of `Boolean(value)`. For string values it lower-cases/trims and treats `""`, `"false"`, and `"0"` as logical false (everything else truthy); non-string values keep `Boolean()` semantics. So migrated props like `{ enabled: "false" }` render the switch OFF. Toggling still writes a real boolean via `onCheckedChange`. Typecheck and build pass. (UI read-path; verified via typecheck/build.)

DEVANA-KEY: src/admin.tsx:580-585 | boolean-string-false-coercion
DEVANA-SUMMARY: fixed | P2 | high | Boolean prop switch now uses normalizeBooleanValue, so stored string sentinels "false"/"0"/"" render as off instead of on.