/**
 * Domain types for the block-list field: block records, prop schemas, and widget options.
 *
 * A stored value is a JSON array of blocks (`BlockBuilderValue`). Each block carries a
 * `type`, optional `hidden` visibility flag, and a props object shaped by
 * `BlockBuilderDefinition`.
 */
import type { BlocksI18nConfig, LocalizedString } from "./i18n";

export type BlockBuilderProps = Record<string, unknown>;

export type BlockBuilderCoreFieldType =
  | "string"
  | "text"
  | "url"
  | "number"
  | "integer"
  | "boolean"
  | "datetime"
  | "select"
  | "multiSelect"
  | "portableText"
  | "image"
  | "file"
  | "reference"
  | "json"
  | "slug"
  | "repeater";

export type BlockBuilderPropFieldType =
  | BlockBuilderCoreFieldType
  | "writer"
  | "markdown"
  | "textarea"
  | "color"
  | "media"
  | "media-list";

export type BlockBuilderPropChoice = {
  value: string;
  label?: LocalizedString;
};

export type BlockBuilderPropField = {
  key: string;
  label: LocalizedString;
  type?: BlockBuilderPropFieldType;
  required?: boolean;
  placeholder?: LocalizedString;
  helpText?: LocalizedString;
  options?: BlockBuilderPropChoice[] | string[];
  fields?: BlockBuilderPropField[];
  defaultValue?: unknown;
};

export type BlockBuilderDefinition = {
  type: string;
  label?: LocalizedString;
  props?: BlockBuilderPropField[];
};

/** One entry in a stored block list. */
export type BlockBuilderBlock = {
  id: string;
  type: string;
  hidden?: boolean;
  props: BlockBuilderProps;
};

/** Stored JSON payload for the blocks field — an ordered block list. */
export type BlockBuilderValue = BlockBuilderBlock[];

/** Admin widget configuration: block type catalog and i18n. */
export type BlockBuilderOptions = {
  blockTypes?: BlockBuilderDefinition[];
  blockDefinitions?: BlockBuilderDefinition[];
  helpText?: LocalizedString;
  i18n?: BlocksI18nConfig;
};
