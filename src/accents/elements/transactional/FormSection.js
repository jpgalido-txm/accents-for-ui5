/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Form section: a titled group of labelled fields that switches between reading and editing. Reading
 * shows each value as plain text (never as a greyed-out input, which is hard to read and looks broken).
 * Editing shows the inputs, marks required fields, and checks each field as it changes and all of them
 * before a save. Every problem is one sentence on the field and in the screen's message list.
 *
 *   var s = FormSection.create({ title: "Order", fields: [...], data: { reference: "PO-7781" } });
 *   s.setEditable(true);   s.validate();   // -> number of problems
 *   s.values();  s.isDirty();  s.changes();  s.commit();  s.revert();
 */
sap.ui.define([
	"sap/ui/layout/form/Form",
	"sap/ui/layout/form/FormContainer",
	"sap/ui/layout/form/FormElement",
	"sap/ui/layout/form/ColumnLayout",
	"sap/m/Toolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/Title",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/Input",
	"sap/m/TextArea",
	"sap/m/Select",
	"sap/m/Button",
	"sap/ui/core/Item",
	"accents/core/Part",
	"accents/core/Messages",
	"accents/core/Format",
	"accents/core/I18n",
	"accents/elements/transactional/ValueHelpField",
	"accents/elements/transactional/AmountField",
	"accents/elements/transactional/DateField"
], function (Form, FormContainer, FormElement, ColumnLayout, Toolbar, ToolbarSpacer, Title, Label, Text, Input, TextArea, Select, Button, Item,
	Part, Messages, Format, I18n, ValueHelpField, AmountField, DateField) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");

	function empty(v) { return v === null || v === undefined || v === "" || (typeof v === "number" && isNaN(v)); }
	function same(a, b) {
		if (a instanceof Date || b instanceof Date) { return !!a && !!b && +a === +b; }
		if (a && b && typeof a === "object") { return JSON.stringify(a) === JSON.stringify(b); }
		return (empty(a) && empty(b)) || a === b;
	}

	/** Builds the input for one field and says how to read and write it. */
	function editor(f, group, onChange) {
		if (f.type === "part") {
			f.part.setGroup(group);
			if (f.required) { f.part.setRequired(true); }
			f.part.attachChange(function () { onChange(f); });
			return { edit: f.part.fields, input: f.part.input, get: f.part.value, set: f.part.setValue, text: f.part.text,
				check: f.part.check, clear: f.part.clearMessage };
		}
		var input;
		if (f.type === "select") {
			var options = (f.required ? [] : [{ key: "", text: t("formSection.none") }]).concat(f.options || []);
			input = new Select({ width: "100%", forceSelection: false,
				items: options.map(function (o) { return new Item({ key: o.key, text: o.text }); }),
				change: function () { onChange(f); } });
		} else if (f.type === "textarea") {
			input = new TextArea({ width: "100%", rows: 3, maxLength: f.maxLength || 0, required: !!f.required, growing: true, growingMaxLines: 8,
				showExceededText: false, change: function () { onChange(f); } });
		} else {
			input = new Input({ width: "100%", maxLength: f.maxLength || 0, required: !!f.required, change: function () { onChange(f); } });
			if (f.placeholder) { input.setPlaceholder(f.placeholder); }
		}
		input.data("accGroup", group);
		var get = f.type === "select" ? function () { return input.getSelectedKey() || null; } : function () { return input.getValue().trim() || null; };
		var set = f.type === "select" ? function (v) { input.setSelectedKey(v || ""); } : function (v) { input.setValue(empty(v) ? "" : String(v)); };
		var text = f.type === "select" ? function () {
			var o = (f.options || []).find(function (x) { return x.key === get(); });
			return o ? o.text : "";
		} : function () { return get() || ""; };
		return { edit: input, input: input, get: get, set: set, text: text,
			check: function () { return f.required && empty(get()) ? t("field.required", f.label) : null; },
			clear: function () { Messages.clearField(input); } };
	}

	function create(o) {
		var group = o.group || o.title || t("formSection.group");
		var editable = !!o.editable;
		var listeners = o.onChange ? [o.onChange] : [];
		var baseline = {}, baselineText = {};

		var records = (o.fields || []).map(function (f) {
			var rec = editor(f, group, function (field) { checkOne(recordOf(field)); fire(field); });
			rec.def = f;
			rec.display = new Text({ text: Format.DASH, wrapping: true });
			rec.label = new Label({ text: f.label, showColon: false });
			rec.element = new FormElement({ label: rec.label });
			return rec;
		});
		function recordOf(f) { return records.find(function (r) { return r.def === f; }); }

		/** A field's own check first, then the field definition's extra rule over all values. */
		function problemOf(rec) {
			var p = rec.check();
			if (!p && rec.def.check && !empty(rec.get())) { p = rec.def.check(rec.get(), part.values()) || null; }
			return p;
		}
		function checkOne(rec) {
			var p = problemOf(rec);
			if (p) { Messages.field(rec.input, p); } else { rec.clear(); }
			return p ? 1 : 0;
		}
		function fire(f) { listeners.forEach(function (fn) { fn(f.key, recordOf(f).get(), part); }); }

		var title = o.title ? new Title({ text: o.title, level: o.level || "H3", titleStyle: "H5" }) : null;
		var toggle = null;
		if (o.toggle) {
			toggle = new Button({ type: "Transparent", press: function () {
				if (!editable) { part.setEditable(true); records[0] && records[0].input.focus(); return; }
				if (part.validate() === 0) { part.commit(); part.setEditable(false); }
			} });
		}
		var toolbar = title || toggle ? new Toolbar({ style: "Clear", content: [].concat(title ? [title] : [], [new ToolbarSpacer()], toggle ? [toggle] : []) }) : null;

		var cols = o.columns || 2;
		var form = new Form({
			editable: editable,
			layout: new ColumnLayout({ columnsM: 1, columnsL: cols, columnsXL: cols, labelCellsLarge: 4 }),
			formContainers: containers()
		});
		/** Two columns on wide screens: the fields are split into two containers, which the layout sets side by side. */
		function containers() {
			var els = records.map(function (r) { return r.element; });
			if (cols < 2 || els.length < 4) { return [new FormContainer({ formElements: els })]; }
			var half = Math.ceil(els.length / 2);
			return [new FormContainer({ formElements: els.slice(0, half) }), new FormContainer({ formElements: els.slice(half) })];
		}
		if (toolbar) { form.setToolbar(toolbar); }
		if (title) { form.addAriaLabelledBy(title); }

		function show() {
			form.setEditable(editable);
			records.forEach(function (r) {
				r.element.removeAllFields();
				if (editable) {
					[].concat(r.edit).forEach(function (c) { r.element.addField(c); });
				} else {
					var text = r.text();
					r.display.setText(text || Format.DASH);
					r.display.setTooltip(text ? null : t("formSection.noValue"));
					r.element.addField(r.display);
				}
				r.label.setLabelFor(editable ? r.input : r.display);
				r.label.setRequired(editable && !!r.def.required);
			});
			if (toggle) {
				toggle.setText(editable ? t("formSection.done") : t("formSection.edit"));
				toggle.setIcon(editable ? "sap-icon://accept" : "sap-icon://edit");
				toggle.setTooltip(editable ? t("formSection.doneTip") : t("formSection.editTip", o.title || group));
			}
		}

		var part = Part.make({
			key: "form-section",
			content: form,
			onDestroy: function () { records.forEach(function (r) { r.clear(); [].concat(r.edit).forEach(function (c) { c.destroy(); }); r.display.destroy(); }); },
			render: function (values) { part.setValues(values || {}); }
		});
		part.form = form;
		part.group = group;
		part.editable = function () { return editable; };
		/** Switches between reading (values as text) and editing (inputs). Leaving editing clears this section's messages. */
		part.setEditable = function (b) {
			editable = !!b;
			if (!editable) { records.forEach(function (r) { r.clear(); }); }
			show();
			return part;
		};
		/** Checks every field, marks the ones that are wrong, and returns how many are wrong. */
		part.validate = function () { return records.reduce(function (n, r) { return n + checkOne(r); }, 0); };
		/** Counts the problems without marking anything. */
		part.problems = function () { return records.filter(function (r) { return !!problemOf(r); }).length; };
		part.values = function () {
			var v = {};
			records.forEach(function (r) { v[r.def.key] = r.get(); });
			return v;
		};
		/** Writes values and takes them as the saved state (what "unchanged" means). */
		part.setValues = function (values) {
			records.forEach(function (r) { if (r.def.key in values) { r.set(values[r.def.key]); } r.clear(); });
			part.commit();
			return part;
		};
		part.commit = function () {
			records.forEach(function (r) { baseline[r.def.key] = r.get(); baselineText[r.def.key] = r.text(); });
			show();
			return part;
		};
		part.revert = function () {
			records.forEach(function (r) { r.set(baseline[r.def.key]); r.clear(); });
			show();
			return part;
		};
		part.isDirty = function () { return records.some(function (r) { return !same(r.get(), baseline[r.def.key]); }); };
		/** What changed since the saved state: [{ key, field, from, to }] with the texts a person reads. */
		part.changes = function () {
			return records.filter(function (r) { return !same(r.get(), baseline[r.def.key]); }).map(function (r) {
				return { key: r.def.key, field: r.def.label, from: baselineText[r.def.key] || "", to: r.text() };
			});
		};
		/** The first field with a problem, for moving the focus there. */
		part.firstProblem = function () {
			var r = records.find(function (x) { return !!problemOf(x); });
			return r ? r.input : null;
		};
		part.attachChange = function (fn) { listeners.push(fn); return part; };
		part.update(o.data || {});
		return part;
	}

	var api = {
		info: {
			controls: ["sap.ui.layout.form.Form", "sap.ui.layout.form.ColumnLayout", "sap.m.Input", "sap.m.Select", "sap.m.TextArea", "sap.m.Text"],
			motion: "None. Switching between reading and editing swaps the controls at once.",
			still: true
		},

		/**
		 * options:
		 *   title      the section's name ("Delivery"); also groups its messages
		 *   fields     [{ key, label, type: "text" | "textarea" | "select" | "part", required, maxLength, placeholder,
		 *                options: [{ key, text }] (select), part (a value-help, amount or date field made with bare: true;
 *                the form places its part.fields),
		 *                check: function (value, values) -> sentence or null (an extra rule) }]
		 *   data       { key: value } the saved values
		 *   editable   start in editing (default reading)
		 *   toggle     true adds an Edit / Done button to the section's own toolbar, for editing one section in place
		 *   columns    1 or 2 (default 2) on wide screens
		 *   onChange   function (key, value, part)
		 */
		create: create,

		example: function () {
			var today = new Date();
			var customer = ValueHelpField.create({ label: t("form.demo.customer"), items: ValueHelpField.sampleCustomers(), bare: true });
			var value = AmountField.create({ label: t("form.demo.value"), kind: "currency", unit: "EUR", min: 1, max: 50000, bare: true });
			var date = DateField.create({ label: t("form.demo.date"), min: today, bare: true });
			var priorities = [{ key: "1", text: t("form.demo.priority.1") }, { key: "2", text: t("form.demo.priority.2") }, { key: "3", text: t("form.demo.priority.3") }];
			function data(seed) {
				var custs = ValueHelpField.sampleCustomers();
				return { customer: custs[seed % custs.length].key, reference: "PO-" + (7700 + seed), priority: String(1 + seed % 3),
					value: 800 + (seed * 211) % 9000, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3 + seed % 9), notes: "" };
			}
			return {
				options: {
					title: t("form.demo.title"), toggle: true,
					fields: [
						{ key: "customer", label: t("form.demo.customer"), type: "part", part: customer, required: true },
						{ key: "reference", label: t("form.demo.reference"), required: true, maxLength: 20,
							check: function (v) { return /^PO-\d{4,}$/.test(v) ? null : t("form.demo.referenceRule"); } },
						{ key: "priority", label: t("form.demo.priority"), type: "select", options: priorities, required: true },
						{ key: "value", label: t("form.demo.value"), type: "part", part: value, required: true },
						{ key: "date", label: t("form.demo.date"), type: "part", part: date, required: true },
						{ key: "notes", label: t("form.demo.notes"), type: "textarea", maxLength: 500 }
					],
					data: data(7)
				},
				next: function (seed) { return data(seed); }
			};
		}
	};
	return api;
});
