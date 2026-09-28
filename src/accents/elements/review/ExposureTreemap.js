/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Exposure treemap: finds what is both large and doing badly. Each tile's area is its volume; its
 * colour is the measure on a diverging ramp from the theme, symmetric about zero. Tiles can be grouped
 * one level deep. Each tile carries its signed measure, and a legend gives both end values.
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
			motion: "Tiles resize and recolour to their new volumes and results when the data changes; the legend stays still.",
			still: false
		},

		/**
		 * options:
		 *   label          the question the chart answers ("Revenue at risk by category")
		 *   volumeLabel    what the tile area is ("Revenue")
		 *   measureLabel   what the colour is ("Against plan")
		 *   volumeFormat   function (value) -> text; default Format.short
		 *   measureFormat  function (value) -> signed text; default Format.delta(v, "percent")
		 *   polarity       "up" when a positive measure is good (default), "down" when it is bad
		 *   height         chart height (default "18rem")
		 *   onSelect       optional: makes tiles selectable; receives the row
		 *   data           [{ name, volume, measure, group? }]; rows without a positive volume are left out
		 */
		create: function (o) {
			var vfmt = o.volumeFormat || Format.short;
			var mfmt = o.measureFormat || function (v) { return Format.delta(v, "percent"); };
			var chart = new Chart({ label: o.label, height: o.height || "18rem", selectable: !!o.onSelect });
			chart.attachSelect(function (e) {
				var v = e.getParameter("value");
				var row = (chart.getData() || []).find(function (r) { return r.name === e.getParameter("name") && r.volume === (Array.isArray(v) ? v[0] : v); });
				if (o.onSelect && row) { o.onSelect(row); }
			});

			chart.setBuilder(function (rows, k) {
				var bg = k.T.background();
				var steps = 9;
				var ramp = k.T.ramp("diverge", steps);
				if (o.polarity === "down") { ramp = ramp.slice().reverse(); }
				var reach = rows.reduce(function (m, r) { return missing(r.measure) ? m : Math.max(m, Math.abs(r.measure)); }, 0) || 1;
				function colour(m) {
					if (missing(m)) { return k.T.mix(bg, k.status("neutral"), 0.25); }
					return ramp[Math.round((m / reach + 1) / 2 * (steps - 1))];
				}
				function leaf(r) {
					return { name: r.name, value: [r.volume, r.measure], itemStyle: { color: colour(r.measure) } };
				}
				var grouped = rows.some(function (r) { return r.group; });
				var data;
				if (grouped) {
					var groups = [];
					rows.forEach(function (r) {
						var g = r.group || r.name;
						var node = groups.find(function (x) { return x.name === g; });
						if (!node) { node = { name: g, children: [] }; groups.push(node); }
						node.children.push(leaf(r));
					});
					data = groups;
				} else {
					data = rows.map(leaf);
				}
				var leafLevel = { itemStyle: { borderColor: bg, borderWidth: 1, gapWidth: 1 } };
				return k.base({
					tooltip: { trigger: "item", confine: true, formatter: function (p) {
						var v = p.value;
						var volumeLabel = o.volumeLabel || t("exposureTreemap.volume");
						if (!Array.isArray(v)) { return t("exposureTreemap.tooltipGroup", p.name, volumeLabel, vfmt(v)); }
						return p.name + "<br>" + t("exposureTreemap.tooltipLine", volumeLabel, vfmt(v[0])) + "<br>" + t("exposureTreemap.tooltipLine", o.measureLabel || t("exposureTreemap.result"), mfmt(v[1]));
					} },
					// The legend only: the tiles carry their own colours, so this map targets no series.
					visualMap: {
						type: "continuous", seriesIndex: [], min: -reach, max: reach, calculable: false,
						orient: "horizontal", left: "center", bottom: 0, itemWidth: 12, itemHeight: 140,
						text: [mfmt(reach), mfmt(-reach)], textGap: 8,
						textStyle: { color: k.label, fontFamily: k.T.font() },
						inRange: { color: ramp }
					},
					series: [{
						type: "treemap",
						top: 4, left: 0, right: 0, bottom: 40,
						roam: false,
						nodeClick: false,
						breadcrumb: { show: false },
						label: { show: true, color: k.text, fontFamily: k.T.font(), fontSize: 12, overflow: "truncate",
							formatter: function (p) { return Array.isArray(p.value) ? p.name + "\n" + mfmt(p.value[1]) : p.name; } },
						upperLabel: { show: grouped, height: 20, color: k.label, fontFamily: k.T.font() },
						itemStyle: { borderColor: bg },
						levels: grouped ? [
							{ itemStyle: { borderColor: bg, borderWidth: 0, gapWidth: 4 }, upperLabel: { show: false } },
							{ itemStyle: { borderColor: bg, borderWidth: 2, gapWidth: 1, color: bg } },
							leafLevel
						] : [{ itemStyle: { borderColor: bg, borderWidth: 0, gapWidth: 2 } }, leafLevel],
						data: data
					}]
				});
			});

			var part = Part.make({
				key: "exposure-treemap",
				content: chart,
				empty: t("exposureTreemap.empty"),
				render: function (rows) {
					var list = (rows || []).filter(function (r) { return !missing(r.volume) && r.volume > 0; });
					if (!list.length) { part.state("empty"); return; }
					chart.setData(list);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			// Area: actual revenue to date. Colour: actual against plan, as a fraction of plan.
			function rows(seed) {
				return Data.sample(seed).items.map(function (i) {
					return { name: i.name, group: i.group, volume: i.actual * 1000, measure: Format.change(i.actual, i.plan) };
				});
			}
			return {
				options: { label: t("exposureTreemap.demo.label"), volumeLabel: t("exposureTreemap.demo.volumeLabel"), measureLabel: t("exposureTreemap.demo.measureLabel"),
					volumeFormat: function (v) { return Format.money(v, "USD", true); }, data: rows(7) },
				next: function (seed) { return rows(seed); }
			};
		}
	};
});
