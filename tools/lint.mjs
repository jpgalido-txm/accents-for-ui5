#!/usr/bin/env node
/*
 * Accents for UI5 — rule checker for the rules a script can check. No dependencies.
 * Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 *   node tools/lint.mjs            checks Accents itself (src/ and gallery/)
 *   node tools/lint.mjs <folder>   checks an app built with Accents (colour, libraries and labels only)
 *
 * Rules checked (see docs/building-elements.md):
 *   colour     no literal colours in JavaScript (exceptions: the first-paint backgrounds in boot.js,
 *              and the AI surface in accents.css)
 *   libraries  no SAP paid libraries (sap.viz, sap.suite.*, sap.ui.comp, sap.gantt)
 *   labels     no vague labels as visible text ("More", "Other", "Insights", "Details")
 *   header     every module starts with the licence header
 *   names      no employer, client, personal or system names (the list is private; see private/)
 * Exit code 1 when anything is found.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { resolve } from "node:path";

const target = process.argv[2] ? resolve(process.argv[2]) : null;
const root = target || new URL("..", import.meta.url).pathname;
const files = [];
function walk(dir, deep) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) {
			// An app's own copy of Accents, fonts and installed packages are not the app's code.
			const skip = target ? /^(fonts|node_modules|accents|\..*)$/ : /^fonts$/;
			if (deep && !skip.test(name)) { walk(p, deep); }
		} else if (/\.(js|css|html)$/.test(name)) { files.push(p); }
	}
}
if (target) { walk(target, true); } else { walk(join(root, "src"), true); walk(join(root, "gallery"), false); }

const RULES = [
	// boot.js is exempt: it paints the measured theme background before any theme exists.
	{ id: "colour", test: (f) => f.endsWith(".js") && !f.endsWith("/boot.js"),
		re: /(["'`])#[0-9a-fA-F]{3,8}\1|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g,
		allow: (line) => /rgba\(0,0,0,0\)/.test(line) },
	{ id: "libraries", test: () => true, re: /["']sap\/(viz|suite|ui\/comp|gantt)\//g },
	{ id: "labels", test: (f) => f.endsWith(".js"),
		re: /\b(text|title|label)\s*:\s*["'](More|Other|Others|Insights|Details|Misc)["']/g },
	// Forbidden names live in private/forbidden-names.txt, which never leaves the private repository,
	// so this public file does not itself list them. Without that file the rule is skipped.
	...forbiddenNames()
];

function forbiddenNames() {
	const list = join(new URL("..", import.meta.url).pathname, "private", "forbidden-names.txt");
	if (!existsSync(list)) { return []; }
	const words = readFileSync(list, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
	return words.length ? [{ id: "names", test: () => true, re: new RegExp(words.join("|"), "gi") }] : [];
}

const problems = [];
for (const file of files) {
	const text = readFileSync(file, "utf8");
	const rel = relative(root, file);
	if (!target && /\.js$/.test(file) && !/Licensed under the Apache License/.test(text.slice(0, 600))) {
		problems.push(`${rel}:1  header  missing the licence header`);
	}
	text.split("\n").forEach((line, i) => {
		for (const rule of RULES) {
			if (!rule.test(file) || (target && rule.id === "names")) { continue; }
			rule.re.lastIndex = 0;
			const m = rule.re.exec(line);
			if (m && !(rule.allow && rule.allow(line))) {
				problems.push(`${rel}:${i + 1}  ${rule.id}  ${line.trim().slice(0, 110)}`);
			}
		}
	});
}

if (problems.length) {
	console.log(problems.join("\n"));
	console.log(`\n${problems.length} problem(s) in ${files.length} files.`);
	process.exit(1);
}
console.log(`No problems in ${files.length} files.`);
