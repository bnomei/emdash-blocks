DEVANA-FINDING: v1
Priority: P1 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/admin.tsx:825-838 | Slug: raw-props-stale-overwrite

# Uncontrolled raw-props textarea can restore stale JSON after a block type change

## Finding

When a block definition has no `props` schema (`definition?.props` is falsy), the props editor uses an uncontrolled `<Textarea defaultValue={JSON.stringify(props)}>` and commits `event.currentTarget.value` on blur. `defaultValue` is applied only at mount. After `blockWithType` replaces `props` in parent state, the textarea DOM can still show the previous JSON; blurring commits that stale text back through `onChange`.

## Violated Invariant Or Contract

Changing block `type` via `blockWithType` must replace `props` with `defaultPropsForDefinition(nextDefinition)` and keep the editor display aligned with the new props until the user edits again.

## Oracle

`blockWithType` test in `test/admin-transformations.test.mjs` expects props replacement for typed definitions; `JsonLikePropField` resyncs via controlled `value` and `valueKey` effect.

## Counterexample

1. Block `id: "b1"`, type `"legacy-a"` (extra/unknown type, `props: undefined`), props `{ "title": "Old" }`.
2. User changes type to `"legacy-b"` (also unknown, `props: undefined`).
3. `blockWithType` sets `props: {}` in parent state.
4. Textarea still displays `{"title":"Old"}` because `block.id` is unchanged and `defaultValue` does not update.
5. User blurs without editing → `parseProps` succeeds → `onChange({ title: "Old" })` overwrites the reset.

## Why It Might Matter

Unknown/migrated block types use the raw JSON fallback. Type changes appear to reset props in memory, but a no-edit blur silently restores the previous type’s props into persisted JSON.

## Proof

**Counterexample value:** two unknown types in `resolveBlockDefinitions` extras with the same stable `block.id`.

**Control-flow trace:** `blockWithType` → `updateBlock` updates parent `props` → `renderPropsEditor` re-renders with new `props` prop but uncontrolled textarea ignores it → `onBlur` → `parseProps(DOM text)` → `onChange(stale)`.

**Cross-entry mismatch:** schema-driven fields use controlled inputs; raw fallback does not.

## Counterevidence Checked

- Typed definitions (`definition.props` array) use controlled per-field editors and avoid this path.
- Switching between schema and raw modes remounts different editor branches.
- `key={block.id}` is stable across type changes, preventing textarea remount.

## Suggested Next Step

Use a controlled textarea keyed by `valueKey` (as in `JsonLikePropField`) or include `block.type` in the textarea `key` to remount on type changes.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Extracted the raw-props fallback into a controlled `RawPropsField` component that mirrors `JsonLikePropField`: it tracks `draft` state and resyncs via a `useEffect` keyed on `JSON.stringify(props)`. When `blockWithType` resets `props` (e.g. on a type change), the textarea now updates to the new value, so a no-edit blur can no longer commit stale JSON. Typecheck and build pass.

DEVANA-KEY: src/admin.tsx:825-838 | P1 | raw-props-stale-overwrite
DEVANA-SUMMARY: Status=fixed | P1 high src/admin.tsx:825-838 - Raw JSON props fallback is now a controlled RawPropsField that resyncs on props change, so a type-change reset can no longer be undone by stale textarea content on blur.