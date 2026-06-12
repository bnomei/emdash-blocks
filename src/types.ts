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
  label?: string;
};

export type BlockBuilderPropField = {
  key: string;
  label: string;
  type?: BlockBuilderPropFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: BlockBuilderPropChoice[] | string[];
  fields?: BlockBuilderPropField[];
  defaultValue?: unknown;
};

export type BlockBuilderDefinition = {
  type: string;
  label?: string;
  props?: BlockBuilderPropField[];
};

export type BlockBuilderBlock = {
  id: string;
  type: string;
  hidden?: boolean;
  props: BlockBuilderProps;
};

export type BlockBuilderValue = BlockBuilderBlock[];
