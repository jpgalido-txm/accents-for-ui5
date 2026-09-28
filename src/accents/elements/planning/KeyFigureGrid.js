/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Key-figure grid: the planning table. One row per item and key figure, one column per period, with
 * the item and key-figure columns fixed. Every cell is in one of six states, and each state looks
 * different and says what it is in its tooltip:
 *   actual     a period that has happened; bold, never editable
 *   readonly   a figure nobody edits here (for example the base plan); muted
 *   editable   a figure a person may change; shown in a field
 *   pending    changed and simulated, not saved; warning wash and warning field
 *   saved      changed and saved; information wash and information field
 *   na         does not apply to this item and period; blank, never zero
 * Each key figure carries the same colour swatch as its line in the workspace chart. Choosing a cell
 * chooses its period, and the chart can choose it back (selectPeriod).
 *
 * On a phone the grid cannot show items by periods, so it shows one item at a time, chosen from a
 * list, with periods as rows and key figures as columns, and says the full grid needs a wider screen.
 */
sap.ui.define([
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/ui/table/Table",
	"sap/ui/table/Column",
	"sap/ui/table/rowmodes/Fixed",
	"sap/ui/core/Icon",
	"sap/ui/core/Item",
	"sap/ui/core/InvisibleText",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/FlexBox",
	"sap/m/Text",
	"sap/m/Label",
	"sap/m/Input",
	"sap/m/Button",
	"sap/m/Select",
	"sap/m/MessageStrip",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/Tokens",
	"accents/core/I18n"
], function (Device, JSONModel, Table, Column, FixedRowMode, Icon, Item, InvisibleText, VBox, HBox, FlexBox, Text, Label, Input, Button, Select,
	MessageStrip, Part, Format, Motion, Tokens, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.planning.i18n.i18n");

	var STATES = ["actual", "readonly", "editable", "pending", "saved", "na"];
	var EDITABLE = { editable: true, pending: true, saved: true };
	var SAY = {};
	STATES.forEach(function (s) { SAY[s] = t("keyFigureGrid.state." + s); });
	var NARROW = 640;

	/** Parses a typed number in the reader's locale; returns null when it is not a number. */
	function parseTyped(text) {
		var locale = (navigator.languages && navigator.languages[0]) || "en-US";
		var parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
		var group = (parts.find(function (p) { return p.type === "group"; }) || {}).value || ",";
		var decimal = (parts.find(function (p) { return p.type === "decimal"; }) || {}).value || ".";
		var clean = String(text || "").trim().split(group).join("").replace(decimal, ".").replace(Format.MINUS, "-").replace(/\s/g, "");
		if (!/^-?\d*\.?\d+$/.test(clean)) { return null; }
		return parseFloat(clean);
	}

	function swatch(slot) {
		return new Icon({ src: "sap-icon://circle-task-2", size: "0.625rem", color: Tokens.series(slot || 0), decorative: true })
			.addStyleClass("sapUiTinyMarginEnd");
	}

	return {
		info: {
			controls: ["sap.ui.table.Table (fixed columns)", "sap.m.Input", "sap.m.Text", "sap.ui.core.Icon", "sap.m.Select"],
			motion: "Cells whose values changed re-value in one left-to-right sweep, each flashing once in the tone of its change.",
			still: false
		},

		/**
		 * options:
		 *   data {
		 *     periods:    ["2026-01", ...]
		 *     keyFigures: [{ key, name, polarity: "up" | "down", digits, slot }]   slot = chart colour slot
		 *     rows:       [{ item, itemName, keyFigure, cells: [{ value, state }] }]  one cell per period
		 *   }
		 *   visible          optional list of key-figure keys to show (default: all)
		 *   selected         optional period key to start selected
		 *   rowCount         rows shown before the grid scrolls (default 12)
		 *   onEdit(change)   a cell was changed: { item, keyFigure, period, value, previous }
		 *   onSelectPeriod(period)  a cell was chosen, so its period is now selected
		 *   assistant        optional: the app's assistant; adds a per-row ask button (wide layout)
		 *
		 * part.selectPeriod(period)  selects a period without calling onSelectPeriod
		 * part.setVisible(keys)      shows only these key figures (the key-figure toggle calls this)
		 */
		create: function (o) {
			var model = new JSONModel({ rows: [] });
			var current = null, visible = o.visible ? o.visible.slice() : null, selected = o.selected || null;
			var itemFilter = null, prevValues = {}, pendingSweep = null;
			var layoutKey = null, fixedCount = 0;

			var table = new Table({
				rows: "{/rows}",
				selectionMode: "None",
				width: "100%",
				rowMode: new FixedRowMode({ rowCount: 1 }),
				noData: new Text({ text: t("keyFigureGrid.noData") })
			});
			table.setModel(model);

			var picker = new Select({ width: "100%", change: function (e) {
				itemFilter = e.getParameter("selectedItem").getKey();
				fill();
			} });
			var narrowBox = new VBox({ renderType: "Bare", visible: false, items: [
				new Label({ text: t("keyFigureGrid.item"), labelFor: picker }), picker,
				new MessageStrip({ type: "Information", showIcon: true,
					text: t("keyFigureGrid.narrow") }).addStyleClass("sapUiTinyMarginTop sapUiTinyMarginBottom")
			] });

			function legendEntry(state, text) {
				return new Text({ text: text, tooltip: SAY[state] }).addStyleClass("accCell--" + state + " sapUiSmallMarginEnd");
			}
			var legend = new FlexBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Center", items: [
				new Label({ text: t("keyFigureGrid.legend.title"), showColon: true }).addStyleClass("sapUiTinyMarginEnd"),
				legendEntry("actual", t("keyFigureGrid.legend.actual")),
				legendEntry("readonly", t("keyFigureGrid.legend.readonly")),
				legendEntry("editable", t("keyFigureGrid.legend.editable")),
				legendEntry("pending", t("keyFigureGrid.legend.pending")),
				legendEntry("saved", t("keyFigureGrid.legend.saved")),
				new Text({ text: t("keyFigureGrid.legend.na") }).addStyleClass("accLabel")
			] }).addStyleClass("sapUiTinyMarginTop");

			function isNarrow() { return window.innerWidth < NARROW; }
			function kfOf(key) { return (current.keyFigures || []).find(function (k) { return k.key === key; }) || { key: key, name: key }; }
			function slotOf(key) {
				var k = kfOf(key);
				return typeof k.slot === "number" ? k.slot : Math.max(0, (current.keyFigures || []).indexOf(k));
			}
			function shownRows() {
				return current.rows.map(function (r, index) { return { r: r, index: index }; }).filter(function (x) {
					return !visible || visible.indexOf(x.r.keyFigure) >= 0;
				});
			}

			/**
			 * A value cell: text when read-only, a field when editable. Binds to cells/<i>/. The field has
			 * no room for a visible label, so a hidden text names its item, key figure and period.
			 */
			function valueTemplate(i) {
				var path = "cells/" + i + "/";
				var name = new InvisibleText({ text: "{" + path + "name}" });
				var input = new Input({
					ariaLabelledBy: [name],
					value: { parts: [path + "value", path + "digits"], formatter: function (v, d) { return Format.number(v, d); } },
					visible: { path: path + "state", formatter: function (s) { return !!EDITABLE[s]; } },
					valueState: { path: path + "state", formatter: function (s) { return s === "pending" ? "Warning" : s === "saved" ? "Information" : "None"; } },
					valueStateText: { path: path + "state", formatter: function (s) { return SAY[s] || ""; } },
					showValueStateMessage: false,
					textAlign: "End",
					width: "100%",
					change: function (e) { edit(e.getSource(), i, e.getParameter("value")); }
				});
				var text = new Text({
					text: { parts: [path + "value", path + "state", path + "digits"], formatter: function (v, s, d) { return s === "na" ? "" : Format.number(v, d); } },
					visible: { path: path + "state", formatter: function (s) { return !EDITABLE[s]; } },
					textAlign: "End", width: "100%", wrapping: false
				});
				return new HBox({ renderType: "Bare", width: "100%", items: [text, input, name] });
			}

			function header(text, slot, wrap) {
				var label = new Label({ text: text, textAlign: "End", wrapping: !!wrap });
				if (slot === undefined) { return label; }
				// Narrow headers stack the swatch over the name so the name keeps its full width.
				return new VBox({ renderType: "Bare", alignItems: "End", width: "100%", items: [swatch(slot), label] });
			}

			/** Wide layout: items by key figure down, periods across. */
			function buildWide() {
				table.addColumn(new Column({ width: "8rem", label: new Label({ text: t("keyFigureGrid.column.item") }),
					template: new Text({ text: "{itemText}", wrapping: false }) }));
				table.addColumn(new Column({ width: "9rem", label: new Label({ text: t("keyFigureGrid.column.keyFigure") }),
					template: new HBox({ renderType: "Bare", alignItems: "Center", items: [
						new Icon({ src: "sap-icon://circle-task-2", size: "0.625rem", decorative: true,
							color: { path: "slot", formatter: function (s) { return Tokens.series(s || 0); } } }).addStyleClass("sapUiTinyMarginEnd"),
						new Text({ text: "{kfName}", wrapping: false })
					] }) }));
				current.periods.forEach(function (p, i) {
					var col = new Column({ minWidth: 64, hAlign: "End", label: header(Format.period(p, true)), template: valueTemplate(i),
						tooltip: Format.period(p) });
					col.data("period", p);
					table.addColumn(col);
				});
				if (o.assistant) {
					table.addColumn(new Column({ width: "3.25rem", hAlign: "Center", label: new Label({ text: t("keyFigureGrid.column.ask") }),
						template: new Button({ icon: "sap-icon://ai", type: "Transparent", tooltip: t("keyFigureGrid.ask.tooltip"),
							press: function (e) { ask(e.getSource().getBindingContext().getObject()); } }).addStyleClass("accAiButton") }));
				}
				fixedCount = 2;
			}

			/** Narrow layout: one item; periods down, key figures across. */
			function buildNarrow(kfKeys) {
				table.addColumn(new Column({ width: "4rem", label: new Label({ text: t("keyFigureGrid.column.period") }),
					template: new Text({ text: "{periodText}", wrapping: false }) }));
				kfKeys.forEach(function (key, i) {
					table.addColumn(new Column({ width: "5.25rem", hAlign: "End", label: header(kfOf(key).name, slotOf(key), true), template: valueTemplate(i) }));
				});
				fixedCount = 1;
			}

			function ask(r) {
				var facts = {};
				facts[t("keyFigureGrid.ask.fact.item")] = r.itemName;
				facts[t("keyFigureGrid.ask.fact.keyFigure")] = r.kfName;
				r.cells.forEach(function (c) { facts[Format.period(current.periods[c.p])] = t("keyFigureGrid.ask.fact.value", Format.number(c.value, c.digits), SAY[c.state]); });
				o.assistant.askAbout({ title: t("keyFigureGrid.ask.title", r.itemName, r.kfName), facts: facts,
					question: t("keyFigureGrid.ask.question", I18n.language() === "en" ? r.kfName.toLowerCase() : r.kfName, r.itemName) });
			}

			function cellOf(r, index, p) {
				var c = r.cells[p] || { value: null, state: "na" };
				var k = kfOf(r.keyFigure);
				return { value: c.value, state: STATES.indexOf(c.state) >= 0 ? c.state : "readonly", digits: k.digits || 0,
					polarity: k.polarity || "up", src: index, p: p };
			}

			/** Adds the spoken name of a cell: item, key figure and period. */
			function named(c, item, kf, period) {
				c.name = t("keyFigureGrid.cellName", item, kf, Format.period(period));
				return c;
			}

			/** Builds the columns for the current layout (only when it changes) and writes the rows. */
			function fill() {
				var narrow = isNarrow();
				var shown = shownRows();
				narrowBox.setVisible(narrow);
				var rows;
				if (narrow) {
					var items = [];
					current.rows.forEach(function (r) { if (items.indexOf(r.item) < 0) { items.push(r.item); } });
					if (!itemFilter || items.indexOf(itemFilter) < 0) { itemFilter = items[0]; }
					var mine = shown.filter(function (x) { return x.r.item === itemFilter; });
					var kfKeys = mine.map(function (x) { return x.r.keyFigure; });
					var key = "narrow:" + current.periods.join() + ":" + kfKeys.join();
					if (key !== layoutKey) { table.destroyColumns(); buildNarrow(kfKeys); layoutKey = key; }
					rows = current.periods.map(function (p, pi) {
						return { periodText: Format.period(p, true), period: p, cells: mine.map(function (x) {
							return named(cellOf(x.r, x.index, pi), x.r.itemName || x.r.item, kfOf(x.r.keyFigure).name, p);
						}) };
					});
					picker.destroyItems();
					var seen = {};
					current.rows.forEach(function (r) {
						if (seen[r.item]) { return; }
						seen[r.item] = true;
						picker.addItem(new Item({ key: r.item, text: r.itemName || r.item }));
					});
					picker.setSelectedKey(itemFilter);
				} else {
					var wideKey = "wide:" + current.periods.join();
					if (wideKey !== layoutKey) { table.destroyColumns(); buildWide(); layoutKey = wideKey; }
					var lastItem = null;
					rows = shown.map(function (x) {
						var k = kfOf(x.r.keyFigure);
						var name = x.r.itemName || x.r.item;
						var first = x.r.item !== lastItem;
						lastItem = x.r.item;
						return { itemText: first ? name : "", itemName: name, item: x.r.item, keyFigure: x.r.keyFigure, kfName: k.name,
							slot: slotOf(x.r.keyFigure), cells: current.periods.map(function (p, pi) { return named(cellOf(x.r, x.index, pi), name, k.name, p); }) };
					});
				}
				table.setFixedColumnCount(fixedCount);
				model.setData({ rows: rows });
				table.getRowMode().setRowCount(Math.max(1, Math.min(rows.length, o.rowCount || 12)));
			}

			function edit(input, i, text) {
				var cell = input.getBindingContext().getObject().cells[i];
				var value = parseTyped(text);
				if (value === null) {
					input.setValueState("Error");
					input.setValueStateText(t("keyFigureGrid.typeNumber", Format.number(1234.5, 1)));
					input.setShowValueStateMessage(true);
					return;
				}
				input.setShowValueStateMessage(false);
				var src = current.rows[cell.src];
				var previous = src.cells[cell.p].value;
				// The source row changes too, so the next update() compares against what is on screen.
				src.cells[cell.p] = { value: value, state: "pending" };
				prevValues[cell.src + "|" + cell.p] = value;
				cell.value = value;
				cell.state = "pending";
				model.refresh(true);
				if (o.onEdit) { o.onEdit({ item: src.item, keyFigure: src.keyFigure, period: current.periods[cell.p], value: value, previous: previous }); }
			}

			/** After each row render: state classes, tooltips, the selected period and any pending sweep. */
			function decorate() {
				if (!current) { return; }
				var sel = Tokens.get("--sapList_SelectionBackgroundColor");
				var sweep = [];
				table.getRows().forEach(function (row) {
					var ctx = row.getBindingContext();
					var r = ctx && ctx.getObject();
					row.getCells().forEach(function (cell, ci) {
						var i = ci - fixedCount;
						var c = r && r.cells && i >= 0 ? r.cells[i] : null;
						var el = cell.getDomRef();
						if (i < 0 || (r && r.cells && i >= r.cells.length)) {
							// Attribute cells: in the narrow layout the period cell marks the selected row.
							if (el && r && r.period && ci === 0) { el.closest("td").style.backgroundColor = r.period === selected ? sel : ""; }
							return;
						}
						STATES.forEach(function (s) { cell.toggleStyleClass("accCell--" + s, !!c && c.state === s); });
						cell.setTooltip(c ? SAY[c.state] : null);
						var td = el && el.closest("td");
						if (td) { td.style.backgroundColor = c && current.periods[c.p] === selected ? sel : ""; }
						if (pendingSweep && c && el && pendingSweep[c.src + "|" + c.p] !== undefined) {
							sweep.push({ el: el, column: c.p, tone: Format.tone(pendingSweep[c.src + "|" + c.p], c.polarity) });
						}
					});
				});
				table.getColumns().forEach(function (col) {
					var p = col.data("period");
					var label = col.getLabel();
					if (p && label && label.setDesign) { label.setDesign(p === selected ? "Bold" : "Standard"); }
				});
				if (pendingSweep && sweep.length) { pendingSweep = null; Motion.sweep(sweep); }
			}
			table.attachRowsUpdated(function () { decorate(); });

			table.attachCellClick(function (e) {
				var ctx = e.getParameter("rowBindingContext");
				var r = ctx && ctx.getObject();
				// Every column is visible, so the visible column index is the column index.
				var i = e.getParameter("columnIndex") - fixedCount;
				var c = r && r.cells && i >= 0 ? r.cells[i] : null;
				var period = r && r.period ? r.period : c ? current.periods[c.p] : null;
				if (!period || period === selected) { return; }
				selected = period;
				decorate();
				if (o.onSelectPeriod) { o.onSelectPeriod(selected); }
			});

			var stopTheme = Tokens.onChange(function () { layoutKey = null; if (current) { fill(); } });
			var onResize = function () { if (current) { fill(); } };
			Device.resize.attachHandler(onResize);
			var content = new VBox({ renderType: "Bare", width: "100%", items: [narrowBox, table, legend] });
			// Stop listening to theme and resize changes when the grid goes away.
			var destroy = content.destroy;
			content.destroy = function () { stopTheme(); Device.resize.detachHandler(onResize); return destroy.apply(this, arguments); };

			var part = Part.make({
				key: "key-figure-grid",
				content: content,
				empty: t("keyFigureGrid.empty"),
				render: function (d, prev) {
					var samePeriods = !!prev && JSON.stringify(prev.periods) === JSON.stringify(d.periods);
					current = { periods: d.periods, keyFigures: d.keyFigures || [], rows: d.rows.map(function (r) {
						return Object.assign({}, r, { cells: r.cells.map(function (c) { return Object.assign({}, c); }) });
					}) };
					if (selected && current.periods.indexOf(selected) < 0) { selected = null; }
					var next = {}, changed = {};
					current.rows.forEach(function (r, ri) {
						r.cells.forEach(function (c, i) {
							var k = ri + "|" + i;
							next[k] = c.value;
							if (samePeriods && typeof prevValues[k] === "number" && typeof c.value === "number" && prevValues[k] !== c.value) {
								changed[k] = c.value - prevValues[k];
							}
						});
					});
					prevValues = next;
					pendingSweep = Object.keys(changed).length ? changed : null;
					fill();
					setTimeout(decorate, 0);
				}
			});
			part.selectPeriod = function (p) { selected = p; decorate(); return part; };
			part.setVisible = function (keys) { visible = keys ? keys.slice() : null; if (current) { fill(); } return part; };
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			var kfs = [
				{ key: "REV", name: t("keyFigureGrid.demo.revenue"), polarity: "up", digits: 0, slot: 0 },
				{ key: "PLAN", name: t("keyFigureGrid.demo.plan"), polarity: "up", digits: 0, slot: 1 },
				{ key: "UPLIFT", name: t("keyFigureGrid.demo.uplift"), polarity: "up", digits: 0, slot: 2 }
			];
			// Sample figures are in thousands of dollars.
			function make(seed) {
				var s = Data.sample(seed);
				var rows = [];
				s.items.slice(0, 4).forEach(function (it, n) {
					rows.push({ item: it.id, itemName: it.name, keyFigure: "REV", cells: it.months.map(function (m, i) {
						if (m.actual !== null) { return { value: m.actual, state: "actual" }; }
						var state = (n === 1 && i === 9) ? "pending" : (n === 2 && i === 10) ? "saved" : "editable";
						return { value: m.forecast, state: state };
					}) });
					rows.push({ item: it.id, itemName: it.name, keyFigure: "PLAN", cells: it.months.map(function (m) {
						return { value: m.plan, state: "readonly" };
					}) });
					rows.push({ item: it.id, itemName: it.name, keyFigure: "UPLIFT", cells: it.months.map(function (m, i) {
						if (m.actual !== null) { return { value: null, state: "na" }; }
						return { value: Data.round(m.forecast - m.plan, 1), state: (n === 0 && i === 8) ? "pending" : "editable" };
					}) });
				});
				return { periods: s.periods, keyFigures: kfs, rows: rows };
			}
			return {
				options: { data: make(7), assistant: ctx && ctx.assistant, rowCount: 12, selected: "2026-09" },
				next: function (seed) { return make(seed); }
			};
		}
	};
});
