/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Create wizard: a new object created in a few ordered steps. Each step is a form section; the next
 * step opens only when the one before it has no problems, and each problem is said on its field. The
 * last step shows everything for review, with a way back to each step. Creating asks first only when
 * it cannot be undone (for example when the new object is sent to someone at once); otherwise the
 * object is created at once and an undo message is offered.
 *
 * Use it when a new object needs more than about eight fields, or fields whose choices depend on
 * earlier ones. For a short record, use quick entry. The pattern arranges regions only; it fetches
 * nothing.
 */
sap.ui.define([
	"sap/m/Wizard",
	"sap/m/WizardStep",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/CheckBox",
	"sap/m/MessageStrip",
	"sap/m/FlexItemData",
	"sap/ui/core/format/NumberFormat",
	"accents/core/I18n",
	"accents/core/Messages",
	"accents/elements/transactional/FormSection",
	"accents/elements/transactional/ValueHelpField",
	"accents/elements/transactional/AmountField",
	"accents/elements/transactional/DateField",
	"accents/elements/transactional/ConfirmAction",
	"accents/elements/transactional/UndoToast",
	"accents/elements/common/SourceLine"
], function (Wizard, WizardStep, VBox, HBox, Title, Text, Button, CheckBox, MessageStrip, FlexItemData, NumberFormat, I18n, Messages, FormSection,
	ValueHelpField, AmountField, DateField, ConfirmAction, UndoToast, SourceLine) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.CreateWizard");

	/**
	 * regions:
	 *   title, lead  page heading and one sentence
	 *   steps        [{ title, icon, content }] in order; the last one is the review step
	 *   result       optional control shown instead of the wizard once the object exists
	 *   height       CSS height of the wizard (default "40rem"); it scrolls inside
	 *   source       the source line control
	 * Returns { control, wizard, steps, showResult(boolean) }.
	 */
	function compose(r) {
		var steps = r.steps.map(function (s) {
			var settings = { title: s.title, validated: false, content: [s.content] };
			if (s.icon) { settings.icon = s.icon; }
			return new WizardStep(settings);
		});
		var wizard = new Wizard({ showNextButton: false, enableBranching: false, steps: steps, height: "100%" });
		wizard.setLayoutData(new FlexItemData({ growFactor: 1, baseSize: "0", minHeight: "0" }));
		var frame = new VBox({ renderType: "Bare", height: r.height || "40rem", items: [wizard] });
		var items = [new Title({ text: r.title, level: "H2", titleStyle: "H3" })];
		if (r.lead) { items.push(new Text({ text: r.lead }).addStyleClass("accPageLead")); }
		items.push(frame);
		if (r.result) { r.result.setVisible(false); items.push(r.result); }
		if (r.source) { items.push(r.source); }
		return {
			control: new VBox({ renderType: "Bare", items: items }),
			wizard: wizard,
			steps: steps,
			showResult: function (b) { frame.setVisible(!b); if (r.result) { r.result.setVisible(!!b); } }
		};
	}

	return {
		info: {
			controls: ["sap.m.Wizard", "sap.m.WizardStep", "sap.ui.layout.form.Form", "Confirm action", "Undo message"],
			motion: "None beyond the wizard scrolling to the next step. The result appears at once.",
			still: true
		},
		compose: compose,

		example: function (Data) {
			var today = new Date();
			var day = function (n) { return new Date(today.getFullYear(), today.getMonth(), today.getDate() + n); };
			var carriers = [{ key: "road", text: t("demo.carrier.road") }, { key: "rail", text: t("demo.carrier.rail") }, { key: "air", text: t("demo.carrier.air") }];
			var units = [{ key: "case", text: t("demo.unit.case") }, { key: "pallet", text: t("demo.unit.pallet") }];
			var created = 0;

			/* ---------- the three form steps ---------- */
			var customer = ValueHelpField.create({ label: t("field.customer"), items: ValueHelpField.sampleCustomers(), bare: true });
			var who = FormSection.create({ group: t("step.customer"), columns: 1, editable: true, fields: [
				{ key: "customer", label: t("field.customer"), type: "part", part: customer, required: true },
				{ key: "contact", label: t("field.contact"), required: true, maxLength: 60 },
				{ key: "email", label: t("field.email"), required: true, maxLength: 80,
					check: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : t("rule.email"); } }
			] });
			var product = ValueHelpField.create({ label: t("field.product"), items: ValueHelpField.sampleProducts(), bare: true });
			var qty = AmountField.create({ label: t("field.quantity"), kind: "quantity", unit: "case", units: units, min: 1, max: 999, bare: true });
			var price = AmountField.create({ label: t("field.price"), kind: "currency", unit: "EUR", min: 0.01, max: 10000, bare: true });
			var what = FormSection.create({ group: t("step.items"), columns: 1, editable: true, fields: [
				{ key: "product", label: t("field.product"), type: "part", part: product, required: true },
				{ key: "quantity", label: t("field.quantity"), type: "part", part: qty, required: true },
				{ key: "price", label: t("field.price"), type: "part", part: price, required: true }
			] });
			var date = DateField.create({ label: t("field.date"), min: day(1), max: day(180), bare: true });
			var when = FormSection.create({ group: t("step.delivery"), columns: 1, editable: true, fields: [
				{ key: "date", label: t("field.date"), type: "part", part: date, required: true },
				{ key: "carrier", label: t("field.carrier"), type: "select", options: carriers, required: true },
				{ key: "notes", label: t("field.notes"), type: "textarea", maxLength: 300 }
			] });
			var sendNow = new CheckBox({ text: t("field.sendNow"), selected: false });
			var sections = [who, what, when];

			/* ---------- review ---------- */
			var reviewForms = new VBox({ renderType: "Bare" });
			var totalText = new Text({ text: "" }).addStyleClass("sapUiSmallMarginBottom");
			var review = new VBox({ renderType: "Bare", items: [reviewForms, totalText, sendNow] });
			var money = NumberFormat.getCurrencyInstance();
			// Each step's fields are listed again as text, in a read-only form section built from that step's texts.
			function fillReview() {
				reviewForms.destroyItems();
				sections.forEach(function (s, i) {
					var rows = rowsOf(s);
					var values = {};
					rows.forEach(function (r) { values[r.key] = r.text; });
					reviewForms.addItem(FormSection.create({ title: STEP_TITLES[i], group: t("review.group"), columns: 1,
						fields: rows.map(function (r) { return { key: r.key, label: r.label }; }), data: values }).root);
					reviewForms.addItem(new Button({ text: t("review.change", STEP_TITLES[i]), type: "Transparent", icon: "sap-icon://edit",
						press: function () { handle.wizard.goToStep(handle.steps[i]); } }).addStyleClass("sapUiSmallMarginBottom"));
				});
				// The total is a documented calculation: quantity times price per unit.
				totalText.setText(t("review.total", money.format((qty.value() || 0) * (price.value() || 0), price.unit())));
				createBtn.setText(sendNow.getSelected() ? t("action.createSend") : t("action.create"));
			}
			function rowsOf(s) {
				var labels = { customer: t("field.customer"), contact: t("field.contact"), email: t("field.email"), product: t("field.product"),
					quantity: t("field.quantity"), price: t("field.price"), date: t("field.date"), carrier: t("field.carrier"), notes: t("field.notes") };
				var parts = { customer: customer, product: product, quantity: qty, price: price, date: date };
				var values = s.values();
				return Object.keys(values).map(function (k) {
					var text = parts[k] ? parts[k].text()
						: k === "carrier" ? (carriers.find(function (c) { return c.key === values[k]; }) || {}).text : values[k];
					return { key: k, label: labels[k], text: text || "" };
				});
			}
			sendNow.attachSelect(function () { createBtn.setText(sendNow.getSelected() ? t("action.createSend") : t("action.create")); });

			/* ---------- create ---------- */
			var resultStrip = new MessageStrip({ type: "Success", showIcon: true, text: "" });
			var another = new Button({ text: t("action.another"), icon: "sap-icon://add", press: function () { reset(); } });
			var result = new VBox({ renderType: "Bare", items: [resultStrip, another] }).addStyleClass("sapUiSmallMarginTop");
			var createBtn = new Button({ text: t("action.create"), type: "Emphasized", press: function () {
				var problems = sections.reduce(function (n, s) { return n + s.validate(); }, 0);
				if (problems) {
					var i = sections.findIndex(function (s) { return s.problems() > 0; });
					handle.wizard.goToStep(handle.steps[i]);
					return;
				}
				created += 1;
				var number = String(4715 + created);
				if (sendNow.getSelected()) {
					ConfirmAction.ask({ verb: t("confirm.verb"), object: t("confirm.object", number, customer.item() ? customer.item().text : ""),
						consequence: t("confirm.consequence") }).then(function (yes) {
						if (!yes) { created -= 1; return; }
						finish(number, true);
					});
				} else {
					finish(number, false);
					UndoToast.show({ text: t("undo.message", number), onUndo: function () {
						created -= 1;
						Messages.clear(t("demo.messageGroup"));
						handle.showResult(false);
						resultStrip.setText("");
					} });
				}
			} });
			function finish(number, sent) {
				resultStrip.setText(sent ? t("result.sent", number) : t("result.created", number));
				handle.showResult(true);
				Messages.clear(t("demo.messageGroup"));
				Messages.add({ type: "Success", group: t("demo.messageGroup"), text: sent ? t("result.sent", number) : t("result.created", number) });
				another.focus();
			}
			function reset() {
				sections.forEach(function (s) {
					var empty = {};
					Object.keys(s.values()).forEach(function (k) { empty[k] = null; });
					s.setValues(empty);
				});
				sendNow.setSelected(false);
				handle.steps.forEach(function (s) { s.setValidated(false); });
				handle.wizard.discardProgress(handle.steps[0], true);
				handle.showResult(false);
				customer.input.focus();
			}

			/* ---------- steps, each gated by its own check ---------- */
			function next(i) {
				return new Button({ text: t("action.next", STEP_TITLES[i + 1]), type: "Emphasized", press: function () {
					var n = sections[i].validate();
					if (n) { var f = sections[i].firstProblem(); if (f) { f.focus(); } return; }
					handle.steps[i].setValidated(true);
					if (i + 1 === sections.length) { fillReview(); }
					handle.wizard.nextStep();
				} });
			}
			/** Step actions sit at the end of the step, at their own width. */
			function actions(button) { return new HBox({ renderType: "Bare", justifyContent: "End", items: [button] }).addStyleClass("sapUiSmallMarginTop"); }
			var STEP_TITLES = [t("step.customer"), t("step.items"), t("step.delivery"), t("step.review")];
			var handle = compose({
				title: t("title"),
				lead: t("lead"),
				steps: [
					{ title: STEP_TITLES[0], icon: "sap-icon://customer", content: new VBox({ renderType: "Bare", items: [who.root, actions(next(0))] }) },
					{ title: STEP_TITLES[1], icon: "sap-icon://product", content: new VBox({ renderType: "Bare", items: [what.root, actions(next(1))] }) },
					{ title: STEP_TITLES[2], icon: "sap-icon://shipping-status", content: new VBox({ renderType: "Bare", items: [when.root, actions(next(2))] }) },
					{ title: STEP_TITLES[3], icon: "sap-icon://checklist", content: new VBox({ renderType: "Bare", items: [review, actions(createBtn)] }) }
				],
				result: result,
				source: SourceLine.create({ data: Data.sampleMeta() }).root
			});
			// A change that breaks a finished step closes the steps after it until that step passes again.
			sections.forEach(function (s, i) {
				s.attachChange(function () {
					if (handle.steps[i].getValidated() && s.problems() > 0) {
						handle.steps[i].setValidated(false);
						handle.wizard.discardProgress(handle.steps[i], true);
					} else if (handle.wizard.getProgress() === 4 && i < 3) { fillReview(); }
				});
			});
			return { control: handle.control };
		}
	};
});
