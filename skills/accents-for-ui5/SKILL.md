---
name: accents-for-ui5
description: Build business apps with Accents for UI5, JP Galido's open design framework on OpenUI5 1.148 (Apache-2.0) — shell, 16 page patterns and 70 elements for planning, analytics, transactional (forms, value help, drafts, attachments), reporting (filter bar, report table, export, print) and workflow (inbox, decisions, comments, audit trail, process flow), with rules for colour, motion, translation, accessibility, data and AI. Use whenever the work is in the accents-for-ui5 repository, or the person asks to build, extend, check or explain an Accents app, element or page pattern, or says "Accents", "Accents for UI5", "OpenUI5 framework", "add an element", "page pattern", "gallery entry", "check.mjs", or "audit-all". Personal and open-source work only — never for employer or client deliverables.
---

# Accents for UI5

Accents is an open design framework for business apps on **OpenUI5** (the free, Apache-2.0 edition of
SAP's UI5). It gives every app the same shell, one of sixteen page patterns, and elements from one
catalogue, with rules that keep screens honest. This skill tells you how to build with it correctly.

## Boundary: which work this is for

- **Use Accents for personal, open-source or JP-owned work.** It is JP Galido's own IP, written by a
  clean-room method (see `PROVENANCE.md`).
- **Never use it for an employer's or a client's deliverables**, and never copy anything from other
  design skills or employer material into Accents. Keeping the two apart is what the provenance record
  depends on.
- If it is unclear which side the work is on, ask before choosing.

## Where the files are

Paths below are relative to the Accents root: the repository root, or `${CLAUDE_PLUGIN_ROOT}` when
Accents is installed as a plugin. That is two folders above this skill.

## Start here, every time

1. If the Accents MCP server is connected (tools named `accents_*`), call `accents_overview` first,
   then `accents_list` and `accents_get <key>` for every entry you will use. The repository's
   `.mcp.json` registers it; it needs Node 22.
2. Otherwise read, in this order: `README.md`, `docs/principles.md`, `docs/building-elements.md`
   (the contract and the 21 rules), `docs/page-patterns.md`, and `docs/traps.md`.
3. Measure before designing: the target's UI5 version, theme and libraries. Accents is pinned to
   OpenUI5 1.148.9.

## How a screen is built

1. **Shell first** (`accents/shell/Shell`): top bar, side panel, user menu, settings, customisable home.
   Theme and language are applied before the first paint by `accents/boot.js`.
2. **One page pattern per screen** (`src/accents/patterns/`). A screen that needs two is two screens.
3. **Compose elements** (`src/accents/elements/<group>/`). Every element: `create(options)` returns a
   part with `part.root`, `part.update(data)` and `part.state("ready"|"loading"|"empty"|"error")`.
4. **Data** through `accents/core/Data` (sample) or `accents/core/OData` (OData V4 / CAP), keeping
   live and sample honest in the source line.
5. **Check** with `node tools/lint.mjs` and `node tools/check.mjs <key> <width> <theme>`.

## Rules that get work rejected

- **Only OpenUI5 libraries:** `sap.m`, `sap.f`, `sap.tnt`, `sap.ui.layout`, `sap.uxap`, `sap.ui.table`,
  `sap.ui.unified`. Never the paid `sap.viz`, `sap.suite.*`, `sap.ui.comp`, `sap.gantt` or
  `sap.ui.export`. Charts go through `accents/core/Chart` (Apache ECharts).
- **Colour** comes from the theme (`accents/core/Tokens`), never literal values. Colour the fact, not
  the container; colour is never the only signal. Plan and forecast are hatched or dashed; a target is
  a marker.
- **Words:** every visible word comes from a translation file via `accents/core/I18n` (never import it
  as `Text`). Labels are short nouns; counts go in brackets, "Open (3)"; no "More", "Details",
  "Insights".
- **Messages** go through `accents/core/Messages`; never show a technical reason.
- **Anything that deletes, sends, submits or cannot be undone** goes through
  `elements/transactional/ConfirmAction`; if it can be undone, act and offer undo instead.
- **Accessible:** every input labelled, every icon-only button named, everything reachable by keyboard.
- **Nothing inert, no typed figures:** every button works; every number comes from data.
- **Motion** only through `accents/core/Motion`, only when data changes; reduced motion switches it off.
- **AI:** the assistant is off until a model is chosen; bring your own key; object AI buttons only on
  things a person acts on; model output is always labelled.

## Checking before anyone sees it

- Serve: `python3 tools/serve.py` then open `http://127.0.0.1:8811/gallery/index.html`.
- One entry: `node tools/check.mjs <key> 1440 sap_horizon --replay` (also 390 and 1920, dark and
  high-contrast themes, `--lang=de` / `--lang=ar`). It must print `"ok": true`: no console errors,
  charts drawn, cards aligned, nothing wider than the page, no missing text, no serious accessibility
  findings (axe-core).
- Everything: `node tools/audit-all.mjs`.
- Rules a script can check: `node tools/lint.mjs` (or `node tools/lint.mjs <app-folder>`).
- New surprises from UI5 or a library go into `docs/traps.md`.

## Adding to Accents

A new element or pattern is added to `src/accents/registry.js` first, follows
`docs/building-elements.md`, owns its translation file, and passes the checks above before commit.
