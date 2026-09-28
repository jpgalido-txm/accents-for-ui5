/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Quick entry: a short form for entering one record at a time, fast. Values are suggested as you
 * type and checked as they change; Save keeps the record and shows it, Save and new keeps it and
 * clears the form for the next one with the focus back on the first field. Saving can be undone for
 * a few seconds, so it does not ask first. What was entered in this visit is listed below the form.
 *
 * Use it for records of up to about eight fields that people enter many of in a row: bookings,
 * counts, readings. For longer or dependent input, use the create wizard. The pattern arranges
 * regions only; it fetches nothing.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/f/Card",
	"sap/f/cards/Header",
	"sap/m/FlexItemData",
	"accents/core/I18n",
	"accents/core/Motion",
	"accents/elements/transactional/FormSection",
	"accents/elements/transactional/ValueHelpField",
	"accents/elements/transactional/AmountField",
	"accents/elements/transactional/DateField",
	"accents/elements/transactional/UndoToast",
	"accents/elements/common/SourceLine"
], function (VBox, HBox, Title, Text, Button, List, StandardListItem, Card, CardHeader, FlexItemData, I18n, Motion, FormSection, ValueHelpField, AmountField,
	DateField, UndoToast, SourceLine) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.QuickEntry");

	/**
	 * regions:
	 *   title, lead   page heading and one sentence
	 *   form          the form section control
	 *   actions       the form's buttons, in order (the main one first)
	 *   status        optional control under the buttons (what just happened)
	 *   list          the records entered so far
	 *   listTitle     the list card's title
	 *   source        the source line control
	 */
	function compose(r) {
		var formCard = new Card({ content: new VBox({ renderType: "Bare", items: [r.form,
			new HBox({ renderType: "Bare", wrap: "Wrap", justifyContent: "End", items: r.actions }).addStyleClass("sapUiSmallMarginTop")
		].concat(r.status ? [r.status] : []) }).addStyleClass("sapUiSmallMargin") });
		var listCard = new Card({ header: new CardHeader({ title: r.listTitle }), content: r.list });
		// Side by side when there is room, the list under the form when there is not.
		formCard.setLayoutData(new FlexItemData({ growFactor: 3, shrinkFactor: 1, baseSize: "28rem", minWidth: "0" }));
		listCard.setLayoutData(new FlexItemData({ growFactor: 2, shrinkFactor: 1, baseSize: "18rem", minWidth: "0" }));
		formCard.addStyleClass("sapUiSmallMarginEnd sapUiSmallMarginBottom");
		listCard.addStyleClass("sapUiSmallMarginBottom");
		var items = [new Title({ text: r.title, level: "H2", titleStyle: "H3" })];
		if (r.lead) { items.push(new Text({ text: r.lead }).addStyleClass("accPageLead")); }
		items.push(new HBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Start", width: "100%", items: [formCard, listCard] }));
		if (r.source) { items.push(r.source); }
		return { control: new VBox({ renderType: "Bare", items: items }), listCard: listCard };
	}

	return {
		info: {
			controls: ["sap.ui.layout.form.Form", "sap.m.Input (suggestions)", "sap.m.DatePicker", "sap.m.List", "sap.f.Card", "Undo message"],
			motion: "A newly saved record rises into the list once. Nothing else moves.",
			still: false
		},
		compose: compose,

		example: function (Data) {
			var today = new Date();
			var products = ValueHelpField.sampleProducts();
			var product = ValueHelpField.create({ label: t("field.product"), items: products, bare: true });
			var qty = AmountField.create({ label: t("field.quantity"), kind: "quantity", unit: t("unit.case"), min: 1, max: 500, bare: true });
			var amount = AmountField.create({ label: t("field.amount"), kind: "currency", unit: "EUR", min: 0.01, max: 20000, bare: true });
			var date = DateField.create({ label: t("field.date"), max: today, min: new Date(today.getFullYear(), today.getMonth() - 2, 1), bare: true });
			var form = FormSection.create({ group: t("group"), columns: 1, editable: true, fields: [
				{ key: "product", label: t("field.product"), type: "part", part: product, required: true },
				{ key: "quantity", label: t("field.quantity"), type: "part", part: qty, required: true },
				{ key: "amount", label: t("field.amount"), type: "part", part: amount, required: true },
				{ key: "date", label: t("field.date"), type: "part", part: date, required: true },
				{ key: "note", label: t("field.note"), maxLength: 80 }
			], data: { date: today } });

			var records = [];
			var seq = 0;
			var list = new List({ noDataText: t("list.empty"), showSeparators: "Inner" });
			var fresh = null;
			list.addEventDelegate({ onAfterRendering: function () { if (fresh && fresh.getDomRef()) { Motion.rank([fresh]); } fresh = null; } });
			function renderList() {
				list.destroyItems();
				records.slice().reverse().forEach(function (rec, i) {
					var li = new StandardListItem({ title: rec.product, description: t("list.line", rec.quantity, rec.amount, rec.date),
						info: rec.note || "" });
					list.addItem(li);
					if (i === 0 && rec.fresh) { fresh = li; rec.fresh = false; }
				});
				handle.listCard.getHeader().setTitle(t("list.title", records.length));
			}

			var status = new Text({ text: "" }).addStyleClass("accLabel sapUiTinyMarginTop");
			status.setVisible(false);
			function say(text) { status.setText(text); status.setVisible(!!text); }

			function keep() {
				var n = form.validate();
				if (n) { var f = form.firstProblem(); if (f) { f.focus(); } say(n === 1 ? t("status.fixOne") : t("status.fixMany", n)); return null; }
				seq += 1;
				var rec = { id: seq, product: product.text(), quantity: qty.text(), amount: amount.text(), date: date.text(),
					note: form.values().note, fresh: true };
				records.push(rec);
				renderList();
				UndoToast.show({ text: t("undo.message", rec.product), onUndo: function () {
					records = records.filter(function (r) { return r.id !== rec.id; });
					renderList();
					say(t("status.undone", rec.product));
				} });
				return rec;
			}
			function clearForm() {
				form.setValues({ product: null, quantity: null, amount: null, date: today, note: null });
				form.setEditable(true);
				saveBtn.setVisible(true); saveNewBtn.setVisible(true); newBtn.setVisible(false);
			}
			var saveBtn = new Button({ text: t("action.save"), type: "Emphasized", tooltip: t("action.saveTip"), press: function () {
				var rec = keep();
				if (!rec) { return; }
				form.commit();
				form.setEditable(false);
				saveBtn.setVisible(false); saveNewBtn.setVisible(false); newBtn.setVisible(true);
				say(t("status.saved", rec.product));
				newBtn.focus();
			} });
			var saveNewBtn = new Button({ text: t("action.saveNew"), tooltip: t("action.saveNewTip"), press: function () {
				var rec = keep();
				if (!rec) { return; }
				clearForm();
				say(t("status.savedNext", rec.product));
				product.input.focus();
			} });
			var newBtn = new Button({ text: t("action.new"), icon: "sap-icon://add", press: function () { clearForm(); say(""); product.input.focus(); } });
			newBtn.setVisible(false);
			[saveBtn, saveNewBtn].forEach(function (b) { b.addStyleClass("sapUiTinyMarginBegin"); });

			var handle = compose({
				title: t("title"),
				lead: t("lead"),
				form: form.root,
				actions: [saveBtn, saveNewBtn, newBtn],
				status: status,
				list: list,
				listTitle: t("list.title", 0),
				source: SourceLine.create({ data: Data.sampleMeta() }).root
			});
			renderList();
			return { control: handle.control };
		}
	};
});
