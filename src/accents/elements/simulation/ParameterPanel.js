/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Parameter panel: the settings a simulation needs before it can run. Required settings come first,
 * optional ones after. Every problem is said in a plain sentence next to the field and once more above
 * the form, and Run and Reset sit in the panel's own toolbar so they never scroll out of view. While a
 * run is in progress, every field and both buttons are switched off.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/Toolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/Title",
	"sap/m/Button",
	"sap/m/BusyIndicator",
	"sap/m/MessageStrip",
	"sap/m/MessageToast",
	"sap/m/Label",
	"sap/m/Input",
	"sap/m/Select",
	"sap/ui/core/Item",
	"sap/ui/core/Title",
	"sap/ui/layout/form/SimpleForm",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/I18n"
], function (VBox, Toolbar, ToolbarSpacer, Title, Button, BusyIndicator, MessageStrip, MessageToast, Label, Input,
	Select, Item, CoreTitle, SimpleForm, Part, Format, Motion, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.simulation.i18n.i18n");

	function blank(v) { return v === null || v === undefined || v === ""; }

	/** Reads a field's current value: a number (or NaN when it is not one), a key, text, or null when empty. */
	function read(def, control) {
		if (def.type === "choice") { return control.getSelectedKey() || null; }
		var raw = String(control.getValue() || "").trim();
		if (raw === "") { return null; }
		if (def.type === "number") { return Number(raw.replace(Format.MINUS, "-")); }
		return raw;
	}

	function show(def, v) {
		if (blank(v)) { return ""; }
		return String(v);
	}

	/** The sentence that says what is wrong with one value, or null when it is fine. */
	function problem(def, v) {
		var name = def.label;
		if (blank(v)) {
			if (!def.required) { return null; }
			return t(def.type === "choice" ? "parameterPanel.choose" : "parameterPanel.enter", name);
		}
		if (def.type === "number") {
			if (isNaN(v)) { return t("parameterPanel.notNumber", name); }
			var withUnit = function (n) { var s = Format.number(n, def.digits); return def.unit ? t("parameterPanel.withUnit", s, def.unit) : s; };
			var hasMin = typeof def.min === "number", hasMax = typeof def.max === "number";
			if ((hasMin && v < def.min) || (hasMax && v > def.max)) {
				if (hasMin && hasMax) { return t("parameterPanel.between", name, Format.number(def.min, def.digits), withUnit(def.max)); }
				if (hasMin) { return t("parameterPanel.atLeast", name, withUnit(def.min)); }
				return t("parameterPanel.atMost", name, withUnit(def.max));
			}
		}
		return null;
	}

	return {
		info: {
			controls: ["sap.ui.layout.form.SimpleForm", "sap.m.Input", "sap.m.Select", "sap.m.Toolbar", "sap.m.Button", "sap.m.MessageStrip", "sap.m.BusyIndicator"],
			motion: "A field flashes once when new data changes its value; nothing moves while a person types.",
			still: false
		},

		/**
		 * options:
		 *   title     short noun for the toolbar ("Settings")
		 *   onRun     function (values) called by Run; may return a promise, and the panel stays switched
		 *             off until it settles. Without onRun, Run is disabled with a tooltip saying why.
		 *   onReset   optional; called after Reset puts the last supplied values back
		 *   data      { parameters: [{ key, label, type: "number" | "choice" | "text", required, value,
		 *               min, max, digits, unit, help, options: [{ key, text }] }] }
		 *
		 * Extra methods: part.values() returns { key: value }; part.setRunning(bool).
		 */
		create: function (o) {
			var defs = [];
			var fields = {};
			var running = false;

			var summary = new MessageStrip({ type: "Warning", showIcon: true, visible: false, text: "" }).addStyleClass("sapUiSmallMarginBottom");
			var busy = new BusyIndicator({ size: "1rem", visible: false, tooltip: t("parameterPanel.running.tooltip") });
			var runSettings = { text: t("parameterPanel.run"), type: "Emphasized", icon: "sap-icon://media-play" };
			var run = new Button(runSettings);
			var reset = new Button({ text: t("parameterPanel.reset"), icon: "sap-icon://reset", tooltip: t("parameterPanel.reset.tooltip") });
			var form = new SimpleForm({ editable: true, layout: "ColumnLayout", columnsM: 1, columnsL: 2, columnsXL: 2 });
			var toolbar = new Toolbar({ style: "Clear", content: [new Title({ text: o.title || t("parameterPanel.title"), level: "H3" }), new ToolbarSpacer(), busy, reset, run] });
			var content = new VBox({ renderType: "Bare", items: [toolbar, summary, form] });

			function values() {
				var out = {};
				defs.forEach(function (d) { out[d.key] = read(d, fields[d.key]); });
				return out;
			}

			/** Checks every field, marks the ones with a problem, and switches Run on only when all are fine. */
			function validate() {
				var sentences = [];
				defs.forEach(function (d) {
					var c = fields[d.key];
					var p = problem(d, read(d, c));
					c.setValueState(p ? "Error" : "None");
					c.setValueStateText(p || "");
					if (p) { sentences.push(p); }
				});
				summary.setText(sentences.length === 1 ? t("parameterPanel.summaryOne", sentences[0])
					: t("parameterPanel.summaryMany", sentences.join(" ")));
				summary.setVisible(sentences.length > 0);
				run.setEnabled(!running && sentences.length === 0 && !!o.onRun);
				run.setTooltip(!o.onRun ? t("parameterPanel.run.notConnected") : sentences.length ? t("parameterPanel.run.fixFirst") : t("parameterPanel.run.ready"));
				return sentences.length === 0;
			}

			function fieldFor(d) {
				var c;
				if (d.type === "choice") {
					c = new Select({ forceSelection: false, width: "100%", change: validate,
						items: [new Item({ key: "", text: "" })].concat((d.options || []).map(function (op) { return new Item({ key: op.key, text: op.text }); })) });
				} else {
					c = new Input({ width: "100%", liveChange: validate, change: validate, description: d.unit || "",
						textAlign: d.type === "number" ? "End" : "Begin", type: "Text" });
					if (d.type === "number") { c.addStyleClass("accTabular"); }
				}
				/*
				 * UI5 1.148.9 points a field in error at a hidden sentence (aria-errormessage) that it treats as
				 * a live region but renders without aria-live, so screen readers may not announce it and axe
				 * reports it. Marking that sentence polite makes the announcement happen; the words are UI5's own.
				 */
				c.addEventDelegate({ onAfterRendering: function () {
					var sr = c.getValueStateMessageId && document.getElementById(c.getValueStateMessageId() + "-sr");
					if (sr) { sr.setAttribute("aria-live", "polite"); }
				} });
				return c;
			}

			function setValue(d, v) {
				var c = fields[d.key];
				if (d.type === "choice") { c.setSelectedKey(blank(v) ? "" : v); } else { c.setValue(show(d, v)); }
			}

			function build(list) {
				form.destroyContent();
				fields = {};
				defs = list.slice();
				var required = defs.filter(function (d) { return d.required; });
				var optional = defs.filter(function (d) { return !d.required; });
				[["parameterPanel.required", required], ["parameterPanel.optional", optional]].forEach(function (g) {
					if (!g[1].length) { return; }
					form.addContent(new CoreTitle({ text: t(g[0], g[1].length) }));
					g[1].forEach(function (d) {
						var c = fieldFor(d);
						fields[d.key] = c;
						var label = new Label({ text: d.label, required: !!d.required, labelFor: c, tooltip: d.help || "" });
						if (d.help) { c.setTooltip(d.help); }
						form.addContent(label);
						form.addContent(c);
					});
				});
			}

			function setRunning(on) {
				running = !!on;
				busy.setVisible(running);
				run.setText(running ? t("parameterPanel.running") : t("parameterPanel.run"));
				reset.setEnabled(!running);
				defs.forEach(function (d) { fields[d.key].setEnabled(!running); });
				validate();
			}

			run.attachPress(function () {
				if (running || !validate() || !o.onRun) { return; }
				var result = o.onRun(values());
				if (result && typeof result.then === "function") {
					setRunning(true);
					result.then(function () { setRunning(false); }, function () {
						setRunning(false);
						MessageToast.show(t("parameterPanel.failed"));
					});
				}
			});
			reset.attachPress(function () {
				var d = part.data();
				if (!d) { return; }
				defs.forEach(function (def) { setValue(def, def.value); });
				validate();
				if (o.onReset) { o.onReset(values()); }
			});

			var part = Part.make({
				key: "parameter-panel",
				content: content,
				empty: t("parameterPanel.empty"),
				render: function (d, prev) {
					var list = d.parameters || [];
					if (!list.length) { part.state("empty"); return; }
					var sameShape = prev && defs.length === list.length && list.every(function (p, i) { return defs[i].key === p.key; });
					var before = sameShape ? values() : null;
					if (!sameShape) { build(list); } else { defs = list.slice(); }
					defs.forEach(function (def) { setValue(def, def.value); });
					setRunning(running);
					if (before) {
						defs.forEach(function (def) {
							var now = read(def, fields[def.key]);
							if (String(now) !== String(before[def.key])) { Motion.flash(fields[def.key], "none"); }
						});
					}
				}
			});
			part.values = values;
			part.setRunning = setRunning;
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function params(seed) {
				var r = Data.rng(seed);
				var gap = seed % 3 === 2;
				return { parameters: [
					{ key: "price", label: t("parameterPanel.demo.price"), type: "number", required: true, unit: "%", min: -20, max: 20, digits: 1,
						value: Data.round((r() - 0.5) * 12, 1), help: t("parameterPanel.demo.price.help") },
					{ key: "depth", label: t("parameterPanel.demo.depth"), type: "number", required: true, unit: "%", min: 0, max: 50,
						value: Math.round(10 + r() * 20), help: t("parameterPanel.demo.depth.help") },
					{ key: "budget", label: t("parameterPanel.demo.budget"), type: "number", required: true, unit: "USD", min: 0,
						value: gap ? null : Math.round(40 + r() * 60) * 1000, help: t("parameterPanel.demo.budget.help") },
					{ key: "horizon", label: t("parameterPanel.demo.horizon"), type: "choice", required: false, value: r() > 0.5 ? "q4" : "h2",
						options: [{ key: "q4", text: t("parameterPanel.demo.horizon.q4") }, { key: "h2", text: t("parameterPanel.demo.horizon.h2") }, { key: "fy", text: t("parameterPanel.demo.horizon.fy") }] },
					{ key: "weeks", label: t("parameterPanel.demo.weeks"), type: "number", required: false, unit: t("parameterPanel.demo.weeks.unit"), min: 1, max: 12,
						value: Math.round(2 + r() * 6), help: t("parameterPanel.demo.weeks.help") }
				] };
			}
			return {
				options: {
					title: t("parameterPanel.title"),
					data: params(7),
					onRun: function () {
						return new Promise(function (resolve) {
							setTimeout(function () {
								MessageToast.show(t("parameterPanel.demo.finished"));
								resolve();
							}, 1600);
						});
					}
				},
				next: function (seed) { return params(seed); }
			};
		}
	};
});
