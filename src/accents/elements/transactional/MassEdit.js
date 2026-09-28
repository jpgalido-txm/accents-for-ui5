/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Mass edit: sets the same fields on several selected items in one go. For each field the person
 * chooses to keep every item's existing value, to give all of them one new value, or to clear it.
 * Before anything happens a line says how many of the selected items will really change ("3 of 5
 * items change"), and applying asks once, naming the count, through the confirm action.
 *
 *   MassEdit.open({ items, fields, noun: "orders" }).then(function (r) { if (r) { apply(r.values, r.changed); } });
 *
 * create() adds the usual host: a table with row selection and a button that opens the dialog.
 */
sap.ui.define([
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/Title",
	"sap/m/Input",
	"sap/m/Select",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/OverflowToolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/FlexItemData",
	"sap/ui/core/Item",
	"sap/ui/core/InvisibleText",
	"sap/ui/Device",
	"accents/core/Part",
	"accents/core/Motion",
	"accents/core/Format",
	"accents/core/Layout",
	"accents/core/I18n",
	"accents/elements/transactional/ConfirmAction"
], function (Dialog, Button, Label, Text, Title, Input, Select, VBox, HBox, Table, Column, ColumnListItem, OverflowToolbar, ToolbarSpacer,
	FlexItemData, Item, InvisibleText, Device, Part, Motion, Format, Layout, I18n, ConfirmAction) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");
	var KEEP = "keep", NEW = "new", CLEAR = "clear";

	function empty(v) { return v === null || v === undefined || v === ""; }
	function textOf(f, v) {
		if (empty(v)) { return ""; }
		if (f.options) { var o = f.options.find(function (x) { return x.key === v; }); return o ? o.text : String(v); }
		return f.format ? f.format(v) : String(v);
	}

	/**
	 * Opens the dialog. o: { items: [{ id, name, <field keys> }], fields: [{ key, label, type: "text" | "select",
	 * options, required }], noun: plural name of the items ("orders") }. Resolves to null when cancelled, or
	 * { values: { key: value or null }, changed: [ids of items that change] } after the confirmation.
	 */
	function open(o) {
		return new Promise(function (resolve) {
			var noun = o.noun || t("massEdit.items");
			var rows = o.fields.map(function (f) {
				var distinct = Array.from(new Set(o.items.map(function (i) { return empty(i[f.key]) ? "" : i[f.key]; })));
				var choice = new Select({ width: "100%", selectedKey: KEEP, items: [
					new Item({ key: KEEP, text: t("massEdit.keep") }),
					new Item({ key: NEW, text: t("massEdit.newValue") })
				].concat(f.required ? [] : [new Item({ key: CLEAR, text: t("massEdit.clear") })]), change: function () { refresh(); } });
				var name = new InvisibleText({ text: t("massEdit.newValueFor", f.label) });
				var editor = f.type === "select"
					? new Select({ width: "100%", forceSelection: true, ariaLabelledBy: [name],
						items: (f.options || []).map(function (x) { return new Item({ key: x.key, text: x.text }); }), change: function () { refresh(); } })
					: new Input({ width: "100%", ariaLabelledBy: [name], liveChange: function () { refresh(); } });
				var now = new Text({ text: distinct.length > 1 ? t("massEdit.mixed", distinct.length)
					: t("massEdit.allSame", textOf(f, distinct[0]) || t("massEdit.emptyValue")) }).addStyleClass("accLabel");
				var label = new Label({ text: f.label, labelFor: choice, showColon: false });
				var box = new VBox({ renderType: "Bare", items: [label, choice, editor, name, now] }).addStyleClass("sapUiSmallMarginBottom");
				return { f: f, choice: choice, editor: editor, box: box };
			});

			function wanted(r) {
				var k = r.choice.getSelectedKey();
				if (k === KEEP) { return undefined; }
				if (k === CLEAR) { return null; }
				var v = r.f.type === "select" ? r.editor.getSelectedKey() : r.editor.getValue().trim();
				return empty(v) ? undefined : v;
			}
			function plan() {
				var values = {};
				rows.forEach(function (r) { var v = wanted(r); if (v !== undefined) { values[r.f.key] = v; } });
				var changed = o.items.filter(function (i) {
					return Object.keys(values).some(function (k) { return (empty(i[k]) ? null : i[k]) !== values[k]; });
				}).map(function (i) { return i.id; });
				return { values: values, changed: changed };
			}
			var preview = new Text({ text: "" }).addStyleClass("sapUiSmallMarginTop");
			var apply = new Button({ text: t("massEdit.apply"), type: "Emphasized", press: function () {
				var p = plan();
				var fields = o.fields.filter(function (f) { return f.key in p.values; }).map(function (f) { return f.label; }).join(", ");
				ConfirmAction.ask({ verb: t("massEdit.verb"), object: t("massEdit.object", p.changed.length, o.items.length, noun),
					consequence: t("massEdit.consequence", fields) }).then(function (yes) {
					if (yes) { finish(p); }
				});
			} });
			function refresh() {
				rows.forEach(function (r) { r.editor.setVisible(r.choice.getSelectedKey() === NEW); });
				var p = plan();
				preview.setText(Object.keys(p.values).length ? t("massEdit.preview", p.changed.length, o.items.length, noun) : t("massEdit.nothingYet"));
				apply.setEnabled(p.changed.length > 0);
				apply.setTooltip(p.changed.length ? t("massEdit.applyTip", p.changed.length, noun) : t("massEdit.applyOff"));
			}
			var done = false;
			function finish(v) { if (done) { return; } done = true; dialog.close(); resolve(v); }
			var dialog = new Dialog({
				title: t("massEdit.title", o.items.length, noun),
				contentWidth: "28rem",
				stretch: Device.system.phone,
				content: [new VBox({ renderType: "Bare", items: rows.map(function (r) { return r.box; }).concat([preview]) })],
				beginButton: apply,
				endButton: new Button({ text: t("massEdit.cancel"), press: function () { finish(null); } }),
				afterClose: function () { finish(null); dialog.destroy(); }
			}).addStyleClass("sapUiContentPadding");
			refresh();
			dialog.open();
		});
	}

	function create(o) {
		var noun = o.noun || t("massEdit.items");
		var title = new Title({ text: "", level: "H3", titleStyle: "H5" });
		var change = new Button({ text: "", icon: "sap-icon://edit", press: function () {
			var ids = table.getSelectedItems().map(function (li) { return li.data("id"); });
			var items = (part.data() || []).filter(function (i) { return ids.indexOf(String(i.id)) >= 0; });
			open({ items: items, fields: o.fields, noun: noun }).then(function (r) {
				if (!r) { return; }
				var next = (part.data() || []).map(function (i) {
					return r.changed.indexOf(i.id) >= 0 ? Object.assign({}, i, r.values) : i;
				});
				part.update(next);
				status.setText(t("massEdit.done", r.changed.length, noun));
				status.setVisible(true);
				if (o.onApply) { o.onApply(r, next); }
			});
		} });
		var status = new Text({ text: "" }).addStyleClass("accLabel sapUiTinyMarginTop");
		status.setVisible(false);
		var table = new Table({
			mode: "MultiSelect",
			fixedLayout: false,
			ariaLabelledBy: [title],
			headerToolbar: new OverflowToolbar({ content: [title, new ToolbarSpacer(), change] }),
			columns: [new Column({ header: new Text({ text: o.itemLabel || t("massEdit.item") }) })].concat(o.fields.map(function (f) {
				return new Column({ header: new Text({ text: f.label }), minScreenWidth: "Tablet", demandPopin: true });
			})),
			selectionChange: function () { refreshButton(); }
		});
		Layout.fitTable(table);
		function refreshButton() {
			var n = table.getSelectedItems().length;
			change.setText(t("massEdit.button", n));
			change.setEnabled(n > 0);
			change.setTooltip(n ? t("massEdit.buttonTip", n, noun) : t("massEdit.buttonOff"));
		}
		var cellsToFlash = [];
		table.addEventDelegate({ onAfterRendering: function () {
			cellsToFlash.forEach(function (c) { Motion.flash(c, "none"); });
			cellsToFlash = [];
		} });

		var part = Part.make({
			key: "mass-edit",
			content: new VBox({ renderType: "Bare", items: [table, status] }),
			empty: t("massEdit.empty"),
			render: function (items, prev) {
				var before = {};
				(prev || []).forEach(function (i) { before[i.id] = i; });
				var selected = table.getSelectedItems().map(function (li) { return li.data("id"); });
				table.destroyItems();
				items.forEach(function (i) {
					var cells = [new Text({ text: i.name })].concat(o.fields.map(function (f) {
						return new Text({ text: textOf(f, i[f.key]) || Format.DASH, tooltip: empty(i[f.key]) ? t("massEdit.emptyValue") : null });
					}));
					var li = new ColumnListItem({ cells: cells, selected: selected.indexOf(String(i.id)) >= 0 });
					li.data("id", String(i.id));
					table.addItem(li);
					var old = before[i.id];
					if (old) {
						o.fields.forEach(function (f, k) { if (old[f.key] !== i[f.key]) { cellsToFlash.push(cells[k + 1]); } });
					}
				});
				title.setText(t("massEdit.tableTitle", noun, items.length));
				refreshButton();
				if (!items.length) { part.state("empty"); }
			}
		});
		part.open = open;
		part.table = table;
		/** Selects rows by id (used by demos and tests). */
		part.select = function (ids) {
			table.getItems().forEach(function (li) { li.setSelected(ids.indexOf(li.data("id")) >= 0); });
			refreshButton();
			return part;
		};
		part.update(o.data || []);
		return part;
	}

	return {
		open: open,

		info: {
			controls: ["sap.m.Dialog", "sap.m.Select", "sap.m.Input", "sap.m.Table (multi-select)", "Confirm action"],
			motion: "After a change, the cells that changed flash once.",
			still: false
		},

		/**
		 * options:
		 *   data       [{ id, name, <field keys> }]
		 *   fields     [{ key, label, type: "text" | "select", options: [{ key, text }], required }]
		 *   noun       plural name of the items ("orders"); itemLabel the first column's header
		 *   onApply    function ({ values, changed }, allItems)
		 */
		create: create,

		example: function (Data) {
			var statuses = [{ key: "open", text: t("massEdit.demo.status.open") }, { key: "hold", text: t("massEdit.demo.status.hold") },
				{ key: "ready", text: t("massEdit.demo.status.ready") }];
			var carriers = [{ key: "road", text: t("massEdit.demo.carrier.road") }, { key: "rail", text: t("massEdit.demo.carrier.rail") },
				{ key: "air", text: t("massEdit.demo.carrier.air") }];
			function items(seed) {
				var r = Data.rng(seed);
				return [4711, 4712, 4713, 4714, 4715].map(function (n, k) {
					return { id: "O" + n, name: t("massEdit.demo.order", String(n)), status: statuses[Math.floor(r() * 3)].key,
						carrier: k === 2 ? null : carriers[Math.floor(r() * 3)].key, note: k % 2 ? t("massEdit.demo.note") : null };
				});
			}
			return {
				options: {
					noun: t("massEdit.demo.noun"), itemLabel: t("massEdit.demo.item"), data: items(7),
					fields: [
						{ key: "status", label: t("massEdit.demo.status"), type: "select", options: statuses, required: true },
						{ key: "carrier", label: t("massEdit.demo.carrier"), type: "select", options: carriers },
						{ key: "note", label: t("massEdit.demo.noteLabel"), type: "text" }
					]
				},
				next: function (seed) { return items(seed); }
			};
		}
	};
});
