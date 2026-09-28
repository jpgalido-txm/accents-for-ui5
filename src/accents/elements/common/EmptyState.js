/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Empty state: an illustration, a sentence saying what the absence means (often good news), and one
 * action that fills it. It never animates.
 */
sap.ui.define([
	"sap/m/IllustratedMessage",
	"sap/m/Button",
	"accents/core/Part",
	"accents/core/I18n"
], function (IllustratedMessage, Button, Part, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.common.i18n.i18n");

	return {
		info: {
			controls: ["sap.m.IllustratedMessage", "sap.m.Button"],
			motion: "None. An empty state never animates.",
			still: true
		},

		/**
		 * options:
		 *   onAction  what the one action does; without it, no button is shown
		 *   data      { title (what the absence means, a sentence), description (optional second sentence),
		 *               action (button text, a short verb phrase), illustration (sapIllus-... type) }
		 */
		create: function (o) {
			var button = new Button({ type: "Emphasized", visible: false });
			if (o.onAction) { button.attachPress(function () { o.onAction(); }); }
			var msg = new IllustratedMessage({ illustrationSize: "Auto", enableDefaultTitleAndDescription: false,
				additionalContent: [button] });

			var part = Part.make({
				key: "empty-state",
				content: msg,
				empty: t("emptyState.empty"),
				render: function (d) {
					msg.setIllustrationType(d.illustration || "sapIllus-NoData");
					msg.setTitle(d.title);
					msg.setDescription(d.description || "");
					button.setText(d.action || "");
					button.setVisible(!!(d.action && o.onAction));
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			function d() {
				return {
					illustration: "sapIllus-NoEntries",
					title: t("emptyState.demo.title"),
					description: t("emptyState.demo.description"),
					action: t("emptyState.demo.action")
				};
			}
			return {
				options: {
					data: d(),
					// The gallery has no scenarios to create; the action goes where one is made.
					onAction: function () { if (ctx && ctx.go) { ctx.go("planning-desk"); } }
				},
				next: function () { return d(); }
			};
		}
	};
});
