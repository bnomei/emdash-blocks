import { definePlugin, type PluginDescriptor } from "emdash";

export type {
  BlockBuilderBlock,
  BlockBuilderCoreFieldType,
  BlockBuilderDefinition,
  BlockBuilderOptions,
  BlockBuilderPropChoice,
  BlockBuilderPropField,
  BlockBuilderPropFieldType,
  BlockBuilderProps,
  BlockBuilderValue,
} from "./types";
export { isSafeLinkHref, safeLinkHref } from "./linkProtocols";
export {
  blockProps,
  isBlockBuilderBlock,
  normalizeBlock,
  normalizeBlocks,
  visibleBlocks,
} from "./render";
export {
  defaultBlockDefinitions,
  defaultPropsForDefinition,
  emdashCorePropFieldTypes,
} from "./schema";

export type BlockBuilderDescriptorOptions = {
  entrypoint?: string;
  adminEntry?: string;
};

const PLUGIN_ID = "block-builder";
const PLUGIN_VERSION = "0.1.0";
const PACKAGE_NAME = "@bnomei/emdash-blocks";

export function blockBuilderPlugin(options: BlockBuilderDescriptorOptions = {}): PluginDescriptor {
  const entrypoint = options.entrypoint ?? PACKAGE_NAME;
  const adminEntry = options.adminEntry ?? `${entrypoint}/admin`;

  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    format: "native",
    entrypoint,
    adminEntry,
    options: { adminEntry },
  };
}

export function createPlugin(options: Pick<BlockBuilderDescriptorOptions, "adminEntry"> = {}) {
  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    admin: {
      entry: options.adminEntry ?? `${PACKAGE_NAME}/admin`,
      fieldWidgets: [{ name: "blocks", label: "Blocks", fieldTypes: ["json"] }],
    },
  });
}

export default blockBuilderPlugin;
