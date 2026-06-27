import type { BlockBuilderBlock, BlockBuilderValue } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Coerce a stored `hidden` flag to a boolean. Migrated JSON often carries string
// sentinels ("true"/"false"/"yes"/"1"/...); keeping only real booleans dropped
// those to undefined, silently rendering hidden blocks as visible (and a raw
// `!block.hidden` check treats the truthy string "false" as hidden).
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

export function isBlockBuilderBlock(value: unknown): value is BlockBuilderBlock {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    isRecord((value as { props?: unknown }).props)
  );
}

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

export function normalizeBlocks(blocks?: BlockBuilderValue | null): BlockBuilderValue {
  // Drop null/primitive/array slots so sparse or corrupted arrays do not
  // render phantom empty text blocks.
  return Array.isArray(blocks)
    ? blocks.filter(isRecord).map((block, index) => normalizeBlock(block, index))
    : [];
}

export function visibleBlocks(blocks?: BlockBuilderValue | null): BlockBuilderValue {
  return normalizeBlocks(blocks).filter((block) => !block.hidden);
}

export function blockProps(block: BlockBuilderBlock): Record<string, unknown> {
  return block.props && typeof block.props === "object" && !Array.isArray(block.props)
    ? block.props
    : {};
}
