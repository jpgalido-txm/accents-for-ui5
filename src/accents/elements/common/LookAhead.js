/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Look-ahead: how many periods forward to consider, as a stepped input. The default is stated next to
 * it, and a reset returns to the default; the reset is enabled only when the value differs from it.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/StepInput",
	"sap/m/Button",
	"accents/core/Part",
	"accents/core/I18n"
], function (VBox, HBox, Label, Text, StepInput, Button, Part, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.common.i18n.i18n");

	return {
		info: {
			controls: ["sap.m.StepInput", "sap.m.Button", "sap.m.Text"],
			motion: "None. A setting moves only when a person changes it.",
			still: true
		},

		/**
		 * options:
		 *   label     short noun ("Look-ahead")
		 *   onChange  optional; receives the new number of periods
		 *   data      { value, defaultValue, min, max, unit ("months") }
		 */
		create: function (o) {
			var d0 = null;
			var input = new StepInput({ step: 1, width: "13rem", fieldWidth: "8rem", validationMode: "LiveChange" });
			var stated = new Text({ text: "" }).addStyleClass("accLabel sapUiTinyMarginTop");
			var reset = new Button({ text: t("lookAhead.useDefault"), type: "Transparent" });
			var label = new Label({ text: o.label || t("lookAhead.label"), labelFor: input });
			function sync() {
				if (!d0) { return; }
				reset.setEnabled(input.getValue() !== d0.defaultValue);
				reset.setTooltip(reset.getEnabled() ? t("lookAhead.backTo", d0.defaultValue, d0.unit) : t("lookAhead.atDefault"));
			}
			input.attachChange(function () { sync(); if (o.onChange) { o.onChange(input.getValue()); } });
			reset.attachPress(function () { input.setValue(d0.defaultValue); sync(); if (o.onChange) { o.onChange(d0.defaultValue); } });
			var content = new VBox({ renderType: "Bare", items: [
				label,
				new HBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [input, reset] }),
				stated
			] });

			var part = Part.make({
				key: "look-ahead",
				content: content,
				empty: t("lookAhead.empty"),
				render: function (d) {
					d0 = d;
					input.setMin(d.min);
					input.setMax(d.max);
					input.setDescription(d.unit);
					input.setValue(d.value);
					stated.setText(t("lookAhead.stated", d.defaultValue, d.unit, d.max));
					sync();
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function d(seed) {
				var s = Data.sample(seed);
				var ahead = s.periods.filter(function (p) { return p > s.today; }).length;
				// Default: a quarter ahead, or every future period when fewer than three remain.
				var def = Math.min(3, ahead);
				return { value: def, defaultValue: def, min: 1, max: ahead, unit: t("lookAhead.demo.unit") };
			}
			return { options: { label: t("lookAhead.label"), data: d(7) }, next: function (seed) { return d(seed); } };
		}
	};
});
