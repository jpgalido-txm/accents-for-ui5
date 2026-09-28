/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Predicted against actual: the prediction as a dashed line and the actual as a solid line in the
 * same colour. Actuals are drawn only for periods that have happened. When no period has closed yet,
 * a sentence says when the first actual will appear, so an empty line is never mistaken for zero.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/MessageStrip",
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/I18n"
], function (VBox, MessageStrip, Part, Chart, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.forecasting.i18n.i18n");

	function has(v) { return v !== null && v !== undefined; }
	/** Legend keys drawn as the line itself: solid for what happened, dashed for what is expected. */
	var SOLID = "path://M0,4H24V6H0Z";
	var DASHED = "path://M0,4H6V6H0Z M9,4H15V6H9Z M18,4H24V6H18Z";

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)", "sap.m.MessageStrip"],
			motion: "Both lines move to their new values when the data changes.",
			still: false
		},

		/**
		 * options:
		 *   label     the question the chart answers ("Orders: predicted against actual")
		 *   format    function (value) -> text; default Format.short
		 *   height    chart height (default "16rem")
		 *   data      { today: "2026-08", periods: [{ period, predicted, actual }] }
		 *             actuals after today are ignored even if present.
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var chart = new Chart({ label: o.label || t("predictedVsActual.label"), height: o.height || "16rem" });
			var note = new MessageStrip({ type: "Information", showIcon: true, visible: false, text: "" }).addStyleClass("sapUiTinyMarginBottom");
			chart.setBuilder(function (d, k) {
				var rows = d.periods;
				var colour = k.series(0);
				var PREDICTED = t("predictedVsActual.predicted"), ACTUAL = t("predictedVsActual.actual");
				var actual = rows.map(function (r) { return r.period <= d.today && has(r.actual) ? r.actual : null; });
				var count = rows.length;
				return k.base({
					grid: { left: 8, right: 16, top: 24, bottom: 32, containLabel: true },
					legend: Object.assign(k.legend(true), { data: [{ name: PREDICTED, icon: DASHED }, { name: ACTUAL, icon: SOLID }], itemWidth: 24 }),
					tooltip: Object.assign(k.base().tooltip, { formatter: function (ps) {
						var i = ps[0].dataIndex, r = rows[i];
						var lines = [Format.period(r.period), t("predictedVsActual.tip.value", PREDICTED, fmt(r.predicted))];
						if (actual[i] !== null) {
							lines.push(t("predictedVsActual.tip.value", ACTUAL, fmt(actual[i])));
							var pct = Format.change(actual[i], r.predicted);
							if (pct !== null) { lines.push(t("predictedVsActual.tip.against", Format.delta(pct, "percent"))); }
						} else {
							lines.push(t(r.period > d.today ? "predictedVsActual.tip.notYet" : "predictedVsActual.tip.notReported"));
						}
						return lines.join("<br/>");
					} }),
					xAxis: k.axis("category", { data: rows.map(function (r) { return Format.period(r.period, true); }) }),
					yAxis: k.axis("value", { scale: true, axisLabel: { color: k.label, formatter: function (v) { return fmt(v); } } }),
					series: [
						{ name: PREDICTED, type: "line", data: rows.map(function (r) { return has(r.predicted) ? r.predicted : null; }),
							symbol: "emptyCircle", symbolSize: 5, lineStyle: { width: 2, type: "dashed", color: colour }, itemStyle: { color: colour } },
						{ name: ACTUAL, type: "line", data: actual, symbol: "circle", symbolSize: 6,
							lineStyle: { width: 2, color: colour }, itemStyle: { color: colour },
							label: Object.assign(k.labels(count, function (p) { return fmt(p.value); }), { position: "top" }) }
					]
				});
			});

			var part = Part.make({
				key: "predicted-vs-actual",
				content: new VBox({ renderType: "Bare", items: [note, chart] }),
				empty: t("predictedVsActual.empty"),
				render: function (d) {
					if (!d.periods || !d.periods.length) { part.state("empty"); return; }
					var any = d.periods.some(function (r) { return r.period <= d.today && has(r.actual); });
					if (!any) {
						var first = d.periods.map(function (r) { return r.period; }).filter(function (p) { return p > d.today; })[0] || d.periods[0].period;
						note.setText(t("predictedVsActual.noActuals", Format.period(first)));
					}
					note.setVisible(!any);
					chart.setData(d);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function build(seed) {
				var s = Data.sample(seed);
				var r = Data.rng(seed * 11);
				var fresh = seed % 3 === 2; // every third replay shows a prediction for a period with no actuals yet
				var periods = fresh ? Data.periods("2026-09", 8) : s.periods.slice(0, 10);
				var level = s.items.reduce(function (a, it) { return a + it.plan; }, 0) / 8 * 10;
				var walk = Data.walk(r, periods.length, level, 0.01, 0.04);
				return { today: s.today, periods: periods.map(function (p, i) {
					var predicted = Math.round(walk[i]);
					return { period: p, predicted: predicted, actual: p <= s.today ? Math.round(predicted * (0.9 + r() * 0.2)) : null };
				}) };
			}
			return {
				options: { label: t("predictedVsActual.demo.label"), format: Format.short, data: build(7) },
				next: function (seed) { return build(seed); }
			};
		}
	};
});
