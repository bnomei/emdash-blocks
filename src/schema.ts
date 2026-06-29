/**
 * Default block-type catalog and prop defaults for the block-list field.
 *
 * Ships built-in heading, text, image, quote, and divider definitions. Custom
 * `blockDefinitions` merge with and override these defaults by `type`.
 */
import type { BlockBuilderCoreFieldType, BlockBuilderDefinition, BlockBuilderProps } from "./types";

export const emdashCorePropFieldTypes: BlockBuilderCoreFieldType[] = [
  "string",
  "text",
  "url",
  "number",
  "integer",
  "boolean",
  "datetime",
  "select",
  "multiSelect",
  "portableText",
  "image",
  "file",
  "reference",
  "json",
  "slug",
  "repeater",
];

export const defaultBlockDefinitions: BlockBuilderDefinition[] = [
  {
    type: "heading",
    label: "Heading",
    props: [
      { key: "text", label: "Text", type: "text", defaultValue: "" },
      {
        key: "level",
        label: "Level",
        type: "select",
        defaultValue: "h2",
        options: ["h1", "h2", "h3", "h4"],
      },
    ],
  },
  {
    type: "text",
    label: "Text",
    props: [{ key: "text", label: "Text", type: "portableText", defaultValue: [] }],
  },
  {
    type: "image",
    label: "Image",
    props: [
      { key: "image", label: "Image", type: "media" },
      { key: "alt", label: "Alt text", type: "text" },
      { key: "caption", label: "Caption", type: "portableText" },
    ],
  },
  {
    type: "quote",
    label: "Quote",
    props: [
      { key: "text", label: "Quote", type: "portableText", defaultValue: [] },
      { key: "image", label: "Image", type: "media" },
      { key: "author", label: "Author", type: "text" },
      { key: "source", label: "Source", type: "text" },
    ],
  },
  {
    type: "divider",
    label: "Divider",
    props: [{ key: "height", label: "Height", type: "integer", defaultValue: 1 }],
  },
];

/** Builds initial props from a definition's `defaultValue` fields only. */
export function defaultPropsForDefinition(definition?: BlockBuilderDefinition): BlockBuilderProps {
  const props: BlockBuilderProps = {};

  for (const field of definition?.props ?? []) {
    if (field.defaultValue !== undefined) {
      props[field.key] = field.defaultValue;
    }
  }

  return props;
}
