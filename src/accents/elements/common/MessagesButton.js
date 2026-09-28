/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Messages button: shows how many messages the screen has, coloured by the most serious one, and opens
 * the list. Choosing a message that belongs to a field moves the focus to that field. It is hidden
 * while there are no messages, because a button that opens an empty list does nothing useful.
 */
sap.ui.define([
	"sap/m/Button",
	"sap/m/MessagePopover",
	"sap/m/MessageItem",
	"sap/m/MessageToast",
	"accents/core/Part",
	"accents/core/Messages",
	"accents/core/Motion",
	"accents/core/I18n"
], function (Button, MessagePopover, MessageItem, MessageToast, Part, Messages, Motion, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.common.i18n.i18n");
	var ICON = { Error: "sap-icon://error", Warning: "sap-icon://alert", Success: "sap-icon://sys-enter-2", Information: "sap-icon://information" };
	var TYPE = { Error: "Negative", Warning: "Critical", Success: "Success", Information: "Neutral" };

	return {
		info: {
			controls: ["sap.m.Button", "sap.m.MessagePopover", "sap.m.MessageItem"],
			motion: "The count pulses once when it changes.",
			still: false
		},

		/** options: none required. It reads accents/core/Messages, the screen's one message list. */
		create: function () {
			var popover = new MessagePopover({
				groupItems: true,
				items: { path: "/", template: new MessageItem({
					type: "{type}", title: "{message}", subtitle: "{additionalText}", description: "{description}", groupName: "{additionalText}"
				}) },
				// Choosing a field's message takes the person to that field.
				itemSelect: function (e) {
					var control = Messages.controlOf(e.getParameter("item").getBindingContext().getObject());
					if (control && control.focus) { popover.close(); control.focus(); }
				}
			});
			popover.setModel(Messages.model());
			var button = new Button({ visible: false, press: function () { popover.toggle(button); } });
			button.addDependent(popover);
			var last = 0;

			function refresh() {
				var n = Messages.count();
				var worst = Messages.worst();
				button.setVisible(n > 0);
				button.setText(t("messages.count", n));
				button.setTooltip(t("messages.tooltip"));
				if (worst) { button.setIcon(ICON[worst]); button.setType(TYPE[worst]); }
				if (n !== last && button.getDomRef()) { Motion.pulse(button); }
				last = n;
			}
			var stop = Messages.onChange(refresh);
			var part = Part.make({
				key: "messages-button",
				content: button,
				onDestroy: stop,
				render: refresh
			});
			part.update({});
			return part;
		},

		example: function (Data, ctx) {
			var shown = 0;
			function next() {
				shown += 1;
				Messages.clear("Demo");
				var kinds = [
					{ type: "Error", text: t("messages.demo.error") },
					{ type: "Warning", text: t("messages.demo.warning") },
					{ type: "Information", text: t("messages.demo.info") }
				];
				kinds.slice(0, 1 + (shown % 3)).forEach(function (k) { Messages.add({ type: k.type, text: k.text, group: "Demo" }); });
				return {};
			}
			next();
			return { options: {}, next: next };
		}
	};
});
