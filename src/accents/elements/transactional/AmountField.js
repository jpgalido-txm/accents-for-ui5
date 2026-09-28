/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Amount field: an amount of money with its currency, or a quantity with its unit. The person types
 * the number the way their language writes it ("1.234,5" in German, "1,234.5" in English); the field
 * reads it with UI5's number format, shows it back in the same format, and checks the limits. The
 * unit is either fixed (shown beside the number) or chosen from a short list.
 *
 * It follows the same small field interface as the value-help field (see ValueHelpField.js).
 */
sap.ui.define([
	"sap/m/Input",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/Select",
	"sap/m/HBox",
	"sap/m/VBox",
	"sap/m/FlexItemData",
	"sap/ui/core/Item",
	"sap/ui/core/InvisibleText",
	"sap/ui/core/VariantLayoutData",
	"sap/ui/layout/form/ColumnElementData",
	"sap/ui/core/format/NumberFormat",
	"accents/core/Part",
	"accents/core/Messages",
	"accents/core/I18n"
], function (Input, Label, Text, Select, HBox, VBox, FlexItemData, Item, InvisibleText, VariantLayoutData, ColumnElementData, NumberFormat,
	Part, Messages, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");

	function missing(v) { return v === null || v === undefined || (typeof v === "number" && isNaN(v)); }

	function create(o) {
		var money = o.kind !== "quantity";
		var decimals = o.decimals === undefined ? (money ? 2 : 0) : o.decimals;
		var required = !!o.required;
		var value = missing(o.value) ? null : o.value;
		var unit = o.unit || (o.units && o.units[0] && o.units[0].key) || "";
		var listeners = o.onChange ? [o.onChange] : [];
		var typedBad = false;

		// The number as the person's language writes it, without the unit (the unit sits beside it).
		var numberFormat = NumberFormat.getFloatInstance({ minFractionDigits: decimals, maxFractionDigits: decimals, groupingEnabled: true });
		var parser = NumberFormat.getFloatInstance({ groupingEnabled: true });

		function unitText(k) {
			var u = (o.units || []).find(function (x) { return x.key === k; });
			return u ? u.text : k;
		}
		function formatted(v) { return missing(v) ? "" : numberFormat.format(v); }

		var input = new Input({
			width: "100%",
			textAlign: "End",
			required: required,
			placeholder: o.placeholder || t("amount.placeholder", numberFormat.format(money ? 1250 : 12)),
			change: function () { read(); },
			liveChange: function () {
				// Check as you type, but only speak up once the text holds something no number can contain.
				var raw = input.getValue().trim();
				if (/[^\d\s.,'\u00a0\u202f+\-\u2212]/.test(raw)) {
					Messages.field(input, t("amount.notNumber", o.label || t("amount.thing"), numberFormat.format(money ? 1250.5 : 12)));
				} else if (input.getValueState() === "Error") { Messages.clearField(input); }
			}
		}).addStyleClass("accTabular");
		// One layout for the field's own row, one for a form row (a form places the number and unit side by side).
		input.setLayoutData(new VariantLayoutData({ multipleLayoutData: [new FlexItemData({ growFactor: 1, minWidth: "0" }),
			new ColumnElementData({ cellsSmall: 8, cellsLarge: 5 })] }));
		if (o.group) { input.data("accGroup", o.group); }

		var unitName = new InvisibleText({ text: money ? t("amount.currency") : t("amount.unit") }).toStatic();
		var unitControl;
		if (o.units && o.units.length > 1) {
			unitControl = new Select({
				selectedKey: unit,
				width: "7rem",
				ariaLabelledBy: [unitName],
				items: o.units.map(function (u) { return new Item({ key: u.key, text: u.text }); }),
				change: function (e) { unit = e.getParameter("selectedItem").getKey(); fire(); }
			}).addStyleClass("sapUiTinyMarginBegin");
		} else {
			unitControl = new Text({ text: unitText(unit), wrapping: false }).addStyleClass("sapUiTinyMarginBegin accLabel");
		}
		unitControl.setLayoutData(new VariantLayoutData({ multipleLayoutData: [new FlexItemData({ shrinkFactor: 0 }),
			new ColumnElementData({ cellsSmall: 4, cellsLarge: 3 })] }));
		var row = new HBox({ renderType: "Bare", alignItems: "Center", items: [input, unitControl] });

		function fire() { listeners.forEach(function (fn) { fn(value, part); }); }

		function read() {
			var raw = input.getValue().trim();
			if (!raw) { value = null; typedBad = false; }
			else {
				var v = parser.parse(raw);
				typedBad = isNaN(v);
				value = typedBad ? null : Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
				if (!typedBad) { input.setValue(formatted(value)); }
			}
			part.validate();
			fire();
		}

		var label = o.bare ? null : new Label({ text: o.label, labelFor: input, required: required, showColon: false });
		var box = new VBox({ renderType: "Bare", width: o.width || "100%", items: label ? [label, row] : [row] });

		var part = Part.make({
			key: "amount-field",
			content: box,
			onDestroy: function () { unitName.destroy(); },
			render: function (d) {
				if (d && "unit" in d && d.unit) { unit = d.unit; if (unitControl.setSelectedKey) { unitControl.setSelectedKey(unit); } else { unitControl.setText(unitText(unit)); } }
				if (d && "value" in d) { value = missing(d.value) ? null : d.value; typedBad = false; input.setValue(formatted(value)); }
			}
		});
		part.input = input;
		part.fields = [input, unitControl];
		part.label = label;
		part.value = function () { return value; };
		part.unit = function () { return unit; };
		part.setValue = function (v, u) { part.update(u ? { value: v, unit: u } : { value: v }); Messages.clearField(input); return part; };
		/** The value with its unit in the person's format: "1,250.00 EUR", "12 cases". */
		part.text = function () {
			if (missing(value)) { return ""; }
			if (money) { return NumberFormat.getCurrencyInstance({ minFractionDigits: decimals, maxFractionDigits: decimals }).format(value, unit); }
			return t("amount.withUnit", numberFormat.format(value), unitText(unit));
		};
		part.check = function () {
			var name = o.label || t("amount.thing");
			if (typedBad) { return t("amount.notNumber", name, numberFormat.format(money ? 1250.5 : 12)); }
			if (missing(value)) { return required ? t("field.required", name) : null; }
			if (!missing(o.min) && value < o.min) { return t("amount.tooLow", name, numberFormat.format(o.min)); }
			if (!missing(o.max) && value > o.max) { return t("amount.tooHigh", name, numberFormat.format(o.max)); }
			return null;
		};
		part.validate = function () {
			var problem = part.check();
			if (problem) { Messages.field(input, problem); } else { Messages.clearField(input); }
			return problem ? 1 : 0;
		};
		part.clearMessage = function () { Messages.clearField(input); };
		part.attachChange = function (fn) { listeners.push(fn); return part; };
		part.setRequired = function (b) { required = !!b; input.setRequired(required); if (label) { label.setRequired(required); } return part; };
		part.setGroup = function (g) { input.data("accGroup", g); return part; };
		part.update({ value: value });
		return part;
	}

	return {
		info: {
			controls: ["sap.m.Input", "sap.m.Select", "sap.ui.core.format.NumberFormat"],
			motion: "None. A field never animates.",
			still: true
		},

		/**
		 * options:
		 *   label        the field's name ("Order value")
		 *   kind         "currency" (default) or "quantity"
		 *   value        a number, or null
		 *   unit         the currency code or unit key
		 *   units        optional [{ key, text }]; more than one shows a choice beside the number
		 *   decimals     digits after the decimal point (default 2 for money, 0 for quantities)
		 *   min, max     optional limits, checked on every change
		 *   required, group, bare, placeholder, onChange(value, part)  as in the value-help field
		 */
		create: create,

		example: function () {
			var units = [{ key: "EUR", text: "EUR" }, { key: "USD", text: "USD" }, { key: "GBP", text: "GBP" }];
			return {
				options: { label: t("amount.demo.label"), kind: "currency", value: 1250, unit: "EUR", units: units, min: 1, max: 50000,
					required: true, group: t("amount.demo.group") },
				next: function (seed) { return { value: 500 + (seed * 137) % 4000 }; }
			};
		}
	};
});
