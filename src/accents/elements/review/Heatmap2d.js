/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Two-way heat map: where value is made or lost across two dimensions, such as category by month.
 * Colour runs on a diverging ramp from the theme, symmetric about zero, so equal gains and losses look
 * equally strong. Combinations with no value stay blank, never zero. A legend gives both end values,
 * and each cell carries its signed value when there is room, so colour is never the only signal.
 */
sap.ui.define([
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/I18n"
], function (Part, Chart, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.review.i18n.i18n");

	function missing(v) { return v === null || v === undefined || isNaN(v); }

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)"],
			motion: "Cells fade to their new colours when the data changes; axes and the legend stay still.",
			still: false
		},

		/**
		 * options:
		 *   label         the question the chart answers ("Revenue against plan by month")
		 *   polarity      "up" when a positive value is good (default), "down" when it is bad
		 *   format        function (value) -> signed text; default Format.delta(v, "short")
		 *   columnFormat  function (column key) -> axis text; default shows the key
		 *   height        chart height (default "18rem")
		 *   data          { rows: [name], columns: [key], cells: [{ row, column, value }] }
		 *                 A missing cell, or a null value, is left blank.
		 */
		create: function (o) {
			var fmt = o.format || function (v) { return Format.delta(v, "short"); };
			var colFmt = o.columnFormat || function (c) { return c; };
			var chart = new Chart({ label: o.label, height: o.height || "18rem" });

			chart.setBuilder(function (d, k) {
				var cells = d.cells.filter(function (c) { return !missing(c.value); });
				var reach = cells.reduce(function (m, c) { return Math.max(m, Math.abs(c.value)); }, 0) || 1;
				var ramp = k.T.ramp("diverge", 7);
				if (o.polarity === "down") { ramp = ramp.slice().reverse(); }
				var el = chart.getDomRef();
				var width = el ? el.clientWidth : 800;
				// Cell values only when there are few columns and each cell is wide enough to hold one.
				var roomy = k.labels(d.columns.length).show && (width - 120) / d.columns.length >= 44;
				return k.base({
					tooltip: { trigger: "item", confine: true, formatter: function (p) {
						return d.rows[p.value[1]] + " · " + colFmt(d.columns[p.value[0]]) + ": " + fmt(p.value[2]);
					} },
					grid: { left: 8, right: 8, top: 8, bottom: 44, containLabel: true },
					xAxis: k.axis("category", { data: d.columns.map(colFmt), splitArea: { show: false },
						axisLabel: { color: k.label, fontFamily: k.T.font(), interval: 0, hideOverlap: true } }),
					yAxis: k.axis("category", { data: d.rows, inverse: true, splitArea: { show: false } }),
					visualMap: {
						type: "continuous",
						min: -reach,
						max: reach,
						calculable: false,
						orient: "horizontal",
						left: "center",
						bottom: 0,
						itemWidth: 12,
						itemHeight: 140,
						text: [fmt(reach), fmt(-reach)],
						textGap: 8,
						textStyle: { color: k.label, fontFamily: k.T.font() },
						inRange: { color: ramp }
					},
					series: [{
						type: "heatmap",
						itemStyle: { borderColor: k.T.background(), borderWidth: 2, borderRadius: 2 },
						emphasis: { disabled: true },
						label: { show: roomy, color: k.text, fontFamily: k.T.font(), fontSize: 11,
							formatter: function (p) { return fmt(p.value[2]); } },
						data: cells.map(function (c) { return [d.columns.indexOf(c.column), d.rows.indexOf(c.row), c.value]; })
							.filter(function (t) { return t[0] >= 0 && t[1] >= 0; })
					}]
				});
			});

			var part = Part.make({
				key: "heatmap-2d",
				content: chart,
				empty: t("heatmap2d.empty"),
				render: function (d) {
					var any = d && d.rows && d.columns && (d.cells || []).some(function (c) { return !missing(c.value); });
					if (!any) { part.state("empty"); return; }
					chart.setData(d);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			// Actual minus plan per category and month. Months without actuals yet are left out, so they show blank.
			function build(seed) {
				var s = Data.sample(seed);
				var columns = s.periods.slice(0, 10);
				var cells = [];
				s.items.forEach(function (i) {
					i.months.slice(0, 10).forEach(function (m) {
						if (m.actual !== null) { cells.push({ row: i.name, column: m.period, value: (m.actual - m.plan) * 1000 }); }
					});
				});
				return { rows: s.items.map(function (i) { return i.name; }), columns: columns, cells: cells };
			}
			return {
				options: { label: t("heatmap2d.demo.label"), polarity: "up",
					columnFormat: function (p) { return Format.period(p, true); }, data: build(7) },
				next: function (seed) { return build(seed); }
			};
		}
	};
});
