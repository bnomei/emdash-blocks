DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/admin.tsx:272-276,718-724 | Slug: number-negative-entry-blocked

# Number and integer fields clear input while typing a leading minus sign

## Finding

Numeric prop fields are controlled inputs that call `normalizeNumber` on every `onChange`. A lone `-` parses to `NaN`, which becomes `undefined`, and the input `value` resets to `""`, preventing keystroke-by-keystroke entry of negative numbers.

## Violated Invariant Or Contract

Users must be able to compose valid negative numeric values (for example `-5` on an integer `height` field) through normal typing without the field clearing mid-entry.

## Oracle

HTML number inputs accept intermediate `-` drafts; `normalizeNumber` is only used on live `onChange`, not on blur.

## Counterexample

1. Integer prop `height` is empty.
2. User types `-`.
3. `normalizeNumber("-", true)` → `Number.parseInt("-", 10)` is `NaN` → returns `undefined`.
4. `onChange(undefined)` → `stringValue` becomes `""` → input clears before the user can type the digits.

## Why It Might Matter

Divider and custom integer/number props that allow negatives (or zero-bound negatives) cannot be entered interactively; paste of `"-5"` still works but keyboard entry fails.

## Proof

**Counterexample value:** partial input `"-"` on an integer field.

**Dataflow trace:** keystroke `-` → `normalizeNumber` → `undefined` → controlled `value=""` → input reset.

**Control-flow trace:** `Number.isFinite` guard rejects `NaN`; no draft-state path preserves partial numeric strings.

## Counterevidence Checked

- Fully formed negatives like `"-5"` parse and commit correctly.
- Empty string intentionally maps to `undefined`.
- `step={1}` on integer fields does not mitigate the `-`-only failure.

## Suggested Next Step

Defer parsing until blur, or keep a local draft string while the value is a valid numeric prefix (`-`, `-0`, `1.`).

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Extracted number/integer inputs into a `NumberPropField` component holding a local `draft` string. On change it always updates the draft but only commits via `onChange` when the input is empty (→ undefined) or parses to a finite number; intermediate prefixes like `-`, `-0`, `1.` stay in the draft without wiping the value. The draft resyncs from the external value only when `normalizeNumber(draft) !== value`, so it preserves in-progress formatting yet follows genuine external updates. Typecheck and build pass. (UI-only path; covered by typecheck/build, no node test harness for React inputs.)

DEVANA-KEY: src/admin.tsx:272-276,718-724 | P2 | number-negative-entry-blocked
DEVANA-SUMMARY: Status=fixed | P2 high src/admin.tsx:272-276,718-724 - Numeric fields now use a NumberPropField with a local draft string, so a lone minus or trailing dot is preserved while typing instead of clearing the input.