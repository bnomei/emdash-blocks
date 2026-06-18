# Changelog

All notable changes to this package will be documented in this file.

This project follows semantic versioning.

## 0.2.0 - 2026-06-18

- Added EmDash-shaped `i18n` options with `locale`, `defaultLocale`,
  `locales`, `fallback`, and `messages` for block editor copy.
- Added localized string support for block definitions, prop labels, choice
  labels, placeholders, help text, and editor toolbar/menu labels.
- Exported the default block i18n catalog, message keys, and resolver helpers.

## 0.1.1 - 2026-06-18

- Added editor command adapter and block transformation test coverage.
- Preserved invalid JSON drafts until they are corrected.
- Validated portable text link protocols and rejected backslash protocol-relative
  links.
- Exported `BlockBuilderOptions` from the public package entry.

## 0.1.0 - 2026-06-12

- Initial public package setup for the `@bnomei/emdash-blocks` EmDash field
  widget.
- Added the `block-builder:blocks` JSON field widget.
- Added runtime helpers for normalizing, filtering, and reading block values.
