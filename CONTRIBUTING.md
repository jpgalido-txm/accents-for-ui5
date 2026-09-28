# Contributing

Thank you for helping. Three things keep Accents usable and legally clean.

## 1. Only your own work

- Write your contribution yourself. Do not copy text, code, screenshots or icons from SAP's design
  guidelines, SAPUI5's paid libraries, another design system, or your employer's or client's material.
- Ideas are welcome; their expression must be yours. If you are unsure, ask in an issue first.
- By opening a pull request you confirm the work is yours to give under the Apache License 2.0.

## 2. The contract and the rules

Read [docs/building-elements.md](docs/building-elements.md). Every element follows one contract and
21 rules: OpenUI5 libraries only, colours from the theme, every word from a translation file, messages in
one list, a confirmation for anything that cannot be undone, and accessible by construction.

## 3. Checked before review

```bash
python3 tools/serve.py &
node tools/lint.mjs
node tools/check.mjs <entry-key> 1440 sap_horizon --replay
node tools/check.mjs <entry-key> 390 sap_horizon_dark
node mcp/test.mjs
```

Each must pass. The Checks workflow runs the same on every pull request. When UI5 or a library surprises
you, add the symptom and the fix to [docs/traps.md](docs/traps.md).

## Translations

English is the base text. Add a language by placing `i18n_<code>.properties` next to an
`i18n.properties` file and declaring it in `src/accents/core/I18n.js`. Write apostrophes twice (`''`).
