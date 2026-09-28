/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Value-help field: a field whose value must be one of a known list (a customer, a product, a plant).
 * It suggests matches by name or key as you type, opens a searchable list to pick from, and shows the
 * chosen value as "description (key)". Free text that matches nothing is not kept silently: the field
 * says so in one sentence and the message goes to the screen's message list.
 *
 * The field parts (value-help, amount and date fields) share one small interface, so a form section
 * can hold any of them: part.input, part.fields (what a form row holds), value(), setValue(v), text(),
 * check(), validate(), clearMessage(), attachChange(fn), setRequired(b) and setGroup(name).
 */
sap.ui.define([
	"sap/m/Input",
	"sap/m/Label",
	"sap/m/VBox",
	"sap/m/SelectDialog",
	"sap/m/StandardListItem",
	"sap/ui/core/ListItem",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"accents/core/Part",
	"accents/core/Messages",
	"accents/core/I18n"
], function (Input, Label, VBox, SelectDialog, StandardListItem, ListItem, JSONModel, Filter, FilterOperator, Part, Messages, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");

	/** "Coffee beans (P-100)", or just the key when the list does not know it. */
	function show(item) { return item ? t("valueHelp.shown", item.text, item.key) : ""; }

	/** The item a typed text means: its key, its name, or "name (key)"; null when nothing matches. */
	function match(items, typed) {
		var q = (typed || "").trim().toLowerCase();
		if (!q) { return null; }
		return items.find(function (i) {
			return i.key.toLowerCase() === q || i.text.toLowerCase() === q || show(i).toLowerCase() === q;
		}) || null;
	}

	function create(o) {
		var items = (o.items || []).slice();
		var required = !!o.required;
		var key = o.value || null;
		var listeners = o.onChange ? [o.onChange] : [];
		var group = o.group;
		var dialog = null;

		var input = new Input({
			width: "100%",
			showSuggestion: true,
			showValueHelp: true,
			required: required,
			placeholder: o.placeholder || t("valueHelp.placeholder"),
			valueHelpIconSrc: "sap-icon://value-help",
			suggestionItems: items.map(function (i) { return new ListItem({ key: i.key, text: i.text, additionalText: i.key }); }),
			suggestionItemSelected: function (e) {
				var li = e.getParameter("selectedItem");
				if (li) { choose(li.getKey()); }
			},
			change: function () {
				var typed = input.getValue();
				if (!typed.trim()) { choose(null); return; }
				var hit = match(items, typed);
				if (hit) { choose(hit.key); return; }
				key = null;
				Messages.field(input, t("valueHelp.noMatch", typed.trim(), o.label || t("valueHelp.thing")));
				fire();
			},
			valueHelpRequest: function () { openList(); }
		});
		// Suggest on any part of the name or the key, not only the start of the name.
		input.setFilterFunction(function (typed, li) {
			var q = typed.toLowerCase();
			return li.getText().toLowerCase().indexOf(q) >= 0 || li.getKey().toLowerCase().indexOf(q) >= 0;
		});
		if (group) { input.data("accGroup", group); }

		function fire() { listeners.forEach(function (fn) { fn(key, part); }); }

		function choose(k) {
			key = k;
			var item = items.find(function (i) { return i.key === k; });
			input.setValue(show(item));
			part.validate();
			fire();
		}

		function openList() {
			if (!dialog) {
				dialog = new SelectDialog({
					title: t("valueHelp.dialogTitle", o.label || t("valueHelp.thing")),
					noDataText: t("valueHelp.noResults"),
					items: { path: "/items", template: new StandardListItem({ title: "{text}", description: "{key}" }) },
					search: function (e) { filter(e.getParameter("value")); },
					liveChange: function (e) { filter(e.getParameter("value")); },
					confirm: function (e) {
						var li = e.getParameter("selectedItem");
						if (li) { choose(li.getBindingContext().getProperty("key")); }
						input.focus();
					},
					cancel: function () { input.focus(); }
				});
				dialog.setModel(new JSONModel({ items: items }));
				input.addDependent(dialog);
			}
			filter("");
			dialog.open(input.getValue() && !key ? input.getValue() : "");
		}

		function filter(q) {
			var binding = dialog.getBinding("items");
			binding.filter(q ? [new Filter({ and: false, filters: [
				new Filter("text", FilterOperator.Contains, q), new Filter("key", FilterOperator.Contains, q)
			] })] : []);
		}

		var label = o.bare ? null : new Label({ text: o.label, labelFor: input, required: required, showColon: false });
		var box = new VBox({ renderType: "Bare", width: o.width || "100%", items: label ? [label, input] : [input] });

		var part = Part.make({
			key: "value-help-field",
			content: box,
			render: function (d) {
				if (d && d.items) {
					items = d.items.slice();
					input.destroySuggestionItems();
					items.forEach(function (i) { input.addSuggestionItem(new ListItem({ key: i.key, text: i.text, additionalText: i.key })); });
					if (dialog) { dialog.getModel().setData({ items: items }); }
				}
				if (d && "value" in d) { key = d.value || null; input.setValue(show(items.find(function (i) { return i.key === key; }))); }
			}
		});
		part.input = input;
		/** The controls a form places in its row for this field. */
		part.fields = [input];
		part.label = label;
		part.value = function () { return key; };
		part.setValue = function (k) { key = k || null; input.setValue(show(items.find(function (i) { return i.key === key; }))); Messages.clearField(input); return part; };
		part.item = function () { return items.find(function (i) { return i.key === key; }) || null; };
		part.text = function () { return show(part.item()); };
		/** A sentence saying what is wrong, or null. Does not mark the field. */
		part.check = function () {
			var typed = input.getValue().trim();
			if (typed && !key) { return t("valueHelp.noMatch", typed, o.label || t("valueHelp.thing")); }
			if (required && !key) { return t("field.required", o.label || t("valueHelp.thing")); }
			return null;
		};
		/** Marks the field when something is wrong; returns the number of problems (0 or 1). */
		part.validate = function () {
			var problem = part.check();
			if (problem) { Messages.field(input, problem); } else { Messages.clearField(input); }
			return problem ? 1 : 0;
		};
		part.clearMessage = function () { Messages.clearField(input); };
		part.attachChange = function (fn) { listeners.push(fn); return part; };
		part.setRequired = function (b) { required = !!b; input.setRequired(required); if (label) { label.setRequired(required); } return part; };
		part.setGroup = function (g) { group = g; input.data("accGroup", g); return part; };
		part.update({ value: key });
		return part;
	}

	var api = {
		info: {
			controls: ["sap.m.Input (suggestions)", "sap.m.SelectDialog", "sap.m.Label"],
			motion: "None. A field never animates; the suggestion list and the dialog open the way UI5 opens them.",
			still: true
		},

		/**
		 * options:
		 *   label        the field's name ("Customer"); also names the dialog and the messages
		 *   items        [{ key, text }]
		 *   value        the chosen key, or null
		 *   required     true when a value must be chosen
		 *   placeholder  optional hint
		 *   group        optional section name that groups this field's messages
		 *   bare         true inside a form, which supplies its own label
		 *   onChange     function (key, part)
		 */
		create: create,

		/** Sample customers for demos. Names come from the translation file. */
		sampleCustomers: function () {
			return ["C-1001", "C-1002", "C-1003", "C-1004", "C-1005", "C-1006", "C-1007", "C-1008"].map(function (k, i) {
				return { key: k, text: t("sample.customer." + (i + 1)) };
			});
		},
		sampleProducts: function () {
			return ["P-100", "P-110", "P-200", "P-210", "P-300", "P-400", "P-500"].map(function (k, i) {
				return { key: k, text: t("sample.product." + (i + 1)) };
			});
		},

		example: function () {
			var customers = api.sampleCustomers();
			return {
				options: { label: t("valueHelp.demo.label"), items: customers, value: "C-1003", required: true, group: t("valueHelp.demo.group") },
				next: function (seed) { return { value: customers[seed % customers.length].key }; }
			};
		}
	};
	return api;
});
