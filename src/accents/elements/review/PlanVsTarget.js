/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Plan against target: one column per item. The plan is hatched (it is not yet actual), the shortfall
 * to target is stacked on top of it, and the target itself is a short line marker, never a bar. The
 * signed gap above each column says whether the plan clears the target.
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
			motion: "Plan and gap segments grow or shrink to their new heights and the target marker moves when the data changes.",
			still: false
		},

		/**
		 * options:
		 *   label     the question the chart answers ("Plan against target by category")
		 *   format    function (value) -> text; default Format.short
		 *   height    chart height (default "16rem")
		 *   onSelect  optional: makes columns selectable; receives the row
		 *   data      [{ name, plan, target }]. Higher is better: the gap is how far the plan falls
		 *             short of the target. A missing target draws no marker and no gap.
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var chart = new Chart({ label: o.label, height: o.height || "16rem", selectable: !!o.onSelect });
			var shown = [];
			chart.attachSelect(function (e) { if (o.onSelect) { o.onSelect(shown[e.getParameter("index")]); } });

			chart.setBuilder(function (rows, k) {
				var bg = k.T.background();
				var gapTone = k.status("critical");
				var gapFill = k.T.mix(gapTone, bg, 0.6);
				var n = rows.length;
				function diff(r) { return missing(r.target) || missing(r.plan) ? null : r.plan - r.target; }
				return k.base({
					tooltip: { trigger: "axis", confine: true, axisPointer: { type: "shadow" }, formatter: function (ps) {
						var r = rows[ps[0].dataIndex];
						var d = diff(r);
						var gapText = d === null ? t("planVsTarget.noTarget") : d < 0 ? t("planVsTarget.short", fmt(-d)) : t("planVsTarget.clears", fmt(d));
						return r.name + "<br>" + t("planVsTarget.tooltipPlan", Format.number(r.plan)) + "<br>" + t("planVsTarget.tooltipTarget", Format.number(r.target)) + "<br>" + gapText;
					} },
					legend: k.legend(true),
					grid: { left: 8, right: 16, top: 28, bottom: 32, containLabel: true },
					xAxis: k.axis("category", { data: rows.map(function (r) { return r.name; }),
						axisLabel: { color: k.label, fontFamily: k.T.font(), interval: 0, hideOverlap: true } }),
					yAxis: k.axis("value", { axisLabel: { color: k.label, formatter: function (v) { return fmt(v); } } }),
					series: [{
						name: t("planVsTarget.plan"),
						type: "bar",
						stack: "plan",
						barMaxWidth: 32,
						itemStyle: { color: k.series(0), decal: k.hatch() },
						data: rows.map(function (r) { return missing(r.plan) ? null : r.plan; })
					}, {
						name: t("planVsTarget.gap"),
						type: "bar",
						stack: "plan",
						barMaxWidth: 32,
						itemStyle: { color: gapFill, borderColor: gapTone, borderType: "dashed", borderWidth: 1 },
						data: rows.map(function (r) {
							var d = diff(r);
							var tone = Format.tone(d, "up");
							return {
								value: d !== null && d < 0 ? -d : 0,
								label: { color: tone === "none" ? k.label : k.T.statusText(tone) }
							};
						}),
						label: Object.assign(k.labels(n, function (p) { return Format.delta(diff(rows[p.dataIndex]), "short"); }),
							{ position: "top", distance: 8 })
					}, {
						name: t("planVsTarget.target"),
						type: "scatter",
						symbol: "rect",
						symbolSize: [36, 3],
						z: 5,
						itemStyle: { color: k.text },
						data: rows.map(function (r) { return missing(r.target) ? null : r.target; })
					}]
				});
			});

			var part = Part.make({
				key: "plan-vs-target",
				content: chart,
				empty: t("planVsTarget.empty"),
				render: function (rows) {
					shown = rows.slice();
					if (!shown.length) { part.state("empty"); return; }
					chart.setData(shown);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			// Demo target: the sample target scaled by a seeded spread, so some columns clear it and some fall short.
			function rows(seed) {
				var random = Data.rng(seed * 31 + 5);
				return Data.sample(seed).items.slice(0, 6).map(function (i) {
					return { name: i.name, plan: i.plan * 1000, target: i.target * 1000 * (0.92 + random() * 0.14) };
				});
			}
			return {
				options: { label: t("planVsTarget.demo.label"), format: function (v) { return Format.money(v, "USD", true); }, data: rows(7) },
				next: function (seed) { return rows(seed); }
			};
		}
	};
});
