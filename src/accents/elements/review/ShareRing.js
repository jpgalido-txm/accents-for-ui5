/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Share ring: how a whole divides into a few parts. A ring with a small maximum of slices; smaller
 * parts are merged into one remainder that says how many it holds, such as "Other categories (3)".
 * The total sits in the middle. Slices are labelled with name and share, so colour is not the only key.
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
			motion: "Slices widen or narrow to their new shares when the data changes; the total and the labels do not move.",
			still: false
		},

		/**
		 * options:
		 *   label          the question the chart answers ("Share of revenue by category")
		 *   format         function (value) -> text; default Format.short
		 *   max            most slices, the remainder included (default 6)
		 *   remainderNoun  plural noun for the remainder ("categories" gives "Other categories (3)")
		 *   totalLabel     word under the total in the middle (default "Total")
		 *   height         chart height (default "16rem")
		 *   onSelect       optional: makes slices selectable; receives the slice { name, value, members }
		 *   data           [{ name, value }]; only positive values are shares, others are left out
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var max = Math.max(2, o.max || 6);
			var noun = o.remainderNoun || t("shareRing.remainderNoun");
			var chart = new Chart({ label: o.label, height: o.height || "16rem", selectable: !!o.onSelect });
			var slices = [];
			chart.attachSelect(function (e) { if (o.onSelect) { o.onSelect(slices[e.getParameter("index")]); } });

			chart.setBuilder(function (list, k) {
				var total = list.reduce(function (s, x) { return s + x.value; }, 0);
				var el = chart.getDomRef();
				// On a narrow card the names move from around the ring into a legend below it.
				var narrow = (el ? el.clientWidth : 800) < 480;
				var middle = narrow ? "38%" : "50%";
				function share(name) {
					var x = list.find(function (y) { return y.name === name; });
					return x ? Format.percent(x.value / total) : "";
				}
				return k.base({
					legend: Object.assign(k.legend(narrow), { formatter: function (name) { return name + " " + share(name); } }),
					tooltip: { trigger: "item", confine: true, formatter: function (p) {
						var x = list[p.dataIndex];
						var tail = x.members ? "<br>" + x.members.join(", ") : "";
						return x.name + ": " + Format.number(x.value) + " (" + Format.percent(x.value / total) + ")" + tail;
					} },
					graphic: [{
						type: "group", left: "center", top: narrow ? "34%" : "middle", silent: true,
						children: [
							{ type: "text", left: "center", top: -12, style: { text: fmt(total), fill: k.text, fontFamily: k.T.font(), fontSize: 18, fontWeight: 700, textAlign: "center" } },
							{ type: "text", left: "center", top: 10, style: { text: o.totalLabel || t("shareRing.total"), fill: k.label, fontFamily: k.T.font(), fontSize: 12, textAlign: "center" } }
						]
					}],
					series: [{
						type: "pie",
						radius: narrow ? ["40%", "60%"] : ["46%", "68%"],
						center: ["50%", middle],
						avoidLabelOverlap: true,
						itemStyle: { borderColor: k.T.background(), borderWidth: 2 },
						label: { show: !narrow, color: k.text, fontFamily: k.T.font(), formatter: function (p) {
							return p.name + "\n" + Format.percent(p.value / total);
						} },
						labelLine: { show: !narrow, lineStyle: { color: k.line } },
						labelLayout: { hideOverlap: true },
						data: list.map(function (x) {
							return { name: x.name, value: x.value,
								itemStyle: { color: x.members ? k.status("neutral") : k.T.category(x.name) } };
						})
					}]
				});
			});

			var part = Part.make({
				key: "share-ring",
				content: chart,
				empty: t("shareRing.empty"),
				render: function (rows) {
					var list = (rows || []).filter(function (r) { return !missing(r.value) && r.value > 0; })
						.sort(function (a, b) { return b.value - a.value; });
					if (!list.length) { part.state("empty"); return; }
					if (list.length > max) {
						var rest = list.slice(max - 1);
						list = list.slice(0, max - 1).concat([{
							name: t("shareRing.remainder", noun, rest.length),
							value: rest.reduce(function (s, r) { return s + r.value; }, 0),
							members: rest.map(function (r) { return r.name; })
						}]);
					}
					slices = list;
					chart.setData(list);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function rows(seed) {
				return Data.sample(seed).items.map(function (i) { return { name: i.name, value: i.actual * 1000 }; });
			}
			return {
				options: { label: t("shareRing.demo.label"), remainderNoun: t("shareRing.demo.remainderNoun"), max: 6,
					format: function (v) { return Format.money(v, "USD", true); }, data: rows(7) },
				next: function (seed) { return rows(seed); }
			};
		}
	};
});
