/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Run statistics: after an optimiser run, how many options it evaluated and how many of them met the
 * target. Two counts and one sentence; the share is calculated from the two counts, never typed. No
 * assistant button: these are counts, not something a person acts on.
 */
sap.ui.define([
	"sap/m/HBox",
	"sap/m/VBox",
	"sap/m/Text",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/I18n",
	"accents/elements/optimisation/sampleOptions"
], function (HBox, VBox, Text, Part, Format, Motion, I18n, sampleOptions) {
	"use strict";

	var t = I18n.use("accents.elements.optimisation.i18n.i18n");

	/** A label over a figure. The figure's text is written straight to the DOM while it counts. */
	function figure(label) {
		var value = new Text({ text: "" }).addStyleClass("accFigure");
		var box = new VBox({ renderType: "Bare", items: [new Text({ text: label }).addStyleClass("accLabel"), value] })
			.addStyleClass("sapUiLargeMarginEnd sapUiTinyMarginBottom");
		return { box: box, value: value };
	}

	return {
		info: {
			controls: ["sap.m.Text", "sap.m.HBox", "sap.m.VBox"],
			motion: "Both counts count up to their new values when a run finishes. The sentence below never moves.",
			still: false
		},

		/**
		 * options:
		 *   targetLabel  what the target is ("target return"); default "target"
		 *   format       function (value) -> text for the target; default Format.short
		 *   data         { evaluated, met, target (optional) }
		 */
		create: function (o) {
			var evaluated = figure(t("runStats.evaluated"));
			var met = figure(t("runStats.met"));
			var sentence = new Text({ text: "" }).addStyleClass("accLabel");
			var content = new VBox({ renderType: "Bare", items: [
				new HBox({ renderType: "Bare", wrap: "Wrap", items: [evaluated.box, met.box] }),
				sentence
			] });

			function show(f, from, to) {
				var el = f.value.getDomRef();
				f.value.setProperty("text", Format.number(to), true);
				if (!el) { return; }
				if (typeof from === "number" && from !== to) { Motion.countTo(el, from, to, Format.number, 600); }
				else { el.textContent = Format.number(to); }
			}
			[evaluated, met].forEach(function (f, i) {
				f.value.addEventDelegate({ onAfterRendering: function () {
					var d = part.data();
					if (d) { f.value.getDomRef().textContent = Format.number(i === 0 ? d.evaluated : d.met); }
				} });
			});

			var part = Part.make({
				key: "run-stats",
				content: content,
				empty: t("runStats.empty"),
				render: function (d, prev) {
					show(evaluated, prev ? prev.evaluated : null, d.evaluated);
					show(met, prev ? prev.met : null, d.met);
					var share = d.evaluated ? d.met / d.evaluated : null;
					var what = o.targetLabel || t("runStats.defaultTarget");
					var noTarget = d.target === null || d.target === undefined;
					sentence.setText(d.evaluated === 0 ? t("runStats.noOptions") :
						(noTarget ? t("runStats.sentence", Format.number(d.met), Format.number(d.evaluated), Format.percent(share, 0), what) :
							t("runStats.sentenceWithTarget", Format.number(d.met), Format.number(d.evaluated), Format.percent(share, 0), what,
								(o.format || Format.short)(d.target))) +
						(d.met === 0 ? " " + t("runStats.noneMet") : ""));
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			/** Counts read from a seeded demo run: every option, and those at or above its target. */
			function data(seed, n) {
				var run = sampleOptions.run(Data, seed, n);
				return { evaluated: run.options.length, met: run.options.filter(function (x) { return x.met; }).length,
					target: run.target * 1000 };
			}
			return {
				options: { targetLabel: t("runStats.demo.targetLabel"), format: function (v) { return Format.money(v, "USD", true); }, data: data(7) },
				// Each replay is a new run with a different number of options, so both counts move.
				next: function (seed) { return data(seed, 18 + (seed % 5) * 3); }
			};
		}
	};
});
