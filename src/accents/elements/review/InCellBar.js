/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * In-cell bar: a small bar inside a table cell, so a column of numbers can be compared at a glance.
 * The number stays as text, right-aligned, beside a neutral sap.m.ProgressIndicator. A missing value shows a
 * dash and no bar, never an empty bar that would read as zero. When a reference is given (for example
 * 100 percent of plan), the number takes the tone of the measure's polarity and an arrow repeats it; the bar stays neutral.
 *
 * InCellBar.cell(value, settings) gives one cell for any table; create() builds a whole sap.m.Table.
 */
sap.ui.define([
	"sap/m/HBox",
	"sap/m/Text",
	"sap/m/ObjectStatus",
	"sap/m/ProgressIndicator",
	"sap/m/FlexItemData",
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/I18n"
], function (HBox, Text, ObjectStatus, ProgressIndicator, FlexItemData, Table, Column, ColumnListItem, Part, Format, Motion, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.review.i18n.i18n");

	function missing(v) { return v === null || v === undefined || isNaN(v); }

	/**
	 * One cell. settings: { max, format, reference, polarity, emptyText, label }. label names the bar
	 * for screen readers (the column header, for example). Returns an object with
	 * root (the control) and set(value) to change it in place.
	 */
	function cell(value, s) {
		s = s || {};
		var fmt = s.format || Format.short;
		var figure = new ObjectStatus({ text: "" }).addStyleClass("accTabular");
		var bar = new ProgressIndicator({ percentValue: 0, showValue: false, displayAnimation: false, displayOnly: true,
			width: "100%", height: "0.5rem" });
		var slot = new HBox({ renderType: "Bare", width: "4.5rem", justifyContent: "End", items: [figure] });
		var barSlot = new HBox({ renderType: "Bare", items: [bar], alignItems: "Center" }).addStyleClass("sapUiSmallMarginBegin");
		bar.setLayoutData(new FlexItemData({ growFactor: 1 }));
		barSlot.setLayoutData(new FlexItemData({ growFactor: 1, minWidth: "3rem" }));
		var root = new HBox({ renderType: "Bare", alignItems: "Center", width: "100%", items: [slot, barSlot] });
		var current;
		function set(v) {
			var had = current;
			current = v;
			var none = missing(v);
			figure.setText(none ? Format.number(null) : fmt(v));
			figure.setTooltip(none ? (s.emptyText || t("inCellBar.noValue")) : Format.number(v, 2));
			barSlot.setVisible(!none);
			if (none) { figure.setState("None"); figure.setIcon(""); return; }
			var max = s.max || Math.abs(v) || 1;
			// The bar's name: the column it belongs to and the value it shows, so a screen reader reads both.
			bar.setTooltip(s.label ? t("inCellBar.barName", s.label, fmt(v)) : fmt(v));
			bar.setPercentValue(Math.max(0, Math.min(100, Math.abs(v) / max * 100)));
			var tone = "none";
			if (!missing(s.reference)) {
				var delta = v - s.reference;
				tone = Format.tone(delta, s.polarity || "up");
				figure.setIcon(tone === "none" ? "" : Format.arrow(delta));
			}
			figure.setState(Format.state(tone));
			if (had !== undefined && !missing(had) && had !== v) {
				Motion.flash(figure, Format.tone(v - had, s.polarity || "up"));
			}
		}
		set(value);
		return { root: root, set: set };
	}

	return {
		info: {
			controls: ["sap.m.Table", "sap.m.ProgressIndicator", "sap.m.ObjectStatus"],
			motion: "A changed value flashes once, in the tone of its change; bars take their new length at once.",
			still: false
		},

		cell: cell,

		/**
		 * options:
		 *   label       accessible name of the table ("Plan attainment by category")
		 *   nameLabel   header of the first column (default "Name")
		 *   columns     [{ key, label, max, format, reference, polarity, emptyText }]; max defaults to
		 *               the largest value in the column, so bars in one column share a scale
		 *   data        [{ name, values: { key: number|null } }]
		 */
		create: function (o) {
			var table = new Table({ fixedLayout: false, columns: [
				new Column({ header: new Text({ text: o.nameLabel || t("inCellBar.name") }) })
			].concat(o.columns.map(function (c) {
				return new Column({ header: new Text({ text: c.label }), hAlign: "Begin", minScreenWidth: c.minScreenWidth || "", demandPopin: !!c.minScreenWidth, width: c.width || "" });
			})) });
			if (o.label) { table.setTooltip(o.label); }
			var cells = {};

			function scale(rows, c) {
				if (c.max) { return c.max; }
				return rows.reduce(function (m, r) { var v = r.values[c.key]; return missing(v) ? m : Math.max(m, Math.abs(v)); }, 0) || 1;
			}

			var part = Part.make({
				key: "in-cell-bar",
				content: table,
				empty: t("inCellBar.empty"),
				render: function (rows, prev) {
					if (!rows || !rows.length) { part.state("empty"); return; }
					var same = prev && prev.length === rows.length && prev.every(function (r, i) { return r.name === rows[i].name; });
					if (same) {
						rows.forEach(function (r) {
							o.columns.forEach(function (c) { cells[r.name + "|" + c.key].set(r.values[c.key]); });
						});
						return;
					}
					table.destroyItems();
					cells = {};
					var maxes = o.columns.map(function (c) { return scale(rows, c); });
					rows.forEach(function (r) {
						var items = [new Text({ text: r.name })];
						o.columns.forEach(function (c, i) {
							var x = cell(r.values[c.key], Object.assign({}, c, { max: maxes[i] }));
							cells[r.name + "|" + c.key] = x;
							items.push(x.root);
						});
						table.addItem(new ColumnListItem({ cells: items }));
					});
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			// Attainment is actual divided by plan: year to date, and for the last two months. The later
			// month has no actuals yet, so it shows a dash rather than an empty bar.
			function rows(seed) {
				var s = Data.sample(seed);
				var last = s.periods.indexOf(s.today);
				return s.items.map(function (i) {
					function ratio(m) { return m && m.actual !== null ? m.actual / m.plan : null; }
					return { name: i.name, values: { ytd: i.actual / i.plan, month: ratio(i.months[last]), next: ratio(i.months[last + 1]) } };
				});
			}
			function pct(v) { return Format.percent(v, 1); }
			var s0 = Data.sample(7);
			var last = s0.periods.indexOf(s0.today);
			return {
				options: {
					label: t("inCellBar.demo.label"),
					nameLabel: t("inCellBar.demo.nameLabel"),
					columns: [
						{ key: "ytd", label: t("inCellBar.demo.yearToDate"), format: pct, reference: 1, polarity: "up" },
						{ key: "month", label: Format.period(s0.periods[last]), format: pct, reference: 1, polarity: "up", minScreenWidth: "Tablet" },
						{ key: "next", label: Format.period(s0.periods[last + 1]), format: pct, reference: 1, polarity: "up",
							emptyText: t("inCellBar.demo.notYet"), minScreenWidth: "Tablet" }
					],
					data: rows(7)
				},
				next: function (seed) { return rows(seed); }
			};
		}
	};
});
