/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Composition columns: what each total is made of, as stacked columns. Shown either as amounts or as
 * shares of 100 percent. Kept to a few series: anything past the limit is merged into one named
 * remainder, so the legend stays readable. Each part keeps its fixed category colour.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/ui/core/InvisibleText",
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/I18n"
], function (VBox, HBox, SegmentedButton, SegmentedButtonItem, InvisibleText, Part, Chart, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.review.i18n.i18n");

	function missing(v) { return v === null || v === undefined || isNaN(v); }
	function sum(list) { return list.reduce(function (s, v) { return s + (missing(v) ? 0 : v); }, 0); }

	/** Keeps the largest series and merges the rest into one named remainder. */
	function limit(series, max, noun) {
		if (series.length <= max) { return series; }
		var ranked = series.slice().sort(function (a, b) { return sum(b.values) - sum(a.values); });
		var kept = ranked.slice(0, max - 1);
		var rest = ranked.slice(max - 1);
		var values = rest[0].values.map(function (v, i) {
			var parts = rest.map(function (s) { return s.values[i]; }).filter(function (x) { return !missing(x); });
			return parts.length ? sum(parts) : null;
		});
		return kept.concat([{ name: t("compositionColumns.remainder", noun, rest.length), values: values, remainder: true }]);
	}

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)", "sap.m.SegmentedButton"],
			motion: "Segments grow or shrink to their new heights when the data changes or the view switches between amounts and shares.",
			still: false
		},

		/**
		 * options:
		 *   label          the question the chart answers ("Revenue by group")
		 *   mode           "stacked" (amounts, default) or "percent" (shares of 100 percent)
		 *   switchable     true shows an Amount / Share switch above the chart
		 *   format         function (value) -> text for amounts; default Format.short
		 *   columnFormat   function (column key) -> axis text; default shows the key
		 *   maxSeries      most series before the rest are merged (default 5)
		 *   remainderNoun  plural noun for the remainder ("groups" gives "Other groups (3)")
		 *   height         chart height (default "16rem")
		 *   data           { columns: [key], series: [{ name, values: [number|null] }] }
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var colFmt = o.columnFormat || function (c) { return c; };
			var mode = o.mode === "percent" ? "percent" : "stacked";
			var chart = new Chart({ label: o.label, height: o.height || "16rem" });

			chart.setBuilder(function (d, k) {
				var totals = d.columns.map(function (c, i) { return sum(d.series.map(function (s) { return s.values[i]; })); });
				var share = mode === "percent";
				var el = chart.getDomRef();
				var slot = (el ? el.clientWidth : 800) / Math.max(1, d.columns.length);
				// Values inside segments only when a column is wide enough to hold them.
				var showLabels = k.labels(d.columns.length).show && slot >= 96;
				return k.base({
					tooltip: { trigger: "axis", confine: true, axisPointer: { type: "shadow" }, formatter: function (ps) {
						var i = ps[0].dataIndex;
						var lines = [t("compositionColumns.tooltipTotal", colFmt(d.columns[i]), fmt(totals[i]))];
						d.series.forEach(function (s) {
							var v = s.values[i];
							lines.push(s.name + ": " + (missing(v) ? Format.DASH : fmt(v) + " (" + Format.percent(totals[i] ? v / totals[i] : null) + ")"));
						});
						return lines.join("<br>");
					} },
					legend: k.legend(true),
					grid: { left: 8, right: 16, top: 16, bottom: 32, containLabel: true },
					xAxis: k.axis("category", { data: d.columns.map(colFmt) }),
					yAxis: k.axis("value", share ? { max: 1, axisLabel: { color: k.label, formatter: function (v) { return Format.percent(v, 0); } } }
						: { axisLabel: { color: k.label, formatter: function (v) { return fmt(v); } } }),
					series: d.series.map(function (s) {
						var colour = s.remainder ? k.status("neutral") : k.T.category(s.name);
						return {
							name: s.name,
							type: "bar",
							stack: "total",
							barMaxWidth: 64,
							itemStyle: { color: colour, borderColor: k.T.background(), borderWidth: 1 },
							data: s.values.map(function (v, i) {
								if (missing(v)) { return null; }
								return share ? (totals[i] ? v / totals[i] : null) : v;
							}),
							// Labels only on segments big enough to hold them; the rest are in the tooltip.
							label: { show: showLabels, position: "inside", fontFamily: k.T.font(), fontSize: 11,
								formatter: function (p) {
									var t = totals[p.dataIndex];
									var part = share ? p.value : (t ? p.value / t : 0);
									if (missing(p.value) || part < 0.1) { return ""; }
									return share ? Format.percent(p.value, 0) : fmt(p.value);
								} }
						};
					})
				});
			});

			var content = chart;
			if (o.switchable) {
				var toggleName = new InvisibleText({ text: t("compositionColumns.switchName") });
				var toggle = new SegmentedButton({
					selectedKey: mode,
					items: [new SegmentedButtonItem({ key: "stacked", text: t("compositionColumns.amount") }), new SegmentedButtonItem({ key: "percent", text: t("compositionColumns.share") })],
					selectionChange: function (e) { part.setMode(e.getParameter("item").getKey()); }
				});
				toggle.addAriaLabelledBy(toggleName);
				content = new VBox({ renderType: "Bare", items: [
					new HBox({ renderType: "Bare", justifyContent: "End", items: [toggleName, toggle] }).addStyleClass("sapUiTinyMarginBottom"),
					chart
				] });
			}

			var part = Part.make({
				key: "composition-columns",
				content: content,
				empty: t("compositionColumns.empty"),
				render: function (d) {
					if (!d || !d.columns || !d.columns.length || !d.series || !d.series.length) { part.state("empty"); return; }
					chart.setData({ columns: d.columns, series: limit(d.series, o.maxSeries || 5, o.remainderNoun || t("compositionColumns.remainderNoun")) });
				}
			});
			/** Switches between amounts ("stacked") and shares ("percent"). */
			part.setMode = function (m) {
				mode = m === "percent" ? "percent" : "stacked";
				if (chart.getData()) { chart.setData(chart.getData()); }
				return part;
			};
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			// Actual revenue per product group per month, summed from the sample items, for months that have happened.
			function build(seed) {
				var s = Data.sample(seed);
				var columns = s.periods.filter(function (p) { return p <= s.today; });
				var groups = [];
				s.items.forEach(function (i) { if (groups.indexOf(i.group) < 0) { groups.push(i.group); } });
				return {
					columns: columns,
					series: groups.map(function (g) {
						return { name: g, values: columns.map(function (p, c) {
							return s.items.filter(function (i) { return i.group === g; })
								.reduce(function (a, i) { return a + i.months[c].actual * 1000; }, 0);
						}) };
					})
				};
			}
			return {
				options: {
					label: t("compositionColumns.demo.label"),
					switchable: true,
					remainderNoun: t("compositionColumns.demo.remainderNoun"),
					format: function (v) { return Format.money(v, "USD", true); },
					columnFormat: function (p) { return Format.period(p, true); },
					data: build(7)
				},
				next: function (seed) { return build(seed); }
			};
		}
	};
});
