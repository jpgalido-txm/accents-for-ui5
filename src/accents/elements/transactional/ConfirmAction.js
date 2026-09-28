/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Confirm action: every action that deletes, sends, submits or cannot be undone goes through this.
 * The question names the object and the consequence ("Delete order 4711? Its 3 items are deleted
 * too."), the confirming button repeats the verb ("Delete", never "OK"), and the safe choice has focus.
 * When the action can be undone, prefer doing it at once with an undo message instead of asking.
 *
 *   ConfirmAction.ask({ verb: "Delete", object: "order 4711", consequence: "Its 3 items are deleted too.",
 *     danger: true }).then(function (yes) { if (yes) { ... } });
 */
sap.ui.define([
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/VBox",
	"sap/m/TextArea",
	"sap/m/Label",
	"sap/ui/core/InvisibleText",
	"accents/core/Part",
	"accents/core/I18n"
], function (Dialog, Button, Text, VBox, TextArea, Label, InvisibleText, Part, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");

	/**
	 * Opens the question and resolves to true (confirmed) or false (cancelled or closed).
	 * o: { verb, object, consequence, danger, reason: { label, required } }
	 * With reason, it resolves to { reason } instead of true, so the reason can be recorded.
	 */
	function ask(o) {
		return new Promise(function (resolve) {
			var reason = null;
			var items = [new Text({ text: o.consequence || "" }).setVisible(!!o.consequence)];
			if (o.reason) {
				reason = new TextArea({ width: "100%", rows: 3, maxLength: 1000, required: !!o.reason.required,
					liveChange: function () { confirm.setEnabled(!o.reason.required || !!reason.getValue().trim()); } });
				var label = new Label({ text: o.reason.label || t("confirm.reason"), labelFor: reason, required: !!o.reason.required });
				items.push(label.addStyleClass("sapUiSmallMarginTop"), reason);
			}
			var done = false;
			function finish(value) { if (done) { return; } done = true; dialog.close(); resolve(value); }
			var confirm = new Button({
				text: o.verb,
				type: o.danger ? "Reject" : "Emphasized",
				enabled: !(o.reason && o.reason.required),
				press: function () { finish(reason ? { reason: reason.getValue().trim() } : true); }
			});
			var cancel = new Button({ text: t("confirm.cancel"), press: function () { finish(false); } });
			var dialog = new Dialog({
				type: "Message",
				state: o.danger ? "Warning" : "None",
				title: t("confirm.question", o.verb, o.object),
				contentWidth: "26rem",
				content: [new VBox({ renderType: "Bare", items: items })],
				beginButton: confirm,
				endButton: cancel,
				initialFocus: reason || cancel,
				afterClose: function () { finish(false); dialog.destroy(); }
			}).addStyleClass("sapUiContentPadding");
			dialog.open();
		});
	}

	return {
		ask: ask,

		info: {
			controls: ["sap.m.Dialog", "sap.m.Button", "sap.m.TextArea"],
			motion: "None. A confirmation never animates beyond the dialog opening.",
			still: true
		},

		/**
		 * A button that asks before it acts. options: { text, verb, object, consequence, danger,
		 * reason, onConfirm(result, part) }. The button's own text is the action ("Delete order").
		 */
		create: function (o) {
			var status = new Text({ text: "" }).addStyleClass("accLabel sapUiTinyMarginTop");
			var button = new Button({
				text: o.text || o.verb,
				type: o.danger ? "Reject" : "Default",
				icon: o.icon,
				press: function () {
					ask(o).then(function (result) {
						if (result && o.onConfirm) { o.onConfirm(result, part); }
					});
				}
			});
			var part = Part.make({
				key: "confirm-action",
				content: new VBox({ renderType: "Bare", alignItems: "Start", items: [button, status] }),
				render: function (d) { status.setText(d && d.status || ""); status.setVisible(!!(d && d.status)); }
			});
			part.ask = function () { return ask(o); };
			part.update({});
			return part;
		},

		example: function () {
			var options = {
				text: t("confirm.demo.button"),
				verb: t("confirm.demo.verb"),
				object: t("confirm.demo.object"),
				consequence: t("confirm.demo.consequence"),
				danger: true,
				icon: "sap-icon://delete",
				onConfirm: function (result, part) { part.update({ status: t("confirm.demo.done") }); }
			};
			return {
				options: options,
				next: function () { return { status: "" }; }
			};
		}
	};
});
