#!/usr/bin/env node
/*
 * Accents for UI5 — packages the Accents skill for claude.ai (Settings → Capabilities → Skills).
 * Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 *   node tools/package-skill.mjs        writes dist/accents-for-ui5-skill.zip
 *
 * Chat has no repository to read, so the package is self-contained:
 *   accents-for-ui5/SKILL.md            the chat version of the skill
 *   accents-for-ui5/references/*.md     the rule and pattern documents
 *   accents-for-ui5/catalogue.md        every entry: purpose, controls, options, example (read from the code)
 *   accents-for-ui5/library/accents/    the framework itself, to copy into an app
 *   accents-for-ui5/LICENSE, NOTICE
 */
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const out = join(root, "dist");
const dir = join(out, "accents-for-ui5");
rmSync(dir, { recursive: true, force: true });
mkdirSync(join(dir, "references"), { recursive: true });

/* ---------- references ---------- */
const docs = ["principles", "building-elements", "page-patterns", "planning", "colour-and-motion", "shell", "ai", "traps"];
for (const d of docs) { cpSync(join(root, "docs", d + ".md"), join(dir, "references", d + ".md")); }
cpSync(join(root, "LICENSE"), join(dir, "LICENSE"));
cpSync(join(root, "NOTICE"), join(dir, "NOTICE"));

/* ---------- library ---------- */
cpSync(join(root, "src", "accents"), join(dir, "library", "accents"), { recursive: true });

/* ---------- catalogue, read from the code through the MCP server ---------- */
function mcp(calls) {
	const lines = [JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18" } })]
		.concat(calls.map((c, i) => JSON.stringify({ jsonrpc: "2.0", id: i + 1, method: "tools/call", params: c })));
	const r = spawnSync(process.execPath, [join(root, "mcp", "server.mjs")], { input: lines.join("\n") + "\n", encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	const byId = {};
	r.stdout.trim().split("\n").forEach((l) => { const m = JSON.parse(l); byId[m.id] = m; });
	return calls.map((c, i) => byId[i + 1].result.content[0].text);
}
const registry = readFileSync(join(root, "src", "accents", "registry.js"), "utf8");
const keys = [...registry.matchAll(/\b[PE]\((?:"[a-z]+",\s*)?"([a-z0-9-]+)"/g)].map((m) => m[1]);
const [overview, list, ...entries] = mcp([
	{ name: "accents_overview", arguments: {} },
	{ name: "accents_list", arguments: {} },
	...keys.map((key) => ({ name: "accents_get", arguments: { key } }))
]);
writeFileSync(join(dir, "catalogue.md"), [
	"# Accents catalogue",
	"",
	"Every page pattern and element, read from the code. Each entry lists its purpose, the UI5 controls it",
	"uses, how it moves, the options it takes and a working example. The module path is the",
	"`sap.ui.define` dependency; the file is under `library/`.",
	"",
	"## All entries",
	"",
	list,
	"",
	...entries.map((e) => e.replace(/^# /, "## ").replace(/\n## /g, "\n### ") + "\n")
].join("\n"));

/* ---------- SKILL.md (chat version) ---------- */
const brand = readFileSync(join(root, "src", "accents", "brand.js"), "utf8");
const version = (brand.match(/version:\s*"([^"]+)"/) || [])[1];
const ui5 = (brand.match(/ui5:\s*"([^"]+)"/) || [])[1];
const description = "Build business apps with Accents for UI5, JP Galido's open design framework on OpenUI5 (Apache-2.0): a shell, 16 page patterns and 70 elements for planning, analytics, transactional forms, reporting and workflow, with rules for colour, motion, translation, accessibility, data and AI. Use when asked to design, build, extend, review or explain an Accents app, screen, element or page pattern, or when the person says Accents, Accents for UI5, or asks for an OpenUI5 business app for personal or open-source work. Never for employer or client deliverables.";
if (description.length > 1024) { throw new Error("Description is longer than 1024 characters."); }
writeFileSync(join(dir, "SKILL.md"), `---
name: accents-for-ui5
description: ${description}
---

# Accents for UI5 (${version}, OpenUI5 ${ui5})

Accents is an open design framework for business apps on **OpenUI5**, the free Apache-2.0 edition of
SAP's UI5. Every app gets the same shell, one of sixteen page patterns, and elements from one catalogue,
with rules that keep screens honest. This package holds everything needed to build with it:

| File | What it is |
|---|---|
| \`catalogue.md\` | Every page pattern and element: purpose, controls, options and a working example |
| \`references/building-elements.md\` | The contract every element follows and the 21 rules |
| \`references/principles.md\` | The twenty principles every screen follows |
| \`references/page-patterns.md\` | When to use each of the sixteen page patterns |
| \`references/planning.md\` | Versions, simulate/save/discard, alerts, missing data |
| \`references/colour-and-motion.md\` | What each colour means, which chart answers which question, motion |
| \`references/shell.md\`, \`references/ai.md\` | The shell and the assistant |
| \`references/traps.md\` | Measured UI5 surprises and their fixes |
| \`library/accents/\` | The framework itself: copy it next to an app's \`index.html\` |

## Boundary

- For personal, open-source or JP-owned work only. It is JP Galido's own IP, written by a clean-room
  method.
- Never for an employer's or a client's deliverables, and never mix material from other design skills into it.
  If it is unclear which side the work is on, ask.

## Before writing anything

1. Read \`references/building-elements.md\` and \`references/principles.md\`.
2. Choose ONE page pattern from \`references/page-patterns.md\`. A screen that needs two is two screens.
3. Look up every element you will use in \`catalogue.md\` and follow its options and example exactly.

## How an app is set up

\`\`\`html
<script src="accents/boot.js"></script>              <!-- theme and language before first paint -->
<link rel="stylesheet" href="accents/accents.css">
<script id="sap-ui-bootstrap"
  src="https://sdk.openui5.org/${ui5}/resources/sap-ui-core.js"
  data-sap-ui-compat-version="edge" data-sap-ui-async="true" data-sap-ui-xx-wait-for-theme="init"
  data-sap-ui-libs="sap.m,sap.f,sap.tnt,sap.ui.layout,sap.uxap,sap.ui.table"
  data-sap-ui-resource-roots='{ "accents": "./accents/", "app": "./" }'
  data-sap-ui-on-init="module:app/main"></script>
\`\`\`

Keep the theme attribute off the bootstrap tag. \`main.js\` creates the shell
(\`accents/shell/Shell\`), then pages built from one pattern each. Serve over http, never from a file.

## Rules that get work rejected

${overview.split("## Rules that reject a screen")[1].split("## Docs")[0].trim()}
- Every visible word comes from a translation file through \`accents/core/I18n\` (never import it as
  \`Text\`). Messages go through \`accents/core/Messages\`. Anything that deletes, sends or cannot be
  undone goes through \`elements/transactional/ConfirmAction\`. Every input is labelled.

## When you show the result

Say what you checked and what you could not check. In chat you cannot run the gallery's render-and-audit
tools; tell the person to run \`node tools/check.mjs <key>\` in the Accents repository before release.

${readFileSync(join(root, "NOTICE"), "utf8").split("\n").slice(5, 8).join(" ").trim()}
`);

/* ---------- zip ---------- */
const zip = join(out, "accents-for-ui5-skill.zip");
rmSync(zip, { force: true });
execFileSync("zip", ["-qr", "-X", zip, "accents-for-ui5", "-x", "*.DS_Store"], { cwd: out });
console.log("Wrote " + zip);
