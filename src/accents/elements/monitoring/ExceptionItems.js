/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Exception items: the items that break one rule. Each row names the object, the rule, the level the
 * rule was calculated at, and the figure that broke it next to the limit it broke. A person can select
 * several rows and hand them on in one go. Each row carries an assistant button, because a row is
 * something a person acts on.
 */
sap.ui.define([
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/Toolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/ObjectIdentifier",
	"sap/m/ObjectStatus",
	"sap/m/VBox",
	"sap/m/MessageToast",
	"sap/ui/core/InvisibleText",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/Layout",
	"accents/core/I18n"
], function (Table, Column, ColumnListItem, Toolbar, ToolbarSpacer, Title, Text, Button, ObjectIdentifier, ObjectStatus,
	VBox, MessageToast, InvisibleText, Part, Format, Motion, Layout, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.monitoring.i18n.i18n");

	var STATE = { error: "Error", warning: "Warning", information: "Information" };

	return {
		info: {
			controls: ["sap.m.Table", "sap.m.ObjectIdentifier", "sap.m.ObjectStatus", "sap.m.Button"],
			motion: "A breaking figure that changes flashes once. Headers, rules and levels never move.",
			still: false
		},

		/**
		 * options:
		 *   title      short noun for the list ("Target missed")
		 *   format     function (value) -> text for figures; default Format.number with 1 digit
		 *   onHandOff  optional: function (items) called with the selected items. Without it the
		 *              "Hand off" button is left out, never shown inert.
		 *   assistant  optional: the app's assistant; each row then gets an object button
		 *   onOpen     optional: function (item); rows become navigable and pressing one calls it
		 *   data       { type, rule, severity, items: [{ id, object, level, figure, limit, measure }] }
		 */
		create: function (o) {
			var fmt = o.format || function (v) { return Format.number(v, 1); };
			var heading = new Title({ text: o.title || t("exceptionItems.title"), level: "H3", titleStyle: "H6" });
			var handOff = null;
			var bar = new Toolbar({ style: "Clear", content: [heading, new ToolbarSpacer()] });
			if (o.onHandOff) {
				handOff = new Button({ text: t("exceptionItems.handOff"), type: "Emphasized", enabled: false,
					tooltip: t("exceptionItems.handOff.none"),
					press: function () {
						var picked = table.getSelectedItems().map(function (it) { return it.data("item"); });
						if (picked.length) { o.onHandOff(picked); }
					} });
				bar.addContent(handOff);
			}

			var columns = [
				new Column({ header: new Text({ text: t("exceptionItems.column.object") }) }),
				new Column({ header: new Text({ text: t("exceptionItems.column.rule") }), minScreenWidth: "Desktop", demandPopin: true, popinDisplay: "Inline" }),
				new Column({ header: new Text({ text: t("exceptionItems.column.level") }), minScreenWidth: "Tablet", demandPopin: true, popinDisplay: "Inline" }),
				new Column({ header: new Text({ text: t("exceptionItems.column.figure") }), hAlign: "End" })
			];
			// The assistant column has no room for a visible header; a hidden one names it for screen readers.
			if (o.assistant) { columns.push(new Column({ width: "3rem", hAlign: "Center", header: new InvisibleText({ text: t("exceptionItems.column.ask") }) })); }

			var table = new Table({
				mode: o.onHandOff ? "MultiSelect" : "None",
				headerToolbar: bar,
				columns: columns,
				noDataText: t("exceptionItems.noData"),
				selectionChange: sync
			}).addStyleClass("accExceptionItems");
			Layout.fitTable(table);

			/** What the assistant is told about one item. */
			function facts(it, d) {
				var f = {};
				f[t("exceptionItems.ask.fact.object")] = it.object + " (" + it.id + ")";
				f[t("exceptionItems.ask.fact.rule")] = d.rule;
				f[t("exceptionItems.ask.fact.level")] = it.level;
				f[t("exceptionItems.ask.fact.figure")] = (it.measure || t("exceptionItems.figure")) + " " + fmt(it.figure);
				f[t("exceptionItems.ask.fact.limit")] = fmt(it.limit);
				return f;
			}

			function sync() {
				if (!handOff) { return; }
				var n = table.getSelectedItems().length;
				handOff.setEnabled(n > 0);
				handOff.setText(n ? t("exceptionItems.handOffCount", n) : t("exceptionItems.handOff"));
				handOff.setTooltip(n ? t("exceptionItems.handOff.ready") : t("exceptionItems.handOff.none"));
			}

			var part = Part.make({
				key: "exception-items",
				content: table,
				empty: t("exceptionItems.empty"),
				render: function (d, previous) {
					var before = {};
					((previous && previous.items) || []).forEach(function (it) { before[it.id] = it; });
					var state = STATE[d.severity] || "Warning";
					heading.setText(t("exceptionItems.heading", o.title || d.type || t("exceptionItems.title"), d.items.length));
					table.destroyItems();
					d.items.forEach(function (it) {
						var gap = it.figure - it.limit;
						var figure = new ObjectStatus({
							text: fmt(it.figure),
							state: state,
							icon: Format.arrow(gap),
							tooltip: t("exceptionItems.figure.tooltip", it.measure || t("exceptionItems.figure"), fmt(it.figure), fmt(it.limit))
						}).addStyleClass("accTabular");
						var old = before[it.id];
						if (previous && old && old.figure !== it.figure) {
							figure.addEventDelegate({ onAfterRendering: function () {
								if (figure._flashed) { return; }
								figure._flashed = true;
								Motion.flash(figure, "none");
							} });
						}
						var cells = [
							new ObjectIdentifier({ title: it.object, text: it.id }),
							new Text({ text: d.rule }),
							new Text({ text: it.level }),
							new VBox({ renderType: "Bare", alignItems: "End", items: [
								figure,
								new Text({ text: t("exceptionItems.limit", fmt(it.limit)) }).addStyleClass("accLabel accTabular")
							] })
						];
						if (o.assistant) {
							cells.push(o.assistant.objectButton({
								title: t("exceptionItems.ask.title", it.object, d.type || t("exceptionItems.exception")),
								facts: facts(it, d),
								question: t("exceptionItems.ask.question", it.object)
							}));
						}
						var rowSettings = { cells: cells };
						if (o.onOpen) {
							rowSettings.type = "Navigation";
							rowSettings.press = function () { o.onOpen(it); };
						}
						var row = new ColumnListItem(rowSettings);
						row.data("item", it);
						table.addItem(row);
					});
					sync();
					if (!d.items.length) { part.state("empty"); }
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			/** Items whose year-to-date actual is below target, read from the sample data. */
			function data(seed) {
				var items = Data.sample(seed).items.filter(function (i) { return i.actual < i.target; }).map(function (i) {
					return { id: i.id, object: i.name, level: t("exceptionItems.demo.level", i.group), figure: i.actual, limit: i.target, measure: t("exceptionItems.demo.measure") };
				});
				return { type: t("exceptionItems.demo.type"), severity: "warning", rule: t("exceptionItems.demo.rule"), items: items };
			}
			return {
				options: {
					title: t("exceptionItems.demo.type"),
					format: function (v) { return Format.number(v, 1) + "k"; },
					assistant: ctx.assistant,
					data: data(7),
					onHandOff: function (picked) {
						// The demo has no backend, so it says what would be sent instead of sending it.
						MessageToast.show(t(picked.length === 1 ? "exceptionItems.demo.handOffOne" : "exceptionItems.demo.handOffMany", picked.length,
							picked.map(function (p) { return p.object; }).join(", ")));
					}
				},
				next: function (seed) { return data(seed); }
			};
		}
	};
});
