/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * The contract every element follows. An element module's create(options) returns a Part:
 *
 *   part.key          the element's catalogue key
 *   part.root         the control to place on a page
 *   part.update(data) apply new data; runs the element's data motion on what changed
 *   part.state(name, message)  "ready" | "loading" | "empty" | "error"
 *
 * Part.make() builds that shape and handles the four states the same way everywhere:
 *  - loading: busy indicator on the content only, after a short delay; headers stay
 *  - empty:   a sentence saying what the absence means (usually good news)
 *  - error:   an in-place message with a retry; the technical reason stays out of view
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/MessageStrip",
	"sap/m/IllustratedMessage",
	"sap/m/Button",
	"accents/core/I18n"
], function (VBox, MessageStrip, IllustratedMessage, Button, I18n) {
	"use strict";

	var t = I18n.use("accents.i18n.i18n");

	var Part = {
		STATES: ["ready", "loading", "empty", "error"],

		/**
		 * o.key      catalogue key
		 * o.content  the control that shows data
		 * o.render   function (data, previous) that writes data into content
		 * o.empty    default empty sentence
		 * o.onRetry  optional; shows a Retry button on the error state
		 * o.fill     true when the element should stretch to its card's height
		 * o.onDestroy optional cleanup, run once when the element is destroyed
		 */
		make: function (o) {
			var message = new VBox({ renderType: "Bare" }).addStyleClass("accPartMsg");
			var root = new VBox({ items: [o.content, message], renderType: "Bare", fitContainer: !!o.fill }).addStyleClass("accPart");
			o.content.setBusyIndicatorDelay(300);
			// o.onDestroy: stop listeners (theme, resize) when the element is destroyed.
			if (o.onDestroy) {
				var destroy = root.destroy;
				root.destroy = function () { o.onDestroy(); return destroy.apply(root, arguments); };
			}
			var current = null;
			var part = {
				key: o.key,
				root: root,
				content: o.content,
				data: function () { return current; },
				update: function (data) {
					var previous = current;
					current = data;
					part.state("ready");
					o.render(data, previous);
					return part;
				},
				state: function (name, text) {
					message.destroyItems();
					o.content.setBusy(name === "loading");
					o.content.setVisible(name === "ready" || name === "loading");
					if (name === "empty") {
						message.addItem(new IllustratedMessage({
							illustrationType: "sapIllus-NoData",
							illustrationSize: "Dot",
							title: text || o.empty || t("part.empty"),
							enableDefaultTitleAndDescription: false
						}));
					} else if (name === "error") {
						message.addItem(new MessageStrip({
							type: "Error",
							showIcon: true,
							text: text || t("part.error")
						}));
						if (o.onRetry) {
							message.addItem(new Button({ text: t("part.retry"), press: o.onRetry }));
						}
					}
					return part;
				}
			};
			return part;
		}
	};
	return Part;
});
