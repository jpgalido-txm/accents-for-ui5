#!/usr/bin/env node
/*
 * Accents for UI5 — render-and-audit check for one gallery entry, with no dependencies.
 * Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 *   node tools/check.mjs <entry-key> [width] [theme] [--replay] [--lang=de|ar]
 *
 * Needs the gallery served at http://127.0.0.1:8811 (python3 tools/serve.py) and Google Chrome, and
 * Node 22 or later (for the built-in WebSocket). Opens the entry in headless Chrome with true device
 * emulation (a real 390-pixel phone screen, not a clamped window), lets the gallery run its own audit,
 * and prints the result: console errors, charts with their size and whether they drew, band alignment
 * problems, and anything wider than the page. Saves a screenshot to
 * /tmp/accents-<key>-<width>-<theme>.png. Exit code 1 when anything failed.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const [key = "home", widthArg = "1600", theme = "sap_horizon"] = args.filter((a) => !a.startsWith("--"));
const width = Number(widthArg);
const replay = args.includes("--replay");
const langArg = (args.find((a) => a.startsWith("--lang=")) || "").slice(7);
const phone = width < 768;

const chrome = [
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"
].find(existsSync);
if (!chrome) { console.error("Google Chrome was not found."); process.exit(2); }

const base = process.env.ACCENTS_URL || "http://127.0.0.1:8811/gallery/index.html";
const url = `${base}?audit=1&data=sample&theme=${theme}${replay ? "&replay=1" : ""}${langArg ? "&lang=" + langArg : ""}#/${key}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 9300 + Math.floor(Math.random() * 600);
const profile = mkdtempSync(join(tmpdir(), "accents-chrome-"));
// On CI machines Chrome runs as root in a container, where its sandbox cannot start.
const sandbox = process.env.CI ? ["--no-sandbox", "--disable-dev-shm-usage"] : [];
const proc = spawn(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
	"--no-default-browser-check", ...sandbox, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });

// A run that has not finished in two minutes is a failure, never a hang.
const deadline = setTimeout(() => finish(1, { key, width, theme, ok: false, problem: "Timed out after 120 seconds." }), 120000);
let finished = false;

function finish(code, output) {
	if (finished) { return; }
	finished = true;
	clearTimeout(deadline);
	try { proc.kill(); } catch (e) { /* already gone */ }
	setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch (e) { /* ignore */ } }, 300);
	console.log(JSON.stringify(output, null, 1));
	setTimeout(() => process.exit(code), 400);
}

async function target() {
	for (let i = 0; i < 60; i++) {
		try {
			const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
			const page = list.find((t) => t.type === "page");
			if (page) { return page; }
		} catch (e) { /* not up yet */ }
		await sleep(250);
	}
	throw new Error("Chrome did not start.");
}

try {
	const page = await target();
	const ws = new WebSocket(page.webSocketDebuggerUrl);
	await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
	let id = 0;
	const pending = new Map();
	ws.onmessage = (e) => {
		const m = JSON.parse(e.data);
		if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
	};
	const send = (method, params = {}) => new Promise((resolve) => {
		const n = ++id;
		pending.set(n, resolve);
		ws.send(JSON.stringify({ id: n, method, params }));
	});

	await send("Emulation.setDeviceMetricsOverride", { width, height: phone ? 844 : 1000, deviceScaleFactor: 1, mobile: phone });
	if (phone) {
		await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
		await send("Emulation.setUserAgentOverride", { userAgent:
			"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
	}
	await send("Page.enable");
	await send("Page.navigate", { url });

	let audit = null;
	for (let i = 0; i < 90 && !audit; i++) {
		await sleep(500);
		const r = await send("Runtime.evaluate", { expression: "(document.getElementById('accents-audit') || {}).textContent || ''", returnByValue: true });
		const text = r.result && r.result.result && r.result.result.value;
		if (text) { audit = JSON.parse(text); }
	}
	// Accessibility: axe-core (MPL-2.0 library, loaded for the check only) over the main area, WCAG 2.1 A and AA.
	let a11y = null;
	if (audit && process.env.ACCENTS_A11Y !== "off") {
		const expr = `new Promise(function (done) {
			var s = document.createElement("script");
			s.src = "https://cdn.jsdelivr.net/npm/axe-core@4.13.0/axe.min.js";
			s.onload = function () {
				axe.run(document.querySelector(".sapTntToolPageMain") || document,
					{ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, resultTypes: ["violations"] })
					.then(function (r) { done(JSON.stringify(r.violations.map(function (v) {
						return { id: v.id, impact: v.impact, nodes: v.nodes.length, target: (v.nodes[0] && v.nodes[0].target || []).join(" ").slice(0, 120), help: v.help };
					}))); }, function (e) { done(JSON.stringify([{ id: "axe-failed", impact: "minor", nodes: 0, help: String(e) }])); });
			};
			s.onerror = function () { done("null"); };
			document.head.appendChild(s);
		})`;
		const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
		const v = r.result && r.result.result && r.result.result.value;
		a11y = v && v !== "null" ? JSON.parse(v) : null;
	}
	const shot = `/tmp/accents-${key}-${width}-${theme}${langArg ? "-" + langArg : ""}.png`;
	const img = await send("Page.captureScreenshot", { format: "png" });
	if (img.result && img.result.data) { writeFileSync(shot, Buffer.from(img.result.data, "base64")); }
	ws.close();

	if (!audit) {
		finish(1, { key, width, theme, ok: false, screenshot: shot,
			problem: "The page never finished its audit (it may have crashed before the gallery started)." });
	} else {
		const badCharts = audit.charts.filter((c) => !c.drawn || c.width === 0 || c.height === 0 || c.width > width);
		// Serious and critical accessibility findings fail the check; ACCENTS_A11Y=report lists them without failing.
		// Findings inside UI5's own controls that an app cannot change. Each is recorded in docs/traps.md.
		const KNOWN_UI5 = [
			{ id: "aria-required-attr", target: /splitbar/ },          // sap.ui.layout.Splitter bar
			{ id: "scrollable-region-focusable", target: /splitter.*content/ },
			{ id: "aria-required-children", target: /-listUl$/ }       // sap.m.Table pop-in rows (aria-owns)
		];
		const known = (v) => KNOWN_UI5.some((k) => k.id === v.id && k.target.test(v.target || ""));
		const blocking = (a11y || []).filter((v) => (v.impact === "serious" || v.impact === "critical") && !known(v));
		const a11yOk = process.env.ACCENTS_A11Y === "report" || blocking.length === 0;
		const ok = audit.errors.length === 0 && badCharts.length === 0 && audit.bands.length === 0 && !audit.notBuilt &&
			!(audit.overflow && audit.overflow.length) && !(audit.missingText && audit.missingText.length) && a11yOk;
		finish(ok ? 0 : 1, { key, width, theme, ok, screenshot: shot, ...audit, a11y: a11y === null ? "not run" : a11y });
	}
} catch (err) {
	finish(1, { key, width, theme, ok: false, problem: err.message });
}
