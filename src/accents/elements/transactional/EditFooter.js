/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Edit footer: Save and Cancel kept in view for as long as something is being edited, with the
 * Messages button beside them. While there are problems, Save is switched off and the footer says
 * why in words ("Fix 2 problems to save"), because a greyed-out button alone explains nothing.
 * Cancel with unsaved changes asks first, since thrown-away changes cannot be brought back.
 *
 * Give it `content` and it wraps that content in a page whose footer stays at the bottom while the
 * content scrolls. Without content, place `part.bar` in a page's footer yourself (an object page's
 * footer, for example).
 */
sap.ui.define([
	"sap/m/OverflowToolbar",
	"sap/m/OverflowToolbarLayoutData",
	"sap/m/ToolbarSpacer",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/Page",
	"sap/m/VBox",
	"sap/ui/Device",
	"accents/core/Part",
	"accents/core/Messages",
	"accents/core/Layout",
	"accents/core/I18n",
	"accents/elements/common/MessagesButton",
	"accents/elements/transactional/ConfirmAction",
	"accents/elements/transactional/FormSection"
], function (OverflowToolbar, OverflowToolbarLayoutData, ToolbarSpacer, Button, Text, Page, VBox, Device, Part, Messages, Layout, I18n, MessagesButton,
	ConfirmAction, FormSection) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");

	/** Errors in the given message groups (all groups when none are given). */
	function errors(groups) {
		return (Messages.model().getData() || []).filter(function (m) {
			return m.getType() === "Error" && (!groups || groups.indexOf(m.getAdditionalText()) >= 0);
		}).length;
	}

	function create(o) {
		var never = function () { return new OverflowToolbarLayoutData({ priority: "NeverOverflow" }); };
		var messages = MessagesButton.create();
		messages.root.setLayoutData(never());
		var reason = new Text({ wrapping: false }).addStyleClass("accLabel");
		var save = new Button({ text: o.saveText || t("editFooter.save"), type: "Emphasized", layoutData: never(), press: function () {
			var n = o.validate ? o.validate() : 0;
			if (n > 0) { refresh(); return; }
			if (o.onSave) { o.onSave(part); }
		} });
		var cancel = new Button({ text: t("editFooter.cancel"), layoutData: never(), press: function () {
			var dirty = o.isDirty ? o.isDirty() : false;
			if (!dirty) { if (o.onCancel) { o.onCancel(part); } return; }
			ConfirmAction.ask({ verb: t("editFooter.discard"), object: t("editFooter.discardObject"),
				consequence: t("editFooter.discardConsequence"), danger: true }).then(function (yes) {
				if (yes && o.onCancel) { o.onCancel(part); }
			});
		} });
		var bar = new OverflowToolbar({ content: [messages.root, new ToolbarSpacer(), reason, save, cancel] });

		function refresh() {
			var n = errors(o.groups);
			save.setEnabled(n === 0);
			// On a phone the footer has room for a short reason only; Save's tooltip keeps the full sentence.
			var phone = Layout.narrower("phone");
			reason.setText(n === 1 ? t(phone ? "editFooter.fixOneShort" : "editFooter.fixOne") : t(phone ? "editFooter.fixManyShort" : "editFooter.fixMany", n));
			reason.setVisible(n > 0);
			save.setTooltip(n ? (n === 1 ? t("editFooter.fixOne") : t("editFooter.fixMany", n)) : t("editFooter.saveTip"));
		}
		var stop = Messages.onChange(refresh);
		var stopResize = function () { Device.resize.detachHandler(refresh); };
		Device.resize.attachHandler(refresh);

		var root = o.content
			? new VBox({ renderType: "Bare", height: o.height || "22rem", items: [new Page({ showHeader: false, content: [o.content], footer: bar })] })
			: new VBox({ renderType: "Bare", items: [bar] });

		var part = Part.make({
			key: "edit-footer",
			content: root,
			onDestroy: function () { stop(); stopResize(); messages.root.destroy(); },
			render: refresh
		});
		part.bar = bar;
		part.save = save;
		part.cancel = cancel;
		part.refresh = refresh;
		part.update({});
		return part;
	}

	return {
		info: {
			controls: ["sap.m.OverflowToolbar", "sap.m.Page (footer)", "sap.m.Button", "Messages button", "Confirm action"],
			motion: "None of its own. The Messages button's count pulses once when it changes.",
			still: true
		},

		/**
		 * options:
		 *   onSave(part)     called when Save is pressed and validate() found no problems
		 *   onCancel(part)   called after Cancel (after the question, when there were changes)
		 *   validate()       optional: checks everything and returns the number of problems
		 *   isDirty()        optional: true when there are unsaved changes
		 *   groups           optional message groups whose errors stop a save (default: every error)
		 *   content, height  optional: the content to keep the footer under
		 *   saveText         optional: the save button's text (default "Save")
		 */
		create: create,

		example: function () {
			var ex = FormSection.example();
			var section = FormSection.create(Object.assign({}, ex.options, { toggle: false, editable: true }));
			var status = new Text({ text: "" }).addStyleClass("accLabel sapUiSmallMargin");
			status.setVisible(false);
			var content = new VBox({ renderType: "Bare", items: [section.root, status] });
			return {
				options: {
					content: content,
					height: "24rem",
					groups: [section.group],
					validate: section.validate,
					isDirty: section.isDirty,
					onSave: function () {
						var n = section.changes().length;
						section.commit();
						status.setText(n === 1 ? t("editFooter.demo.savedOne") : n ? t("editFooter.demo.saved", n) : t("editFooter.demo.nothing"));
						status.setVisible(true);
					},
					onCancel: function () {
						var had = section.isDirty();
						section.revert();
						status.setText(had ? t("editFooter.demo.discarded") : t("editFooter.demo.unchanged"));
						status.setVisible(true);
					}
				},
				next: function () { return {}; }
			};
		}
	};
});
