DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | high | security=no
DEVANA-KEY: src/admin.tsx:272-276 | number-whitespace-commits-zero

# Whitespace-only number input commits zero

## Finding

`normalizeNumber` only treats an exact empty string as clear input. For `type: "number"` fields, whitespace-only strings such as `"   "` are passed to `Number()`, which returns `0`, and that zero is persisted as the prop value.

## Violated Invariant Or Contract

Numeric prop fields should persist only finite numbers the user intentionally entered. Whitespace is not a numeric token and should not become a stored value.

## Oracle

README states numeric fields "normalize numeric values." `normalizeNumber` guards `value === ""` but does not trim. The integer branch uses `parseInt`, which returns `NaN` for whitespace-only input and correctly yields `undefined`, so the two numeric types behave inconsistently.

## Counterexample

Divider block `height` field with `type: "number"`. User pastes or programmatically submits `"   "`. `normalizeNumber("   ", false)` calls `Number("   ")`, gets `0`, `Number.isFinite(0)` is true, and `onChange(0)` persists `height: 0`. The same input on an `integer` field returns `undefined`.

## Why It Might Matter

A divider or spacing block can silently flip to zero height from accidental whitespace paste, affecting layout on the published site without any validation error.

## Proof

Dataflow trace: `onChange` handler → `normalizeNumber("   ", false)` → `Number("   ") === 0` → `onChange(0)` → prop overwritten with zero.

## Counterevidence Checked

`number-negative-entry-blocked` covers lone minus signs, not whitespace. Browser `type="number"` inputs often coerce invalid input to empty, but the helper is also reachable via paste and programmatic `onChange` paths. No test asserts whitespace-only behavior.

## Suggested Next Step

Trim input before parsing and treat whitespace-only strings the same as empty (`undefined`), for both `number` and `integer` fields.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `normalizeNumber` now trims before the empty check and parses the trimmed value, so whitespace-only input returns `undefined` (clear) for both `number` and `integer` types instead of `Number("   ")` coercing to 0. The `NumberPropField` change handler's commit guard also uses `next.trim() === ""` so a whitespace-only draft clears rather than committing. Typecheck and build pass.

DEVANA-KEY: src/admin.tsx:272-276 | number-whitespace-commits-zero
DEVANA-SUMMARY: fixed | P2 | high | normalizeNumber now trims before parsing, so whitespace-only number input clears (undefined) consistently with integer fields instead of committing 0.