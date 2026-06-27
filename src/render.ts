/**
 * Runtime normalization and visibility filtering for stored block-list JSON.
 *
 * Used by frontend render paths to coerce migrated or partial payloads into stable
 * block records and to drop `hidden` blocks from published output.
 */
import type { BlockBuilderBlock, BlockBuilderValue } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Coerces stored `hidden` values, including migration string sentinels, to boolean. */
export function normalizeHidden(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "") return undefined;
    return (
      normalized !== "false" &&
      normalized !== "0" &&
      normalized !== "no" &&
      normalized !== "off"
    );
  }
  return undefined;
}

/** Type guard for a block record with a string `type` and object `props`. */
export function isBlockBuilderBlock(value: unknown): value is BlockBuilderBlock {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    isRecord((value as { props?: unknown }).props)
  );
}

/** Fills missing id, type, and props on one block without dropping unknown fields. */
export function normalizeBlock(value: BlockBuilderBlock, index = 0): BlockBuilderBlock {
  const record: Record<string, unknown> = isRecord(value) ? value : {};
  const props = isRecord(record.props) ? record.props : {};

  return {
    id: typeof record.id === "string" && record.id ? record.id : `block-${index + 1}`,
    type: typeof record.type === "string" && record.type ? record.type : "text",
    hidden: normalizeHidden(record.hidden),
    props,
  };
}

/** Normalizes an array of blocks; non-arrays and non-record slots become `[]`. */
export function normalizeBlocks(blocks?: BlockBuilderValue | null): BlockBuilderValue {
  return Array.isArray(blocks)
    ? blocks.filter(isRecord).map((block, index) => normalizeBlock(block, index))
    : [];
}

/** Returns normalized blocks with `hidden` entries removed for render output. */
export function visibleBlocks(blocks?: BlockBuilderValue | null): BlockBuilderValue {
  return normalizeBlocks(blocks).filter((block) => !block.hidden);
}

/** Reads a block's props object, defaulting to `{}` when missing or non-object. */
export function blockProps(block: BlockBuilderBlock): Record<string, unknown> {
  return block.props && typeof block.props === "object" && !Array.isArray(block.props)
    ? block.props
    : {};
}
