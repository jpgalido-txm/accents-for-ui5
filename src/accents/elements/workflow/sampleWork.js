/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Demo data for the workflow elements and the approval and case patterns only: tasks waiting for a
 * decision at the fictional retailer in core/Data.js, with each task's facts, process, history and
 * comments. It is not part of the catalogue and no app should import it. Every word shown on screen
 * comes from the workflow translation file.
 *
 * The calculation, written out so no figure is typed in:
 *  - "now" is fixed at 14 Aug 2026, 09:30 local time, inside the sample's current month;
 *  - each task's due time is its template's offset in hours from now, moved by up to ±8 hours by the seed;
 *  - each "before" figure is drawn from the seed inside the range stated on its template, and the
 *    "after" figure is the before figure times the change stated there;
 *  - a person's open tasks are drawn from the seed between 0 and 11; availability follows the list order.
 */
sap.ui.define(["accents/core/I18n", "accents/core/Format", "accents/core/Data"], function (I18n, Format, Data) {
	"use strict";

	var t = I18n.use("accents.elements.workflow.i18n.i18n");
	var HOUR = 3600000, MINUTE = 60000;

	function now() { return new Date(2026, 7, 14, 9, 30); }
	function at(hoursFromNow) { return new Date(now().getTime() + hoursFromNow * HOUR); }

	var PEOPLE = [
		{ id: "mei", role: "approver", availability: "available" },
		{ id: "rosa", role: "category", availability: "available" },
		{ id: "tomas", role: "buyer", availability: "busy" },
		{ id: "priya", role: "supply", availability: "available" },
		{ id: "owen", role: "finance", availability: "away", back: 96 },
		{ id: "amara", role: "stores", availability: "available" },
		{ id: "jonas", role: "buyer", availability: "busy" }
	];
	var ME = "mei";

	function name(id) { return t("sample.person." + id); }
	function money(v) { return Format.money(v, "EUR"); }

	/**
	 * Task templates. offset: hours from now to the due time. preview(random): the facts before and
	 * after the decision. irreversible: approving cannot be undone (it sends something on).
	 */
	var TEMPLATES = [
		{ key: "price", requester: "tomas", priority: "high", offset: -50, irreversible: false, preview: function (r) {
			var before = 7 + r() * 3, margin = 0.18 + r() * 0.06;
			return [
				{ label: t("sample.fact.shelfPrice"), before: money2(before), after: money2(before * 1.06) },
				{ label: t("sample.fact.margin"), before: Format.percent(margin), after: Format.percent(margin + 0.045) }
			];
		} },
		{ key: "order", requester: "jonas", priority: "high", offset: -20, irreversible: true, preview: function (r) {
			var value = 12000 + r() * 30000;
			return [
				{ label: t("sample.fact.orderValue"), before: Format.DASH, after: money(value) },
				{ label: t("sample.fact.orderStatus"), before: t("sample.value.draft"), after: t("sample.value.sentToSupplier") }
			];
		} },
		{ key: "supplier", requester: "priya", priority: "medium", offset: -3, irreversible: false, preview: function () {
			return [
				{ label: t("sample.fact.supplierStatus"), before: t("sample.value.proposed"), after: t("sample.value.approved") },
				{ label: t("sample.fact.canOrder"), before: t("sample.value.no"), after: t("sample.value.yes") }
			];
		} },
		{ key: "promotion", requester: "rosa", priority: "medium", offset: 4, irreversible: false, preview: function (r) {
			var budget = 4000 + r() * 6000;
			return [
				{ label: t("sample.fact.promotionBudget"), before: money(0), after: money(budget) },
				{ label: t("sample.fact.stores"), before: Format.number(0), after: Format.number(Math.round(20 + r() * 40)) }
			];
		} },
		{ key: "expense", requester: "amara", priority: "low", offset: 6, irreversible: true, preview: function (r) {
			var amount = 180 + r() * 400;
			return [
				{ label: t("sample.fact.claim"), before: t("sample.value.waiting"), after: t("sample.value.paid") },
				{ label: t("sample.fact.amount"), before: money(amount), after: money(amount) }
			];
		} },
		{ key: "writeoff", requester: "amara", priority: "high", offset: 28, irreversible: true, preview: function (r) {
			var units = Math.round(40 + r() * 160), cost = units * (3 + r() * 2);
			return [
				{ label: t("sample.fact.stockUnits"), before: Format.number(units), after: Format.number(0) },
				{ label: t("sample.fact.stockValue"), before: money(cost), after: money(0) }
			];
		} },
		{ key: "range", requester: "rosa", priority: "low", offset: 75, irreversible: false, preview: function (r) {
			var lines = Math.round(10 + r() * 8);
			return [
				{ label: t("sample.fact.lines"), before: Format.number(lines), after: Format.number(lines + 2) }
			];
		} },
		{ key: "budget", requester: "owen", priority: "medium", offset: 122, irreversible: false, preview: function (r) {
			var from = 60000 + r() * 40000, move = 5000 + r() * 10000;
			return [
				{ label: t("sample.fact.marketingBudget"), before: money(from), after: money(from - move) },
				{ label: t("sample.fact.storesBudget"), before: money(from * 0.7), after: money(from * 0.7 + move) }
			];
		} }
	];
	function money2(v) { return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v); }

	function person(id) { return { id: id, name: name(id) }; }

	/** People who can take a task, with their open tasks and availability in words. */
	function people(seed) {
		var random = Data.rng((seed || 7) * 31 + 5);
		return PEOPLE.map(function (p) {
			var o = { id: p.id, name: name(p.id), role: t("sample.role." + p.role), open: Math.floor(random() * 12), availability: p.availability };
			if (p.back) { o.back = at(p.back); }
			return o;
		});
	}

	function tasks(seed) {
		var random = Data.rng(seed || 7);
		return TEMPLATES.map(function (tp, i) {
			var r = Data.rng((seed || 7) * 97 + i);
			var jitter = (random() - 0.5) * 16;
			return {
				id: "T" + (i + 1),
				key: tp.key,
				title: t("sample.task." + tp.key + ".title"),
				object: t("sample.task." + tp.key + ".object"),
				requester: name(tp.requester),
				requesterId: tp.requester,
				due: at(tp.offset + jitter),
				priority: tp.priority,
				irreversible: tp.irreversible,
				preview: tp.preview(r)
			};
		});
	}

	/** One task's process: lanes by role, steps in order. */
	function process(task) {
		var blocked = task.key === "supplier";
		return {
			lanes: [
				{ id: "requester", name: t("sample.lane.requester") },
				{ id: "checks", name: t("sample.lane.checks") },
				{ id: "approver", name: t("sample.lane.approver") },
				{ id: "operations", name: t("sample.lane.operations") }
			],
			steps: [
				{ id: "submit", name: t("sample.step.submit"), lane: "requester", state: "done", owner: task.requester },
				{ id: "check", name: t("sample.task." + task.key + ".check"), lane: "checks", state: blocked ? "blocked" : "done",
					owner: name("owen"), note: blocked ? t("sample.step.blockedNote") : "" },
				{ id: "decide", name: t("sample.step.decide"), lane: "approver", state: "current", owner: name(ME) },
				{ id: "carry", name: t("sample.task." + task.key + ".execute"), lane: "operations", state: "waiting", owner: name("amara") },
				{ id: "tell", name: t("sample.step.tell"), lane: "requester", state: "waiting", owner: task.requester }
			]
		};
	}

	/** One task's history, oldest first. */
	function history(task) {
		var start = task.due.getTime() - 5 * 24 * HOUR;
		var ev = [
			{ id: "e1", at: new Date(start), who: task.requester, kind: "created", what: t("sample.audit.created") },
			{ id: "e2", at: new Date(start + 12 * MINUTE), who: t("sample.person.system"), kind: "assigned", what: t("sample.audit.assigned"),
				from: t("sample.value.nobody"), to: name(ME) }
		];
		if (task.key === "price" || task.key === "budget" || task.key === "order") {
			ev.push({ id: "e3", at: new Date(start + 26 * HOUR), who: name(ME), kind: "sentBack", what: t("sample.audit.sentBack"),
				from: t("sample.value.waitingDecision"), to: t("sample.value.withRequester"), reason: t("sample.audit.sentBackReason") });
			ev.push({ id: "e4", at: new Date(start + 40 * HOUR), who: task.requester, kind: "changed", what: t("sample.audit.changed"),
				from: task.preview[0].before, to: task.preview[0].after });
			ev.push({ id: "e5", at: new Date(start + 41 * HOUR), who: task.requester, kind: "sent", what: t("sample.audit.resent"),
				from: t("sample.value.withRequester"), to: t("sample.value.waitingDecision") });
		}
		ev.push({ id: "e6", at: new Date(start + 44 * HOUR), who: name("owen"), kind: "commented", what: t("sample.audit.commented") });
		return ev.filter(function (e) { return e.at.getTime() <= now().getTime(); });
	}

	/** One task's comments; parent links a reply to the comment it answers. */
	function comments(task) {
		// The conversation started a little over a day ago, so every comment is in the past.
		var base = now().getTime() - 28 * HOUR - (task.id.length % 3) * HOUR;
		return [
			{ id: "c1", author: task.requesterId, text: t("sample.comment.ask"), at: new Date(base) },
			{ id: "c2", author: "owen", text: t("sample.comment.mention", name(ME)), at: new Date(base + 20 * HOUR) },
			{ id: "c3", author: ME, text: t("sample.comment.reply"), at: new Date(base + 22 * HOUR), parent: "c1" }
		].filter(function (c) { return c.at.getTime() <= now().getTime(); });
	}

	/** One task's facts, as label and text. */
	function facts(task) {
		return [
			{ label: t("sample.label.object"), value: task.object },
			{ label: t("sample.label.requester"), value: task.requester },
			{ label: t("sample.label.due"), value: Format.when(task.due) },
			{ label: t("sample.label.priority"), value: t("taskInbox.priority." + task.priority) },
			{ label: t("sample.label.undo"), value: task.irreversible ? t("sample.value.cannotUndo") : t("sample.value.canUndo") }
		];
	}

	/** Notifications for the approver, newest first. */
	function notifications(seed) {
		var random = Data.rng((seed || 7) * 7 + 3);
		var list = [
			{ id: "n1", type: "task", hours: -0.4, author: "tomas", title: t("sample.note.task.title"), description: t("sample.note.task.text"),
				action: { key: "openTask", text: t("sample.note.action.openTask") } },
			{ id: "n2", type: "mention", hours: -2.5, author: "owen", title: t("sample.note.mention.title"), description: t("sample.note.mention.text"),
				action: { key: "openComments", text: t("sample.note.action.openComments") } },
			{ id: "n3", type: "reminder", hours: -6, author: null, title: t("sample.note.reminder.title"), description: t("sample.note.reminder.text"),
				action: { key: "openTask", text: t("sample.note.action.openTask") } },
			{ id: "n4", type: "system", hours: -26, author: null, title: t("sample.note.assigned.title"), description: t("sample.note.assigned.text"),
				action: { key: "openHistory", text: t("sample.note.action.openHistory") } },
			{ id: "n5", type: "mention", hours: -30, author: "rosa", title: t("sample.note.mention2.title"), description: t("sample.note.mention2.text"),
				action: { key: "openComments", text: t("sample.note.action.openComments") } },
			{ id: "n6", type: "system", hours: -75, author: null, title: t("sample.note.done.title"), description: t("sample.note.done.text"),
				action: { key: "openHistory", text: t("sample.note.action.openHistory") } }
		];
		return list.map(function (n, i) {
			var o = { id: n.id, type: n.type, at: at(n.hours - random() * 0.3), title: n.title, description: n.description,
				unread: i < 3 || random() < 0.3, actions: [n.action] };
			if (n.author) { o.author = name(n.author); }
			return o;
		});
	}

	return {
		now: now,
		me: function () { return person(ME); },
		people: people,
		tasks: tasks,
		process: process,
		history: history,
		comments: comments,
		facts: facts,
		notifications: notifications
	};
});
