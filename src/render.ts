import type { BlockBuilderBlock, BlockBuilderValue } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
    hidden: typeof record.hidden === "boolean" ? record.hidden : undefined,
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
