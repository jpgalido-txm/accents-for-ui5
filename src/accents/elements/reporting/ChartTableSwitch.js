/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Chart and table: the same results shown as a chart or as a table, one at a time, switched with a
 * segmented button. The choice is remembered per report in this browser, so a person who prefers
 * the table sees the table next time. The chart goes through core/Chart; the table is either a plain
 * sap.m.Table of the same numbers or a table control the page passes in (such as a report table).
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Label",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/Text",
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/Layout",
	"accents/core/I18n",
	"accents/elements/reporting/sampleReport"
], function (VBox, HBox, Label, SegmentedButton, SegmentedButtonItem, Table, Column, ColumnListItem, Text, Part, Chart, Format, Layout, I18n, sampleReport) {
	"use strict";

	var t = I18n.use("accents.elements.reporting.i18n.i18n");

	function remembered(key) {
		try { return window.localStorage.getItem(key); } catch (e) { return null; }
	}
	function remember(key, value) {
		try { window.localStorage.setItem(key, value); } catch (e) { /* this visit only */ }
	}

	return {
		info: {
			controls: ["sap.m.SegmentedButton", "accents.core.Chart (Apache ECharts)", "sap.m.Table"],
			motion: "Bars grow or shrink to their new lengths when the data changes; switching between chart and table is instant.",
			still: false
		},

		/**
		 * options:
		 *   reportId   names the report, so the choice is remembered per report
		 *   label      the question the chart answers ("Sales by group")
		 *   category   header of the name column in the built-in table
		 *   measure    header of the value column in the built-in table
		 *   format     function (value) -> text; default Format.short
		 *   table      optional control shown instead of the built-in table
		 *   view       "chart" (default) or "table", used until the person chooses
		 *   height     chart height (default "18rem")
		 *   onSelect   optional: bars become selectable; receives the row
		 *   data       [{ name, value }]
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var storeKey = "accents.reporting.view." + (o.reportId || o.label);
			var mode = remembered(storeKey) || o.view || "chart";
			var rows = [];
			var chart = new Chart({ label: o.label, height: o.height || "18rem", selectable: !!o.onSelect });
			chart.attachSelect(function (e) { if (o.onSelect) { o.onSelect(rows[e.getParameter("index")]); } });
			chart.setBuilder(function (list, k) {
				var narrow = k.width && k.width < Layout.WIDTHS.phone;
				return k.base({
					tooltip: { trigger: "item", confine: true, formatter: function (p) { return p.name + ": " + fmt(p.value); } },
					grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
					xAxis: k.axis("category", { data: list.map(function (r) { return r.name; }), axisLabel: { color: k.label, interval: 0, rotate: narrow && list.length > 4 ? 30 : 0 } }),
					yAxis: k.axis("value", { axisLabel: { color: k.label, formatter: function (v) { return Format.short(v); } } }),
					series: [{ type: "bar", name: o.measure, barMaxWidth: 48,
						data: list.map(function (r) { return { value: r.value, itemStyle: { color: k.series(0), borderRadius: [3, 3, 0, 0] } }; }),
						label: Object.assign(k.labels(list.length, function (p) { return fmt(p.value); }), { position: "top" }) }]
				});
			});

			var own = null;
			if (!o.table) {
				own = new Table({ fixedLayout: false, columns: [
					new Column({ header: new Text({ text: o.category }) }),
					new Column({ header: new Text({ text: o.measure }), hAlign: "End" })
				] });
				own.setTooltip(o.label);
			}
			var tableView = o.table || own;

			var viewLabel = new Label({ text: t("chartTableSwitch.viewLabel") }).addStyleClass("sapUiTinyMarginEnd");
			var switcher = new SegmentedButton({ selectedKey: mode, items: [
				new SegmentedButtonItem({ key: "chart", icon: "sap-icon://vertical-bar-chart", text: t("chartTableSwitch.chart"), tooltip: t("chartTableSwitch.chartTip") }),
				new SegmentedButtonItem({ key: "table", icon: "sap-icon://table-view", text: t("chartTableSwitch.table"), tooltip: t("chartTableSwitch.tableTip") })
			], selectionChange: function (e) { show(e.getParameter("item").getKey(), true); } });
			viewLabel.setLabelFor(switcher);
			switcher.addAriaLabelledBy(viewLabel);
			var bar = new HBox({ renderType: "Bare", alignItems: "Center", justifyContent: "End", items: [viewLabel, switcher] }).addStyleClass("sapUiTinyMarginBottom");

			function show(m, chosen) {
				mode = m === "table" ? "table" : "chart";
				// The hidden view is not rendered at all, so a chart is never measured while it has no size.
				chart.setVisible(mode === "chart");
				tableView.setVisible(mode === "table");
				switcher.setSelectedKey(mode);
				if (chosen) { remember(storeKey, mode); }
			}

			var part = Part.make({
				key: "chart-table-switch",
				content: new VBox({ renderType: "Bare", items: [bar, chart, tableView] }),
				empty: t("chartTableSwitch.empty"),
				render: function (list) {
					rows = list || [];
					if (!rows.length) { part.state("empty"); return; }
					chart.setData(rows);
					if (own) {
						own.destroyItems();
						rows.forEach(function (r) {
							own.addItem(new ColumnListItem({ cells: [new Text({ text: r.name }), new Text({ text: fmt(r.value) }).addStyleClass("accTabular")] }));
						});
					}
				}
			});
			part.show = function (m) { show(m, true); return part; };
			part.mode = function () { return mode; };
			part.chart = chart;
			show(mode, false);
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function () {
			function byGroup(seed) {
				var sums = {};
				sampleReport.rows(seed).forEach(function (r) { sums[r.group] = (sums[r.group] || 0) + r.sales; });
				return Object.keys(sums).sort().map(function (g) { return { name: g, value: sums[g] }; });
			}
			return {
				options: {
					reportId: "gallery-chart-table", label: t("chartTableSwitch.demo.label"), category: t("chartTableSwitch.demo.category"),
					measure: t("chartTableSwitch.demo.measure"), format: function (v) { return Format.money(v, "USD", true); }, data: byGroup(7)
				},
				next: function (seed) { return byGroup(seed); }
			};
		}
	};
});
