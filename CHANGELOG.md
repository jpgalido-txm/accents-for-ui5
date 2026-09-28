# Changelog

## 0.1.0

First public release.

- **Shell:** top bar, side panel, user menu, settings (theme, density, language, assistant),
  customisable home, theme and language applied before the first paint.
- **16 page patterns:** scoreboard landing, review board, planning desk, run and rank, exception
  triage, item register, lifecycle object, cause map, glance dialog, editable object, create wizard,
  quick entry, analytical list, report page, approval inbox, case workspace.
- **70 elements** in eleven groups: planning, simulation, forecasting, monitoring, review,
  optimisation, collaboration, common, transactional, reporting and workflow.
- **Foundations:** every word from translation files (German and Arabic for the shell,
  machine-drafted, pending native review); right-to-left pages; one message list; an OData V4 / CAP
  data adapter; a confirmation for anything that cannot be undone.
- **Assistant:** off until a model is chosen; bring your own key for Anthropic Claude, OpenAI, Google
  Gemini or your own model; answers always labelled as model output.
- **Checks:** render-and-audit in headless Chrome with axe-core accessibility, a rule checker, and an
  audit of every entry at three widths, three themes and two extra languages.
- **For AI assistants:** an MCP server (seven tools), a Claude Code plugin and marketplace, and a
  skill package for claude.ai.
- Built only on OpenUI5 1.148.9 and Apache ECharts; none of SAP's paid libraries.
