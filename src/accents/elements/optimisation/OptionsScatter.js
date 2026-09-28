/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Options scatter: every option a run found, plus the starting point, placed by cost against return,
 * with the target as a dashed reference line. Options that meet the target are filled; those that fall
 * short are hollow rings, so the split reads without colour. The starting point is a labelled diamond.
 * Selecting a point calls onSelect; selectOption(id) highlights one from outside (for example from the
 * ranked table), so the two stay in step.
 */
sap.ui.define([
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/I18n",
	"accents/elements/optimisation/sampleOptions"
], function (Part, Chart, Format, I18n, sampleOptions) {
	"use strict";

	var t = I18n.use("accents.elements.optimisation.i18n.i18n");
	// Series names are read by screen readers in the chart's table, and also tell the two series apart.
	var OPTIONS = t("optionsScatter.series.options");
	var START = t("optionsScatter.series.start");

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)"],
			motion: "Points move to their new places when the data changes. A selected point grows, without animation of anything else.",
			still: false
		},

		/**
		 * options:
		 *   label     the question the chart answers ("Cost against return")
		 *   format    function (value) -> text for cost and return; default Format.short
		 *   height    chart height (default "18rem")
		 *   onSelect  optional: function (option); makes points selectable
		 *   data      { start: { cost, ret }, target, options: [{ id, name, cost, ret }] }
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var chart = new Chart({ label: o.label || t("optionsScatter.label"), height: o.height || "18rem", selectable: !!o.onSelect });
			var selected = null;
			var shown = [];

			chart.attachSelect(function (e) {
				if (e.getParameter("series") !== OPTIONS) { return; }
				var op = shown[e.getParameter("index")];
				if (!op) { return; }
				part.selectOption(op.id);
				o.onSelect(op);
			});

			chart.setBuilder(function (d, k) {
				var bg = k.T.background();
				var mark = k.series(0);
				var pts = d.options.map(function (op) {
					var met = op.ret >= d.target;
					var isSel = op.id === selected;
					return {
						value: [op.cost, op.ret],
						name: op.name,
						symbolSize: isSel ? 18 : 10,
						itemStyle: {
							color: met ? mark : bg,
							borderColor: isSel ? k.text : mark,
							borderWidth: isSel ? 3 : 1.5
						},
						label: { show: isSel, position: "top", formatter: op.name, color: k.text, fontFamily: k.T.font() }
					};
				});
				return k.base({
					tooltip: { trigger: "item", confine: true, formatter: function (p) {
						if (p.seriesName === START) { return t("optionsScatter.startTooltip", fmt(d.start.cost), fmt(d.start.ret)); }
						var op = d.options[p.dataIndex];
						return t(op.ret >= d.target ? "optionsScatter.metTooltip" : "optionsScatter.belowTooltip", op.name, fmt(op.cost), fmt(op.ret));
					} },
					grid: { left: 8, right: 24, top: 36, bottom: 24, containLabel: true },
					xAxis: k.axis("value", { name: t("optionsScatter.axis.cost"), nameLocation: "middle", nameGap: 26, scale: true,
						nameTextStyle: { color: k.label }, axisLabel: { color: k.label, hideOverlap: true, formatter: function (v) { return fmt(v); } } }),
					yAxis: k.axis("value", { name: t("optionsScatter.axis.return"), nameLocation: "end", scale: true,
						nameTextStyle: { color: k.label, align: "left" }, axisLabel: { color: k.label, formatter: function (v) { return fmt(v); } } }),
					series: [
						{
							type: "scatter", name: OPTIONS, data: pts, cursor: o.onSelect ? "pointer" : "default",
							emphasis: { scale: 1.3 },
							markLine: {
								silent: true, symbol: "none",
								lineStyle: { color: k.text, type: "dashed", width: 1 },
								label: { formatter: t("optionsScatter.target", fmt(d.target)), position: "insideEndTop", color: k.text, fontFamily: k.T.font() },
								data: [{ yAxis: d.target }]
							}
						},
						{
							type: "scatter", name: START, symbol: "diamond", symbolSize: 14,
							data: [{ value: [d.start.cost, d.start.ret], name: t("optionsScatter.startName") }],
							itemStyle: { color: k.label, borderColor: bg, borderWidth: 1 },
							label: { show: true, position: "right", formatter: t("optionsScatter.startMark"), color: k.text, fontFamily: k.T.font() }
						}
					]
				});
			});

			var part = Part.make({
				key: "options-scatter",
				content: chart,
				empty: t("optionsScatter.empty"),
				render: function (d) {
					shown = d.options;
					if (selected && !d.options.some(function (op) { return op.id === selected; })) { selected = null; }
					chart.setData(d);
					if (!d.options.length) { part.state("empty"); }
				}
			});

			/** Highlights one option (or none, with null) without firing onSelect. */
			part.selectOption = function (id) {
				selected = id || null;
				if (part.data()) { chart.setData(part.data()); }
				return part;
			};
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function data(seed) { var r = sampleOptions.run(Data, seed); return { start: r.start, target: r.target, options: r.options }; }
			return {
				options: {
					label: t("optionsScatter.label"),
					format: function (v) { return Format.money(v * 1000, "USD", true); },
					onSelect: function (op) {
						sap.ui.require(["sap/m/MessageToast"], function (MessageToast) {
							MessageToast.show(t("optionsScatter.demo.selected", op.name));
						});
					},
					data: data(7)
				},
				next: function (seed) { return data(seed); }
			};
		}
	};
});
