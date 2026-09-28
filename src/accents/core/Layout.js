/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Cards and bands. A page is a stack of bands; each band has a heading and one card grid. Every card
 * declares both how many columns and how many rows it spans, so cards in a band end on the same line.
 * Grid: 16 columns wide, 8 medium, 4 narrow; spans are quarter (4), half (8) or full (16).
 */
sap.ui.define([
	"sap/f/Card",
	"sap/f/cards/Header",
	"sap/f/GridContainer",
	"sap/f/GridContainerSettings",
	"sap/f/GridContainerItemLayoutData",
	"sap/m/VBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/Toolbar",
	"sap/m/ToolbarSpacer",
	"sap/ui/core/ResizeHandler"
], function (Card, CardHeader, GridContainer, GridContainerSettings, ItemLayoutData, VBox, Title, Text, Button, Toolbar, ToolbarSpacer, ResizeHandler) {
	"use strict";

	var ROW = "5rem";
	var GAP = "0.75rem";

	function settings(columns, rowSize) {
		// The control only takes fixed column widths; stretch() below makes the columns share the width.
		return new GridContainerSettings({ columns: columns, rowSize: rowSize || ROW, columnSize: "4rem", gap: GAP });
	}

	var Layout = {
		/**
		 * The widths, in CSS pixels, where layouts change. Use these instead of writing numbers into
		 * elements, so every element changes at the same points. Layout.narrower("phone") is true
		 * below the phone limit.
		 */
		WIDTHS: Object.freeze({ phone: 600, tablet: 1024, desktop: 1440 }),
		narrower: function (name, width) {
			return (width === undefined ? window.innerWidth : width) < Layout.WIDTHS[name];
		},

		/**
		 * Makes a sap.m.Table drop columns below the row (pop-in) by its own width, not the window's,
		 * so it behaves inside a narrow panel or column. UI5's contextualWidth "Auto" does nothing until
		 * the first resize, so this measures the table and sets the width in pixels.
		 */
		fitTable: function (table) {
			var id = null;
			table.addEventDelegate({ onAfterRendering: function () {
				if (id) { ResizeHandler.deregister(id); }
				var measure = function () {
					var el = table.getDomRef();
					if (el && el.clientWidth) {
						var w = el.clientWidth + "px";
						if (table.getContextualWidth() !== w) { table.setContextualWidth(w); }
					}
				};
				id = ResizeHandler.register(table, measure);
				measure();
			} });
			return table;
		},

		/**
		 * A card that answers one question.
		 *  title    short noun phrase naming the question
		 *  subtitle unit and source, e.g. "USD · sample data"
		 *  content  one control (one chart per card)
		 *  cols     4, 8 or 16 (default 4)
		 *  rows     how many 5rem rows it spans (required in spirit; default 4)
		 *  action   optional single footer action { text, press }
		 *  press    optional: makes the whole card pressable (it then lifts on hover)
		 */
		card: function (o) {
			var body = new VBox({ items: [o.content], renderType: "Bare", fitContainer: true }).addStyleClass("accCardBody");
			if (o.action) {
				body.addItem(new Toolbar({ style: "Clear", content: [new ToolbarSpacer(),
					new Button({ text: o.action.text, type: "Transparent", press: o.action.press })] }));
			}
			if (!o.title) { body.addStyleClass("accCardBody--bare"); }
			var settings = { content: body, layoutData: new ItemLayoutData({ columns: o.cols || 4, rows: o.rows || 4 }) };
			if (o.title) {
				// Event settings must be left out, not set to undefined: UI5 throws on an undefined handler.
				var head = { title: o.title, subtitle: o.subtitle };
				if (o.press) { head.press = o.press; }
				settings.header = new CardHeader(head);
			}
			var card = new Card(settings).addStyleClass("accCard");
			if (o.press) { card.addStyleClass("accPressable"); }
			return card;
		},

		/**
		 * A band: heading plus a grid of cards. Breakpoints follow the band's width, not the device.
		 * o: { title, cards, rowSize } — rowSize defaults to 5rem; KPI bands use 3.5rem.
		 */
		band: function (o) {
			var grid = new GridContainer({
				containerQuery: true,
				snapToRow: true,
				allowDenseFill: false,
				layout: settings(16, o.rowSize),
				layoutXL: settings(16, o.rowSize),
				layoutL: settings(16, o.rowSize),
				layoutM: settings(8, o.rowSize),
				layoutS: settings(4, o.rowSize),
				layoutXS: settings(4, o.rowSize),
				items: o.cards || []
			});
			var stretch = function () {
				var el = grid.getDomRef();
				var active = grid.getActiveLayoutSettings && grid.getActiveLayoutSettings();
				if (el && active) { el.style.setProperty("--acc-cols", active.getColumns()); }
			};
			grid.addEventDelegate({ onAfterRendering: stretch });
			grid.attachLayoutChange(function () { setTimeout(stretch, 0); });
			var items = [];
			if (o.title) { items.push(new Title({ text: o.title, level: "H2", titleStyle: "H5" }).addStyleClass("accBandTitle")); }
			items.push(grid);
			return new VBox({ items: items, renderType: "Bare" }).addStyleClass("accBand");
		},

		/** Standard page frame inside the shell: title, one-sentence lead, content. */
		page: function (o) {
			var items = [new Title({ text: o.title, level: "H1", titleStyle: "H3" }).addStyleClass("accPageTitle")];
			if (o.lead) { items.push(new Text({ text: o.lead }).addStyleClass("accPageLead")); }
			return new VBox({ items: items.concat(o.content || []), renderType: "Bare" }).addStyleClass("accPage");
		},

		/**
		 * Audit helper: within each band, cards sharing a top edge must share a height.
		 * Returns a list of problems (empty means aligned).
		 */
		checkBands: function (root) {
			var problems = [];
			(root || document).querySelectorAll(".accBand .sapFGridContainer").forEach(function (grid, b) {
				var rows = {};
				grid.querySelectorAll(":scope > .sapFGridContainerItemWrapper").forEach(function (w) {
					var r = w.getBoundingClientRect();
					var top = Math.round(r.top);
					(rows[top] = rows[top] || []).push(Math.round(r.height));
				});
				Object.keys(rows).forEach(function (top) {
					var hs = rows[top];
					if (Math.max.apply(null, hs) - Math.min.apply(null, hs) > 1) {
						problems.push("Band " + (b + 1) + ": cards at the same top edge have heights " + hs.join(", "));
					}
				});
			});
			return problems;
		}
	};
	return Layout;
});
