/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Lifecycle object: one object moving through dated steps. An object page whose header names the
 * object, shows where it sits (breadcrumbs), its key facts and its actions, with the object's assistant
 * button among the actions. Below, anchored sections: the steps as a table and the same steps on a
 * timeline with one today marker.
 *
 * Use it for one object with a schedule: an approval, a launch, a promotion. The pattern arranges
 * regions only; it fetches nothing.
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
	"sap/m/Link",
	"sap/m/Button",
	"sap/m/Breadcrumbs",
	"sap/m/ObjectStatus",
	"sap/m/Dialog",
	"sap/m/List",
	"sap/m/DisplayListItem",
	"sap/m/FlexItemData",
	"sap/m/OverflowToolbarLayoutData",
	"sap/m/MessageToast",
	"sap/ui/Device",
	"accents/core/Format",
	"accents/elements/collaboration/StepsTable",
	"accents/elements/collaboration/TimelineCalendar",
	"accents/elements/common/SourceLine",
	"accents/core/I18n"
], function (ObjectPageLayout, DynamicHeaderTitle, ObjectPageSection, ObjectPageSubSection, VBox, HBox, Title, Text, Label, Link, Button,
	Breadcrumbs, ObjectStatus, Dialog, List, DisplayListItem, FlexItemData, OverflowToolbarLayoutData, MessageToast, Device, Format, StepsTable, TimelineCalendar, SourceLine, I18n) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.LifecycleObject");

	/**
	 * regions:
	 *   title        the object's name
	 *   status       optional control beside the title (an ObjectStatus)
	 *   breadcrumbs  a sap.m.Breadcrumbs showing where the object sits
	 *   facts        [{ label, value }] where value is a control; the header's key facts
	 *   actions      controls for the header's actions
	 *   assistant    the object's assistant button; it stays in view and never goes into the overflow
	 *   sections     [{ title, content }] anchored sections, in order
	 *   height       CSS height of the object page (default "44rem"); it scrolls inside
	 *   source       the source line control
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
		var titleSettings = { heading: heading, actions: actions };
		if (r.breadcrumbs) { titleSettings.breadcrumbs = r.breadcrumbs; }
		var facts = new HBox({ renderType: "Bare", wrap: "Wrap", items: (r.facts || []).map(function (f) {
			return new VBox({ renderType: "Bare", items: [new Label({ text: f.label, labelFor: f.value }), f.value] })
				.addStyleClass("sapUiMediumMarginEnd sapUiSmallMarginBottom");
		}) });
		var page = new ObjectPageLayout({
			upperCaseAnchorBar: false,
			useIconTabBar: false,
			showFooter: false,
			headerTitle: new DynamicHeaderTitle(titleSettings),
			headerContent: [facts],
			sections: (r.sections || []).map(function (s) {
				return new ObjectPageSection({ title: s.title, titleUppercase: false, subSections: [
					new ObjectPageSubSection({ blocks: [s.content] })
				] });
			})
		});
		page.setLayoutData(new FlexItemData({ growFactor: 1, baseSize: "0", minHeight: "0" }));
		var frame = new VBox({ renderType: "Bare", height: r.height || "44rem", items: [page] });
		return new VBox({ renderType: "Bare", items: [frame].concat(r.source ? [r.source] : []) });
	}

	return {
		info: {
			controls: ["sap.uxap.ObjectPageLayout", "sap.uxap.ObjectPageDynamicHeaderTitle", "sap.m.Breadcrumbs", "sap.m.Table",
				"accents.core.Chart (Apache ECharts)"],
			motion: "When a step changes, its cells in the table flash once and its bar on the timeline takes its new place. The header and today marker stay put.",
			still: false
		},
		compose: compose,

		example: function (Data, ctx) {
			var OBJECT = t("lifecycleObject.demo.object");
			var STEPS = [
				{ id: "S1", name: t("lifecycleObject.demo.step.S1"), owner: t("lifecycleObject.demo.owner.rosa"), group: t("lifecycleObject.demo.group.range") },
				{ id: "S2", name: t("lifecycleObject.demo.step.S2"), owner: t("lifecycleObject.demo.owner.tomas"), group: t("lifecycleObject.demo.group.buying") },
				{ id: "S3", name: t("lifecycleObject.demo.step.S3"), owner: t("lifecycleObject.demo.owner.tomas"), group: t("lifecycleObject.demo.group.buying") },
				{ id: "S4", name: t("lifecycleObject.demo.step.S4"), owner: t("lifecycleObject.demo.owner.priya"), group: t("lifecycleObject.demo.group.stores") },
				{ id: "S5", name: t("lifecycleObject.demo.step.S5"), owner: t("lifecycleObject.demo.owner.owen"), group: t("lifecycleObject.demo.group.stores") },
				{ id: "S6", name: t("lifecycleObject.demo.step.S6"), owner: t("lifecycleObject.demo.owner.rosa"), group: t("lifecycleObject.demo.group.stores") }
			];
			var today = Data.SAMPLE_TODAY + "-01";

			/** Steps fall one per month from May; status follows the sample's today, open tasks are seeded. */
			function build(seed) {
				var random = Data.rng(seed * 13 + 1);
				var ps = Data.periods("2026-05", STEPS.length);
				return STEPS.map(function (s, i) {
					var p = ps[i];
					var status = p < Data.SAMPLE_TODAY ? (random() < 0.3 ? "late" : "done") : p === Data.SAMPLE_TODAY ? "active" : "planned";
					var tasks = status === "done" ? 0 : 1 + Math.floor(random() * 4);
					return Object.assign({}, s, { period: p, status: status, tasks: tasks });
				});
			}
			var steps = build(7);

			function monthEnd(p) {
				var m = /^(\d{4})-(\d{2})$/.exec(p);
				return new Date(Date.UTC(+m[1], +m[2], 0)).toISOString().slice(0, 10);
			}
			function timelineData() {
				return { today: today, objects: steps.map(function (s) {
					return { id: s.id, name: s.name, group: s.group, start: s.period + "-01", end: monthEnd(s.period), status: s.status };
				}) };
			}

			/* ---------- header ---------- */
			var status = new ObjectStatus();
			var owner = new Text(), due = new Text(), progress = new Text(), current = new Text(), open = new Text().addStyleClass("accTabular");
			var complete = new Button({ text: t("lifecycleObject.completeStep"), type: "Emphasized", press: function () {
				var i = steps.findIndex(function (s) { return s.status === "active"; });
				if (i < 0 || steps[i].tasks > 0) { return; }
				steps = steps.map(function (s, n) {
					if (n === i) { return Object.assign({}, s, { status: "done" }); }
					if (n === i + 1 && s.status === "planned") { return Object.assign({}, s, { status: "active" }); }
					return s;
				});
				MessageToast.show(t("lifecycleObject.stepDone"));
				refresh();
			} });
			var remind = new Button({ text: t("lifecycleObject.sendReminder"), enabled: false,
				tooltip: t("lifecycleObject.sendReminder.tooltip") });

			function refresh() {
				var done = steps.filter(function (s) { return s.status === "done"; }).length;
				var late = steps.filter(function (s) { return s.status === "late"; }).length;
				var active = steps.find(function (s) { return s.status === "active"; });
				var tasks = steps.reduce(function (a, s) { return a + s.tasks; }, 0);
				status.setText(late ? t("lifecycleObject.lateSteps", late) : t("lifecycleObject.onSchedule"));
				status.setState(late ? "Error" : "Success");
				status.setIcon(late ? "sap-icon://alert" : "sap-icon://sys-enter-2");
				owner.setText(STEPS[0].owner);
				due.setText(Format.period(steps[steps.length - 1].period));
				progress.setText(t("lifecycleObject.progressValue", done, steps.length));
				current.setText(active ? active.name : t("lifecycleObject.noStep"));
				open.setText(Format.number(tasks));
				complete.setEnabled(!!active && active.tasks === 0);
				complete.setTooltip(!active ? t("lifecycleObject.complete.noStep") : active.tasks ? t("lifecycleObject.complete.openTasks", active.name, active.tasks) :
					t("lifecycleObject.complete.ready", active.name));
				table.update(steps);
				timeline.update(timelineData());
			}

			/* ---------- one step ---------- */
			var stepDialog = null;
			function openStep(step) {
				if (stepDialog) { stepDialog.destroy(); }
				var facts = new List({ showSeparators: "Inner" });
				var close = new Button({ text: t("lifecycleObject.closeTask"), type: "Emphasized" });
				function fill() {
					var s = steps.find(function (x) { return x.id === step.id; });
					facts.destroyItems();
					[[t("lifecycleObject.owner"), s.owner || t("lifecycleObject.notAssigned")], [t("lifecycleObject.group"), s.group],
						[t("lifecycleObject.period"), Format.period(s.period)],
						[t("lifecycleObject.status"), t("lifecycleObject.status." + s.status)],
						[t("lifecycleObject.openTasks"), Format.number(s.tasks)]].forEach(function (f) {
						facts.addItem(new DisplayListItem({ label: f[0], value: f[1] }));
					});
					close.setEnabled(s.tasks > 0);
					close.setTooltip(s.tasks > 0 ? t("lifecycleObject.closeTask.tooltip") : t("lifecycleObject.closeTask.none"));
				}
				close.attachPress(function () {
					steps = steps.map(function (s) { return s.id === step.id && s.tasks > 0 ? Object.assign({}, s, { tasks: s.tasks - 1 }) : s; });
					refresh();
					fill();
				});
				fill();
				stepDialog = new Dialog({ title: step.name, contentWidth: "24rem", stretch: Device.system.phone, content: [facts],
					beginButton: close, endButton: new Button({ text: t("lifecycleObject.close"), press: function () { stepDialog.close(); } }) });
				stepDialog.addStyleClass("sapUiContentPadding");
				stepDialog.open();
			}

			var table = StepsTable.create({ label: t("lifecycleObject.stepsLabel", OBJECT), assistant: ctx.assistant, onOpen: openStep });
			var timeline = TimelineCalendar.create({ label: t("lifecycleObject.timelineLabel", OBJECT) });

			var aiButton = ctx.assistant.objectButton({ title: OBJECT, get: function () {
				var active = steps.find(function (s) { return s.status === "active"; });
				return {
					title: OBJECT,
					facts: (function () {
						var o = {};
						var lateNames = steps.filter(function (s) { return s.status === "late"; }).map(function (s) { return s.name; });
						o[t("lifecycleObject.ai.object")] = OBJECT;
						o[t("lifecycleObject.owner")] = STEPS[0].owner;
						o[t("lifecycleObject.due")] = Format.period(steps[steps.length - 1].period);
						o[t("lifecycleObject.ai.stepsDone")] = t("lifecycleObject.ai.ofTotal", steps.filter(function (s) { return s.status === "done"; }).length, steps.length);
						o[t("lifecycleObject.ai.lateSteps")] = lateNames.length ? lateNames.reduce(function (x, y) { return t("lifecycleObject.ai.list", x, y); }) :
							t("lifecycleObject.ai.none");
						o[t("lifecycleObject.currentStep")] = active ? active.name : t("lifecycleObject.ai.none");
						o[t("lifecycleObject.openTasks")] = Format.number(steps.reduce(function (a, s) { return a + s.tasks; }, 0));
						return o;
					}()),
					question: t("lifecycleObject.ai.question", OBJECT)
				};
			} });

			var crumbs = new Breadcrumbs({ currentLocationText: OBJECT, links: [
				new Link({ text: t("lifecycleObject.crumb.overview"), press: function () { ctx.go("home"); } }),
				new Link({ text: t("lifecycleObject.crumb.itemRegister"), press: function () { ctx.go("item-register"); } })
			] });

			var control = compose({
				title: OBJECT,
				status: status,
				breadcrumbs: crumbs,
				facts: [
					{ label: t("lifecycleObject.owner"), value: owner }, { label: t("lifecycleObject.due"), value: due },
					{ label: t("lifecycleObject.progress"), value: progress },
					{ label: t("lifecycleObject.currentStep"), value: current }, { label: t("lifecycleObject.openTasks"), value: open }
				],
				actions: [complete, remind],
				assistant: aiButton,
				sections: [
					{ title: t("lifecycleObject.stepsCount", STEPS.length), content: table.root },
					{ title: t("lifecycleObject.timeline"), content: timeline.root }
				],
				source: SourceLine.create({ data: Data.sampleMeta() }).root
			});
			refresh();
			return {
				control: control,
				next: function (seed) { return function () { steps = build(seed); refresh(); }; }
			};
		}
	};
});
