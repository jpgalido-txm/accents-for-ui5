/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Workspace chart: the chart above the key-figure grid. It plots the same key figures over the same
 * periods, base against scenario: the base is the dashed reference line and the scenario being built
 * is the solid line, in the same colour. Choosing a period on the chart selects that period in the
 * grid (onSelectPeriod), and the grid can select it back (selectPeriod). A scenario is never shown
 * without its base.
 */
sap.ui.define([
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/I18n"
], function (Part, Chart, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.planning.i18n.i18n");

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)"],
			motion: "Lines move to their new values when the data changes. The selected period band moves only when a period is chosen.",
			still: false
		},

		/**
		 * options:
		 *   label     the question the chart answers ("Revenue by month, base against scenario")
		 *   height    chart height (default "16rem")
		 *   format    function (value) -> text for tooltips and labels (default Format.short)
		 *   visible   optional list of key-figure keys to show (default: all)
		 *   selected  optional period key to start selected
		 *   onSelectPeriod(period)  a period was chosen on the chart
		 *   data {
		 *     periods:    ["2026-01", ...]
		 *     keyFigures: [{ key, name, slot, base: [..], scenario: [..] }]   one value per period; null = no value
		 *     baseName, scenarioName   optional names for the legend (default "Base", "Scenario")
		 *   }
		 *
		 * part.selectPeriod(period)  selects a period without calling onSelectPeriod
		 * part.setVisible(keys)      shows only these key figures (the key-figure toggle calls this)
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var visible = o.visible ? o.visible.slice() : null;
			var selected = o.selected || null;
			var current = null;
			var chart = new Chart({ label: o.label || t("workspaceChart.label"), height: o.height || "16rem", selectable: true });
			var hooked = false;

			function choose(index) {
				if (!current || index < 0 || index >= current.periods.length) { return; }
				var p = current.periods[index];
				if (p === selected) { return; }
				selected = p;
				redraw();
				if (o.onSelectPeriod) { o.onSelectPeriod(p); }
			}

			chart.attachSelect(function (e) { choose(e.getParameter("index")); });
			// Clicks anywhere in a period's column choose it, not only clicks on a point.
			chart.attachDrawn(function () {
				var inst = chart.instance();
				if (hooked || !inst) { return; }
				hooked = true;
				inst.getZr().on("click", function (ev) {
					if (ev.target) { return; } // a point was hit; the select event handles it
					var at = [ev.offsetX, ev.offsetY];
					if (!inst.containPixel({ gridIndex: 0 }, at)) { return; }
					var v = inst.convertFromPixel({ xAxisIndex: 0 }, at);
					choose(Math.round(Array.isArray(v) ? v[0] : v));
				});
			});

			function build(d, k) {
				var labels = d.periods.map(function (p) { return Format.period(p, true); });
				var kfs = d.keyFigures.filter(function (f) { return !visible || visible.indexOf(f.key) >= 0; });
				var baseName = d.baseName || t("workspaceChart.base"), scenName = d.scenarioName || t("workspaceChart.scenario");
				var series = [];
				kfs.forEach(function (f, i) {
					var colour = k.series(typeof f.slot === "number" ? f.slot : i);
					series.push({ type: "line", name: t("workspaceChart.series", f.name, baseName), data: f.base, symbol: "none", connectNulls: false,
						lineStyle: { type: "dashed", width: 1.5, color: colour }, itemStyle: { color: colour } });
					series.push({ type: "line", name: t("workspaceChart.series", f.name, scenName), data: f.scenario, symbol: "circle", symbolSize: 6, connectNulls: false,
						lineStyle: { type: "solid", width: 2.25, color: colour }, itemStyle: { color: colour },
						label: Object.assign(k.labels(kfs.length === 1 ? d.periods.length : 99, function (p) { return fmt(p.value); }), { position: "top" }) });
				});
				// The selected period is a tinted band behind its column: one split-area colour per period.
				var si = selected ? d.periods.indexOf(selected) : -1;
				var tint = k.T.mix(k.status("info"), k.T.background(), 0.8);
				var bands = labels.map(function (l, i) { return i === si ? tint : k.T.background(); });
				// The legend wraps instead of scrolling; leave room below the plot for however many rows it needs.
				var el = chart.getDomRef();
				var width = el && el.clientWidth ? el.clientWidth : 800;
				var chars = series.reduce(function (n, x) { return n + x.name.length; }, 0);
				var legendRows = Math.max(1, Math.ceil((chars * 7 + series.length * 40) / Math.max(200, width - 32)));
				var legend = k.legend(true);
				delete legend.icon;
				legend.itemWidth = 22;
				legend.type = "plain";
				legend.left = "center";
				legend.itemHeight = 8;
				// Legend keys draw the line style too, so base and scenario differ by more than their names.
				legend.data = series.map(function (x) {
					return { name: x.name, icon: x.lineStyle.type === "dashed" ? "path://M0,3h6v2H0zM9,3h6v2H9zM18,3h6v2H18zM0,0h0v8H0z" : "path://M0,3h24v2H0zM0,0h0v8H0z" };
				});
				return k.base({
					grid: { left: 8, right: 16, top: 24, bottom: 16 + legendRows * 22, containLabel: true },
					tooltip: { trigger: "axis", confine: true, backgroundColor: k.T.background(), borderColor: k.line,
						textStyle: { color: k.text }, valueFormatter: function (v) { return fmt(v); } },
					legend: legend,
					xAxis: k.axis("category", { data: labels, boundaryGap: true,
						splitArea: { show: si >= 0, interval: 0, areaStyle: { color: bands } } }),
					yAxis: k.axis("value", { scale: true, axisLabel: { color: k.label, formatter: function (v) { return fmt(v); } } }),
					series: series
				});
			}
			chart.setBuilder(build);

			function redraw() { if (current) { chart.setData(Object.assign({}, current)); } }

			var part = Part.make({
				key: "workspace-chart",
				content: chart,
				empty: t("workspaceChart.empty"),
				render: function (d) {
					current = d;
					if (selected && d.periods.indexOf(selected) < 0) { selected = null; }
					chart.setData(d);
				}
			});
			part.selectPeriod = function (p) { selected = p; redraw(); return part; };
			part.setVisible = function (keys) {
				visible = keys ? keys.slice() : null;
				// The number of lines changes, so the chart is rebuilt rather than merged.
				chart.setBuilder(build);
				return part;
			};
			part.chart = chart;
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			// Sample figures are in thousands of dollars; the scenario adds a price change from September.
			function make(seed) {
				var s = Data.sample(seed);
				var r = Data.rng(seed + 100);
				var lift = 0.02 + r() * 0.06;
				var sum = function (fn) { return s.periods.map(function (p, i) { return Data.round(s.items.reduce(function (a, it) { return a + fn(it.months[i]); }, 0), 1); }); };
				var revBase = sum(function (m) { return m.actual !== null ? m.actual : m.forecast; });
				var revScen = revBase.map(function (v, i) { return s.periods[i] > s.today ? Data.round(v * (1 + lift), 1) : v; });
				var plan = sum(function (m) { return m.plan; });
				return {
					periods: s.periods,
					baseName: t("workspaceChart.demo.base"),
					scenarioName: t("workspaceChart.demo.scenario"),
					keyFigures: [
						{ key: "REV", name: t("workspaceChart.demo.revenue"), slot: 0, base: revBase, scenario: revScen },
						{ key: "PLAN", name: t("workspaceChart.demo.plan"), slot: 1, base: plan, scenario: plan }
					]
				};
			}
			return {
				options: { label: t("workspaceChart.demo.label"), selected: "2026-09",
					format: function (v) { return Format.money(v * 1000, "USD", true); }, data: make(7) },
				next: function (seed) { return make(seed); }
			};
		}
	};
});
