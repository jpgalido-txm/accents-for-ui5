/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Forecast error map: items down, periods across, each cell coloured by how far the actual landed from
 * the forecast. Over and under are both warnings, so the ramp deepens the same way in both directions;
 * the tooltip and the legend's signed end values say which way. Periods without an actual stay blank.
 */
sap.ui.define([
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/I18n"
], function (Part, Chart, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.forecasting.i18n.i18n");

	function has(v) { return v !== null && v !== undefined && !isNaN(v); }

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)"],
			motion: "Cells recolour to their new error when the data changes.",
			still: false
		},

		/**
		 * options:
		 *   label     the question the chart answers ("Forecast error by category and month")
		 *   height    chart height (default: 2rem per item plus room for axes and legend)
		 *   onSelect  optional: makes cells selectable; receives { item, period, error }
		 *   data      { periods: ["2026-01", ...], items: [{ name, errors: [fraction | null per period] }] }
		 *             error = (actual − forecast) / forecast; null when there is no actual yet.
		 */
		create: function (o) {
			var chart = new Chart({ label: o.label || t("forecastErrorHeatmap.label"), height: o.height || "20rem", selectable: !!o.onSelect });
			chart.attachSelect(function (e) {
				var d = chart.getData(), v = e.getParameter("value");
				if (!o.onSelect || !d || !v) { return; }
				o.onSelect({ item: d.items[v[1]].name, period: d.periods[v[0]], error: v[2] });
			});
			chart.setBuilder(function (d, k) {
				var cells = [], spread = 0;
				d.items.forEach(function (it, yi) {
					it.errors.forEach(function (e, xi) {
						if (!has(e)) { return; } // no actual yet: the cell stays blank
						spread = Math.max(spread, Math.abs(e));
						cells.push([xi, yi, e]);
					});
				});
				// The legend runs symmetric about zero, to the largest error shown, rounded up to a whole percent.
				spread = Math.max(0.01, Math.ceil(spread * 100) / 100);
				return k.base({
					grid: { left: 8, right: 8, top: 8, bottom: 52, containLabel: true },
					tooltip: Object.assign(k.base().tooltip, { trigger: "item", formatter: function (p) {
						var e = p.value[2];
						return t("forecastErrorHeatmap.tip.where", d.items[p.value[1]].name, Format.period(d.periods[p.value[0]])) + "<br/>" +
							t(e > 0 ? "forecastErrorHeatmap.tip.above" : e < 0 ? "forecastErrorHeatmap.tip.below" : "forecastErrorHeatmap.tip.on", Format.delta(e, "percent"));
					} }),
					xAxis: k.axis("category", { data: d.periods.map(function (p) { return Format.period(p, true); }), splitArea: { show: false },
						axisLabel: { color: k.label, hideOverlap: true } }),
					yAxis: k.axis("category", { inverse: true, data: d.items.map(function (it) { return it.name; }), splitLine: { show: false },
						axisLabel: { color: k.label, width: 96, overflow: "truncate" } }),
					visualMap: { type: "continuous", min: -spread, max: spread, dimension: 2, orient: "horizontal", left: "center", bottom: 0,
						itemWidth: 10, itemHeight: 140, calculable: false, inRange: { color: k.T.ramp("error", 7) },
						text: [t("forecastErrorHeatmap.over", Format.delta(spread, "percent", 0)), t("forecastErrorHeatmap.under", Format.delta(-spread, "percent", 0))],
						textStyle: { color: k.label, fontFamily: k.T.font() } },
					series: [{
						type: "heatmap",
						data: cells,
						itemStyle: { borderColor: k.T.background(), borderWidth: 2, borderRadius: 2 },
						emphasis: { itemStyle: { borderColor: k.text, borderWidth: 2 } },
						label: k.labels(cells.length, function (p) { return Format.delta(p.value[2], "percent", 0); })
					}]
				});
			});

			var part = Part.make({
				key: "forecast-error-heatmap",
				content: chart,
				empty: t("forecastErrorHeatmap.empty"),
				render: function (d) {
					var any = (d.items || []).some(function (it) { return it.errors.some(has); });
					if (!any) { part.state("empty"); return; }
					if (!o.height) { chart.setHeight(Math.max(12, d.items.length * 2 + 5) + "rem"); }
					chart.setData(d);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function build(seed) {
				var s = Data.sample(seed);
				// Demo forecast: the plan for each month. error = (actual − plan) / plan; blank after today.
				return { periods: s.periods, items: s.items.map(function (it) {
					return { name: it.name, errors: it.months.map(function (m) {
						return m.actual === null ? null : Data.round((m.actual - m.plan) / m.plan, 3);
					}) };
				}) };
			}
			return {
				options: { label: t("forecastErrorHeatmap.demo.label"), data: build(7) },
				next: function (seed) { return build(seed); }
			};
		}
	};
});
