/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Key-figure toggle: shows or hides key figures in the workspace chart and the key-figure grid at the
 * same time, so the two never disagree. Each key figure carries the colour swatch of its chart line.
 * The last visible key figure cannot be hidden: its box is disabled and says why.
 */
sap.ui.define([
	"sap/m/FlexBox",
	"sap/m/HBox",
	"sap/m/Label",
	"sap/m/CheckBox",
	"sap/ui/core/Icon",
	"accents/core/Part",
	"accents/core/Tokens",
	"accents/core/I18n"
], function (FlexBox, HBox, Label, CheckBox, Icon, Part, Tokens, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.planning.i18n.i18n");

	return {
		info: {
			controls: ["sap.m.CheckBox", "sap.ui.core.Icon", "sap.m.Label"],
			motion: "None. A setting never animates; the chart and grid it controls move instead.",
			still: true
		},

		/**
		 * options:
		 *   data  [{ key, name, visible, slot }]   slot = the key figure's chart colour slot (default: position)
		 *   onChange(keys)   the keys now visible; pass them to the chart's and the grid's setVisible
		 */
		create: function (o) {
			var list = [];
			var title = new Label({ text: "", showColon: true }).addStyleClass("sapUiSmallMarginEnd");
			var boxes = new FlexBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Center" });
			var stopTheme = null;

			function shown() { return list.filter(function (k) { return k.visible; }).map(function (k) { return k.key; }); }

			function draw() {
				var keys = shown();
				title.setText(t("keyFigureToggle.title", keys.length, list.length));
				boxes.destroyItems();
				list.forEach(function (k, i) {
					var last = k.visible && keys.length === 1;
					var box = new CheckBox({ text: k.name, selected: k.visible, enabled: !last,
						tooltip: last ? t("keyFigureToggle.lastVisible")
							: t(k.visible ? "keyFigureToggle.hide" : "keyFigureToggle.show", k.name),
						select: function (e) {
							k.visible = e.getParameter("selected");
							draw();
							if (o.onChange) { o.onChange(shown()); }
						} });
					boxes.addItem(new HBox({ renderType: "Bare", alignItems: "Center", items: [
						new Icon({ src: "sap-icon://circle-task-2", size: "0.625rem", decorative: true,
							color: Tokens.series(typeof k.slot === "number" ? k.slot : i) }),
						box
					] }).addStyleClass("sapUiSmallMarginEnd"));
				});
			}

			var content = new FlexBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Center", items: [title, boxes] });
			// Stop redrawing on theme changes once the toggle goes away.
			var destroy = content.destroy;
			content.destroy = function () { if (stopTheme) { stopTheme(); } return destroy.apply(this, arguments); };
			var part = Part.make({
				key: "key-figure-toggle",
				content: content,
				empty: t("keyFigureToggle.empty"),
				render: function (d) {
					list = d.map(function (k) { return Object.assign({ visible: true }, k); });
					if (list.length && !shown().length) { list[0].visible = true; }
					draw();
					if (!stopTheme) { stopTheme = Tokens.onChange(function () { if (list.length) { draw(); } }); }
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function () {
			function make() {
				return [
					{ key: "REV", name: t("keyFigureToggle.demo.revenue"), visible: true, slot: 0 },
					{ key: "PLAN", name: t("keyFigureToggle.demo.plan"), visible: true, slot: 1 },
					{ key: "UPLIFT", name: t("keyFigureToggle.demo.uplift"), visible: false, slot: 2 }
				];
			}
			return { options: { data: make(), onChange: function () {} }, next: function () { return make(); } };
		}
	};
});
