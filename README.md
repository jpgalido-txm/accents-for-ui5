# Accents for UI5

An open design framework for business applications built on [OpenUI5](https://openui5.org).

Accents gives every app the same shell, the same page patterns and the same building blocks. It also
gives them rules for colour, motion, data and AI that keep screens honest: every figure has a source,
every colour means something, and model output is always labelled as model output.

> **Status: 0.1.0, the first release.** Built on OpenUI5 1.148.9. See [CHANGELOG.md](CHANGELOG.md) for what is in
> it and [PROVENANCE.md](PROVENANCE.md) for how it was written.

## What is in it

| Part | What it is | Where |
|---|---|---|
| Principles | Twenty rules every screen follows | [docs/principles.md](docs/principles.md) |
| Shell | Top bar, left panel, user menu, settings, customizable home, theme before first paint | [docs/shell.md](docs/shell.md), `src/accents/shell/` |
| Assistant | Page-aware assistant and per-object AI buttons, off until a model is chosen, bring your own key | [docs/ai.md](docs/ai.md), `src/accents/ai/` |
| Page patterns | Sixteen layouts, from scoreboard landing to approval inbox | [docs/page-patterns.md](docs/page-patterns.md), `src/accents/patterns/` |
| Planning rules | Versions, simulate/save/discard, density, alerts and missing data | [docs/planning.md](docs/planning.md) |
| Elements | 70 building blocks: planning, simulation, forecasting, monitoring, review, optimisation, collaboration, transactional (forms, value help, drafts, attachments), reporting (filter bar, report table, export, print) and workflow (inbox, decisions, comments, audit trail, process flow) | `src/accents/elements/` |
| Foundations | Translation files for every word (German and Arabic for the shell), right-to-left pages, one message list, an OData V4 / CAP data adapter, and a confirmation for anything that cannot be undone | `src/accents/core/` |
| Colour, charts and motion | What each colour means, which chart answers which question, and the two kinds of motion | [docs/colour-and-motion.md](docs/colour-and-motion.md) |
| Gallery | A live catalogue of every entry, in every state | `gallery/` |
| Audit | Headless render-and-audit for one entry or all of them, and a rule checker | `tools/check.mjs`, `tools/audit-all.mjs`, `tools/lint.mjs` |
| MCP server | Lets AI coding assistants find entries, read their options and examples, start an app and check it | [mcp/README.md](mcp/README.md) |

## Use it with Claude

Accents ships as a Claude Code plugin with a skill and an MCP server, so Claude builds with its rules:

```bash
claude plugin marketplace add jpgalido-txm/accents-for-ui5
claude plugin install accents-for-ui5@accents-for-ui5
```

For claude.ai, download `accents-for-ui5-skill.zip` from the latest release and upload it under
Settings → Capabilities → Skills.

## Try the gallery

```bash
python3 tools/serve.py
```

Then open http://127.0.0.1:8811/gallery/index.html. Add `?motion=reduced` to switch motion off, or
`?theme=sap_horizon_dark` to open in the dark theme.

## Use it in an app

1. Copy `src/accents/` into your app, or serve it next to it.
2. In `<head>`, load `accents/boot.js` and `accents/accents.css` before the UI5 bootstrap. Leave the
   theme attribute off the bootstrap tag.
3. Add `"accents": "<path>/accents/"` to `data-sap-ui-resource-roots`.
4. Start from the shell (see [docs/shell.md](docs/shell.md)), pick a page pattern, and compose
   elements.

Accents needs only the libraries that ship with OpenUI5: `sap.m`, `sap.f`, `sap.tnt`, `sap.ui.layout`,
`sap.uxap`, `sap.ui.table` and `sap.ui.unified`. It never uses SAP's paid libraries (`sap.viz`,
`sap.suite.*`, `sap.ui.comp`, `sap.gantt`, `sap.ui.export`). Charts use Apache ECharts, which is loaded on first use.

## Adding to it

Read [docs/building-elements.md](docs/building-elements.md). Every element follows one contract and
twenty-one rules, and must pass `node tools/check.mjs <key>` before it is merged.

## What leaves your computer

Accents collects no data. Pages load OpenUI5 (sdk.openui5.org) and Apache ECharts (cdn.jsdelivr.net);
the check tool also loads axe-core (cdn.jsdelivr.net). The assistant sends questions only to the model
provider you choose in Settings. The Claude plugin's MCP server runs on your computer and sends nothing
to anyone. Details: [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Licence

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). The Inter font is under the SIL Open
Font Licence 1.1.

SAP, SAP Fiori and SAPUI5 are trademarks or registered trademarks of SAP SE or its affiliates in Germany
and in other countries. Accents is an independent project, not affiliated with or endorsed by SAP. It is
built on OpenUI5, which is licensed under the Apache License 2.0.
