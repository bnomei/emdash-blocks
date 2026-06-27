import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BlocksField } from "../dist/admin.mjs";
import {
  blockMessage,
  formatBlockMessage,
  localeFallbacks,
  localizedString,
} from "../dist/index.mjs";

test("block messages follow the EmDash-style fallback chain", () => {
  const i18n = {
    locale: "fr-CA",
    defaultLocale: "en",
    locales: ["en", "fr", "fr-CA"],
    fallback: { "fr-CA": "fr", fr: "en" },
    messages: {
      fr: { addBlock: "Ajouter un bloc" },
      en: { invalidJson: "Bad JSON: {error}" },
    },
  };

  assert.deepEqual(localeFallbacks(i18n), ["fr-CA", "fr", "en"]);
  assert.equal(blockMessage("addBlock", i18n), "Ajouter un bloc");
  assert.equal(formatBlockMessage("invalidJson", i18n, { error: "nope" }), "Bad JSON: nope");
  assert.equal(localizedString({ en: "Title", fr: "Titre" }, i18n), "Titre");
});

test("block message override on a later fallback locale is not shadowed by the en default", () => {
  // Chain routes through "en" (which has no override) before "brand" (which
  // does). The built-in English default must not short-circuit the lookup.
  const i18n = {
    locale: "en",
    defaultLocale: "en",
    fallback: { en: "brand" },
    messages: { brand: { addBlock: "Block hinzufügen" } },
  };

  assert.deepEqual(localeFallbacks(i18n), ["en", "brand"]);
  assert.equal(blockMessage("addBlock", i18n), "Block hinzufügen");
  // A key with no override anywhere still resolves to the built-in default.
  assert.equal(blockMessage("removeBlock", i18n), "Remove block");
});

test("blocks field renders localized schema and editor chrome", () => {
  const html = renderToStaticMarkup(
    React.createElement(BlocksField, {
      value: [{ id: "block-one", type: "note", props: { title: "Hallo" } }],
      onChange() {},
      options: {
        blockDefinitions: [
          {
            type: "note",
            label: { en: "Note", de: "Notiz" },
            props: [
              {
                key: "title",
                label: { en: "Title", de: "Titel" },
                helpText: { en: "Shown publicly", de: "Wird oeffentlich angezeigt" },
              },
            ],
          },
        ],
        i18n: {
          locale: "de",
          defaultLocale: "en",
          locales: ["en", "de"],
          fallback: { de: "en" },
          messages: {
            de: {
              addBlock: "Block hinzufuegen",
              hideBlock: "Block ausblenden",
              removeBlock: "Block entfernen",
            },
          },
        },
      },
    }),
  );

  assert.match(html, /Titel/);
  assert.match(html, /Wird oeffentlich angezeigt/);
  assert.match(html, /Block hinzufuegen/);
  assert.match(html, /Block ausblenden/);
  assert.match(html, /Block entfernen/);
  assert.doesNotMatch(html, /\[object Object\]/);
});
