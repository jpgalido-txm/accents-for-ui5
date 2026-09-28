#!/usr/bin/env node
/*
 * Accents for UI5 — builds the clean public copy of the repository. No dependencies.
 * Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 *   node tools/export-public.mjs <empty-folder>
 *
 * Copies every tracked file except private/ into the folder, scans the copy, and, when the scan is
 * clean, makes it a new git repository with one commit under the author's GitHub noreply address. It
 * never pushes. The private repository and its full history are untouched.
 *
 * The scan fails on:
 *   - any word from private/forbidden-names.txt (employer, client, personal and system names)
 *   - any email address except noreply addresses and the public addresses listed in ALLOWED_EMAILS
 *   - absolute paths into a personal home folder on macOS, Linux or Windows
 *   - anything that looks like a secret key or token
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const target = process.argv[2] ? resolve(process.argv[2]) : null;
if (!target) { console.error("Give an empty folder: node tools/export-public.mjs <folder>"); process.exit(2); }
if (existsSync(target) && readdirSync(target).length) { console.error(target + " is not empty."); process.exit(2); }

const AUTHOR = "JP Galido";
const EMAIL = "257663112+jpgalido-txm@users.noreply.github.com";
const ALLOWED_EMAILS = [/noreply/i, /^trademarks@sap\.com$/i, /@example\.(com|org|net)$/i];

/* ---------- copy ---------- */
const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean)
	.filter((f) => !f.startsWith("private/"));
for (const f of files) {
	const from = join(root, f), to = join(target, f);
	mkdirSync(dirname(to), { recursive: true });
	const st = lstatSync(from);
	if (st.isSymbolicLink()) { symlinkSync(readlinkSync(from), to); } else { copyFileSync(from, to); }
}

/* ---------- scan ---------- */
const listFile = join(root, "private", "forbidden-names.txt");
const names = existsSync(listFile)
	? readFileSync(listFile, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
	: [];
if (!names.length) { console.error("private/forbidden-names.txt is missing or empty; refusing to export unscanned."); process.exit(2); }
const RULES = [
	{ id: "name", re: new RegExp(names.join("|"), "gi") },
	{ id: "path", re: /\/Users\/[A-Za-z0-9._-]+|\/Volumes\/[A-Za-z0-9._-]+|[A-Z]:\\Users\\/g },
	{ id: "secret", re: /sk-ant-[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
	{ id: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, allow: (m) => ALLOWED_EMAILS.some((a) => a.test(m)) }
];
const problems = [];
for (const f of files) {
	const p = join(target, f);
	if (lstatSync(p).isSymbolicLink()) { continue; }
	const buf = readFileSync(p);
	if (buf.includes(0)) { continue; } // binary (fonts)
	buf.toString("utf8").split("\n").forEach((line, i) => {
		for (const r of RULES) {
			r.re.lastIndex = 0;
			let m;
			while ((m = r.re.exec(line))) {
				if (!(r.allow && r.allow(m[0]))) { problems.push(`${f}:${i + 1}  ${r.id}  ${m[0]}`); }
			}
		}
	});
}
if (problems.length) {
	console.log(problems.join("\n"));
	console.log(`\n${problems.length} problem(s). Nothing was committed; fix them in the private repository and export again.`);
	process.exit(1);
}

/* ---------- one clean commit ---------- */
const version = (readFileSync(join(root, "src", "accents", "brand.js"), "utf8").match(/version:\s*"([^"]+)"/) || [])[1];
const git = (args) => execFileSync("git", args, { cwd: target, encoding: "utf8" });
git(["init", "-q", "-b", "main"]);
git(["add", "-A"]);
git(["-c", "user.name=" + AUTHOR, "-c", "user.email=" + EMAIL, "commit", "-q", "-m", `Accents for UI5 ${version}`]);
console.log(`Exported ${files.length} files to ${target}`);
console.log(`Scan: clean (${names.length} forbidden names, emails, local paths, secrets).`);
console.log("Commit: " + git(["log", "--format=%h %an <%ae> %s", "-1"]).trim());
console.log("Nothing was pushed.");
