/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Ranked options: the options an optimiser run found, best first. Each row carries the settings that
 * define the option, its cost and return, how far it lands from the target, and a driver-mix bar.
 * Selecting a row hands the whole option, with every one of its settings, to onSelect, so whatever
 * opens it next can re-value it exactly. Each row has an assistant button: an option is something a
 * person decides on.
 */
sap.ui.define([
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/Text",
	"sap/m/ObjectIdentifier",
	"sap/m/ObjectNumber",
	"sap/m/ObjectStatus",
	"sap/m/Link",
	"sap/m/VBox",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/I18n",
	"accents/elements/optimisation/DriverMix",
	"accents/elements/optimisation/sampleOptions"
], function (Table, Column, ColumnListItem, Text, ObjectIdentifier, ObjectNumber, ObjectStatus, Link, VBox, Part, Format, Motion,
	I18n, DriverMix, sampleOptions) {
	"use strict";

	var t = I18n.use("accents.elements.optimisation.i18n.i18n");

	function defaultSettings(s) {
		return Object.keys(s || {}).map(function (k) { return k + " " + s[k]; }).join(" · ");
	}

	return {
		info: {
			controls: ["sap.m.Table", "sap.m.ObjectIdentifier", "sap.m.ObjectNumber", "sap.m.ObjectStatus", "driver-mix"],
			motion: "When a run's results arrive, rows enter in rank order with a short stagger. Headers never move.",
			still: false
		},

		/**
		 * options:
		 *   format        function (value) -> text for cost, return and gap; default Format.short
		 *   settingsText  function (settings) -> short text; default "key value · key value"
		 *   limit         rows shown before "Show all" (default 10)
		 *   onSelect      optional: function (option) when a row is selected; rows are selectable only with it
		 *   assistant     optional: the app's assistant; each row then gets an object button
		 *   data          { target, options: [{ id, name, rank, settings, cost, ret, mix }] } best first
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var limit = o.limit || 10;
			var all = false;
			/** A gap with its sign and a true minus, in the caller's format. */
			var signed = function (v) { return (v > 0 ? "+" : v < 0 ? Format.MINUS : "") + fmt(Math.abs(v)); };
			var more = new Link({ visible: false, press: function () { all = !all; part.update(part.data()); } })
				.addStyleClass("sapUiSmallMarginTop");
			var settingsText = o.settingsText || defaultSettings;
			var pending = false;
			var byId = {};

			var columns = [
				new Column({ header: new Text({ text: t("rankedOptions.column.rank") }), width: "3.5rem", hAlign: "End" }),
				new Column({ header: new Text({ text: t("rankedOptions.column.option") }) }),
				new Column({ header: new Text({ text: t("rankedOptions.column.settings") }), minScreenWidth: "Tablet", demandPopin: true, popinDisplay: "Inline" }),
				new Column({ header: new Text({ text: t("rankedOptions.column.cost") }), hAlign: "End", minScreenWidth: "Tablet", demandPopin: true, popinDisplay: "Inline" }),
				new Column({ header: new Text({ text: t("rankedOptions.column.return") }), hAlign: "End" }),
				new Column({ header: new Text({ text: t("rankedOptions.column.againstTarget") }), hAlign: "End", minScreenWidth: "Tablet", demandPopin: true, popinDisplay: "Inline" }),
				new Column({ header: new Text({ text: t("rankedOptions.column.driverMix") }), width: "9rem", minScreenWidth: "Desktop", demandPopin: true, popinDisplay: "Inline" })
			];
			if (o.assistant) { columns.push(new Column({ width: "3rem", hAlign: "Center" })); }

			var settings = {
				mode: o.onSelect ? "SingleSelectMaster" : "None",
				columns: columns,
				noDataText: t("rankedOptions.noData")
			};
			if (o.onSelect) {
				settings.selectionChange = function (e) {
					var row = e.getParameter("listItem");
					if (row) { o.onSelect(row.data("option")); }
				};
			}
			var table = new Table(settings).addStyleClass("accRankedOptions");
			table.addEventDelegate({ onAfterRendering: function () {
				if (!pending) { return; }
				pending = false;
				Motion.rank(table.getItems().filter(function (r) { return r.getDomRef(); }));
			} });

			/** What the assistant is told about one option, under the same names as the columns. */
			function facts(op, d, gap) {
				var f = {};
				f[t("rankedOptions.column.option")] = t("rankedOptions.fact.optionValue", op.name, op.id);
				f[t("rankedOptions.column.rank")] = t("rankedOptions.fact.rankValue", op.rank, d.options.length);
				f[t("rankedOptions.column.settings")] = settingsText(op.settings);
				f[t("rankedOptions.column.cost")] = fmt(op.cost);
				f[t("rankedOptions.column.return")] = fmt(op.ret);
				f[t("rankedOptions.fact.target")] = fmt(d.target);
				f[t("rankedOptions.column.againstTarget")] = signed(gap);
				f[t("rankedOptions.column.driverMix")] = op.mix.map(function (m) { return t("rankedOptions.fact.mixItem", m.name, fmt(m.value)); }).join(", ");
				return f;
			}

			var part = Part.make({
				key: "ranked-options",
				content: new VBox({ renderType: "Bare", items: [table, more] }),
				empty: t("rankedOptions.empty"),
				render: function (d, previous) {
					var sel = table.getSelectedItem();
					var keep = sel ? sel.data("option").id : null;
					table.destroyItems();
					byId = {};
					more.setVisible(d.options.length > limit);
					more.setText(all ? t("rankedOptions.showTop", limit) : t("rankedOptions.showAll", d.options.length));
					d.options.slice(0, all ? d.options.length : limit).forEach(function (op) {
						var gap = op.ret - d.target;
						var tone = Format.tone(gap, "up");
						var cells = [
							new Text({ text: String(op.rank) }).addStyleClass("accTabular"),
							new ObjectIdentifier({ title: op.name, text: op.id }),
							new Text({ text: settingsText(op.settings) }),
							new Text({ text: fmt(op.cost) }).addStyleClass("accTabular"),
							new ObjectNumber({ number: fmt(op.ret) }).addStyleClass("accTabular"),
							new ObjectStatus({
								text: signed(gap),
								state: gap >= 0 ? "Success" : Format.state(tone),
								icon: gap >= 0 ? "sap-icon://sys-enter-2" : Format.arrow(gap),
								tooltip: gap >= 0 ? t("rankedOptions.meets", fmt(gap)) : t("rankedOptions.fallsShort", fmt(-gap))
							}).addStyleClass("accTabular"),
							DriverMix.create({ compact: true, width: "8rem", title: op.name, format: fmt, data: op.mix }).root
						];
						if (o.assistant) {
							cells.push(o.assistant.objectButton({
								title: t("rankedOptions.ai.title", op.name, op.rank),
								facts: facts(op, d, gap),
								question: t("rankedOptions.ai.question", op.name, op.rank)
							}));
						}
						var row = new ColumnListItem({ cells: cells, type: o.onSelect ? "Active" : "Inactive" });
						row.data("option", op);
						byId[op.id] = row;
						table.addItem(row);
						if (keep === op.id) { table.setSelectedItem(row, true); }
					});
					// Rows enter in rank order only when a new result arrives, not when the list is expanded.
					pending = d !== previous;
					if (!d.options.length) { part.state("empty"); }
				}
			});

			/** Selects the row for an option without firing onSelect, so two views can stay in step. */
			part.selectOption = function (id) {
				var row = byId[id];
				var d = part.data();
				if (!row && !all && d && d.options.some(function (op) { return op.id === id; })) {
					all = true;
					part.update(d);
					row = byId[id];
				}
				if (row) { table.setSelectedItem(row, true); } else { table.removeSelections(true); }
				return part;
			};
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			function data(seed) { var r = sampleOptions.run(Data, seed); return { target: r.target, options: r.options }; }
			return {
				options: {
					format: function (v) { return Format.money(v * 1000, "USD", true); },
					settingsText: function (s) {
						return t("rankedOptions.demo.settings", Format.delta(s.price, "number", 1), s.display,
							s.feature ? t("rankedOptions.demo.feature") : t("rankedOptions.demo.noFeature"), s.promotion);
					},
					assistant: ctx.assistant,
					onSelect: function (op) {
						sap.ui.require(["sap/m/MessageToast"], function (MessageToast) {
							MessageToast.show(t("rankedOptions.demo.selected", op.name));
						});
					},
					data: data(7)
				},
				next: function (seed) { return data(seed); }
			};
		}
	};
});
