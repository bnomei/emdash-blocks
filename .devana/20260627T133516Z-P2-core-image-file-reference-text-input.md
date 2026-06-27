DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | medium | security=no
DEVANA-KEY: src/admin.tsx:559-730 | core-image-file-reference-text-input

# Core field types `image` / `file` / `reference` render as a plain text input and persist a raw string

## Finding

`renderPropField` has no branch for the core field types `image`, `file`, or `reference`. A prop declared with one of these types falls through to the default `<Input>` (`src/admin.tsx:708-729`), and `inputType` (`:264-270`) returns `"text"` for them, so the editor shows a free-text box and `onChange(event.currentTarget.value)` persists a raw string instead of a media/reference object.

## Violated Invariant Or Contract

`emdashCorePropFieldTypes` (`src/schema.ts:3-20`) is the package's exported, authoritative list of core prop field types a host may declare, and it includes `"image"`, `"file"`, and `"reference"`. `renderPropField` is expected to render an editor appropriate to each declared core type. The only media-aware branch (`src/admin.tsx:694-706`) matches `"media"`/`"media-list"` — neither appears in the core list — and there is no `reference` branch at all.

## Oracle

Contract mismatch between two source artifacts: the exported core-type list (`schema.ts:3-20`, `types.ts:5-21`) declares `image`/`file`/`reference` as supported, while the renderer (`admin.tsx:559-730`) handles only `media`/`media-list` for media and has no reference editor. A field declared `image` should produce a media picker and store a media object, not a text string.

## Counterexample

A host configures a block definition with:

```ts
{ key: "photo", label: "Photo", type: "image" }   // valid per emdashCorePropFieldTypes
```

`type = field.type ?? "text"` = `"image"`. It matches none of the branches (boolean, select, multiSelect, text/markdown/textarea, portableText/writer, json/repeater, media/media-list), so it reaches the default `<Input>` at `:708-729`; `inputType` returns `"text"`. The editor renders a plain text box and stores whatever string the user types. Same outcome for `type: "file"` and `type: "reference"`.

## Why It Might Matter

Any host wiring its CMS media/reference fields through the documented core types `image`/`file`/`reference` (rather than the bundled-default alias `media`) gets a broken editor: no picker, and a string persisted where a media/reference object is expected. Downstream consumers that read `props.photo` as a media object will mishandle a bare string.

## Proof

Control-flow trace through `renderPropField` (`admin.tsx:567` `type = field.type ?? "text"`): for `type === "image"` no branch matches at lines 573 (boolean), 591 (select), 610 (multiSelect), 656 (text/markdown/textarea), 675 (portableText/writer), 688 (json/repeater), 694 (media/media-list) → default `<Input>` (708-729) with `inputType` (264-270) yielding `"text"`. Contract mismatch vs `emdashCorePropFieldTypes` (`schema.ts:3-20`).

## Counterevidence Checked

- The bundled `defaultBlockDefinitions` (`schema.ts:43-59`) deliberately use `type: "media"` for image/quote props, never `"image"`/`"file"`/`"reference"`. If every host normalizes its field types to `"media"`/`"media-list"` before handing definitions to the widget, the broken branch is unreachable.
- Why that does not save it: `emdashCorePropFieldTypes` is publicly exported (`src/index.ts:37-41`) as the authoritative core-type list, and the bundled defaults provide no example for `file`/`reference`/`image`-as-core, so a host wiring those declared core types straight through is an expected, supported path. `datetime`/`url`/`color`/`slug` are handled correctly by `inputType`, which makes the missing `image`/`file`/`reference` handling look like an omission rather than an intentional exclusion.
- Strongest reason this might be false: the package may intend `image`/`file` to be host-mapped to `media` and `reference` to be host-rendered, leaving the widget presentation-only for those. That intent is not encoded anywhere in the exported types or renderer, so the mismatch stands as actionable.

## Suggested Next Step

Either route `image`/`file` to `MediaPropField` (and add a `reference` editor) in `renderPropField`, or remove `image`/`file`/`reference` from the exported `emdashCorePropFieldTypes` if hosts are expected to map them first. Confirm a definition with `type: "image"` renders a picker (or that the type is no longer advertised).

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` status/priority/confidence prefix. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Keep `DEVANA-KEY:` stable unless the same finding moved. Add dated notes below with evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed (renderer path of the report's first option). `renderPropField` now routes the exported core types `image` and `file` to `MediaPropField` (single-select, alongside the bundled `media`/`media-list` aliases) so they render a media picker and store a media object, and routes `reference` to the JSON-like structured editor (a reference is an id/object, not free text). None fall through to the plain `<Input>` anymore. Added a render test asserting `image` and `file` fields produce the media picker ("No media") rather than a text box. Typecheck/build and i18n suite pass.

  Scope note: `MediaPropField` queries the media API with `mimeType=image/`, so `file` currently surfaces image assets; broadening the picker's mime filter per field type is a reasonable follow-up. A first-class `reference` picker (entity selection) would need a reference-target/API the widget doesn't have, so the JSON editor is the structured-but-honest interim; the alternative (dropping these from `emdashCorePropFieldTypes`) was not chosen since the list is the public core-type contract.

DEVANA-KEY: src/admin.tsx:559-730 | core-image-file-reference-text-input
DEVANA-SUMMARY: fixed | P2 | medium | renderPropField now routes core image/file to MediaPropField and reference to the JSON editor, so they store media/structured objects instead of a raw string from a fallthrough text input. Render test added.
