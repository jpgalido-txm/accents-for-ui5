/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Period range: choose a first and last period with a range slider that only reaches periods the
 * data has, labelled as months. The chosen range is also stated in words above the slider.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/RangeSlider",
	"sap/m/ResponsiveScale",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/I18n"
], function (VBox, Label, Text, RangeSlider, ResponsiveScale, Part, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.common.i18n.i18n");

	/*
	 * A scale that labels each tick with a month. UI5's own scale labels ticks with numbers only; a
	 * scale may offer getLabel(value), which the slider then uses for tick labels and handle text.
	 */
	var PeriodScale = ResponsiveScale.extend("accents.elements.common.PeriodScale", {
		metadata: {},
		getLabel: function (value) {
			var p = (this._periods || [])[Math.round(value)];
			return p ? Format.period(p, true) : "";
		}
	});

	return {
		info: {
			controls: ["sap.m.RangeSlider", "sap.m.ResponsiveScale (month labels)", "sap.m.Text"],
			motion: "None. A setting moves only when a person moves it.",
			still: true
		},

		/**
		 * options:
		 *   label     short noun ("Periods")
		 *   onChange  optional; receives { from, to } as period keys
		 *   data      { periods: ["2026-01", ...] (only those the data has), from, to }
		 */
		create: function (o) {
			var scale = new PeriodScale({ tickmarksBetweenLabels: 1 });
			var slider = new RangeSlider({ min: 0, max: 1, step: 1, enableTickmarks: true, showAdvancedTooltip: false,
				showHandleTooltip: false, width: "100%", scale: scale }).addStyleClass("sapUiMediumMarginBottom");
			var said = new Text({ text: "" });
			var label = new Label({ text: o.label || t("periodRange.label"), labelFor: slider });
			var periods = [];
			function state() {
				var r = slider.getRange();
				var a = Math.min(r[0], r[1]), b = Math.max(r[0], r[1]);
				return { from: periods[a], to: periods[b], count: b - a + 1 };
			}
			function say() {
				var s = state();
				said.setText(t(s.count === 1 ? "periodRange.saidOne" : "periodRange.saidMany", Format.period(s.from), Format.period(s.to), s.count));
			}
			slider.attachLiveChange(say);
			slider.attachChange(function () { say(); if (o.onChange) { var s = state(); o.onChange({ from: s.from, to: s.to }); } });
			var content = new VBox({ renderType: "Bare", items: [label, said, slider] });

			var part = Part.make({
				key: "period-range",
				content: content,
				empty: t("periodRange.empty"),
				render: function (d) {
					periods = d.periods.slice();
					scale._periods = periods;
					// Ticks: a label on every period while they fit, otherwise every second or third.
					scale.setTickmarksBetweenLabels(periods.length > 12 ? 2 : 1);
					slider.setMax(Math.max(1, periods.length - 1));
					var a = Math.max(0, periods.indexOf(d.from)), b = periods.indexOf(d.to);
					slider.setRange([a, b < 0 ? periods.length - 1 : b]);
					slider.setEnabled(periods.length > 1);
					say();
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function d(seed) {
				var s = Data.sample(seed);
				// Only periods that have actuals: the range cannot reach months that have not happened.
				var have = s.periods.filter(function (p) { return p <= s.today; });
				return { periods: have, from: have[Math.max(0, have.length - 6)], to: have[have.length - 1] };
			}
			return { options: { label: t("periodRange.label"), data: d(7) }, next: function (seed) { return d(seed); } };
		}
	};
});
