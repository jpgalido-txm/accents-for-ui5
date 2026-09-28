/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Base against scenario: paired columns per item. The base is solid; the scenario is the same colour,
 * hatched, so the eye reads them as one measure in two versions rather than two different measures.
 */
sap.ui.define([
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/I18n"
], function (Part, Chart, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.simulation.i18n.i18n");

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)"],
			motion: "Columns grow or shrink to their new heights when the data changes.",
			still: false
		},

		/**
		 * options:
		 *   label          the question the chart answers ("Revenue: base against scenario")
		 *   baseLabel      default "Base"; scenarioLabel default "Scenario"
		 *   format         function (value) -> text; default Format.short
		 *   height         chart height (default "16rem")
		 *   onSelect       optional: makes columns selectable; receives the item
		 *   data           [{ name, base, scenario }]
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var baseName = o.baseLabel || t("baseVsScenario.base"), scenName = o.scenarioLabel || t("baseVsScenario.scenario");
			var chart = new Chart({ label: o.label || t("baseVsScenario.label", baseName, scenName), height: o.height || "16rem", selectable: !!o.onSelect });
			chart.attachSelect(function (e) {
				var rows = chart.getData() || [];
				if (o.onSelect && rows[e.getParameter("index")]) { o.onSelect(rows[e.getParameter("index")]); }
			});
			chart.setBuilder(function (rows, k) {
				var colour = k.series(0);
				// Category names share the width equally and are shortened rather than dropped when space is tight.
				var inst = chart.instance();
				var slot = Math.max(32, ((inst ? inst.getWidth() : 640) - 64) / Math.max(1, rows.length) - 6);
				var label = Object.assign(k.labels(rows.length, function (p) { return fmt(p.value); }), { position: "top", fontSize: 11 });
				return k.base({
					grid: { left: 8, right: 8, top: 24, bottom: 32, containLabel: true },
					legend: Object.assign(k.legend(true), { data: [baseName, scenName] }),
					tooltip: Object.assign(k.base().tooltip, { trigger: "axis", axisPointer: { type: "shadow" }, formatter: function (ps) {
						var r = rows[ps[0].dataIndex];
						var pct = Format.change(r.scenario, r.base);
						return r.name + "<br/>" + t("baseVsScenario.tooltip.value", baseName, fmt(r.base)) + "<br/>" + t("baseVsScenario.tooltip.value", scenName, fmt(r.scenario)) +
							"<br/>" + t("baseVsScenario.tooltip.change", Format.delta(r.scenario === null || r.base === null ? null : r.scenario - r.base, "short")) +
							(pct === null ? "" : " (" + Format.delta(pct, "percent") + ")");
					} }),
					xAxis: k.axis("category", { data: rows.map(function (r) { return r.name; }), axisLabel: { color: k.label, interval: 0, width: slot, overflow: "truncate" } }),
					yAxis: k.axis("value", { axisLabel: { color: k.label, formatter: function (v) { return fmt(v); } } }),
					series: [
						{ name: baseName, type: "bar", barMaxWidth: 22, barGap: "12%", data: rows.map(function (r) { return r.base; }),
							itemStyle: { color: colour, borderRadius: [3, 3, 0, 0] }, label: label, labelLayout: { hideOverlap: true } },
						{ name: scenName, type: "bar", barMaxWidth: 22, data: rows.map(function (r) { return r.scenario; }),
							itemStyle: { color: colour, borderColor: colour, borderRadius: [3, 3, 0, 0], decal: k.hatch() }, label: label, labelLayout: { hideOverlap: true } }
					]
				});
			});

			var part = Part.make({
				key: "base-vs-scenario",
				content: chart,
				empty: t("baseVsScenario.empty"),
				render: function (rows) {
					if (!rows.length) { part.state("empty"); return; }
					chart.setData(rows);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function rows(seed) {
				var r = Data.rng(seed * 17);
				return Data.sample(seed).items.slice(0, 6).map(function (i) {
					var base = i.actual * 1000;
					return { name: i.name, base: base, scenario: Math.round(base * (0.88 + r() * 0.26)) };
				});
			}
			return {
				options: { label: t("baseVsScenario.demo.label"), format: function (v) { return Format.money(v, "USD", true); }, data: rows(7) },
				next: function (seed) { return rows(seed); }
			};
		}
	};
});
