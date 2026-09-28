/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Change history: who changed which field, from what to what, and when. Newest first, grouped by
 * day, one row per changed field, so a reader can answer "who set the delivery date to Friday?"
 * without opening anything. New entries rise in once when they arrive; the rest stays still.
 */
sap.ui.define([
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/GroupHeaderListItem",
	"sap/m/Text",
	"sap/m/Title",
	"sap/m/OverflowToolbar",
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/format/NumberFormat",
	"accents/core/Part",
	"accents/core/Motion",
	"accents/core/Format",
	"accents/core/Layout",
	"accents/core/I18n"
], function (Table, Column, ColumnListItem, GroupHeaderListItem, Text, Title, OverflowToolbar, DateFormat, NumberFormat, Part, Motion, Format, Layout, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");

	function dayKey(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
	function value(v) {
		var empty = v === null || v === undefined || v === "";
		return new Text({ text: empty ? Format.DASH : String(v), tooltip: empty ? t("changeHistory.noValue") : null, wrapping: true });
	}

	function create(o) {
		var title = new Title({ text: "", level: "H3", titleStyle: "H5" });
		var settings = {
			fixedLayout: false,
			noDataText: o.empty || t("changeHistory.empty"),
			columns: [
				new Column({ header: new Text({ text: t("changeHistory.time") }), width: "6rem" }),
				new Column({ header: new Text({ text: t("changeHistory.person") }), minScreenWidth: "Tablet", demandPopin: true }),
				new Column({ header: new Text({ text: t("changeHistory.field") }) }),
				new Column({ header: new Text({ text: t("changeHistory.before") }), minScreenWidth: "Tablet", demandPopin: true }),
				new Column({ header: new Text({ text: t("changeHistory.after") }) })
			]
		};
		// Inside a titled page section the section names the table, so the table's own heading can be left out.
		if (o.showTitle !== false) { settings.headerToolbar = new OverflowToolbar({ content: [title] }); settings.ariaLabelledBy = [title]; }
		var table = new Table(settings);
		Layout.fitTable(table);
		var fresh = [];
		table.addEventDelegate({ onAfterRendering: function () { if (fresh.length) { Motion.rank(fresh); fresh = []; } } });

		var part = Part.make({
			key: "change-history",
			content: table,
			render: function (entries, prev) {
				var seen = new Set((prev || []).map(function (e) { return e.id; }));
				var rows = (entries || []).map(function (e, i) { return Object.assign({ id: "c" + i }, e, { at: new Date(e.at) }); })
					.sort(function (a, b) { return b.at - a.at; });
				var dayFormat = DateFormat.getDateInstance({ style: "full" });
				var timeFormat = DateFormat.getTimeInstance({ style: "short" });
				var counts = {};
				rows.forEach(function (r) { var k = dayKey(r.at); counts[k] = (counts[k] || 0) + 1; });
				table.destroyItems();
				var lastDay = null;
				rows.forEach(function (r) {
					var k = dayKey(r.at);
					if (k !== lastDay) {
						table.addItem(new GroupHeaderListItem({ title: t("changeHistory.day", dayFormat.format(r.at), counts[k]) }));
						lastDay = k;
					}
					var li = new ColumnListItem({ cells: [
						new Text({ text: timeFormat.format(r.at), wrapping: false }).addStyleClass("accTabular"),
						new Text({ text: r.by || t("changeHistory.unknownPerson") }),
						new Text({ text: r.object ? t("changeHistory.fieldOf", r.field, r.object) : r.field }),
						value(r.from),
						value(r.to)
					] });
					table.addItem(li);
					if (prev && r.id && !seen.has(r.id)) { fresh.push(li); }
				});
				title.setText(o.label ? t("changeHistory.titleNamed", o.label, rows.length) : t("changeHistory.title", rows.length));
			}
		});
		/** Adds entries ({ at, by, field, from, to }) and shows them at the top. Each gets an id if it has none. */
		part.add = function (entries) {
			var now = part.data() || [];
			var stamp = Date.now();
			var added = [].concat(entries).map(function (e, i) { return Object.assign({ id: "n" + stamp + "-" + i }, e); });
			part.update(now.concat(added));
			return part;
		};
		part.table = table;
		part.update((o.data || []).map(function (e, i) { return Object.assign({ id: "s" + i }, e); }));
		return part;
	}

	var api = {
		info: {
			controls: ["sap.m.Table", "sap.m.GroupHeaderListItem", "sap.ui.core.format.DateFormat"],
			motion: "Entries added while the page is open rise in once, in order. Existing rows and the day headings never move.",
			still: false
		},

		/**
		 * options:
		 *   data   [{ id, at (Date or ISO text), by, field, from, to, object (optional, for lists of several objects) }]
		 *   label  optional name for the table's heading ("Order 4711 changes")
		 *   empty  optional sentence for when there are no changes
		 */
		create: create,

		/** Sample history over the last few days, relative to now. */
		sample: function (seed) {
			var now = Date.now(), h = 3600000, d = 86400000;
			var s = seed || 0;
			var date = function (ms) { return DateFormat.getDateInstance({ style: "medium" }).format(new Date(ms)); };
			var money = function (v) { return NumberFormat.getCurrencyInstance().format(v, "EUR"); };
			return [
				{ id: "a1", at: new Date(now - 0.5 * h), by: t("sample.person.1"), field: t("form.demo.date"), from: date(now + 5 * d), to: date(now + 8 * d) },
				{ id: "a2", at: new Date(now - 0.5 * h), by: t("sample.person.1"), field: t("form.demo.priority"), from: t("form.demo.priority.2"), to: t("form.demo.priority.1") },
				{ id: "a3", at: new Date(now - 26 * h), by: t("sample.person.2"), field: t("form.demo.notes"), from: "", to: t("changeHistory.demo.note") },
				{ id: "a4", at: new Date(now - 50 * h), by: t("sample.person.3"), field: t("form.demo.value"), from: money(1980), to: money(2277) },
				{ id: "a5", at: new Date(now - 51 * h), by: t("sample.person.3"), field: t("form.demo.customer"), from: "", to: t("valueHelp.shown", t("sample.customer." + (1 + s % 8)), "C-100" + (1 + s % 8)) }
			];
		},

		example: function () {
			return {
				options: { data: api.sample(0) },
				next: function (seed) {
					return api.sample(0).concat([{ id: "r" + seed, at: new Date(), by: t("sample.person.2"), field: t("form.demo.reference"),
						from: "PO-" + (7700 + seed - 1), to: "PO-" + (7700 + seed) }]);
				}
			};
		}
	};
	return api;
});
