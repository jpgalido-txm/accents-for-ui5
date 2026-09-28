/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Object insight: one object a person acts on, its figures, the assistant button that opens the
 * conversation already about this object, and a panel where a model's explanation appears. The
 * panel sits on the AI surface, below the figures it explains and never in their place. It stays
 * hidden until there is text, and the "written by a model" label appears only once the text is
 * complete. An example text can be shown, and is then marked on screen as an example that no model
 * wrote.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/ObjectStatus",
	"sap/m/FlexItemData",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/I18n"
], function (VBox, HBox, Title, Text, ObjectStatus, FlexItemData, Part, Format, Motion, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.collaboration.i18n.i18n");

	/** Runs fn once, right after the control next renders. */
	function afterRender(control, fn) {
		var d = { onAfterRendering: function () { control.removeEventDelegate(d); fn(); } };
		control.addEventDelegate(d);
	}

	return {
		info: {
			controls: ["sap.m.Title", "sap.m.ObjectStatus", "sap.m.Text", "sap.m.Button (assistant object button)"],
			motion: "A figure that changes flashes once in the tone of the change. The explanation never animates; it is cleared when the object changes, because it no longer describes it.",
			still: false
		},

		/**
		 * options:
		 *   assistant  the app's assistant; its object button goes on the object header
		 *   question   the starter question the button fills in
		 *   data       { id, title, subtitle, figures: [{ key, label, text, tone: "good"|"bad"|"none" }],
		 *                facts: { name: value } for the assistant, example: optional example text }
		 *
		 * Methods for app code that asks a model itself:
		 *   part.begin()          shows the panel, empty, without a label
		 *   part.add(piece)       appends streamed text
		 *   part.done(writer)     text is complete; shows "Written by <writer>..." underneath
		 *   part.clear()          hides the panel again
		 */
		create: function (o) {
			var title = new Title({ text: "", level: "H3", titleStyle: "H5", wrapping: true });
			var subtitle = new Text({ text: "" }).addStyleClass("accLabel");
			var head = new HBox({ renderType: "Bare", alignItems: "Center", justifyContent: "SpaceBetween", items: [
				new VBox({ renderType: "Bare", items: [title, subtitle], layoutData: new FlexItemData({ growFactor: 1, shrinkFactor: 1, minWidth: "0" }) })
			] });
			var button = null;
			var figures = new HBox({ renderType: "Bare", wrap: "Wrap" }).addStyleClass("sapUiSmallMarginTop");
			var figureControls = {};

			var panelTitle = new Title({ text: t("objectInsight.explanation"), level: "H4", titleStyle: "H6" });
			var body = new Text({ text: "", renderWhitespace: true }).addStyleClass("sapUiTinyMarginTop");
			var label = new Text({ text: "", visible: false }).addStyleClass("accAiLabel sapUiTinyMarginTop");
			var panel = new VBox({ renderType: "Bare", visible: false, items: [panelTitle, body, label] })
				.addStyleClass("accAi sapUiSmallMarginTop");

			var content = new VBox({ renderType: "Bare", items: [head, figures, panel] });
			var current = null;

			function ask() {
				var d = current || {};
				return { title: d.title, facts: d.facts, question: o.question || t("objectInsight.question") };
			}

			function setButton(d) {
				if (!o.assistant || !o.assistant.objectButton) { return; }
				if (button && button.data("for") === d.id) { return; }
				if (button) { head.removeItem(button); button.destroy(); }
				button = o.assistant.objectButton({ title: d.title, get: ask });
				button.data("for", d.id);
				head.addItem(button);
			}

			var api = {
				begin: function () {
					panelTitle.setText(t("objectInsight.explanation"));
					body.setText("");
					label.setVisible(false);
					panel.setVisible(true);
				},
				add: function (piece) { body.setText(body.getText() + piece); },
				done: function (writer) {
					label.setText(t("objectInsight.writtenBy", writer || t("objectInsight.aModel")));
					label.setVisible(true);
				},
				example: function (text) {
					panelTitle.setText(t("objectInsight.explanationExample"));
					body.setText(text);
					label.setText(t("objectInsight.exampleLabel"));
					label.setVisible(true);
					panel.setVisible(true);
				},
				clear: function () {
					body.setText("");
					label.setVisible(false);
					panel.setVisible(false);
				}
			};

			var part = Part.make({
				key: "object-insight",
				content: content,
				empty: t("objectInsight.empty"),
				render: function (d, prev) {
					current = d;
					title.setText(d.title);
					subtitle.setText(d.subtitle || "");
					subtitle.setVisible(!!d.subtitle);
					setButton(d);
					var old = {};
					((prev && prev.id === d.id && prev.figures) || []).forEach(function (f) { old[f.key] = f; });
					var keys = (d.figures || []).map(function (f) { return f.key; }).join("|");
					if (keys !== figures.data("keys")) {
						figures.destroyItems();
						figureControls = {};
						(d.figures || []).forEach(function (f) {
							var c = new ObjectStatus({ title: f.label }).addStyleClass("sapUiMediumMarginEnd sapUiTinyMarginBottom accTabular");
							figureControls[f.key] = c;
							figures.addItem(c);
						});
						figures.data("keys", keys);
					}
					(d.figures || []).forEach(function (f) {
						var c = figureControls[f.key];
						c.setText(f.text);
						c.setState(Format.state(f.tone));
						c.setIcon(f.icon || "");
						if (old[f.key] && old[f.key].text !== f.text) {
							afterRender(c, function () { Motion.flash(c, f.tone); });
						}
					});
					if (!prev || prev.id !== d.id) { api.clear(); }
					if (d.example) { api.example(d.example); }
				}
			});
			Object.assign(part, api);
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			function object(seed) {
				var s = Data.sample(seed);
				var it = s.items.reduce(function (worst, i) { return i.actual / i.plan < worst.actual / worst.plan ? i : worst; });
				var gap = it.actual - it.plan;
				var pct = Format.change(it.actual, it.plan);
				var tone = Format.tone(gap, it.polarity);
				var last = it.months.filter(function (m) { return m.actual !== null; }).slice(-1)[0];
				var money = function (v) { return Format.money(v * 1000, "USD", true); };
				var facts = {};
				facts[t("objectInsight.demo.fact.category")] = it.name;
				facts[t("objectInsight.demo.fact.group")] = it.group;
				facts[t("objectInsight.demo.fact.actual")] = money(it.actual);
				facts[t("objectInsight.demo.fact.plan")] = money(it.plan);
				facts[t("objectInsight.demo.fact.gap")] = Format.delta(pct, "percent");
				facts[t("objectInsight.demo.fact.latest")] = t("objectInsight.demo.fact.latestValue", Format.period(last.period), money(last.actual), money(last.plan));
				return {
					id: it.id,
					title: it.name,
					subtitle: t("objectInsight.demo.subtitle", it.group, Format.period(s.periods[0]), Format.period(s.today)),
					figures: [
						{ key: "actual", label: t("objectInsight.demo.actual"), text: money(it.actual), tone: "none" },
						{ key: "plan", label: t("objectInsight.demo.plan"), text: money(it.plan), tone: "none" },
						{ key: "gap", label: t("objectInsight.demo.gap"), text: Format.delta(pct, "percent"), tone: tone, icon: Format.arrow(gap) }
					],
					facts: facts,
					example: t(gap < 0 ? "objectInsight.demo.exampleBelow" : "objectInsight.demo.exampleAbove", it.name, Format.percent(Math.abs(pct)),
						Format.period(last.period), Format.delta(Format.change(last.actual, last.plan), "percent"))
				};
			}
			return {
				options: { assistant: ctx && ctx.assistant, question: t("objectInsight.demo.question"), data: object(7) },
				next: function (seed) { return object(seed); }
			};
		}
	};
});
