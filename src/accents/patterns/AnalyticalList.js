/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Analytical list: find the items behind a number. Key figures sit in the header, the filter bar
 * below them, then one chart and one report table that filter each other. Selecting a bar keeps only
 * that bar's rows in the table and says so; selecting rows in the table redraws the chart from those
 * rows only and says so; each statement has a link that restores everything. Export sits in the
 * table's toolbar and includes both the filters and the chart selection.
 *
 * Use it when a person starts from a figure and drills into the rows that make it up. Do not use it to
 * present finished results for reading or printing; that is the report page. The pattern arranges
 * regions only; it fetches nothing.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/MessageStrip",
	"sap/m/Link",
	"accents/core/Layout",
	"accents/core/Format",
	"accents/core/I18n",
	"accents/elements/reporting/FilterBar",
	"accents/elements/reporting/ReportTable",
	"accents/elements/reporting/ExportMenu",
	"accents/elements/reporting/KpiTag",
	"accents/elements/reporting/Snapshot",
	"accents/elements/reporting/sampleReport",
	"accents/elements/review/RankedBars",
	"accents/elements/common/SourceLine"
], function (VBox, HBox, MessageStrip, Link, Layout, Format, I18n, FilterBar, ReportTable, ExportMenu, KpiTag, Snapshot, sampleReport,
	RankedBars, SourceLine) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.AnalyticalList");

	/**
	 * regions:
	 *   kpis       up to four KPI tags (KpiTag roots) for the header
	 *   filterBar  the filter bar control
	 *   chart      the chart control (one chart), placed in a card
	 *   chartTitle short noun phrase naming the chart's question
	 *   chartSubtitle unit and what selecting does
	 *   statements controls that state the chart and table selections (MessageStrips), shown between them
	 *   table      the report table control
	 *   source     the source line control
	 */
	function compose(r) {
		if (r.kpis && r.kpis.length > 4) { throw new Error("An analytical list holds at most four KPI tags."); }
		var items = [];
		if (r.kpis && r.kpis.length) {
			items.push(new HBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Center", items: r.kpis.map(function (k) {
				return k.addStyleClass("sapUiMediumMarginEnd sapUiTinyMarginBottom");
			}) }).addStyleClass("sapUiSmallMarginBottom"));
		}
		if (r.filterBar) { items.push(r.filterBar.addStyleClass("sapUiSmallMarginBottom")); }
		if (r.chart) {
			items.push(Layout.band({ cards: [Layout.card({ title: r.chartTitle, subtitle: r.chartSubtitle, content: r.chart, cols: 16, rows: 4 })] }));
		}
		(r.statements || []).forEach(function (s) { items.push(s.addStyleClass("sapUiTinyMarginBottom")); });
		if (r.table) { items.push(r.table); }
		if (r.source) { items.push(r.source.addStyleClass("sapUiSmallMarginTop")); }
		return new VBox({ renderType: "Bare", width: "100%", items: items });
	}

	return {
		info: {
			controls: ["sap.m.MessageStrip", "sap.m.Link", "accents reporting elements (FilterBar, KpiTag, ReportTable, ExportMenu)", "accents review RankedBars"],
			motion: "Key figures count to their new values, bars grow to new lengths and changed totals flash once when data changes.",
			still: false
		},
		compose: compose,

		example: function (Data) {
			var seedRows = sampleReport.rows(7);
			var all = seedRows;
			var columns = sampleReport.columns();
			var meta = Data.sampleMeta();
			var barGroup = null;
			var picked = [];

			function sum(list, key) { return list.reduce(function (a, r) { return a + (r[key] || 0); }, 0); }
			/** Sales by group, the chart's question; groups more than 2% below plan are flagged. */
			function byGroup(list) {
				var g = {};
				list.forEach(function (r) {
					var x = g[r.group] = g[r.group] || { name: r.group, value: 0, plan: 0 };
					x.value += r.sales;
					x.plan += r.plan;
				});
				return Object.keys(g).map(function (k) { return { name: k, value: g[k].value, flag: g[k].value < g[k].plan * 0.98 ? "bad" : null }; });
			}

			/* ---------- key figures: all computed from the rows the table shows ---------- */
			var kSales = KpiTag.create({ label: t("kpi.sales"), unit: "USD", polarity: "up", referenceLabel: t("kpi.plan"),
				note: t("kpi.salesNote"), source: meta });
			var kAtt = KpiTag.create({ label: t("kpi.attainment"), polarity: "up", referenceLabel: t("kpi.target"), deltaKind: "points",
				format: function (v) { return Format.percent(v, 1); }, note: t("kpi.attainmentNote"), source: meta });
			var kUnits = KpiTag.create({ label: t("kpi.units"), polarity: "up", referenceLabel: t("kpi.lastYear"),
				note: t("kpi.unitsNote"), source: meta });
			function figures(list) {
				var sales = sum(list, "sales"), plan = sum(list, "plan");
				// Last year's units: this year's units scaled by last year's sales over this year's, row by row.
				var priorUnits = list.reduce(function (a, r) { return a + (r.sales ? r.units * r.prior / r.sales : 0); }, 0);
				kSales.update({ value: list.length ? sales : null, reference: list.length ? plan : null });
				kAtt.update({ value: plan ? sales / plan : null, reference: 1 });
				kUnits.update({ value: list.length ? sum(list, "units") : null, reference: list.length ? Math.round(priorUnits) : null });
			}

			/* ---------- chart and table ---------- */
			var chart = RankedBars.create({ label: t("chart.label"), format: function (v) { return Format.money(v, "USD", true); },
				onSelect: function (item) { if (!item) { return; } barGroup = barGroup === item.name ? null : item.name; refresh(); } });
			var barStrip = new MessageStrip({ type: "Information", showIcon: true, visible: false,
				link: new Link({ text: t("strip.showAll"), press: function () { barGroup = null; refresh(); } }) });
			var rowStrip = new MessageStrip({ type: "Information", showIcon: true, visible: false,
				link: new Link({ text: t("strip.showAllChart"), press: function () { table.table.clearSelection(); } }) });

			var filterBar = FilterBar.create({
				id: "analytical-list",
				fields: [
					{ key: "item", label: t("filter.item"), type: "search", placeholder: t("filter.itemPlaceholder") },
					{ key: "region", label: t("filter.region"), type: "multi", items: sampleReport.members(seedRows, "region") },
					{ key: "lastOrder", label: t("filter.lastOrder"), type: "date" }
				],
				onGo: function () { refresh(); }
			});

			function base() { return filterBar.filter(all); }
			function filtersSentence() {
				return filterBar.summary() + (barGroup ? " " + t("strip.bar", barGroup) : "");
			}
			var exportMenu = ExportMenu.create({ name: t("export.name"), from: function () {
				return Snapshot.of({ title: t("export.title"), table: table, filters: filtersSentence(), source: meta });
			} });
			var table = ReportTable.create({
				label: t("table.label"),
				columns: columns,
				groupBy: "group",
				sort: { key: "sales", descending: true },
				actions: [exportMenu.root],
				onSelect: function (list) {
					picked = list;
					var from = list.length ? list : base();
					chart.update(byGroup(from));
					rowStrip.setVisible(list.length > 0);
					rowStrip.setText(t("strip.rows", list.length));
				}
			});

			function refresh() {
				var b = base();
				if (barGroup && !b.some(function (r) { return r.group === barGroup; })) { barGroup = null; }
				var shown = barGroup ? b.filter(function (r) { return r.group === barGroup; }) : b;
				table.update(shown);            // clears the table selection, which redraws the chart from b
				figures(shown);
				barStrip.setVisible(!!barGroup);
				barStrip.setText(barGroup ? t("strip.bar", barGroup) : "");
			}
			refresh();

			var control = compose({
				kpis: [kSales.root, kAtt.root, kUnits.root],
				filterBar: filterBar.root,
				chart: chart.root,
				chartTitle: t("chart.title"),
				chartSubtitle: t("chart.subtitle"),
				statements: [barStrip, rowStrip],
				table: table.root,
				source: SourceLine.create({ data: meta }).root
			});
			// Test hook for audits: the parts, so a script can select a bar or rows and read the result.
			control.data("accParts", { filterBar: filterBar, table: table, chart: chart, exportMenu: exportMenu,
				selectBar: function (name) { barGroup = barGroup === name ? null : name; refresh(); },
				state: function () { return { barGroup: barGroup, picked: picked.length, chart: chart.data(), strip: barStrip.getVisible() ? barStrip.getText() : "",
					rowStrip: rowStrip.getVisible() ? rowStrip.getText() : "", tableRows: table.view().rows.length }; } });
			return {
				control: control,
				next: function (seed) { return function () { all = sampleReport.rows(seed); refresh(); }; }
			};
		}
	};
});
