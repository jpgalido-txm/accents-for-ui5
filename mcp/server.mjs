#!/usr/bin/env node
/*
 * Accents for UI5 — MCP server. No dependencies; Node 22 or later.
 * Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Gives AI coding assistants (Claude Code, Cursor, and any other MCP client) what they need to build
 * with Accents correctly: the catalogue, each entry's options and example, the rules, a starter app,
 * the rule checker and the render-and-audit check.
 *
 *   claude mcp add accents -- node /path/to/accents-for-ui5/mcp/server.mjs
 *
 * Speaks the Model Context Protocol over standard input and output (one JSON-RPC message per line).
 * Everything it prints to standard output is protocol; its own notes go to standard error.
 */
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { createInterface } from "node:readline";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const SRC = join(ROOT, "src", "accents");
const read = (p) => readFileSync(p, "utf8");

/* ---------------------------------------------------------------- reading Accents ---------- */

/** Runs a dependency-free sap.ui.define module (registry.js, brand.js) and returns what it exports. */
function loadPlain(file) {
	let out;
	const sap = { ui: { define: (deps, factory) => { out = factory(); } } };
	new Function("sap", read(file))(sap);
	return out;
}
const brand = loadPlain(join(SRC, "brand.js"));
const registry = loadPlain(join(SRC, "registry.js"));

function moduleFile(entry) { return join(ROOT, "src", entry.module.replace(/^accents\//, "accents/") + ".js"); }

/** The source from `start` to its matching closing brace. Good enough for this codebase's style. */
function block(text, start) {
	const open = text.indexOf("{", start);
	if (open < 0) { return ""; }
	let depth = 0, quote = null;
	for (let i = open; i < text.length; i++) {
		const c = text[i], prev = text[i - 1];
		if (quote) { if (c === quote && prev !== "\\") { quote = null; } continue; }
		if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
		if (c === "/" && text[i + 1] === "/") { i = text.indexOf("\n", i); if (i < 0) { break; } continue; }
		if (c === "/" && text[i + 1] === "*") { i = text.indexOf("*/", i + 2) + 1; continue; }
		if (c === "{") { depth++; }
		if (c === "}" && --depth === 0) { return text.slice(start, i + 1); }
	}
	return text.slice(start);
}

/** The /** ... *\/ comment right before `at`. */
function commentBefore(text, at) {
	const end = text.lastIndexOf("*/", at);
	if (end < 0 || text.slice(end + 2, at).trim().length > 0) { return ""; }
	const begin = text.lastIndexOf("/**", end);
	return text.slice(begin, end + 2).split("\n").map((l) => l.replace(/^\s*\/?\*+\/?\s?/, "")).join("\n").trim();
}

function describe(entry) {
	const file = moduleFile(entry);
	if (!existsSync(file)) { return { ...entry, built: false }; }
	const text = read(file);
	const header = (text.match(/\/\*![\s\S]*?\*\//) || [""])[0]
		.split("\n").slice(3).map((l) => l.replace(/^\s*\*\/?\s?/, "")).join("\n").trim();
	const infoAt = text.indexOf("info:");
	const info = infoAt >= 0 ? block(text, infoAt) : "";
	const fn = entry.kind === "pattern" ? "compose" : "create";
	let at = text.search(new RegExp("\\n\\s*" + fn + ":\\s*function"));
	if (at < 0) { at = text.search(new RegExp("function\\s+" + fn + "\\s*\\(")); }
	const options = at >= 0 ? commentBefore(text, at + 1) : "";
	const exAt = text.search(/\n\s*example:\s*function/);
	return {
		key: entry.key, kind: entry.kind, group: entry.group, name: entry.name, purpose: entry.purpose,
		module: entry.module, file: file, built: true,
		about: header,
		controls: ((info.match(/controls:\s*\[([^\]]*)\]/) || [])[1] || "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean),
		motion: (info.match(/motion:\s*"([^"]*)"/) || [])[1] || "",
		neverAnimates: /still:\s*true/.test(info),
		options: options,
		example: exAt >= 0 ? block(text, exAt + 1).trim() : ""
	};
}

const DOCS = {
	principles: "docs/principles.md",
	shell: "docs/shell.md",
	assistant: "docs/ai.md",
	"page-patterns": "docs/page-patterns.md",
	planning: "docs/planning.md",
	"colour-and-motion": "docs/colour-and-motion.md",
	"building-elements": "docs/building-elements.md",
	traps: "docs/traps.md",
	readme: "README.md",
	licence: "NOTICE"
};

/* ---------------------------------------------------------------- local gallery server ------ */

let galleryUrl = null;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
	".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".md": "text/plain", "": "text/plain" };

/** Serves the repository on a free local port, once, for as long as this server runs. */
function gallery() {
	if (galleryUrl) { return Promise.resolve(galleryUrl); }
	return new Promise((resolveUrl, reject) => {
		const server = createServer((req, res) => {
			const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
			const file = resolve(ROOT, "." + path);
			if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
			res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
			res.end(readFileSync(file));
		});
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			galleryUrl = "http://127.0.0.1:" + server.address().port + "/gallery/index.html";
			server.unref();
			resolveUrl(galleryUrl);
		});
	});
}

function runNode(args, env) {
	return new Promise((done) => {
		execFile(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env }, timeout: 150000, maxBuffer: 16 * 1024 * 1024 },
			(err, stdout, stderr) => done({ code: err ? (err.code ?? 1) : 0, out: stdout || "", err: stderr || "" }));
	});
}

/* ---------------------------------------------------------------- starter app -------------- */

function starterFiles(o) {
	const title = o.title || "My app";
	const pattern = registry.get(o.pattern || "review-board");
	const accents = o.accentsUrl || "./accents/";
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${title.replace(/</g, "&lt;")}</title>
	<!-- Accents: theme before first paint. Keep the theme attribute off the bootstrap tag. -->
	<script src="${accents}boot.js"></script>
	<link rel="stylesheet" href="${accents}accents.css">
	<script id="sap-ui-bootstrap"
		src="https://sdk.openui5.org/${brand.ui5}/resources/sap-ui-core.js"
		data-sap-ui-compat-version="edge"
		data-sap-ui-async="true"
		data-sap-ui-xx-wait-for-theme="init"
		data-sap-ui-libs="sap.m,sap.f,sap.tnt,sap.ui.layout,sap.uxap,sap.ui.table"
		data-sap-ui-resource-roots='{ "accents": "${accents}", "app": "./" }'
		data-sap-ui-on-init="module:app/main"></script>
</head>
<body class="sapUiBody" id="content"></body>
</html>
`;
	const main = `/*
 * ${title}: built with ${brand.fullName}.
 * The home page shows the "${pattern.name}" pattern with Accents' sample data. Replace the example with
 * your own regions (see docs/page-patterns.md) and your own data adapter (accents/core/Data.source).
 */
sap.ui.define([
	"sap/m/VBox",
	"accents/shell/Shell",
	"accents/core/Data",
	"${pattern.module}"
], function (VBox, Shell, Data, Pattern) {
	"use strict";

	function home() {
		var example = Pattern.example(Data, context);
		return new VBox({ renderType: "Bare", items: [example.control || example.button] }).addStyleClass("accPage");
	}

	var shell = Shell.create({
		app: { title: ${JSON.stringify(title)} },
		pages: [
			{ key: "home", title: "Home", icon: "sap-icon://home", build: home }
		],
		home: "home"
		// Add user, links (help, feedback, legal, status), search and homeSections when your app has them.
		// Leaving one out is a decision: write down why in your handover.
	});
	var context = { assistant: shell.assistant, go: shell.go };
	shell.start("content");
});
`;
	return { "index.html": html, "main.js": main };
}

/* ---------------------------------------------------------------- tools -------------------- */

const TOOLS = [
	{
		name: "accents_overview",
		description: "Start here. What Accents for UI5 is, how an app is set up, and the rules that get a screen rejected. Call before building or changing any Accents screen.",
		inputSchema: { type: "object", properties: {}, additionalProperties: false },
		run: () => [
			`# ${brand.fullName} ${brand.version}`,
			"An open design framework for business apps on OpenUI5 " + brand.ui5 + ": one shell, nine page patterns, 45 elements, and rules for colour, motion, data and AI.",
			"",
			"## How to build a screen",
			"1. Start from the shell (accents/shell/Shell). Every app has it.",
			"2. Choose ONE page pattern (accents_list kind=pattern). A screen needing two patterns is two screens.",
			"3. Compose elements (accents_list kind=element). Read accents_get for each: its options and a working example.",
			"4. Check with accents_lint (rules) and, for Accents itself, accents_check (renders and audits).",
			"",
			"## Rules that reject a screen",
			"- Only OpenUI5 libraries (sap.m, sap.f, sap.tnt, sap.ui.layout, sap.uxap, sap.ui.table, sap.ui.unified). Never sap.viz, sap.suite.*, sap.ui.comp, sap.gantt or sap.ui.export: those are paid SAP software. Charts use accents/core/Chart.",
			"- No literal colours: read them from accents/core/Tokens or theme CSS variables.",
			"- Colour the fact, never the container; colour is never the only signal.",
			"- Plan, forecast and scenario are the same hue as actual, hatched or dashed; a target is a marker or line.",
			"- Labels are short nouns; counts go in brackets: \"Open (3)\". No \"More\", \"Other\", \"Insights\", \"Details\".",
			"- One chart per card. Nothing inert. No typed figures: every number comes from data.",
			"- Motion only through accents/core/Motion, only when data changes.",
			"- AI buttons only on things a person acts on (rows, alerts, options, object headers), never on charts, figures, counts or titles. Model output is always labelled.",
			"- Leave event handlers out of control settings rather than passing undefined (UI5 throws).",
			"",
			"## Docs (accents_docs)",
			Object.keys(DOCS).join(", "),
			"",
			brand.attribution
		].join("\n")
	},
	{
		name: "accents_list",
		description: "List the Accents catalogue: page patterns and elements, with key, group and purpose. Filter by kind, group or a search word.",
		inputSchema: { type: "object", additionalProperties: false, properties: {
			kind: { type: "string", enum: ["pattern", "element"], description: "Only patterns or only elements." },
			group: { type: "string", enum: registry.groups.map((g) => g.key), description: "Only one group." },
			query: { type: "string", description: "A word to find in the name, key or purpose." }
		} },
		run: (a) => {
			const q = (a.query || "").toLowerCase();
			const rows = registry.entries.filter((e) => (!a.kind || e.kind === a.kind) && (!a.group || e.group === a.group) &&
				(!q || (e.name + " " + e.key + " " + e.purpose).toLowerCase().includes(q)));
			if (!rows.length) { return "Nothing in the catalogue matches. Try a broader word, or accents_list with no filter."; }
			return rows.map((e) => `- ${e.key} (${e.kind}, ${e.group}): ${e.name}. ${e.purpose}`).join("\n") +
				`\n\n${rows.length} of ${registry.entries.length} entries. Use accents_get with a key for options and an example.`;
		}
	},
	{
		name: "accents_get",
		description: "Everything needed to use one catalogue entry: what it is for, the UI5 controls it uses, how it moves, the options its create() or compose() takes, and a working example.",
		inputSchema: { type: "object", additionalProperties: false, required: ["key"], properties: {
			key: { type: "string", description: "Catalogue key, for example \"headline-figure\" or \"planning-desk\"." }
		} },
		run: (a) => {
			const e = registry.get(a.key);
			if (!e) { return { error: `No entry "${a.key}". Use accents_list to see the keys.` }; }
			const d = describe(e);
			if (!d.built) { return { error: `"${a.key}" is listed but its file does not exist yet.` }; }
			return [
				`# ${d.name} (${d.kind}, ${d.group})`,
				d.purpose,
				"",
				`Module: ${d.module}   (sap.ui.define dependency)`,
				`Controls: ${d.controls.join(", ") || "not stated"}`,
				`Motion: ${d.motion || "not stated"}${d.neverAnimates ? " (never animates)" : ""}`,
				"",
				"## About", d.about || "(no description)",
				"",
				`## ${d.kind === "pattern" ? "compose(regions)" : "create(options)"}`, d.options || "(options not documented)",
				"",
				d.kind === "pattern" ? "Returns a control or a small handle; see the options above."
					: "Returns a Part: part.root (place it), part.update(data), part.state(\"ready\"|\"loading\"|\"empty\"|\"error\", message).",
				"",
				"## Example (runs in the gallery; Data is accents/core/Data, ctx is { assistant, go })",
				"```js", d.example, "```"
			].join("\n");
		}
	},
	{
		name: "accents_docs",
		description: "Read an Accents document: principles, shell, assistant, page-patterns, planning, colour-and-motion, building-elements, traps, readme, licence. Optionally return only the parts that mention a word.",
		inputSchema: { type: "object", additionalProperties: false, required: ["topic"], properties: {
			topic: { type: "string", enum: Object.keys(DOCS) },
			query: { type: "string", description: "Return only the sections that mention this word." }
		} },
		run: (a) => {
			const text = read(join(ROOT, DOCS[a.topic]));
			if (!a.query) { return text; }
			const q = a.query.toLowerCase();
			const parts = text.split(/\n(?=#{1,3} )/).filter((p) => p.toLowerCase().includes(q));
			return parts.length ? parts.join("\n\n") : `"${a.query}" does not appear in ${a.topic}. The whole document has ${text.split("\n").length} lines; call without query to read it.`;
		}
	},
	{
		name: "accents_new_app",
		description: "Create a starter Accents app: an index.html with the theme boot and OpenUI5 bootstrap, and a main.js with the shell and one page pattern on sample data. Writes into a new or empty folder, and copies Accents into it unless accentsUrl is given.",
		inputSchema: { type: "object", additionalProperties: false, required: ["folder"], properties: {
			folder: { type: "string", description: "Absolute path of a new or empty folder for the app." },
			title: { type: "string", description: "The app's name, shown in the top bar." },
			pattern: { type: "string", enum: registry.inGroup("patterns").map((e) => e.key), description: "The page pattern for the home page. Default review-board." },
			accentsUrl: { type: "string", description: "Where the app loads Accents from, ending in /accents/. Leave out to copy Accents into the app folder." }
		} },
		run: (a) => {
			const folder = resolve(a.folder);
			if (existsSync(folder) && readdirSync(folder).length) { return { error: `${folder} is not empty. Choose a new or empty folder; nothing was written.` }; }
			if (a.pattern && !registry.get(a.pattern)) { return { error: `No pattern "${a.pattern}".` }; }
			mkdirSync(folder, { recursive: true });
			const files = starterFiles(a);
			for (const [name, content] of Object.entries(files)) { writeFileSync(join(folder, name), content); }
			if (!a.accentsUrl) { cpSync(SRC, join(folder, "accents"), { recursive: true }); }
			return [
				`Created ${folder}:`,
				"- index.html: theme boot, Accents styles, OpenUI5 " + brand.ui5 + " bootstrap",
				"- main.js: the shell with a home page showing the " + (a.pattern || "review-board") + " pattern on sample data",
				a.accentsUrl ? "- Accents is loaded from " + a.accentsUrl : "- accents/: a copy of Accents " + brand.version + " (Apache-2.0; keep its NOTICE when you ship)",
				"",
				"Run it: cd into the folder and serve it over http (for example: python3 -m http.server 8080), then open http://127.0.0.1:8080.",
				"Next: replace the example with your own regions and data (accents_get " + (a.pattern || "review-board") + "), then run accents_lint on the folder."
			].join("\n");
		}
	},
	{
		name: "accents_lint",
		description: "Check code against the rules a script can check: no literal colours, no paid SAP libraries, no vague labels. With no folder it checks Accents itself (also licence headers and forbidden names).",
		inputSchema: { type: "object", additionalProperties: false, properties: {
			folder: { type: "string", description: "Absolute path of an app folder to check. Leave out to check Accents itself." }
		} },
		run: async (a) => {
			const r = await runNode([join(ROOT, "tools", "lint.mjs")].concat(a.folder ? [resolve(a.folder)] : []));
			return r.code === 0 ? r.out.trim() : { error: (r.out + r.err).trim() };
		}
	},
	{
		name: "accents_check",
		description: "Render one gallery entry in headless Chrome and audit it: console errors, charts drawn with real size, cards aligned in bands, nothing wider than the page. Needs Google Chrome. Returns the result and the path of a screenshot.",
		inputSchema: { type: "object", additionalProperties: false, required: ["key"], properties: {
			key: { type: "string", description: "Catalogue key, or \"home\"." },
			width: { type: "integer", enum: [390, 768, 1024, 1440, 1600], description: "Screen width. Default 1600." },
			theme: { type: "string", enum: ["sap_horizon", "sap_horizon_dark", "sap_horizon_hcb", "sap_horizon_hcw"], description: "Default sap_horizon." },
			replay: { type: "boolean", description: "Feed new data once, to exercise data motion." }
		} },
		run: async (a) => {
			if (a.key !== "home" && !registry.get(a.key)) { return { error: `No entry "${a.key}". Use accents_list to see the keys.` }; }
			const url = await gallery();
			const r = await runNode([join(ROOT, "tools", "check.mjs"), a.key, String(a.width || 1600), a.theme || "sap_horizon"]
				.concat(a.replay ? ["--replay"] : []), { ACCENTS_URL: url });
			let result;
			try { result = JSON.parse(r.out); } catch (e) { return { error: "The check did not return a result. " + (r.err || r.out).slice(0, 500) }; }
			const summary = result.ok ? `PASS: ${a.key} at ${result.width} px, ${result.theme}.`
				: `FAIL: ${a.key} at ${result.width} px, ${result.theme}.`;
			return summary + "\n\n" + JSON.stringify(result, null, 1);
		}
	}
];

/* ---------------------------------------------------------------- protocol ----------------- */

function send(msg) { process.stdout.write(JSON.stringify(msg) + "\n"); }

async function handle(msg) {
	const { id, method, params } = msg;
	if (method === "initialize") {
		return send({ jsonrpc: "2.0", id, result: {
			protocolVersion: (params && params.protocolVersion) || "2025-06-18",
			capabilities: { tools: {} },
			serverInfo: { name: "accents", title: brand.fullName, version: brand.version },
			instructions: `Tools for building with ${brand.fullName}. Call accents_overview first, then accents_list and accents_get before writing any Accents screen.`
		} });
	}
	if (method === "ping") { return send({ jsonrpc: "2.0", id, result: {} }); }
	if (method === "tools/list") {
		return send({ jsonrpc: "2.0", id, result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } });
	}
	if (method === "tools/call") {
		const tool = TOOLS.find((t) => t.name === params.name);
		if (!tool) { return send({ jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${params.name}` } }); }
		try {
			const out = await tool.run(params.arguments || {});
			const isError = !!(out && typeof out === "object" && out.error);
			return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: isError ? out.error : String(out) }], isError } });
		} catch (e) {
			return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "The tool failed: " + e.message }], isError: true } });
		}
	}
	if (id !== undefined && id !== null) {
		return send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
	}
	// Notifications (notifications/initialized, cancellations) need no answer.
}

createInterface({ input: process.stdin }).on("line", (line) => {
	if (!line.trim()) { return; }
	let msg;
	try { msg = JSON.parse(line); } catch (e) { return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
	handle(msg).catch((e) => process.stderr.write("accents mcp: " + e.stack + "\n"));
});
process.stderr.write(`${brand.fullName} MCP server ${brand.version} ready (${registry.entries.length} catalogue entries).\n`);
