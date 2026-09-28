/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Print view: a Print button that opens the browser's print dialog with a clean, paged version of the
 * report: its title, the filters that produced it, the table as shown (group headers with their
 * subtotals, then the totals row), the source line and page numbers. The same dialog saves a PDF.
 *
 * How it works: the element adds one style element to the page, used only when printing, and just
 * before printing it adds a plain sheet with the report to the page; after printing both are removed
 * again. The sheet is plain semantic HTML (a heading, paragraphs and one table) because it is meant
 * for paper, not for the screen: it does not imitate any UI5 control, and the screen never shows it.
 * The print style names no colours. It asks for the light system colours (Canvas and CanvasText),
 * which the browser prints as black on white whatever theme is on screen. Page numbers come from the
 * CSS @page margin boxes; table headers repeat on every page.
 */
sap.ui.define([
	"sap/m/Button",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Messages",
	"accents/core/I18n",
	"accents/elements/reporting/Snapshot",
	"accents/elements/reporting/sampleReport"
], function (Button, Part, Format, Messages, I18n, Snapshot, sampleReport) {
	"use strict";

	var t = I18n.use("accents.elements.reporting.i18n.i18n");
	var STYLE_ID = "accPrintStyle";
	var SHEET = "accPrintSheet";

	/** A CSS string literal. */
	function cssText(s) { return "\"" + String(s).replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\""; }

	/** The page-number content, from the translated "Page {0} of {1}". */
	function pageContent() {
		var pattern = t("printView.pageOf", "\u0000", "\u0001");
		return pattern.split(/(\u0000|\u0001)/).filter(function (p) { return p !== ""; }).map(function (p) {
			return p === "\u0000" ? "counter(page)" : p === "\u0001" ? "counter(pages)" : cssText(p);
		}).join(" ");
	}

	function ensureStyle() {
		var el = document.getElementById(STYLE_ID);
		if (!el) {
			el = document.createElement("style");
			el.id = STYLE_ID;
			document.head.appendChild(el);
		}
		var sheet = "." + SHEET;
		el.textContent = [
			"@media screen { " + sheet + " { display: none !important; } }",
			"@media print {",
			"  @page { margin: 16mm 14mm 18mm; @bottom-right { content: " + pageContent() + "; font-size: 8pt; } }",
			"  html, body { color-scheme: light !important; background: Canvas !important; color: CanvasText !important; height: auto !important; overflow: visible !important; }",
			"  body > *:not(" + sheet + ") { display: none !important; }",
			"  " + sheet + " { display: block !important; color-scheme: light; color: CanvasText; background: Canvas; font-family: var(--sapFontFamily, sans-serif); font-size: 9pt; }",
			"  " + sheet + " h1 { font-size: 15pt; margin: 0 0 4pt; }",
			"  " + sheet + " p { margin: 0 0 3pt; }",
			"  " + sheet + " table { width: 100%; border-collapse: collapse; margin: 8pt 0; }",
			"  " + sheet + " th, " + sheet + " td { padding: 2.5pt 4pt; text-align: start; border-bottom: 0.5pt solid currentColor; vertical-align: top; }",
			"  " + sheet + " thead th { border-bottom-width: 1pt; }",
			"  " + sheet + " .num { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }",
			"  " + sheet + " .sum td { font-weight: bold; }",
			"  " + sheet + " tfoot td { font-weight: bold; border-top: 1pt solid currentColor; }",
			"  " + sheet + " tr { break-inside: avoid; }",
			"  " + sheet + " .src { font-size: 8pt; }",
			"}"
		].join("\n");
		return el;
	}

	function el(tag, text, cls) {
		var e = document.createElement(tag);
		if (text !== undefined) { e.textContent = text; }
		if (cls) { e.className = cls; }
		return e;
	}

	/** Builds the paper version of a snapshot and adds it to the page. Returns the sheet. */
	function build(snap) {
		ensureStyle();
		var old = document.querySelector("body > ." + SHEET);
		if (old) { old.remove(); }
		var sheet = el("div", undefined, SHEET);
		sheet.setAttribute("aria-hidden", "true");
		sheet.appendChild(el("h1", snap.title));
		sheet.appendChild(el("p", snap.filters));
		sheet.appendChild(el("p", t("printView.printed", Format.when(snap.at))));
		var table = el("table");
		var head = el("thead");
		var hr = el("tr");
		snap.columns.forEach(function (c) { hr.appendChild(el("th", Snapshot.header(c), Snapshot.numeric(c) ? "num" : "")); });
		head.appendChild(hr);
		table.appendChild(head);
		var body = el("tbody");
		function row(values, cls, label) {
			var tr = el("tr", undefined, cls || "");
			snap.columns.forEach(function (c, i) {
				var text = label !== undefined && i === 0 ? label : label !== undefined && !c.total ? "" : Snapshot.display(c, values[c.key]);
				tr.appendChild(el("td", text, Snapshot.numeric(c) ? "num" : ""));
			});
			return tr;
		}
		if (snap.groups && snap.groups.length) {
			snap.groups.forEach(function (g) {
				body.appendChild(row(g.totals, "sum", g.label));
				g.rows.forEach(function (r) { body.appendChild(row(r)); });
			});
		} else {
			snap.rows.forEach(function (r) { body.appendChild(row(r)); });
		}
		table.appendChild(body);
		if (snap.totals) {
			var foot = el("tfoot");
			foot.appendChild(row(snap.totals, "", t("printView.total", snap.rows.length)));
			table.appendChild(foot);
		}
		sheet.appendChild(table);
		if (snap.source) { sheet.appendChild(el("p", t("printView.source", snap.source), "src")); }
		document.body.appendChild(sheet);
		return sheet;
	}

	function cleanUp() {
		var s = document.querySelector("body > ." + SHEET);
		if (s) { s.remove(); }
	}

	return {
		info: {
			controls: ["sap.m.Button", "a print-only style element and sheet (plain HTML for paper)"],
			motion: "None. Printing never animates.",
			still: true
		},

		/** For tests and apps: builds the sheet without opening the dialog. */
		build: build,
		cleanUp: cleanUp,

		/**
		 * options:
		 *   from   function () -> a snapshot (Snapshot.of({ title, table, filterBar, source }))
		 */
		create: function (o) {
			function print() {
				var snap = o.from();
				if (!snap || !snap.rows.length) {
					Messages.add({ type: "Warning", text: t("printView.none"), group: t("printView.button") });
					return;
				}
				build(snap);
				var done = function () { window.removeEventListener("afterprint", done); cleanUp(); };
				window.addEventListener("afterprint", done);
				window.print();
			}
			var button = new Button({ text: t("printView.button"), icon: "sap-icon://print", type: "Transparent",
				tooltip: t("printView.tooltip"), press: print });
			var part = Part.make({
				key: "print-view",
				content: button,
				render: function (d) { button.setEnabled(d.enabled !== false); }
			});
			part.print = print;
			part.update({ enabled: true });
			return part;
		},

		example: function (Data) {
			var columns = sampleReport.columns();
			var meta = Data.sampleMeta();
			return {
				options: {
					from: function () {
						var rows = sampleReport.rows(7);
						var names = sampleReport.members(rows, "group").map(function (m) { return m.key; });
						var groups = names.map(function (n) {
							var list = rows.filter(function (r) { return r.group === n; }).sort(function (a, b) { return b.sales - a.sales; });
							return { label: t("reportTable.group", n, list.length), value: n, count: list.length, totals: Snapshot.totals(columns, list), rows: list };
						});
						return { title: t("sample.title"), filters: t("snapshot.noFilters"),
							source: t("snapshot.sourceSample", meta.source, Format.when(meta.readAt)), columns: columns,
							rows: groups.reduce(function (a, g) { return a.concat(g.rows); }, []), groups: groups,
							totals: Snapshot.totals(columns, rows), at: new Date() };
					}
				}
			};
		}
	};
});
