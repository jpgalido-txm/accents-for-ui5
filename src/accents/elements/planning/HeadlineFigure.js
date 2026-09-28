/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Headline figure: one key figure, its base, and the change between them. The change is coloured by
 * the key figure's polarity (is higher better or worse?), not by its sign. No assistant button: a
 * figure is not something a person acts on.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Text",
	"sap/m/ObjectStatus",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/I18n"
], function (VBox, HBox, Text, ObjectStatus, Part, Format, Motion, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.planning.i18n.i18n");

	function formatter(o) {
		switch (o.format) {
			case "money": return function (v) { return Format.money(v, o.currency, true); };
			case "percent": return function (v) { return Format.percent(v); };
			case "number": return function (v) { return Format.number(v, o.digits); };
			default: return Format.short;
		}
	}

	return {
		info: {
			controls: ["sap.m.Text", "sap.m.ObjectStatus", "sap.m.VBox"],
			motion: "Counts up to a new value and flashes once, in the tone of the change.",
			still: false
		},

		/**
		 * options:
		 *   label     short noun naming the figure ("Net revenue")
		 *   unit      optional unit shown after the figure ("cases")
		 *   polarity  "up" when higher is better, "down" when lower is better
		 *   format    "short" (default), "money", "percent" or "number"; currency for money
		 *   baseLabel what the base is ("Plan", "Last year"); default "Base"
		 *   data      { value, base }
		 *   onPress   optional drill to the chart or grid behind the figure
		 */
		create: function (o) {
			var fmt = formatter(o);
			var figure = new Text({ text: "" }).addStyleClass("accFigure");
			var unit = new Text({ text: o.unit || "", visible: !!o.unit }).addStyleClass("accFigureUnit");
			var delta = new ObjectStatus({ text: "", state: "None" }).addStyleClass("accDelta");
			var base = new Text({ text: "" }).addStyleClass("accLabel");
			var content = new VBox({ renderType: "Bare", items: [
				new Text({ text: o.label }).addStyleClass("accLabel"),
				new HBox({ items: [figure, unit], alignItems: "Baseline", renderType: "Bare" }),
				new HBox({ items: [delta, base], alignItems: "Center", renderType: "Bare" }).addStyleClass("sapUiTinyMarginTop")
			] });
			base.addStyleClass("sapUiTinyMarginBegin");
			if (o.onPress) {
				content.attachBrowserEvent("click", o.onPress);
				content.addStyleClass("sapUiCursorPointer");
			}

			var part = Part.make({
				key: "headline-figure",
				content: content,
				empty: t("headlineFigure.empty"),
				render: function (d, prev) {
					var change = d.base === null || d.base === undefined ? null : d.value - d.base;
					var tone = Format.tone(change, o.polarity);
					var pct = Format.change(d.value, d.base);
					delta.setText(change === null ? t("headlineFigure.noBase") : Format.delta(pct !== null ? pct : change, pct !== null ? "percent" : "short"));
					delta.setState(Format.state(tone));
					delta.setIcon(change === null ? "" : Format.arrow(change));
					base.setText(t("headlineFigure.baseValue", o.baseLabel || t("headlineFigure.base"), fmt(d.base)));
					figure.setTooltip(Format.number(d.value, o.digits));
					figure.setProperty("text", fmt(d.value), true);
					var el = figure.getDomRef();
					if (el && prev && prev.value !== d.value) {
						Motion.countTo(el, prev.value, d.value, fmt, 600);
						Motion.flash(el, Format.tone(d.value - prev.value, o.polarity));
					} else if (el) {
						el.textContent = fmt(d.value);
					}
				}
			});
			figure.addEventDelegate({ onAfterRendering: function () {
				var d = part.data();
				if (d) { figure.getDomRef().textContent = fmt(d.value); }
			} });
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function pick(seed) {
				var s = Data.sample(seed);
				var actual = s.items.reduce(function (a, i) { return a + i.actual; }, 0) * 1000;
				var plan = s.items.reduce(function (a, i) { return a + i.plan; }, 0) * 1000;
				return { value: actual, base: plan };
			}
			return {
				options: { label: t("headlineFigure.demo.label"), format: "money", currency: "USD", polarity: "up", baseLabel: t("headlineFigure.demo.baseLabel"), data: pick(7) },
				next: function (seed) { return pick(seed); }
			};
		}
	};
});
