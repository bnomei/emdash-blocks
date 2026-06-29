/**
 * EmDash plugin entry for the block-list field widget.
 *
 * Re-exports the runtime normalization API, schema defaults, i18n helpers, and link
 * policy used by both admin and frontend consumers. `blockBuilderPlugin` and
 * `createPlugin` register the JSON `blocks` field widget with EmDash.
 */
import { definePlugin, type PluginDescriptor } from "emdash";
import { blockMessage, type BlocksI18nConfig } from "./i18n";

export type {
  BlocksI18nConfig,
  BlocksI18nMessages,
  BlocksMessageKey,
  LocalizedString,
} from "./i18n";
export {
  DEFAULT_BLOCKS_I18N,
  DEFAULT_LOCALE,
  blockMessage,
  formatBlockMessage,
  localeFallbacks,
  localizedString,
} from "./i18n";
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

/** Options for registering the block-builder plugin with EmDash. */
export type BlockBuilderDescriptorOptions = {
  entrypoint?: string;
  adminEntry?: string;
  i18n?: BlocksI18nConfig;
};

const PLUGIN_ID = "block-builder";
const PLUGIN_VERSION = "0.2.0";
const PACKAGE_NAME = "@bnomei/emdash-blocks";

/** Returns a native-format EmDash plugin descriptor for the block-list field. */
export function blockBuilderPlugin(options: BlockBuilderDescriptorOptions = {}): PluginDescriptor {
  const entrypoint = options.entrypoint ?? PACKAGE_NAME;
  const adminEntry = options.adminEntry ?? `${entrypoint}/admin`;

  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    format: "native",
    entrypoint,
    adminEntry,
    options: { adminEntry, i18n: options.i18n },
  };
}

/** Registers the `blocks` JSON field widget with the EmDash admin runtime. */
export function createPlugin(
  options: Pick<BlockBuilderDescriptorOptions, "adminEntry" | "i18n"> = {},
) {
  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    admin: {
      entry: options.adminEntry ?? `${PACKAGE_NAME}/admin`,
      fieldWidgets: [
        { name: "blocks", label: blockMessage("blocks", options.i18n), fieldTypes: ["json"] },
      ],
    },
  });
}

export default blockBuilderPlugin;
