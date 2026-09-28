/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * The living gallery: the catalogue, built with the same shell and parts it documents. Every entry has
 * a deep link (#/<key>), its purpose, the controls it uses, how it moves, a live demo, buttons to force
 * each view state, and "Replay motion", which feeds the demo new data.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Text",
	"sap/m/Label",
	"sap/m/Button",
	"sap/m/MessageStrip",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/Toolbar",
	"sap/m/ToolbarSpacer",
	"sap/f/Card",
	"accents/brand",
	"accents/registry",
	"accents/shell/Shell",
	"accents/core/Layout",
	"accents/core/Data",
	"accents/core/Chart",
	"accents/core/Motion",
	"accents/elements/common/SourceLine",
	"accents/core/I18n"
], function (VBox, HBox, Text, Label, Button, MessageStrip, SegmentedButton, SegmentedButtonItem, Toolbar, ToolbarSpacer,
	Card, brand, registry, Shell, Layout, Data, Chart, Motion, SourceLine, I18n) {
	"use strict";

	var t = I18n.use("gallery.i18n.i18n");
	var errors = window.__accErrors || [];
	var auditMode = /[?&]audit=1\b/.test(window.location.search);
	var replayMode = /[?&]replay=1\b/.test(window.location.search);
	var notBuilt = false;
	var replayFn = null;

	var shell;
	var ctx = {};

	function fact(label, text) {
		return new VBox({ renderType: "Bare", items: [new Label({ text: label }), new Text({ text: text })] }).addStyleClass("galFact");
	}

	/** Loads an entry's module; resolves to null when it is not built yet. */
	function load(entry) {
		return new Promise(function (resolve) {
			sap.ui.require([entry.module], resolve, function (err) {
				// A missing file is "not built yet"; a file that exists but fails is a real error.
				var notFound = /404|not found|failed to load/i.test(String(err && err.message));
				if (!notFound) { errors.push(entry.key + ": " + err.message); }
				resolve(notFound ? null : { __error: err });
			});
		});
	}

	function entryPage(entry) {
		var holder = new VBox({ renderType: "Bare" }).addStyleClass("galDemo");
		var page = Layout.page({ title: entry.name, lead: entry.purpose, content: [holder] });
		load(entry).then(function (mod) {
			if (!mod) {
				notBuilt = true;
				holder.addItem(new MessageStrip({ type: "Information", showIcon: true,
					text: t("gallery.notBuilt") }));
				return;
			}
			if (mod.__error) {
				holder.addItem(new MessageStrip({ type: "Error", showIcon: true, text: t("gallery.loadFailed", mod.__error.message) }));
				return;
			}
			var info = mod.info || {};
			holder.addItem(new HBox({ renderType: "Bare", wrap: "Wrap", items: [
				fact(t("gallery.fact.key"), entry.key),
				fact(t("gallery.fact.controls"), (info.controls || []).join(", ") || t("gallery.notStated")),
				fact(t("gallery.fact.motion"), info.motion || t("gallery.notStated"))
			] }).addStyleClass("galFacts"));

			var seed = 7;
			var demo, part = null, next = null;
			try {
				if (entry.kind === "pattern") {
					var ex = mod.example(Data, ctx);
					demo = ex.control;
					next = ex.next || null;
				} else {
					var e = mod.example(Data, ctx);
					part = mod.create(e.options);
					next = e.next;
					demo = new Card({ content: new VBox({ items: [part.root], renderType: "Bare" }).addStyleClass("galDemoBox") });
				}
			} catch (err) {
				errors.push(entry.key + ": " + err.message);
				holder.addItem(new MessageStrip({ type: "Error", showIcon: true, text: t("gallery.demoFailed", err.message) }));
				return;
			}

			// A wrapping row, not a toolbar: on a phone the replay button drops to the next line instead of
			// running past the screen edge.
			var bar = new HBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Center", justifyContent: "SpaceBetween" });
						var stateGroup = new HBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap" });
			if (part) {
				var restore = function () { part.update(part.data() || next(seed)); states.setSelectedKey("ready"); };
				var states = new SegmentedButton({ selectedKey: "ready", items: ["ready", "loading", "empty", "error"].map(function (k) {
					return new SegmentedButtonItem({ key: k, text: t("gallery.state." + k) });
				}), selectionChange: function (ev) {
					var k = ev.getParameter("item").getKey();
					if (k === "ready") { restore(); } else { part.state(k); }
				} });
				stateGroup.addItem(new Label({ text: t("gallery.viewState"), labelFor: states }).addStyleClass("sapUiTinyMarginEnd"));
				states.addAriaLabelledBy(stateGroup.getItems()[0]);
				stateGroup.addItem(states);
			}
			bar.addItem(stateGroup);
			var canReplay = !!next && !info.still;
			var replayBtn;
			bar.addItem(replayBtn = new Button({
				text: t("gallery.replay"), icon: "sap-icon://refresh", enabled: canReplay,
				tooltip: info.still ? t("gallery.replay.still") : (!next ? t("gallery.replay.none") : t("gallery.replay.ready")),
				press: function () {
					seed += 1;
					var d = next(seed);
					if (part) { part.update(d); } else if (typeof d === "function") { d(); }
				}
			}));
			if (canReplay) { replayFn = function () { replayBtn.firePress(); }; }
			holder.addItem(bar);
			holder.addItem(demo);
			// Page patterns carry their own source line; elements get one here.
			if (entry.kind !== "pattern") { holder.addItem(SourceLine.create({ data: Data.sampleMeta() }).root); }
		});
		return page;
	}

	function linkCard(entry, cols) {
		return Layout.card({ title: entry.name, subtitle: entry.purpose, content: new Text({ text: "" }), cols: cols || 4, rows: 2,
			press: function () { shell.go(entry.key); } }).addStyleClass("galLinkCard");
	}

	var SECTIONS = [
		{ key: "about", title: t("gallery.section.about") },
		{ key: "patterns", title: t("gallery.section.patterns") },
		{ key: "elements", title: t("gallery.section.elements") },
		{ key: "legal", title: t("gallery.section.legal") }
	];

	function homeContent() {
		var layout = shell.homeLayout();
		if (!layout.length) { return [shell.emptyHome()]; }
		return layout.map(function (s) {
			if (s.key === "about") {
				return new VBox({ renderType: "Bare", items: [
					new Text({ text: t("gallery.about", brand.fullName) }).addStyleClass("accPageLead")
				] }).addStyleClass("accBand");
			}
			if (s.key === "patterns") { return Layout.band({ title: s.title, cards: registry.inGroup("patterns").map(function (e) { return linkCard(e); }) }); }
			if (s.key === "elements") {
				return Layout.band({ title: s.title, cards: registry.groups.filter(function (g) { return g.key !== "patterns"; }).map(function (g) {
					var n = registry.inGroup(g.key).length;
					var names = registry.inGroup(g.key).map(function (e) { return e.name; }).slice(0, 4).join(", ");
					return Layout.card({ title: t("gallery.group", g.title, n), subtitle: t(n > 4 ? "gallery.groupMembersMore" : "gallery.groupMembers", names),
						content: new Text({ text: "" }), cols: 4, rows: 2, press: function () { shell.go(registry.inGroup(g.key)[0].key); } });
				}) });
			}
			return new VBox({ renderType: "Bare", items: [new Text({ text: t("gallery.licence", brand.attribution) })] }).addStyleClass("galAttribution");
		});
	}

	var home;
	function buildHome() {
		home = Layout.page({ title: brand.fullName, lead: t("gallery.lead"), content: homeContent() });
		return home;
	}

	var pages = [{ key: "home", title: t("gallery.overview"), icon: "sap-icon://home", build: buildHome,
		context: function () { var f = {}; f[t("gallery.context.entries")] = registry.entries.length; return { title: t("gallery.context.home"), facts: f }; } }];
	registry.groups.forEach(function (g) {
		pages.push({ key: "group:" + g.key, title: g.title, icon: g.icon, items: registry.inGroup(g.key).map(function (e) {
			return { key: e.key, title: e.name, build: function () { return entryPage(e); },
				context: function () { var f = {}; f[t("gallery.context.purpose")] = e.purpose; return { title: t("gallery.context.entry", e.name), facts: f }; } };
		}) });
	});

	shell = Shell.create({
		app: { title: brand.fullName },
		pages: pages,
		home: "home",
		search: { placeholder: t("gallery.search"), onSearch: function (q) {
			var hit = registry.entries.find(function (e) { return e.name.toLowerCase().indexOf(q.toLowerCase()) >= 0 || e.key.indexOf(q.toLowerCase()) >= 0; });
			if (hit) { shell.go(hit.key); }
		} },
		links: { help: "../README.md", legal: "../NOTICE" },
		homeSections: { id: "gallery", sections: SECTIONS, onChange: function () {
			if (shell.current() === "home") { shell.refresh(); } else { shell.invalidate("home"); }
		} },
		onShow: function (key, control) {
			setTimeout(function () {
				var cards = control.findAggregatedObjects(true, function (c) { return c.isA("sap.f.Card"); });
				Motion.enter(cards, key);
			}, 0);
		}
	});
	ctx.assistant = shell.assistant;
	ctx.go = shell.go;
	shell.start("content");

	/** Elements that stick out past the right edge of the main area: the page must never scroll sideways. */
	function overflow() {
		var main = document.querySelector(".sapTntToolPageMain") || document.body;
		var edge = Math.min(main.getBoundingClientRect().right, document.documentElement.clientWidth) + 1;
		var out = [];
		// Content inside a box that scrolls or clips sideways (a wide table, a scrolling grid) is not
		// page overflow as long as the box itself fits.
		function clipped(el) {
			for (var p = el.parentElement; p && p !== main; p = p.parentElement) {
				var ox = getComputedStyle(p).overflowX;
				if (ox !== "visible" && p.getBoundingClientRect().right <= edge) { return true; }
			}
			return false;
		}
		main.querySelectorAll("*").forEach(function (el) {
			var r = el.getBoundingClientRect();
			if (r.width > 0 && r.right > edge && !(el.parentElement && out.indexOf(el.parentElement) >= 0) && !clipped(el)) { out.push(el); }
		});
		return out.filter(function (el) { return out.indexOf(el.parentElement) < 0; }).slice(0, 5).map(function (el) {
			return (el.id ? "#" + el.id + " " : "") + String(el.className).split(" ").slice(0, 3).join(".") + " right=" + Math.round(el.getBoundingClientRect().right);
		});
	}

	/** Audit mode (tools/check.mjs): wait for the demo, optionally replay motion, then publish the audit. */
	if (auditMode) {
		setTimeout(function () {
			if (replayMode && replayFn) { replayFn(); }
			setTimeout(function () {
				var pre = document.createElement("pre");
				pre.id = "accents-audit";
				pre.style.display = "none";
				var a = window.accents.audit();
				a.notBuilt = notBuilt;
				a.page = shell.current();
				pre.textContent = JSON.stringify(a);
				document.body.appendChild(pre);
			}, replayMode ? 2500 : 0);
		}, 6000);
	}

	/** Test hook for automated audits. */
	window.accents = {
		registry: registry,
		go: shell.go,
		audit: function () {
			return { charts: Chart.audit(), bands: Layout.checkBands(), overflow: overflow(), errors: errors.slice(),
				missingText: I18n.missing() };
		}
	};
});
