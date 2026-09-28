/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Ranked bars: items sorted by one measure. Only the exceptions are coloured, so the eye finds them
 * without a legend. Long lists stop at a limit and offer a counted "See all" link.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/Link",
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/I18n"
], function (VBox, Link, Part, Chart, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.review.i18n.i18n");

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)", "sap.m.Link"],
			motion: "Bars grow or shrink to their new lengths when the data changes.",
			still: false
		},

		/**
		 * options:
		 *   label     the question the chart answers ("Revenue by category")
		 *   format    function (value) -> text; default Format.short
		 *   limit     how many bars before "See all" (default 8)
		 *   height    chart height (default "16rem")
		 *   onSelect  optional: makes bars selectable; receives the item
		 *   onSeeAll  optional: where "See all" goes
		 *   data      [{ name, value, flag }] where flag "bad" or "critical" colours that bar
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var limit = o.limit || 8;
			var chart = new Chart({ label: o.label, height: o.height || "16rem", selectable: !!o.onSelect });
			var more = new Link({ visible: false, press: function () { if (o.onSeeAll) { o.onSeeAll(); } } });
			var shown = [];
			chart.attachSelect(function (e) { if (o.onSelect) { o.onSelect(shown[e.getParameter("index")]); } });
			chart.setBuilder(function (rows, k) {
				return k.base({
					tooltip: { trigger: "item", confine: true, formatter: function (p) { return p.name + ": " + Format.number(p.value, 1); } },
					grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
					xAxis: k.axis("value", { axisLabel: { show: false }, splitLine: { show: false } }),
					yAxis: k.axis("category", { inverse: true, data: rows.map(function (r) { return r.name; }) }),
					series: [{
						type: "bar",
						barMaxWidth: 18,
						data: rows.map(function (r) {
							return { value: r.value, itemStyle: { color: r.flag ? k.status(r.flag) : k.series(0), borderRadius: [0, 3, 3, 0] } };
						}),
						label: Object.assign(k.labels(rows.length, function (p) { return fmt(p.value); }), { position: "right" })
					}]
				});
			});

			var part = Part.make({
				key: "ranked-bars",
				content: new VBox({ items: [chart, more], renderType: "Bare" }),
				empty: t("rankedBars.empty"),
				render: function (rows) {
					var sorted = rows.slice().sort(function (a, b) { return b.value - a.value; });
					shown = sorted.slice(0, limit);
					more.setText(t("rankedBars.seeAll", sorted.length));
					more.setVisible(sorted.length > limit && !!o.onSeeAll);
					chart.setData(shown);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function rows(seed) {
				return Data.sample(seed).items.map(function (i) {
					return { name: i.name, value: i.actual * 1000, flag: i.actual < i.plan * 0.97 ? "bad" : null };
				});
			}
			return {
				options: { label: t("rankedBars.demo.label"), format: function (v) { return Format.money(v, "USD", true); }, data: rows(7) },
				next: function (seed) { return rows(seed); }
			};
		}
	};
});
