/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Counted switch: a view switch where every option carries its count in brackets, "Late (2)". An
 * option whose count is zero stays visible and selectable; choosing it shows the good news. When the
 * options would be cut short (a phone), the same options become a drop-down so no count is hidden.
 */
sap.ui.define([
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/Select",
	"sap/m/VBox",
	"sap/ui/core/Item",
	"sap/ui/core/ResizeHandler",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/I18n"
], function (SegmentedButton, SegmentedButtonItem, Select, VBox, Item, ResizeHandler, Part, Format, Motion, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.common.i18n.i18n");

	/** Runs fn once, right after the control next renders. */
	function afterRender(control, fn) {
		var d = { onAfterRendering: function () { control.removeEventDelegate(d); fn(); } };
		control.addEventDelegate(d);
	}

	return {
		info: {
			controls: ["sap.m.SegmentedButton", "sap.m.Select (narrow screens)"],
			motion: "An option whose count changes pulses once; the others stay still.",
			still: false
		},

		/**
		 * options:
		 *   label     accessible name ("Status view")
		 *   onSelect  optional; receives the chosen option's key
		 *   data      { options: [{ key, label, count, tooltip }], selected }
		 */
		create: function (o) {
			var sb = new SegmentedButton({ width: "100%" });
			var select = new Select({ width: "100%", visible: false });
			if (o.label) { sb.setTooltip(o.label); select.setTooltip(o.label); }
			sb.attachSelectionChange(function (e) {
				select.setSelectedKey(sb.getSelectedKey());
				if (o.onSelect) { o.onSelect(e.getParameter("item").getKey()); }
			});
			select.attachChange(function (e) {
				sb.setSelectedKey(select.getSelectedKey());
				if (o.onSelect) { o.onSelect(e.getParameter("selectedItem").getKey()); }
			});
			var items = {};
			var box = new VBox({ renderType: "Bare", items: [sb, select] });
			// Rough width each option needs: its text at about 0.55em per character, plus padding.
			function needed() {
				var em = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
				return sb.getItems().reduce(function (w, it) { return w + it.getText().length * 0.55 * em + 2 * em; }, 0);
			}
			function layout() {
				var el = box.getDomRef();
				if (!el || !el.clientWidth) { return; }
				var narrow = needed() > el.clientWidth;
				if (narrow === select.getVisible()) { return; }
				sb.setVisible(!narrow);
				select.setVisible(narrow);
			}
			var handle = null;
			box.addEventDelegate({ onAfterRendering: function () {
				if (!handle) { handle = ResizeHandler.register(box, layout); }
				layout();
			} });

			var part = Part.make({
				key: "counted-switch",
				content: box,
				empty: t("countedSwitch.empty"),
				render: function (d, prev) {
					var keys = d.options.map(function (x) { return x.key; }).join("|");
					var old = {};
					(prev ? prev.options : []).forEach(function (x) { old[x.key] = x.count; });
					if (keys !== sb.data("keys")) {
						sb.destroyItems();
						select.destroyItems();
						items = {};
						d.options.forEach(function (x) {
							items[x.key] = new SegmentedButtonItem({ key: x.key });
							sb.addItem(items[x.key]);
							select.addItem(new Item({ key: x.key }));
						});
						sb.data("keys", keys);
					}
					d.options.forEach(function (x) {
						var it = items[x.key];
						it.setText(t("countedSwitch.option", x.label, Format.number(x.count)));
						select.getItems().filter(function (si) { return si.getKey() === x.key; })[0].setText(it.getText());
						if (x.tooltip) { it.setTooltip(x.tooltip); }
						if (x.key in old && old[x.key] !== x.count) {
							afterRender(sb, function () { Motion.pulse(it.getDomRef() && it.getDomRef().querySelector(".sapMSegBBtnInner") || it); });
						}
					});
					var sel = sb.getSelectedKey();
					sb.setSelectedKey(d.selected || (sel && items[sel] ? sel : d.options[0].key));
					select.setSelectedKey(sb.getSelectedKey());
					setTimeout(layout, 0);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function d(seed) {
				var s = Data.sample(seed);
				var behind = s.items.filter(function (i) { return i.actual < i.plan; }).length;
				var noPlan = s.items.filter(function (i) { return i.plan === null || i.plan === undefined; }).length;
				return { options: [
					{ key: "all", label: t("countedSwitch.demo.all"), count: s.items.length },
					{ key: "behind", label: t("countedSwitch.demo.behind"), count: behind, tooltip: t("countedSwitch.demo.behindTooltip") },
					{ key: "ahead", label: t("countedSwitch.demo.ahead"), count: s.items.length - behind, tooltip: t("countedSwitch.demo.aheadTooltip") },
					{ key: "noplan", label: t("countedSwitch.demo.noPlan"), count: noPlan, tooltip: t("countedSwitch.demo.noPlanTooltip") }
				] };
			}
			return { options: { label: t("countedSwitch.demo.label"), data: d(7) }, next: function (seed) { return d(seed); } };
		}
	};
});
