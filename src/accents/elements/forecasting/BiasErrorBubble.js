/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Bias and error: one bubble per item, placed by forecast bias (does the forecast lean high or low?)
 * across and by forecast error (how far off is it, either way?) up, sized by volume. Two reference
 * lines, at zero bias and at the typical error, split the field so the items that need attention sit
 * alone in the top corners. With too few items the comparison means little, so the element says so
 * instead of drawing.
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

	/** The median, used as the "typical error" reference line. */
	function median(values) {
		var s = values.slice().sort(function (a, b) { return a - b; });
		var m = Math.floor(s.length / 2);
		return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
	}

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)"],
			motion: "Bubbles move to their new places and sizes when the data changes.",
			still: false
		},

		/**
		 * options:
		 *   label     the question the chart answers ("Forecast bias and error by category")
		 *   minItems  fewest items worth comparing (default 5)
		 *   format    function (volume) -> text for the tooltip; default Format.short
		 *   height    chart height (default "20rem")
		 *   onSelect  optional: makes bubbles selectable; receives the item
		 *   data      [{ name, bias, error, volume }] where bias is the mean signed error and error the
		 *             mean absolute error, both as fractions of the forecast.
		 */
		create: function (o) {
			var min = o.minItems || 5;
			var fmt = o.format || Format.short;
			var chart = new Chart({ label: o.label || t("biasErrorBubble.label"), height: o.height || "20rem", selectable: !!o.onSelect });
			chart.attachSelect(function (e) {
				var rows = (chart.getData() || {}).rows || [];
				var r = rows.filter(function (x) { return x.name === e.getParameter("name"); })[0];
				if (o.onSelect && r) { o.onSelect(r); }
			});
			chart.setBuilder(function (d, k) {
				var rows = d.rows, typical = d.typical;
				var maxVol = rows.reduce(function (m, r) { return Math.max(m, r.volume || 0); }, 0) || 1;
				var reach = rows.reduce(function (m, r) { return Math.max(m, Math.abs(r.bias)); }, 0) * 1.25 || 0.05;
				var ref = { color: k.label, type: "dashed", width: 1 };
				var above = t("biasErrorBubble.above"), within = t("biasErrorBubble.within");
				function points(want) {
					return rows.map(function (r, i) {
						if ((r.error > typical) !== want) { return null; }
						return { name: r.name, index: i, value: [r.bias, r.error], symbolSize: 10 + Math.sqrt((r.volume || 0) / maxVol) * 30 };
					}).filter(Boolean);
				}
				function bubbles(name, colour, data, extra) {
					return Object.assign({
						name: name, type: "scatter", data: data,
						itemStyle: { color: colour, opacity: 0.75, borderColor: k.T.background(), borderWidth: 1 },
						label: Object.assign(k.labels(rows.length, function (p) { return p.name; }), { position: "right", fontSize: 11 }),
						labelLayout: { hideOverlap: true }
					}, extra || {});
				}
				return k.base({
					grid: { left: 32, right: 24, top: 24, bottom: 56, containLabel: true },
					legend: Object.assign(k.legend(true), { data: [above, within] }),
					tooltip: Object.assign(k.base().tooltip, { trigger: "item", formatter: function (p) {
						var r = rows[p.data.index];
						var bias = Format.delta(r.bias, "percent");
						return r.name + "<br/>" + t(r.bias > 0 ? "biasErrorBubble.tip.tooLow" : r.bias < 0 ? "biasErrorBubble.tip.tooHigh" : "biasErrorBubble.tip.bias", bias) +
							"<br/>" + t(r.error > typical ? "biasErrorBubble.tip.errorAbove" : "biasErrorBubble.tip.errorWithin", Format.percent(r.error)) +
							"<br/>" + t("biasErrorBubble.tip.volume", fmt(r.volume));
					} }),
					xAxis: k.axis("value", { name: t("biasErrorBubble.axis.bias"), nameLocation: "middle", nameGap: 26, nameTextStyle: { color: k.label }, min: -reach, max: reach,
						splitLine: { show: false }, axisLine: { show: false },
						axisLabel: { color: k.label, formatter: function (v) { return Format.delta(v, "percent", 0); } } }),
					yAxis: k.axis("value", { name: t("biasErrorBubble.axis.error"), nameLocation: "middle", nameGap: 40, nameTextStyle: { color: k.label }, min: 0,
						axisLabel: { color: k.label, formatter: function (v) { return Format.percent(v, 0); } } }),
					series: [
						bubbles(above, k.status("critical"), points(true), {
							markLine: { silent: true, symbol: "none", lineStyle: ref, label: { color: k.label, fontFamily: k.T.font() }, data: [
								{ xAxis: 0, label: { formatter: t("biasErrorBubble.noBias"), position: "end" } },
								{ yAxis: typical, label: { formatter: t("biasErrorBubble.typical", Format.percent(typical)), position: "insideEndTop" } }
							] }
						}),
						bubbles(within, k.series(0), points(false))
					]
				});
			});

			var part = Part.make({
				key: "bias-error-bubble",
				content: chart,
				empty: t("biasErrorBubble.empty"),
				render: function (data) {
					var rows = (data || []).filter(function (r) { return has(r.bias) && has(r.error); });
					if (rows.length < min) {
						part.state("empty", t("biasErrorBubble.tooFew", min, rows.length));
						return;
					}
					chart.setData({ rows: rows, typical: median(rows.map(function (r) { return r.error; })) });
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function build(seed) {
				// Demo forecast: the plan. Bias = mean of (actual − plan) / plan; error = mean of its absolute value.
				return Data.sample(seed).items.map(function (it) {
					var errs = it.months.filter(function (m) { return m.actual !== null; }).map(function (m) { return (m.actual - m.plan) / m.plan; });
					var bias = errs.reduce(function (a, e) { return a + e; }, 0) / errs.length;
					var error = errs.reduce(function (a, e) { return a + Math.abs(e); }, 0) / errs.length;
					return { name: it.name, bias: Data.round(bias, 4), error: Data.round(error, 4), volume: it.actual * 100 };
				});
			}
			return {
				options: { label: t("biasErrorBubble.demo.label"), format: Format.short, data: build(7) },
				next: function (seed) { return build(seed); }
			};
		}
	};
});
