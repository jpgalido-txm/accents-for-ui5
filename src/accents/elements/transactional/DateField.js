/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Date field: one date, a date range, or a relative choice such as "last 7 days" or "this month".
 * The person may type the date in their own format or pick it from the calendar; both are accepted.
 * Limits are checked on every change, and a date outside them is named with the allowed range. A
 * relative choice always shows the real dates it stands for, so nobody has to work them out.
 *
 * It follows the same small field interface as the value-help field (see ValueHelpField.js).
 */
sap.ui.define([
	"sap/m/DatePicker",
	"sap/m/DateRangeSelection",
	"sap/m/DynamicDateRange",
	"sap/m/DynamicDateFormat",
	"sap/m/DynamicDateUtil",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/VBox",
	"sap/ui/core/format/DateFormat",
	"accents/core/Part",
	"accents/core/Messages",
	"accents/core/I18n"
], function (DatePicker, DateRangeSelection, DynamicDateRange, DynamicDateFormat, DynamicDateUtil, Label, Text, VBox, DateFormat,
	Part, Messages, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");
	var RELATIVE = ["DATE", "DATERANGE", "TODAY", "YESTERDAY", "LASTDAYS", "NEXTDAYS", "THISWEEK", "LASTWEEK",
		"THISMONTH", "LASTMONTH", "THISQUARTER", "LASTQUARTER", "THISYEAR"];

	function day(d) { return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null; }
	function medium() { return DateFormat.getDateInstance({ style: "medium" }); }
	function interval(a, b) { return DateFormat.getDateInstance({ style: "medium", interval: true }).format([a, b]); }

	function create(o) {
		var mode = o.mode || "single";
		var required = !!o.required;
		var min = day(o.min), max = day(o.max);
		var listeners = o.onChange ? [o.onChange] : [];
		var typedBad = false;
		var control;

		function fire() { listeners.forEach(function (fn) { fn(part.value(), part); }); }
		var typedDate = null;   // a typed date the picker refused because it is outside the limits
		function changed(e) {
			var valid = e.getParameter("valid");
			var raw = mode === "relative" ? "" : control.getValue().trim();
			typedBad = valid === false && (mode === "relative" || !!raw);
			typedDate = null;
			if (typedBad && mode === "single") {
				typedDate = readTyped(raw);
				if (typedDate) { typedBad = false; }
			}
			part.validate();
			fire();
		}
		/** Reads a typed date in any of the language's standard styles; null when it is not a date. */
		function readTyped(raw) {
			var styles = ["medium", "short", "long"];
			for (var i = 0; i < styles.length; i++) {
				var d = DateFormat.getDateInstance({ style: styles[i] }).parse(raw);
				if (d && !isNaN(d.getTime())) { return day(d); }
			}
			return null;
		}

		if (mode === "range") {
			control = new DateRangeSelection({ width: "100%", required: required, change: changed });
		} else if (mode === "relative") {
			control = new DynamicDateRange({ width: "100%", required: required, standardOptions: o.options || RELATIVE, change: changed });
		} else {
			control = new DatePicker({ width: "100%", required: required, change: changed });
		}
		if (mode !== "relative") {
			if (min) { control.setMinDate(min); }
			if (max) { control.setMaxDate(max); }
		}
		if (o.group) { control.data("accGroup", o.group); }

		/** The dates the field stands for: [start, end], or null. */
		function dates() {
			if (mode === "single") { var d = control.getDateValue(); return d ? [day(d), day(d)] : null; }
			if (mode === "range") {
				var a = control.getDateValue(), b = control.getSecondDateValue();
				return a ? [day(a), day(b || a)] : null;
			}
			var v = control.getValue();
			if (!v) { return null; }
			try {
				var r = DynamicDateUtil.toDates(v);
				return [day(new Date(r[0].getTime())), day(new Date(r[r.length - 1].getTime()))];
			} catch (err) { return null; }
		}

		var hint = mode === "relative" ? new Text({ text: "" }).addStyleClass("accLabel sapUiTinyMarginTop") : null;
		function writeHint() {
			if (!hint) { return; }
			var d = dates();
			hint.setText(d ? t("date.standsFor", interval(d[0], d[1])) : "");
			hint.setVisible(!!d);
		}
		listeners.push(writeHint);

		var label = o.bare ? null : new Label({ text: o.label, labelFor: control, required: required, showColon: false });
		var box = new VBox({ renderType: "Bare", width: o.width || "100%", items: [].concat(label ? [label] : [], [control], hint ? [hint] : []) });

		var part = Part.make({
			key: "date-field",
			content: box,
			render: function (d) {
				if (!d || !("value" in d)) { return; }
				typedBad = false;
				typedDate = null;
				var v = d.value;
				if (mode === "single") { control.setDateValue(v ? new Date(v) : null); }
				else if (mode === "range") { control.setDateValue(v ? new Date(v.start) : null); control.setSecondDateValue(v ? new Date(v.end) : null); }
				else { control.setValue(v || null); }
				writeHint();
			}
		});
		part.input = control;
		part.fields = [control];
		part.label = label;
		part.dates = dates;
		part.value = function () {
			if (mode === "relative") { return control.getValue() || null; }
			var d = dates();
			if (!d) { return null; }
			return mode === "single" ? d[0] : { start: d[0], end: d[1] };
		};
		part.setValue = function (v) { part.update({ value: v }); Messages.clearField(control); return part; };
		part.text = function () {
			var d = dates();
			if (!d) { return ""; }
			if (mode === "single") { return medium().format(d[0]); }
			if (mode === "range") { return interval(d[0], d[1]); }
			return t("date.relativeShown", DynamicDateFormat.getInstance().format(control.getValue()), interval(d[0], d[1]));
		};
		part.check = function () {
			var name = o.label || t("date.thing");
			if (typedBad) { return t("date.notDate", name, medium().format(min || max || new Date())); }
			var d = typedDate ? [typedDate, typedDate] : dates();
			if (!d) { return required ? t("field.required", name) : null; }
			if (min && max && (d[0] < min || d[1] > max)) { return t("date.between", name, medium().format(min), medium().format(max)); }
			if (min && d[0] < min) { return t("date.notBefore", name, medium().format(min)); }
			if (max && d[1] > max) { return t("date.notAfter", name, medium().format(max)); }
			return null;
		};
		part.validate = function () {
			var problem = part.check();
			if (problem) { Messages.field(control, problem); } else { Messages.clearField(control); }
			return problem ? 1 : 0;
		};
		part.clearMessage = function () { Messages.clearField(control); };
		part.attachChange = function (fn) { listeners.splice(listeners.length - 1, 0, fn); return part; };
		part.setRequired = function (b) { required = !!b; control.setRequired(required); if (label) { label.setRequired(required); } return part; };
		part.setGroup = function (g) { control.data("accGroup", g); return part; };
		part.update({ value: o.value === undefined ? null : o.value });
		return part;
	}

	return {
		info: {
			controls: ["sap.m.DatePicker", "sap.m.DateRangeSelection", "sap.m.DynamicDateRange", "sap.ui.core.format.DateFormat"],
			motion: "None. A field never animates.",
			still: true
		},

		/**
		 * options:
		 *   label       the field's name ("Delivery date")
		 *   mode        "single" (default), "range", or "relative" (choices such as "last month")
		 *   value       single: a Date; range: { start, end }; relative: { operator, values } as UI5 uses
		 *   min, max    optional Dates; the chosen dates must fall between them
		 *   options     relative mode: the choices offered (UI5 option keys); a sensible list by default
		 *   required, group, bare, onChange(value, part)  as in the value-help field
		 */
		create: create,

		example: function () {
			var today = new Date();
			var min = new Date(today.getFullYear() - 1, 0, 1);
			return {
				options: { label: t("date.demo.label"), mode: "relative", value: { operator: "LASTDAYS", values: [30] },
					min: min, max: today, required: true, group: t("date.demo.group") },
				next: function (seed) {
					var ops = [{ operator: "LASTMONTH", values: [] }, { operator: "THISMONTH", values: [] }, { operator: "LASTDAYS", values: [7 + seed % 20] }];
					return { value: ops[seed % ops.length] };
				}
			};
		}
	};
});
