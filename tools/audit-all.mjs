#!/usr/bin/env node
/*
 * Accents for UI5 — runs tools/check.mjs for every catalogue entry. No dependencies.
 * Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 *   node tools/audit-all.mjs [--quick]
 *
 * Full run: every entry at 390 (light), 1440 (dark, with motion replayed) and 1920 (high-contrast
 * black), plus the home page, and the home page in German and Arabic. --quick runs 1440 light only.
 * Every check includes accessibility (axe-core) and missing translations. Three checks run at a time.
 * Prints one line per check and a summary; writes the details to /tmp/accents-audit.json.
 * Exit code 1 when anything failed.
 */
import { execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const here = new URL(".", import.meta.url).pathname;
const registry = readFileSync(new URL("../src/accents/registry.js", import.meta.url), "utf8");
const keys = ["home", ...[...registry.matchAll(/\b[PE]\((?:"[a-z]+",\s*)?"([a-z0-9-]+)"/g)].map((m) => m[1])];
const quick = process.argv.includes("--quick");
const runs = quick
	? [["1440", "sap_horizon", true]]
	: [["390", "sap_horizon", false], ["1440", "sap_horizon_dark", true], ["1920", "sap_horizon_hcb", false]];

const jobs = keys.flatMap((k) => runs.map(([w, t, replay]) => ({ key: k, width: w, theme: t, replay })));
if (!quick) {
	jobs.push({ key: "home", width: "1440", theme: "sap_horizon", replay: false, lang: "de" });
	jobs.push({ key: "home", width: "1440", theme: "sap_horizon", replay: false, lang: "ar" });
}
const results = [];
let next = 0;

function run(job) {
	return new Promise((resolve) => {
		const args = [here + "check.mjs", job.key, job.width, job.theme].concat(job.replay ? ["--replay"] : [], job.lang ? ["--lang=" + job.lang] : []);
		execFile(process.execPath, args, { timeout: 150000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => {
			let out;
			try { out = JSON.parse(stdout); } catch (e) { out = { key: job.key, ok: false, problem: "No result (" + (err ? err.message.split("\n")[0] : "empty") + ")" }; }
			resolve(Object.assign({ width: job.width, theme: job.theme }, out));
		});
	});
}

async function worker() {
	while (next < jobs.length) {
		const job = jobs[next++];
		const r = await run(job);
		results.push(r);
		const why = r.ok ? "" : "  " + (r.problem || [
			r.errors && r.errors.length ? "errors: " + r.errors.join(" | ").slice(0, 160) : "",
			r.overflow && r.overflow.length ? "overflow: " + r.overflow[0] : "",
			r.charts && r.charts.some((c) => !c.drawn) ? "chart not drawn" : "",
			r.bands && r.bands.length ? "bands: " + r.bands[0] : "",
			r.notBuilt ? "not built" : "",
			r.missingText && r.missingText.length ? "missing text: " + r.missingText.slice(0, 3).join(", ") : "",
			Array.isArray(r.a11y) && r.a11y.some((v) => v.impact === "serious" || v.impact === "critical")
				? "a11y: " + r.a11y.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id).join(", ") : ""
		].filter(Boolean).join("; "));
		console.log(`${r.ok ? "ok  " : "FAIL"}  ${job.key.padEnd(24)} ${String(job.width).padStart(4)} ${job.theme}${job.lang ? " " + job.lang : ""}${why}`);
	}
}

await Promise.all([worker(), worker(), worker()]);

// A check can fail under the load of three browsers at once (a chart measured mid-layout). Each failure
// is run once more on its own; it is reported as passed on retry, never hidden.
const firstFailures = results.filter((r) => !r.ok);
let retried = 0;
for (const f of firstFailures) {
	const job = jobs.find((j) => j.key === f.key && String(j.width) === String(f.width) && j.theme === f.theme);
	if (!job) { continue; }
	const again = await run(job);
	if (again.ok) {
		retried++;
		Object.assign(f, again, { ok: true, retried: true });
		console.log(`ok    ${job.key.padEnd(24)} ${String(job.width).padStart(4)} ${job.theme}  (passed on retry after failing under parallel load)`);
	}
}
writeFileSync("/tmp/accents-audit.json", JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed${retried ? ` (${retried} on retry)` : ""}. Details: /tmp/accents-audit.json`);
process.exit(failed.length ? 1 : 0);
