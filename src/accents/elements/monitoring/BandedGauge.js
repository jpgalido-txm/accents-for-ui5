/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Banded gauge: one actual as a bar laid over coloured bands (poor, watch, good), with the target as a
 * thin marker. It answers "how far is this from where it should be?". The band the actual falls in is
 * also written out in words, so colour is never the only signal. With no target there is no marker,
 * and the caption and tooltip say so rather than leaving the reader to wonder.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Text",
	"sap/m/ObjectStatus",
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/I18n"
], function (VBox, HBox, Text, ObjectStatus, Part, Chart, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.monitoring.i18n.i18n");

	var STATE = { bad: "Error", critical: "Warning", good: "Success" };
	var ICON = { bad: "sap-icon://error", critical: "sap-icon://alert", good: "sap-icon://sys-enter-2" };
	var NO_TARGET = t("bandedGauge.noTarget");

	/** The band an actual falls in: the first band whose upper end is at or above it. */
	function bandOf(bands, v) {
		for (var i = 0; i < bands.length; i++) { if (v <= bands[i].to) { return bands[i]; } }
		return bands[bands.length - 1];
	}

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)", "sap.m.ObjectStatus", "sap.m.Text"],
			motion: "The actual bar grows or shrinks to its new length and the marker moves when the data changes.",
			still: false
		},

		/**
		 * options:
		 *   label   the question the gauge answers ("Service level")
		 *   format  function (value) -> text; default Format.number
 *   axisFormat  optional shorter format for the scale; default format
		 *   height  chart height (default "8rem")
		 *   data    { actual, target (null for none), min (default 0),
		 *             bands: [{ to, status: "bad" | "critical" | "good", name }] in ascending order }
		 */
		create: function (o) {
			var fmt = o.format || function (v) { return Format.number(v); };
			var axisFmt = o.axisFormat || fmt;
			var chart = new Chart({ label: o.label || t("bandedGauge.label"), height: o.height || "8rem" });
			var status = new ObjectStatus({ text: "" });
			var caption = new Text({ text: "" }).addStyleClass("accLabel accTabular sapUiSmallMarginBegin");

			chart.setBuilder(function (d, k) {
				var min = d.min || 0;
				var bg = k.T.background();
				// Bands overlap, widest first, so each narrower band sits on top of the one beyond it.
				// Bars start at the axis minimum, so each band is drawn from there to its upper end.
				var bandSeries = d.bands.map(function (b, i) {
					var start = i === 0 ? min : d.bands[i - 1].to;
					return {
						type: "bar", yAxisIndex: 0, barWidth: 34, barGap: "-100%", name: b.name,
						data: [{ value: b.to, itemStyle: { color: k.T.mix(k.status(b.status), bg, 0.6) } }],
						// The band's name sits at its upper end, so the bands read without colour.
						label: { show: true, position: "insideBottomRight", distance: 2, formatter: b.name,
							color: k.text, fontFamily: k.T.font(), fontSize: 10 },
						tooltip: { formatter: function () { return t("bandedGauge.band", b.name, fmt(start), fmt(b.to)); } },
						z: 1
					};
				}).reverse();
				var hasTarget = d.target !== null && d.target !== undefined;
				var series = bandSeries.concat([{
					type: "bar", yAxisIndex: 1, barWidth: 8, name: t("bandedGauge.actual"), z: 3,
					data: [{ value: d.actual, itemStyle: { color: k.text, borderRadius: [0, 2, 2, 0] } }],
					tooltip: { formatter: function () {
						return t("bandedGauge.actualValue", fmt(d.actual)) + (hasTarget ? " · " + t("bandedGauge.targetValue", fmt(d.target)) : "<br>" + NO_TARGET);
					} }
				}]);
				if (hasTarget) {
					series.push({
						type: "scatter", yAxisIndex: 1, name: t("bandedGauge.target"), z: 4, symbol: "rect", symbolSize: [3, 44],
						data: [[d.target, 0]],
						itemStyle: { color: k.text },
						tooltip: { formatter: function () { return t("bandedGauge.targetValue", fmt(d.target)); } }
					});
				}
				var cat = function (show) {
					return k.axis("category", { data: ["actual"], show: show, axisLine: { show: false }, axisLabel: { show: false } });
				};
				return k.base({
					tooltip: { trigger: "item", confine: true },
					grid: { left: 20, right: 20, top: 8, bottom: 8, containLabel: true },
					xAxis: k.axis("value", { min: min, max: d.bands[d.bands.length - 1].to,
						splitNumber: 4,
						axisLabel: { color: k.label, hideOverlap: true, formatter: function (v) { return axisFmt(v); } },
						splitLine: { show: false }, axisLine: { show: true, lineStyle: { color: k.line } } }),
					yAxis: [cat(false), cat(false)],
					series: series
				});
			});

			var part = Part.make({
				key: "banded-gauge",
				content: new VBox({ renderType: "Bare", items: [
					chart,
					new HBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [status, caption] })
				] }),
				empty: t("bandedGauge.empty"),
				render: function (d) {
					if (d.actual === null || d.actual === undefined) { part.state("empty"); return; }
					var band = bandOf(d.bands, d.actual);
					status.setText(band.name);
					status.setState(STATE[band.status] || "None");
					status.setIcon(ICON[band.status] || "");
					var hasTarget = d.target !== null && d.target !== undefined;
					caption.setText(t("bandedGauge.actualValue", fmt(d.actual)) + " · " + (hasTarget ? t("bandedGauge.targetValue", fmt(d.target)) : t("bandedGauge.noTargetShort")));
					caption.setTooltip(hasTarget ? t("bandedGauge.marker") : NO_TARGET);
					chart.setData(d);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			/**
			 * Year-to-date sales as a percent of plan, over all sample categories. Bands: below 95% of plan
			 * is poor, 95–100% is watch, above is good. The target is the sample data's own target, as a
			 * percent of plan. Every third seed drops the target, to show the gauge without a marker.
			 */
			function data(seed) {
				var items = Data.sample(seed).items;
				var sum = function (k) { return items.reduce(function (s, i) { return s + i[k]; }, 0); };
				var plan = sum("plan");
				return {
					actual: Data.round(sum("actual") / plan * 100, 1),
					target: seed % 3 === 0 ? null : Data.round(sum("target") / plan * 100, 1),
					min: 80,
					bands: [
						{ to: 95, status: "bad", name: t("bandedGauge.demo.poor") },
						{ to: 100, status: "critical", name: t("bandedGauge.demo.watch") },
						{ to: 110, status: "good", name: t("bandedGauge.demo.good") }
					]
				};
			}
			return {
				options: { label: t("bandedGauge.demo.label"), format: function (v) { return Format.number(v, 1) + "%"; },
					axisFormat: function (v) { return Format.number(v) + "%"; }, data: data(7) },
				next: function (seed) { return data(seed); }
			};
		}
	};
});
