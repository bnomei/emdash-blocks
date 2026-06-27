DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | medium | security=no
DEVANA-KEY: src/admin.tsx:315-341 | media-library-stale-after-upload

# Media library list never refreshes after initial mount

## Finding

`MediaPropField` loads the media library once on mount (`useEffect(..., [])`) and keeps the result in local `items` state. Uploads or deletions elsewhere in the same admin session do not invalidate or refetch that list.

## Violated Invariant Or Contract

The media picker should reflect the current library catalog for the session. A read path frozen at mount time diverges from the server state after subsequent uploads.

## Oracle

`loadMedia()` runs only in the mount effect. There is no refresh hook, event listener, or cache invalidation keyed to library mutations.

## Counterexample

1. Editor opens a page with a `media` prop; `loadMedia()` populates `items` with the current catalog.
2. User uploads a new image in another admin surface without closing the blocks field.
3. User returns to the blocks field (component still mounted).
4. The dropdown still lists only the original `items` snapshot; the new upload is not selectable.

## Why It Might Matter

Editors cannot attach newly uploaded assets without remounting the field (navigate away, reload, or toggle the containing panel). Previews of already-selected media still work, so the failure mode is easy to miss.

## Proof

Read/write sequence: mount fetch → `setItems(catalog₀)` → server catalog becomes catalog₁ → picker still reads catalog₀ from component state.

## Counterevidence Checked

Selected values merge from props into `allItems`, so persisted selections remain previewable. This report is about stale picker options, not `empty-media-identity-collision` or `media-storagekey-traversal`.

## Suggested Next Step

Refetch on window focus, expose a manual refresh control, or subscribe to EmDash media mutation events if available.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `MediaPropField` now also refetches the media library on window `focus` (the first option the report suggests): the mount effect registers a `focus` listener that re-invokes `loadMedia`, and the cleanup removes it (and aborts the controller). So an asset uploaded in another admin surface becomes selectable when the editor returns to the blocks window, without remounting the field. `addEventListener`/`removeEventListener` are optional-chained for non-DOM environments. Typecheck/build and i18n render test pass. Note: window `focus` covers tab/window switches; if a future EmDash media-mutation event becomes available, subscribing to it would also catch same-window uploads.

DEVANA-KEY: src/admin.tsx:315-341 | media-library-stale-after-upload
DEVANA-SUMMARY: fixed | P2 | medium | MediaPropField refetches the library on window focus so session uploads appear in the picker without remounting.