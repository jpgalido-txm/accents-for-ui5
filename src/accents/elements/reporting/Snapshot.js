/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Shared helpers for the reporting group: how a column's value is shown, how totals are calculated,
 * and the "snapshot" of a report (title, filters, visible columns and rows, totals, source) that the
 * export and print elements write out. Not a catalogue entry of its own.
 *
 * A column is { key, label, type: "text" | "number" | "money" | "percent" | "date", digits, currency,
 * total }. total is "sum", "avg", "count", false, or { ratio: [numeratorKey, denominatorKey] }, which
 * divides the sum of one column by the sum of another (the only honest total for a rate).
 */
sap.ui.define([
	"accents/core/Format",
	"accents/core/I18n"
], function (Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.reporting.i18n.i18n");
	var NUMERIC = { number: true, money: true, percent: true };

	function missing(v) { return v === null || v === undefined || (typeof v === "number" && isNaN(v)); }

	function asDate(v) {
		if (missing(v) || v === "") { return null; }
		var d = v instanceof Date ? v : new Date(v);
		return isNaN(d.getTime()) ? null : d;
	}

	var Snapshot = {
		numeric: function (col) { return !!NUMERIC[col.type]; },
		asDate: asDate,

		/** The text a cell shows on screen and on paper. Missing values show a dash, never zero. */
		display: function (col, v) {
			if (col.type === "date") {
				var d = asDate(v);
				return d ? d.toLocaleDateString(I18n.language(), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : Format.DASH;
			}
			if (missing(v)) { return col.type === "text" ? Format.DASH : Format.number(null); }
			if (col.type === "money") { return Format.money(v, col.currency || "USD"); }
			if (col.type === "percent") { return Format.percent(v, col.digits === undefined ? 1 : col.digits); }
			if (col.type === "number") { return Format.number(v, col.digits || 0); }
			return String(v);
		},

		/** A column header with its unit, for files and paper: "Sales (USD)". */
		header: function (col) {
			return col.type === "money" && col.currency ? t("snapshot.withUnit", col.label, col.currency) : col.label;
		},

		/** The total of one column over rows, by the column's own rule. Null when there is no total. */
		total: function (col, list) {
			var rule = col.total;
			if (!rule) { return null; }
			function sum(key) {
				var any = false;
				var s = list.reduce(function (acc, r) { var v = r[key]; if (missing(v)) { return acc; } any = true; return acc + v; }, 0);
				return any ? s : null;
			}
			if (rule === "count") { return list.length; }
			if (rule === "sum") { return sum(col.key); }
			if (rule === "avg") {
				var vals = list.map(function (r) { return r[col.key]; }).filter(function (v) { return !missing(v); });
				return vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : null;
			}
			if (rule.ratio) {
				var top = sum(rule.ratio[0]), bottom = sum(rule.ratio[1]);
				return missing(top) || !bottom ? null : top / bottom;
			}
			return null;
		},

		/** Totals for every column that has a rule: { key: value }. */
		totals: function (cols, list) {
			var out = {};
			cols.forEach(function (c) { if (c.total) { out[c.key] = Snapshot.total(c, list); } });
			return out;
		},

		/**
		 * Builds the snapshot the export and print elements write. o: { title, table (a ReportTable part),
		 * filterBar (a FilterBar part, optional), filters (a sentence, when there is no filter bar),
		 * source ({ source, mode, readAt } as SourceLine takes it) }.
		 */
		of: function (o) {
			var view = o.table.view();
			var src = o.source || {};
			var sourceText = src.source ? t(src.mode === "live" ? "snapshot.sourceLive" : "snapshot.sourceSample", src.source,
				src.readAt ? Format.when(src.readAt) : Format.DASH) : "";
			return {
				title: o.title || "",
				filters: o.filterBar ? o.filterBar.summary() : (o.filters || t("snapshot.noFilters")),
				source: sourceText,
				columns: view.columns,
				rows: view.rows,
				groups: view.groups,
				groupBy: view.groupBy,
				totals: view.totals,
				at: new Date()
			};
		}
	};
	return Snapshot;
});
