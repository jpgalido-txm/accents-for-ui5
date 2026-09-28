/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Mode choice: one choice among modes that exclude each other, such as how a total is spread over
 * items. Two to five modes show side by side as a segmented button, so every option is visible at
 * once; more than five become a drop-down list, which stays readable. On a phone, where side-by-side
 * names would be cut short, the modes always use the drop-down list. Each mode can carry a sentence
 * saying what it does, shown as its tooltip.
 */
sap.ui.define([
	"sap/ui/Device",
	"sap/m/VBox",
	"sap/m/Label",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/Select",
	"sap/ui/core/Item",
	"accents/core/Part",
	"accents/core/I18n"
], function (Device, VBox, Label, SegmentedButton, SegmentedButtonItem, Select, Item, Part, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.planning.i18n.i18n");

	var MAX_SEGMENTS = 5;
	var PHONE = 600;

	return {
		info: {
			controls: ["sap.m.SegmentedButton (two to five modes)", "sap.m.Select (more than five, or on a phone)"],
			motion: "None. A choice never animates; the figures it changes move instead.",
			still: true
		},

		/**
		 * options:
		 *   label    short noun ("Spread")
		 *   data     { modes: [{ key, text, tooltip, enabled, reason }], selected }
		 *            enabled: false disables a mode; reason says why (shown as its tooltip)
		 *   onChange(key)   the chosen mode
		 */
		create: function (o) {
			var label = new Label({ text: o.label || "" , visible: !!o.label });
			var holder = new VBox({ renderType: "Bare", alignItems: "Start" });
			var control = null, current = null;

			function pick(key) { if (o.onChange) { o.onChange(key); } }
			function tip(m) { return m.enabled === false ? (m.reason || t("modeChoice.notAvailable")) : (m.tooltip || m.text); }

			function draw(d) {
				holder.destroyItems();
				var modes = d.modes || [];
				var selected = control && control.getSelectedKey ? control.getSelectedKey() || d.selected : d.selected;
				if (modes.length <= MAX_SEGMENTS && window.innerWidth >= PHONE) {
					control = new SegmentedButton({ selectedKey: selected,
						items: modes.map(function (m) {
							return new SegmentedButtonItem({ key: m.key, text: m.text, tooltip: tip(m), enabled: m.enabled !== false });
						}),
						selectionChange: function (e) { pick(e.getParameter("item").getKey()); } });
				} else {
					control = new Select({ selectedKey: selected, width: "20rem", maxWidth: "100%",
						items: modes.map(function (m) {
							return new Item({ key: m.key, text: m.text, tooltip: tip(m), enabled: m.enabled !== false });
						}),
						change: function (e) { pick(e.getParameter("selectedItem").getKey()); } });
				}
				label.setLabelFor(control);
				// A segmented button renders as a list box; the label names it only through aria-labelledby.
				if (o.label) { control.addAriaLabelledBy(label); }
				holder.addItem(control);
			}

			var part = Part.make({
				key: "mode-choice",
				content: new VBox({ renderType: "Bare", items: [label, holder] }),
				empty: t("modeChoice.empty"),
				render: function (d) { current = d; control = null; draw(d); }
			});
			// Switch between the segmented button and the list when the screen crosses the phone width.
			var phone = window.innerWidth < PHONE;
			var onResize = function () {
				var now = window.innerWidth < PHONE;
				if (now !== phone && current) { phone = now; draw(current); }
			};
			Device.resize.attachHandler(onResize);
			var root = part.root, destroy = root.destroy;
			root.destroy = function () { Device.resize.detachHandler(onResize); return destroy.apply(this, arguments); };
			part.selected = function () {
				return control ? (control.getSelectedKey ? control.getSelectedKey() : null) : null;
			};
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function () {
			var four = [
				{ key: "top", text: t("modeChoice.demo.top"), tooltip: t("modeChoice.demo.top.tooltip") },
				{ key: "bottom", text: t("modeChoice.demo.bottom"), tooltip: t("modeChoice.demo.bottom.tooltip") },
				{ key: "middle", text: t("modeChoice.demo.middle"), tooltip: t("modeChoice.demo.middle.tooltip") },
				{ key: "fixed", text: t("modeChoice.demo.fixed"), enabled: false, reason: t("modeChoice.demo.fixed.reason") }
			];
			return {
				options: { label: t("modeChoice.demo.label"), data: { modes: four, selected: "top" }, onChange: function () {} },
				next: function () { return { modes: four, selected: "top" }; }
			};
		}
	};
});
