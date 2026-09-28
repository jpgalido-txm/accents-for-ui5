/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Editable object: one object shown for reading, switched to editing, kept as a draft, then saved or
 * discarded. An object page whose header names the object, says where its changes stand (draft
 * status) and holds the Edit action; below, anchored sections of form sections, attachments and the
 * change history. While editing, Save and Cancel stay in view in the page footer with the Messages
 * button; Save checks everything first and says how many problems stop it.
 *
 * Use it for changing one object's own fields. Do not use it for creating an object (that is the
 * create wizard) or for changing many objects at once (mass edit). The pattern arranges regions only;
 * it fetches nothing.
 */
sap.ui.define([
	"sap/uxap/ObjectPageLayout",
	"sap/uxap/ObjectPageDynamicHeaderTitle",
	"sap/uxap/ObjectPageSection",
	"sap/uxap/ObjectPageSubSection",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Label",
	"sap/m/Button",
	"sap/m/FlexItemData",
	"sap/m/OverflowToolbarLayoutData",
	"accents/core/I18n",
	"accents/core/Messages",
	"accents/elements/transactional/FormSection",
	"accents/elements/transactional/ValueHelpField",
	"accents/elements/transactional/AmountField",
	"accents/elements/transactional/DateField",
	"accents/elements/transactional/DraftStatus",
	"accents/elements/transactional/EditFooter",
	"accents/elements/transactional/AttachmentList",
	"accents/elements/transactional/ChangeHistory",
	"accents/elements/common/MessagesButton",
	"accents/elements/common/SourceLine"
], function (ObjectPageLayout, DynamicHeaderTitle, ObjectPageSection, ObjectPageSubSection, VBox, HBox, Title, Text, Label, Button, FlexItemData,
	OverflowToolbarLayoutData, I18n, Messages, FormSection, ValueHelpField, AmountField, DateField, DraftStatus, EditFooter, AttachmentList,
	ChangeHistory, MessagesButton, SourceLine) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.EditableObject");

	/**
	 * regions:
	 *   title      the object's name
	 *   status     the draft status control, shown beside the title
	 *   facts      [{ label, value }] where value is a control; the header's key facts
	 *   actions    header actions (Edit first); they stay in the header
	 *   assistant  the object's assistant button; it never goes into the overflow
	 *   sections   [{ title, content }] anchored sections, in order
	 *   footer     the edit footer's bar (EditFooter part.bar); shown only while editing
	 *   height     CSS height of the object page (default "44rem"); it scrolls inside
	 *   source     the source line control
	 * Returns { control, page, setEditing(boolean), setSectionTitle(index, text) }.
	 */
	function compose(r) {
		var heading = new HBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [
			new Title({ text: r.title, level: "H2", titleStyle: "H3", wrapping: true }).addStyleClass("sapUiSmallMarginEnd")
		].concat(r.status ? [r.status] : []) });
		var actions = (r.actions || []).slice();
		if (r.assistant) {
			r.assistant.setLayoutData(new OverflowToolbarLayoutData({ priority: "NeverOverflow" }));
			actions.push(r.assistant);
		}
		var facts = new HBox({ renderType: "Bare", wrap: "Wrap", items: (r.facts || []).map(function (f) {
			return new VBox({ renderType: "Bare", items: [new Label({ text: f.label, labelFor: f.value }), f.value] })
				.addStyleClass("sapUiMediumMarginEnd sapUiSmallMarginBottom");
		}) });
		var sections = (r.sections || []).map(function (s) {
			return new ObjectPageSection({ title: s.title, titleUppercase: false, subSections: [new ObjectPageSubSection({ blocks: [s.content] })] });
		});
		var settings = {
			upperCaseAnchorBar: false,
			useIconTabBar: false,
			showFooter: false,
			headerTitle: new DynamicHeaderTitle({ heading: heading, actions: actions }),
			headerContent: [facts],
			sections: sections
		};
		if (r.footer) { settings.footer = r.footer; }
		var page = new ObjectPageLayout(settings);
		page.setLayoutData(new FlexItemData({ growFactor: 1, baseSize: "0", minHeight: "0" }));
		var frame = new VBox({ renderType: "Bare", height: r.height || "44rem", items: [page] });
		return {
			control: new VBox({ renderType: "Bare", items: [frame].concat(r.source ? [r.source] : []) }),
			page: page,
			setEditing: function (b) { page.setShowFooter(!!b); },
			setSectionTitle: function (i, text) { if (sections[i]) { sections[i].setTitle(text); } }
		};
	}

	return {
		info: {
			controls: ["sap.uxap.ObjectPageLayout", "sap.uxap.ObjectPageDynamicHeaderTitle", "sap.ui.layout.form.Form", "sap.m.upload.UploadSet",
				"sap.m.Table", "sap.m.OverflowToolbar (footer)"],
			motion: "The draft status word pulses once when it changes, and new history rows rise in once after a save. Nothing else moves.",
			still: false
		},
		compose: compose,

		example: function (Data, ctx) {
			var OBJECT = t("demo.object");
			var YOU = t("demo.you");
			var today = new Date();
			var day = function (n) { return new Date(today.getFullYear(), today.getMonth(), today.getDate() + n); };
			var customers = ValueHelpField.sampleCustomers();
			var carriers = [{ key: "road", text: t("demo.carrier.road") }, { key: "rail", text: t("demo.carrier.rail") }, { key: "air", text: t("demo.carrier.air") }];
			var priorities = [{ key: "1", text: t("demo.priority.1") }, { key: "2", text: t("demo.priority.2") }, { key: "3", text: t("demo.priority.3") }];

			/* ---------- sections ---------- */
			var customer = ValueHelpField.create({ label: t("field.customer"), items: customers, bare: true });
			// The page section names each form, so the forms carry only their message group, not a second title.
			var general = FormSection.create({
				group: t("section.general"),
				fields: [
					{ key: "customer", label: t("field.customer"), type: "part", part: customer, required: true },
					{ key: "reference", label: t("field.reference"), required: true, maxLength: 20,
						check: function (v) { return /^PO-\d{4,}$/.test(v) ? null : t("rule.reference"); } },
					{ key: "priority", label: t("field.priority"), type: "select", options: priorities, required: true }
				],
				data: { customer: "C-1003", reference: "PO-7781", priority: "2" }
			});
			var value = AmountField.create({ label: t("field.value"), kind: "currency", unit: "EUR", min: 1, max: 50000, bare: true });
			var date = DateField.create({ label: t("field.date"), min: today, bare: true });
			var delivery = FormSection.create({
				group: t("section.delivery"),
				fields: [
					{ key: "date", label: t("field.date"), type: "part", part: date, required: true },
					{ key: "carrier", label: t("field.carrier"), type: "select", options: carriers },
					{ key: "value", label: t("field.value"), type: "part", part: value, required: true },
					{ key: "notes", label: t("field.notes"), type: "textarea", maxLength: 500,
						check: function (v, all) { return all.carrier === "air" && v && v.length > 200 ? t("rule.airNotes") : null; } }
				],
				data: { date: day(6), carrier: "road", value: 2277, notes: null }
			});
			var forms = [general, delivery];

			var attachments = AttachmentList.create({ data: AttachmentList.sampleFiles(), local: true, maxMb: 5, group: t("section.attachments"),
				onChange: function (files) { handle.setSectionTitle(2, t("section.attachmentsCount", files.length)); } });
			var history = ChangeHistory.create({ data: ChangeHistory.sample(0), showTitle: false });

			/* ---------- header ---------- */
			var draft = DraftStatus.create({ data: { state: "saved", savedAt: Date.now() - 3 * 3600000, by: t("demo.person.1") } });
			var factCustomer = new Text(), factValue = new Text().addStyleClass("accTabular"), factDate = new Text();
			function refreshFacts() {
				factCustomer.setText(customer.text() || t("demo.none"));
				factValue.setText(value.text() || t("demo.none"));
				factDate.setText(date.text() || t("demo.none"));
			}
			var headerMessages = MessagesButton.create();
			var edit = new Button({ text: t("action.edit"), type: "Emphasized", icon: "sap-icon://edit", tooltip: t("action.editTip"),
				press: function () { setEditing(true); } });

			var editing = false, keepTimer = null;
			function setEditing(b) {
				editing = b;
				forms.forEach(function (f) { f.setEditable(b); });
				edit.setVisible(!b);
				headerMessages.root.setVisible(!b);
				handle.setEditing(b);
				if (b) {
					draft.update({ state: "draft", keptAt: Date.now() });
					setTimeout(function () { var first = general.firstProblem() || customer.input; first.focus(); }, 0);
				}
			}
			// A draft is kept a moment after each change, the way a draft service would keep it.
			function changed() {
				var n = forms.reduce(function (a, f) { return a + f.changes().length; }, 0);
				draft.update({ state: "unsaved", count: n });
				clearTimeout(keepTimer);
				keepTimer = setTimeout(function () { if (editing) { draft.update({ state: "draft", keptAt: Date.now() }); } }, 1500);
			}
			forms.forEach(function (f) { f.attachChange(changed); });

			var footer = EditFooter.create({
				groups: forms.map(function (f) { return f.group; }),
				validate: function () {
					var n = forms.reduce(function (a, f) { return a + f.validate(); }, 0);
					var first = forms.map(function (f) { return f.firstProblem(); }).filter(Boolean)[0];
					if (first) { first.focus(); }
					return n;
				},
				isDirty: function () { return forms.some(function (f) { return f.isDirty(); }); },
				onSave: function () {
					var at = new Date();
					var entries = [];
					forms.forEach(function (f) { f.changes().forEach(function (c) { entries.push({ at: at, by: YOU, field: c.field, from: c.from, to: c.to }); }); });
					forms.forEach(function (f) { f.commit(); });
					if (entries.length) { history.add(entries); }
					handle.setSectionTitle(3, t("section.historyCount", history.data().length));
					clearTimeout(keepTimer);
					draft.update({ state: "saved", savedAt: Date.now(), by: YOU });
					Messages.clear(t("demo.messageGroup"));
					Messages.add({ type: "Success", group: t("demo.messageGroup"),
						text: entries.length === 1 ? t("saved.one") : entries.length ? t("saved.some", entries.length) : t("saved.none") });
					refreshFacts();
					setEditing(false);
				},
				onCancel: function () {
					forms.forEach(function (f) { f.revert(); });
					clearTimeout(keepTimer);
					draft.update({ state: "saved", savedAt: Date.now() - 3 * 3600000, by: t("demo.person.1") });
					setEditing(false);
				}
			});

			var aiButton = ctx.assistant.objectButton({ title: OBJECT, get: function () {
				var facts = {};
				facts[t("field.customer")] = customer.text();
				facts[t("field.reference")] = general.values().reference;
				facts[t("field.date")] = date.text();
				facts[t("field.value")] = value.text();
				facts[t("ai.lastChange")] = (history.data() || []).length ? t("ai.changes", history.data().length) : t("demo.none");
				return { title: OBJECT, facts: facts, question: t("ai.question", OBJECT) };
			} });

			var handle = compose({
				title: OBJECT,
				status: draft.root,
				facts: [
					{ label: t("field.customer"), value: factCustomer },
					{ label: t("field.value"), value: factValue },
					{ label: t("field.date"), value: factDate }
				],
				actions: [edit, headerMessages.root],
				assistant: aiButton,
				sections: [
					{ title: t("section.general"), content: general.root },
					{ title: t("section.delivery"), content: delivery.root },
					{ title: t("section.attachmentsCount", attachments.files().length), content: attachments.root },
					{ title: t("section.historyCount", history.data().length), content: history.root }
				],
				footer: footer.bar,
				source: SourceLine.create({ data: Data.sampleMeta() }).root
			});
			refreshFacts();

			return {
				control: handle.control,
				// Replay: someone else changes the priority while the page is open (only while reading).
				next: function (seed) {
					return function () {
						if (editing) { return; }
						var before = general.values().priority;
						var after = String(1 + seed % 3);
						if (after === before) { after = String(1 + (seed + 1) % 3); }
						var text = function (k) { return (priorities.find(function (p) { return p.key === k; }) || {}).text || ""; };
						general.setValues(Object.assign(general.values(), { priority: after }));
						history.add({ at: new Date(), by: t("demo.person.2"), field: t("field.priority"), from: text(before), to: text(after) });
						handle.setSectionTitle(3, t("section.historyCount", history.data().length));
						draft.update({ state: "saved", savedAt: Date.now(), by: t("demo.person.2") });
					};
				}
			};
		}
	};
});
