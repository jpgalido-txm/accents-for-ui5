#!/usr/bin/env node
/*
 * Accents for UI5 — tests the MCP server the way a client uses it. No dependencies.
 * Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 *   node mcp/test.mjs            protocol and every tool except the browser check
 *   node mcp/test.mjs --check    also runs accents_check (needs Google Chrome)
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const server = spawn(process.execPath, [new URL("server.mjs", import.meta.url).pathname], { stdio: ["pipe", "pipe", "inherit"] });
const pending = new Map();
let nextId = 1;
createInterface({ input: server.stdout }).on("line", (line) => {
	const msg = JSON.parse(line);
	if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const call = (method, params) => new Promise((resolve) => {
	const id = nextId++;
	pending.set(id, resolve);
	server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
});
const tool = async (name, args) => (await call("tools/call", { name, arguments: args || {} })).result;

let failures = 0;
function expect(label, ok, detail) {
	console.log(`${ok ? "ok  " : "FAIL"}  ${label}${ok || !detail ? "" : "  -> " + String(detail).slice(0, 300)}`);
	if (!ok) { failures++; }
}

const init = await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "accents-test", version: "0" } });
expect("initialize answers with server info", init.result && init.result.serverInfo.name === "accents", JSON.stringify(init));
server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

const list = await call("tools/list", {});
const names = list.result.tools.map((t) => t.name);
expect("tools/list returns 7 tools", names.length === 7, names.join(", "));
expect("every tool has an input schema", list.result.tools.every((t) => t.inputSchema && t.inputSchema.type === "object"));

let r = await tool("accents_overview");
expect("overview explains the rules", !r.isError && /Rules that reject a screen/.test(r.content[0].text), r.content[0].text);

const registryText = readFileSync(new URL("../src/accents/registry.js", import.meta.url), "utf8");
const patternCount = (registryText.match(/\bP\("/g) || []).length;
const entryCount = [...registryText.matchAll(/\b[PE]\((?:"[a-z]+",\s*)?"([a-z0-9-]+)"/g)].length;
r = await tool("accents_list", { kind: "pattern" });
expect(`list finds the ${patternCount} page patterns`, new RegExp(patternCount + " of " + entryCount + " entries").test(r.content[0].text), r.content[0].text);
r = await tool("accents_list", { query: "hatched" });
expect("list searches purposes", !r.isError && /base-vs-scenario/.test(r.content[0].text), r.content[0].text);

const keys = [...readFileSync(new URL("../src/accents/registry.js", import.meta.url), "utf8").matchAll(/\b[PE]\((?:"[a-z]+",\s*)?"([a-z0-9-]+)"/g)].map((m) => m[1]);
let described = 0;
for (const key of keys) {
	r = await tool("accents_get", { key });
	const t = r.content[0].text;
	if (!r.isError && /## Example/.test(t) && /Controls: \S/.test(t) && /(create|compose)\(/.test(t) && t.split("```js")[1].length > 40) { described++; }
	else { expect("accents_get " + key, false, t.slice(0, 200)); }
}
expect(`accents_get describes all ${keys.length} entries with options and an example`, described === keys.length);
r = await tool("accents_get", { key: "no-such-thing" });
expect("accents_get reports an unknown key as an error", r.isError === true);

r = await tool("accents_docs", { topic: "traps", query: "undefined" });
expect("docs search finds the undefined-handler trap", /undefined/.test(r.content[0].text), r.content[0].text);

const dir = join(mkdtempSync(join(tmpdir(), "accents-app-")), "demo");
r = await tool("accents_new_app", { folder: dir, title: "Demo", pattern: "planning-desk" });
expect("new app writes index.html, main.js and a copy of Accents",
	!r.isError && existsSync(join(dir, "index.html")) && existsSync(join(dir, "main.js")) && existsSync(join(dir, "accents", "boot.js")), r.content[0].text);
r = await tool("accents_new_app", { folder: dir });
expect("new app refuses a folder that is not empty", r.isError === true);

r = await tool("accents_lint", { folder: dir });
expect("lint passes the new app", !r.isError, r.content[0].text);
r = await tool("accents_lint", {});
expect("lint passes Accents itself", !r.isError && /No problems/.test(r.content[0].text), r.content[0].text);

if (process.argv.includes("--check")) {
	r = await tool("accents_check", { key: "headline-figure", width: 390, theme: "sap_horizon_dark" });
	expect("check renders and passes an entry in headless Chrome", !r.isError && /^PASS/.test(r.content[0].text), r.content[0].text);
}

const bad = await call("no/such/method", {});
expect("unknown methods get a JSON-RPC error", bad.error && bad.error.code === -32601);

rmSync(dirname(dir), { recursive: true, force: true });
server.kill();
console.log(failures ? `\n${failures} failure(s).` : "\nAll MCP tests passed.");
process.exit(failures ? 1 : 0);

function dirname(p) { return p.replace(/\/[^/]+$/, ""); }
