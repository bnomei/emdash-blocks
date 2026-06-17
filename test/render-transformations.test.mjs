import assert from "node:assert/strict";
import test from "node:test";
import {
  blockProps,
  defaultBlockDefinitions,
  defaultPropsForDefinition,
  isBlockBuilderBlock,
  normalizeBlock,
  normalizeBlocks,
  visibleBlocks,
} from "../dist/index.mjs";

test("normalizes malformed blocks with stable fallback values", () => {
  assert.deepEqual(
    normalizeBlock(
      {
        id: "",
        type: "",
        hidden: "yes",
        props: ["not", "a", "record"],
      },
      2,
    ),
    {
      id: "block-3",
      type: "text",
      hidden: undefined,
      props: {},
    },
  );

  assert.deepEqual(normalizeBlocks(null), []);
  assert.deepEqual(normalizeBlocks(undefined), []);
});

test("preserves valid block data and filters only hidden blocks", () => {
  const heroProps = { title: "Visible" };
  const blocks = [
    { id: "hidden", type: "hero", hidden: true, props: { title: "Hidden" } },
    { id: "shown", type: "hero", hidden: false, props: heroProps },
    { id: "implicit", type: "text", props: { text: "Shown by default" } },
  ];

  assert.deepEqual(normalizeBlocks(blocks), [
    { id: "hidden", type: "hero", hidden: true, props: { title: "Hidden" } },
    { id: "shown", type: "hero", hidden: false, props: heroProps },
    { id: "implicit", type: "text", hidden: undefined, props: { text: "Shown by default" } },
  ]);
  assert.deepEqual(visibleBlocks(blocks), [
    { id: "shown", type: "hero", hidden: false, props: heroProps },
    { id: "implicit", type: "text", hidden: undefined, props: { text: "Shown by default" } },
  ]);
});

test("identifies renderable block records and normalizes props access", () => {
  assert.equal(isBlockBuilderBlock({ type: "quote", props: { text: "Hello" } }), true);
  assert.equal(isBlockBuilderBlock({ type: "quote", props: [] }), false);
  assert.equal(isBlockBuilderBlock({ props: { text: "Hello" } }), false);
  assert.deepEqual(blockProps({ id: "a", type: "image", props: { alt: "Alt text" } }), {
    alt: "Alt text",
  });
  assert.deepEqual(blockProps({ id: "b", type: "image", props: [] }), {});
});

test("builds default props from block definitions without inventing missing values", () => {
  const heading = defaultBlockDefinitions.find((definition) => definition.type === "heading");
  const image = defaultBlockDefinitions.find((definition) => definition.type === "image");
  const divider = defaultBlockDefinitions.find((definition) => definition.type === "divider");

  assert.deepEqual(defaultPropsForDefinition(heading), { text: "", level: "h2" });
  assert.deepEqual(defaultPropsForDefinition(image), {});
  assert.deepEqual(defaultPropsForDefinition(divider), { height: 1 });
  assert.deepEqual(
    defaultPropsForDefinition({
      type: "custom",
      props: [
        { key: "enabled", label: "Enabled", type: "boolean", defaultValue: false },
        { key: "count", label: "Count", type: "integer", defaultValue: 0 },
        { key: "missing", label: "Missing", type: "text" },
      ],
    }),
    { enabled: false, count: 0 },
  );
});
