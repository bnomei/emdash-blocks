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

export type BlockBuilderBlock = {
  id: string;
  type: string;
  hidden?: boolean;
  props: BlockBuilderProps;
};

export type BlockBuilderValue = BlockBuilderBlock[];

export type BlockBuilderOptions = {
  blockTypes?: BlockBuilderDefinition[];
  blockDefinitions?: BlockBuilderDefinition[];
  helpText?: LocalizedString;
  i18n?: BlocksI18nConfig;
};
