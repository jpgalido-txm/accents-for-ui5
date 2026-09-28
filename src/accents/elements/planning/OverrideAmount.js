/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Override amount: an on-off override paired with a precise amount. While the override is off, the
 * calculated value applies and the amount field is disabled and says so; switching it on starts the
 * amount at the calculated value, so a person changes a real figure rather than a blank.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/FlexBox",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/Switch",
	"sap/m/StepInput",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/I18n"
], function (VBox, FlexBox, Label, Text, Switch, StepInput, Part, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.planning.i18n.i18n");

	return {
		info: {
			controls: ["sap.m.Switch", "sap.m.StepInput"],
			motion: "None. A setting never animates; the figures it changes move instead.",
			still: true
		},

		/**
		 * options:
		 *   label    short noun ("Promotion budget")
		 *   unit     unit after the amount ("USD")
		 *   min, max, step, digits   limits of the amount
 *   width    width of the amount field (default "16rem", room for millions)
		 *   data     { on, amount, calculated }   calculated = the value used while the override is off
		 *   onChange({ on, amount })  called when the switch or the amount changes
		 */
		create: function (o) {
			var digits = o.digits || 0;
			var state = { on: false, amount: null, calculated: null };
			var label = new Label({ text: o.label });
			var sw = new Switch({ customTextOn: t("overrideAmount.on"), customTextOff: t("overrideAmount.off") });
			var field = new StepInput({ min: o.min, max: o.max, step: o.step || 1, displayValuePrecision: digits, width: o.width || "16rem",
				description: o.unit || "", fieldWidth: o.unit ? "78%" : "100%", textAlign: "End" });
			var note = new Text({ text: "" }).addStyleClass("accLabel");
			label.setLabelFor(sw);
			field.addAriaLabelledBy(label);

			function tell() { if (o.onChange) { o.onChange({ on: state.on, amount: state.on ? state.amount : null }); } }

			function draw() {
				sw.setState(state.on);
				field.setEnabled(state.on);
				field.setTooltip(state.on ? t("overrideAmount.field.on") : t("overrideAmount.field.off"));
				field.setValue(state.on ? state.amount : state.calculated);
				var calc = Format.number(state.calculated, digits) + (o.unit ? " " + o.unit : "");
				note.setText(t(state.on ? "overrideAmount.note.on" : "overrideAmount.note.off", calc));
			}

			sw.attachChange(function (e) {
				state.on = e.getParameter("state");
				if (state.on && (state.amount === null || state.amount === undefined)) { state.amount = state.calculated; }
				draw();
				tell();
			});
			field.attachChange(function (e) {
				var v = e.getParameter("value");
				if (!state.on || typeof v !== "number" || isNaN(v)) { return; }
				state.amount = v;
				draw();
				tell();
			});

			var content = new VBox({ renderType: "Bare", items: [
				label,
				new FlexBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [sw.addStyleClass("sapUiSmallMarginEnd"), field] }),
				note
			] });

			var part = Part.make({
				key: "override-amount",
				content: content,
				empty: t("overrideAmount.empty"),
				render: function (d) {
					state.on = !!d.on;
					state.amount = d.amount === undefined ? null : d.amount;
					state.calculated = d.calculated === undefined ? null : d.calculated;
					draw();
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function make(seed) {
				var s = Data.sample(seed);
				// Sample rule: the calculated budget is a tenth of planned revenue (plan is in thousands).
				var calculated = Math.round(s.items.reduce(function (a, i) { return a + i.plan; }, 0) * 1000 * 0.1 / 1000) * 1000;
				return { on: true, amount: Math.round(calculated * 1.1 / 1000) * 1000, calculated: calculated };
			}
			return {
				options: { label: t("overrideAmount.demo.label"), unit: "USD", min: 0, max: 10000000, step: 1000, data: make(7), onChange: function () {} },
				next: function (seed) { return make(seed); }
			};
		}
	};
});
