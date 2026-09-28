/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Glance dialog: a quick look at how a set is distributed, without leaving the list. A button on the
 * list opens a dialog with a view selector (by group, by status), one share ring with its legend, one
 * sentence saying what is counted, and a single Close action. On a phone the dialog fills the screen.
 *
 * Use it when a person working down a list wants the shape of the whole set for a moment. Do not use
 * it for anything that needs more than one chart; that is a review board. The pattern arranges regions
 * only; it fetches nothing.
 */
sap.ui.define([
	"sap/ui/Device",
	"sap/m/VBox",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/ObjectStatus",
	"sap/m/OverflowToolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/Title",
	"accents/core/Layout",
	"accents/core/Format",
	"accents/elements/review/ShareRing",
	"accents/elements/common/SourceLine",
	"sap/ui/core/InvisibleText",
	"accents/core/I18n"
], function (Device, VBox, Text, Button, Dialog, SegmentedButton, SegmentedButtonItem, Table, Column, ColumnListItem, ObjectStatus,
	OverflowToolbar, ToolbarSpacer, Title, Layout, Format, ShareRing, SourceLine, InvisibleText, I18n) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.GlanceDialog");

	/**
	 * regions:
	 *   title    the dialog's title, a short noun ("Revenue distribution")
	 *   trigger  { text, icon, tooltip }: the button that opens the dialog
	 *   views    { items: [{ key, text }], selected, onChange(key), label }: the view selector (label names it for
	 *            screen readers; "View" when left out)
	 *   ring     the share ring control (with fewer than about 480 pixels it draws its own legend)
	 *   note     optional control under the ring, saying what is counted
	 *
	 * Returns { button, dialog }. Place the button on the list (for example in its header toolbar);
	 * the dialog is opened by the button and never needs placing. Destroy the dialog with the page.
	 */
	function compose(r) {
		var selector = null, selectorName = null;
		if (r.views) {
			selectorName = new InvisibleText({ text: r.views.label || t("glanceDialog.viewsLabel") }).toStatic();
			selector = new SegmentedButton({ width: "100%", selectedKey: r.views.selected,
				items: r.views.items.map(function (v) { return new SegmentedButtonItem({ key: v.key, text: v.text }); }) });
			selector.addAriaLabelledBy(selectorName);
			if (r.views.onChange) { selector.attachSelectionChange(function (e) { r.views.onChange(e.getParameter("item").getKey()); }); }
		}
		var dialog = new Dialog({
			title: r.title,
			contentWidth: "28rem",
			draggable: true,
			resizable: false,
			content: [new VBox({ renderType: "Bare", items: [].concat(selector ? [selector] : [], [r.ring], r.note ? [r.note] : []) })],
			endButton: new Button({ text: t("glanceDialog.close"), press: function () { dialog.close(); } })
		}).addStyleClass("sapUiContentPadding");
		var trigger = r.trigger || {};
		var button = new Button({ text: trigger.text || t("glanceDialog.trigger"), icon: trigger.icon || "sap-icon://donut-chart",
			tooltip: trigger.tooltip || t("glanceDialog.triggerTooltip"),
			press: function () {
				// Decided at each opening, so turning a tablet or resizing a window is respected.
				dialog.setStretch(Device.system.phone || Layout.narrower("phone"));
				dialog.open();
			} });
		// The dialog lives outside the page, so it goes when the button goes.
		var destroy = button.destroy;
		button.destroy = function () { dialog.destroy(); if (selectorName) { selectorName.destroy(); } return destroy.apply(this, arguments); };
		return { button: button, dialog: dialog };
	}

	return {
		info: {
			controls: ["sap.m.Dialog", "sap.m.SegmentedButton", "sap.m.Button", "share-ring"],
			motion: "None on the list. In the dialog, the ring's slices move to their new shares when the view changes.",
			still: false
		},
		compose: compose,

		example: function (Data) {
			var seed = 7, view = "group";
			function money(v) { return Format.money(v, "USD", true); }
			function behind(i) { return i.actual < i.plan; }

			/** Revenue to date (sample figures are thousands) summed by group, or by whether a category is behind plan. */
			function slices(items, by) {
				var sums = {};
				items.forEach(function (i) {
					var key = by === "status" ? (behind(i) ? t("glanceDialog.demo.behind") : t("glanceDialog.demo.onPlan")) : i.group;
					sums[key] = (sums[key] || 0) + i.actual * 1000;
				});
				return Object.keys(sums).map(function (k) { return { name: k, value: sums[k] }; });
			}

			var heading = new Title({ text: "", level: "H2" });
			var table = new Table({ ariaLabelledBy: [heading], columns: [
				new Column({ header: new Text({ text: t("glanceDialog.demo.colCategory") }) }),
				new Column({ header: new Text({ text: t("glanceDialog.demo.colGroup") }), minScreenWidth: "Tablet", demandPopin: true }),
				new Column({ header: new Text({ text: t("glanceDialog.demo.colStatus") }) }),
				new Column({ header: new Text({ text: t("glanceDialog.demo.colRevenue") }), hAlign: "End" })
			] });

			var ring = ShareRing.create({ label: t("glanceDialog.demo.ringLabel"), format: money, max: 6, height: "16rem" });
			var note = new Text({ text: "" }).addStyleClass("accLabel sapUiSmallMarginTop");
			var items = [];

			function counts() {
				var groups = {}, statuses = {};
				items.forEach(function (i) { groups[i.group] = true; statuses[behind(i) ? "b" : "o"] = true; });
				return { group: Object.keys(groups).length, status: Object.keys(statuses).length };
			}
			function fill() {
				items = Data.sample(seed).items;
				heading.setText(t("glanceDialog.demo.heading", items.length));
				table.destroyItems();
				items.forEach(function (i) {
					var late = behind(i);
					table.addItem(new ColumnListItem({ cells: [
						new Text({ text: i.name }),
						new Text({ text: i.group }),
						new ObjectStatus({ text: late ? t("glanceDialog.demo.behind") : t("glanceDialog.demo.onPlan"), state: late ? "Warning" : "Success",
							icon: late ? "sap-icon://alert" : "sap-icon://sys-enter-2" }),
						new Text({ text: money(i.actual * 1000) }).addStyleClass("accTabular")
					] }));
				});
				var c = counts();
				var sel = glance.dialog.getContent()[0].getItems()[0];
				sel.getItems()[0].setText(t("glanceDialog.demo.byGroupCount", c.group));
				sel.getItems()[1].setText(t("glanceDialog.demo.byStatusCount", c.status));
				show();
			}
			function show() {
				ring.update(slices(items, view));
				note.setText(view === "status" ? t("glanceDialog.demo.noteStatus", items.length) : t("glanceDialog.demo.noteGroup", items.length));
			}

			var glance = compose({
				title: t("glanceDialog.demo.title"),
				trigger: { text: t("glanceDialog.trigger"), icon: "sap-icon://donut-chart" },
				views: { selected: view, label: t("glanceDialog.viewsLabel"), items: [{ key: "group", text: t("glanceDialog.demo.byGroup") }, { key: "status", text: t("glanceDialog.demo.byStatus") }],
					onChange: function (key) { view = key; show(); } },
				ring: ring.root,
				note: note
			});
			table.setHeaderToolbar(new OverflowToolbar({ content: [heading, new ToolbarSpacer(), glance.button] }));
			fill();

			var control = new VBox({ renderType: "Bare", items: [
				Layout.card({ title: null, content: table }),
				SourceLine.create({ data: Data.sampleMeta() }).root
			] });
			return {
				control: control,
				next: function (sd) { return function () { seed = sd; fill(); }; }
			};
		}
	};
});
