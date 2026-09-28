/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Waterfall: how a starting amount turns into a result, step by step, such as gross revenue down to
 * profit. Each step floats from the running total; its tone follows the measure's polarity, and its
 * label carries the sign. Totals and subtotals stand on zero in a neutral tone.
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

	/**
	 * Turns the steps into bars: { name, total, change, lo, hi }. The first entry is the starting total;
	 * entries marked total show the running total so far; the others are changes to it.
	 */
	function walk(steps) {
		var running = 0;
		return steps.map(function (s, i) {
			if (i === 0 || s.total) {
				if (i === 0) { running = missing(s.value) ? 0 : s.value; }
				return { name: s.name, total: true, change: null, value: running, lo: Math.min(0, running), hi: Math.max(0, running) };
			}
			var v = missing(s.value) ? null : s.value;
			var from = running;
			running += v || 0;
			return { name: s.name, total: false, change: v, value: running, lo: Math.min(from, running), hi: Math.max(from, running) };
		});
	}

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)"],
			motion: "Steps and totals grow, shrink or move to their new positions when the data changes.",
			still: false
		},

		/**
		 * options:
		 *   label     the question the chart answers ("Gross revenue to operating profit")
		 *   polarity  "up" when an increase is good (default), "down" when it is bad
		 *   format    function (value) -> text; default Format.short
		 *   height    chart height (default "18rem")
		 *   data      [{ name, value }, { name, value }, { name, total: true }, ...]
		 *             The first entry is the starting amount. Entries with total: true show the running
		 *             total and take no value. A step with no value shows a dash and moves nothing.
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var chart = new Chart({ label: o.label, height: o.height || "18rem" });

			chart.setBuilder(function (bars, k) {
				var el = chart.getDomRef();
				var width = el ? el.clientWidth : 800;
				var slot = width / Math.max(1, bars.length);
				var tilt = slot < 80;
				var labelled = k.labels(bars.length).show && slot >= 56;
				function tone(b) { return b.total ? "neutral" : Format.tone(b.change, o.polarity || "up"); }
				function colour(b) {
					var t = tone(b);
					return t === "good" || t === "bad" ? k.status(t) : k.status("neutral");
				}
				// Stacking trick: an invisible base lifts each bar to its start. A bar that crosses zero
				// is split into an upper and a lower piece, because stacks go up and down separately.
				var base = [], up = [], down = [];
				bars.forEach(function (b) {
					if (b.lo >= 0) { base.push(b.lo); up.push(b.hi - b.lo); down.push(null); }
					else if (b.hi <= 0) { base.push(b.hi); up.push(null); down.push(b.lo - b.hi); }
					else { base.push(0); up.push(b.hi); down.push(b.lo); }
				});
				function item(b, v) { return v === null ? null : { value: v, itemStyle: { color: colour(b) } }; }
				function text(b) { return b.total ? fmt(b.value) : Format.delta(b.change, "short"); }
				var visible = { type: "bar", stack: "fall", barMaxWidth: 36, barCategoryGap: "30%" };
				return k.base({
					tooltip: { trigger: "axis", confine: true, axisPointer: { type: "shadow" }, formatter: function (ps) {
						var b = bars[ps[0].dataIndex];
						return b.total ? b.name + ": " + Format.number(b.value)
							: b.name + ": " + Format.delta(b.change) + "<br>" + t("waterfall.runningTotal", Format.number(b.value));
					} },
					grid: { left: tilt ? 32 : 8, right: 16, top: labelled ? 28 : 12, bottom: 8, containLabel: true },
					xAxis: k.axis("category", { data: bars.map(function (b) { return b.name; }),
						axisLabel: { color: k.label, fontFamily: k.T.font(), interval: 0, rotate: tilt ? 45 : 0,
							width: tilt ? 90 : Math.max(60, width / Math.max(1, bars.length) - 8), overflow: "truncate" } }),
					yAxis: k.axis("value", { axisLabel: { color: k.label, formatter: function (v) { return fmt(v); } } }),
					series: [
						{ name: t("waterfall.base"), type: "bar", stack: "fall", silent: true, barMaxWidth: 36,
							itemStyle: { opacity: 0 }, emphasis: { disabled: true }, tooltip: { show: false }, data: base },
						Object.assign({}, visible, {
							name: t("waterfall.step"),
							data: bars.map(function (b, i) { return item(b, up[i]); }),
							label: Object.assign(k.labels(bars.length, function (p) {
								return text(bars[p.dataIndex]);
							}), { show: labelled, position: "top", fontSize: 11 })
						}),
						Object.assign({}, visible, {
							name: t("waterfall.belowZero"),
							data: bars.map(function (b, i) { return item(b, down[i]); }),
							label: Object.assign(k.labels(bars.length, function (p) {
								var b = bars[p.dataIndex];
								return b.hi <= 0 ? text(b) : "";
							}), { show: labelled, position: "bottom", fontSize: 11 })
						})
					]
				});
			});

			var part = Part.make({
				key: "waterfall",
				content: chart,
				empty: t("waterfall.empty"),
				render: function (steps) {
					if (!steps || !steps.length || missing(steps[0].value)) { part.state("empty"); return; }
					chart.setData(walk(steps));
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			// Gross revenue is the sample's actual revenue to date. Each deduction is a seeded share of it,
			// so the demo changes on replay; the totals are computed by the element, not typed.
			function steps(seed) {
				var random = Data.rng(seed * 17 + 3);
				var gross = Data.sample(seed).items.reduce(function (s, i) { return s + i.actual; }, 0) * 1000;
				function share(lo, hi) { return gross * (lo + random() * (hi - lo)); }
				return [
					{ name: t("waterfall.demo.gross"), value: gross },
					{ name: t("waterfall.demo.discounts"), value: -share(0.05, 0.09) },
					{ name: t("waterfall.demo.returns"), value: -share(0.01, 0.03) },
					{ name: t("waterfall.demo.tradeSpend"), value: -share(0.07, 0.11) },
					{ name: t("waterfall.demo.net"), total: true },
					{ name: t("waterfall.demo.costOfGoods"), value: -share(0.42, 0.5) },
					{ name: t("waterfall.demo.rebates"), value: share(0.01, 0.03) },
					{ name: t("waterfall.demo.grossMargin"), total: true },
					{ name: t("waterfall.demo.operatingCost"), value: -share(0.12, 0.17) },
					{ name: t("waterfall.demo.operatingProfit"), total: true }
				];
			}
			return {
				options: { label: t("waterfall.demo.label"), polarity: "up",
					format: function (v) { return Format.money(v, "USD", true); }, data: steps(7) },
				next: function (seed) { return steps(seed); }
			};
		}
	};
});
