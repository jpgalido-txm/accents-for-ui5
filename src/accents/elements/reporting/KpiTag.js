/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * KPI tag: a small key figure for a page header. It shows the label, the value with its unit, and an
 * arrow for the direction of the change against a reference (plan, last year, a target). Its colour
 * follows the figure's polarity, not the sign of the change: sales above plan are good, costs above
 * plan are bad. Pressing it opens a popover with the value, the reference, the change, the rule and
 * the source. Built on an active sap.m.ObjectStatus, which carries a title, a state and an icon.
 * (sap.m.GenericTag was not used: its icon is fixed by its state, so it cannot show the arrow.)
 */
sap.ui.define([
	"sap/m/ObjectStatus",
	"sap/m/ResponsivePopover",
	"sap/m/ObjectNumber",
	"sap/m/List",
	"sap/m/DisplayListItem",
	"sap/m/Text",
	"sap/m/VBox",
	"sap/m/Button",
	"sap/ui/Device",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/I18n"
], function (ObjectStatus, ResponsivePopover, ObjectNumber, List, DisplayListItem, Text, VBox, Button, Device, Part, Format, Motion, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.reporting.i18n.i18n");

	function missing(v) { return v === null || v === undefined || (typeof v === "number" && isNaN(v)); }

	return {
		info: {
			controls: ["sap.m.ObjectStatus", "sap.m.ResponsivePopover", "sap.m.ObjectNumber", "sap.m.List"],
			motion: "The value counts to its new figure and flashes once in the tone of the change; the arrow and colour switch at once.",
			still: false
		},

		/**
		 * options:
		 *   label           short noun ("Sales")
		 *   unit            optional unit shown after the value ("USD")
		 *   format          function (value) -> text; default Format.short
		 *   polarity        "up" (higher is better) or "down" (lower is better)
		 *   referenceLabel  what the value is compared with ("Plan")
		 *   deltaKind       "percent" (default: change relative to the reference), "number" (the difference),
		 *                   or "points" (for figures that are fractions: the difference in percentage points)
		 *   note            optional sentence for the popover: what the figure covers
		 *   source          optional { source, mode, readAt } as SourceLine takes it
		 *   data            { value, reference }
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var status = new ObjectStatus({ title: o.label, text: Format.DASH, active: true, press: function () { open(); } })
				.addStyleClass("accTabular");
			var pop = null;
			var shown = null;
			var direction = "";
			// An active ObjectStatus renders its icon as an image with no name (OpenUI5 1.148.9). The arrow
			// is named here after each rendering, so screen readers hear the direction, not a bare image.
			status.addEventDelegate({ onAfterRendering: function () {
				var icon = status.getDomRef() && status.getDomRef().querySelector("[role='img'], [role='presentation']");
				if (icon && direction) { icon.setAttribute("role", "img"); icon.setAttribute("aria-label", direction); }
			} });

			function numbers(d) {
				var delta = missing(d.value) || missing(d.reference) ? null : d.value - d.reference;
				var rel = o.deltaKind === "number" ? delta : Format.change(d.value, d.reference);
				return { delta: delta, rel: rel, tone: Format.tone(delta, o.polarity) };
			}
			function changeText(n) {
				if (missing(n.delta)) { return Format.DASH; }
				if (o.deltaKind === "points") { return Format.delta(n.delta * 100, "points"); }
				return o.deltaKind === "number" ? Format.delta(n.delta, "number", o.digits) : Format.delta(n.rel, "percent");
			}
			function sentence(n) {
				if (missing(n.delta)) { return t("kpiTag.noReference"); }
				var ref = o.referenceLabel || "";
				return n.tone === "good" ? t("kpiTag.good", ref) : n.tone === "bad" ? t("kpiTag.bad", ref) : t("kpiTag.same", ref);
			}
			function valueText(v) { return missing(v) ? Format.DASH : fmt(v) + (o.unit ? " " + o.unit : ""); }

			function open() {
				var d = part.data();
				if (!d) { return; }
				var n = numbers(d);
				if (pop) { pop.destroy(); }
				var facts = [
					{ label: t("kpiTag.current"), value: valueText(d.value) },
					{ label: o.referenceLabel || Format.DASH, value: valueText(d.reference) },
					{ label: t("kpiTag.change"), value: changeText(n) + " · " + sentence(n) },
					{ label: t("kpiTag.rule"), value: o.polarity === "down" ? t("kpiTag.polarityDown") : t("kpiTag.polarityUp") }
				];
				if (o.source && o.source.source) {
					facts.push({ label: t("kpiTag.source"), value: o.source.source + (o.source.readAt ? " · " + Format.when(o.source.readAt) : "") });
				}
				var content = [new ObjectNumber({ number: missing(d.value) ? Format.DASH : fmt(d.value), unit: o.unit || "", emphasized: true,
					state: Format.state(n.tone) }).addStyleClass("sapUiSmallMarginBeginEnd sapUiSmallMarginTop")];
				if (o.note) { content.push(new Text({ text: o.note, wrapping: true }).addStyleClass("sapUiSmallMarginBeginEnd sapUiTinyMarginTop")); }
				content.push(new List({ showSeparators: "Inner", items: facts.map(function (f) {
					return new DisplayListItem({ label: f.label, value: f.value });
				}) }));
				pop = new ResponsivePopover({ title: o.label, placement: "Bottom", contentWidth: Device.system.phone ? "100%" : "22rem",
					content: [new VBox({ renderType: "Bare", items: content })],
					endButton: new Button({ text: t("kpiTag.close"), press: function () { pop.close(); } }) });
				status.addDependent(pop);
				pop.openBy(status);
			}

			var part = Part.make({
				key: "kpi-tag",
				content: status,
				onDestroy: function () { if (pop) { pop.destroy(); } },
				render: function (d, prev) {
					var n = numbers(d);
					status.setState(Format.state(n.tone));
					direction = missing(n.delta) ? "" : t(n.delta > 0 ? "kpiTag.up" : n.delta < 0 ? "kpiTag.down" : "kpiTag.flat");
					status.setIcon(missing(n.delta) ? "" : Format.arrow(n.delta));
					status.setTooltip(t("kpiTag.open", o.label) + ". " + sentence(n) + " (" + changeText(n) + ")");
					var from = prev && !missing(prev.value) ? (shown === null ? prev.value : shown) : null;
					if (missing(d.value)) { status.setText(Format.DASH); shown = null; return; }
					if (from === null || !status.getDomRef()) { status.setText(valueText(d.value)); shown = d.value; return; }
					Motion.countTo(status, from, d.value, valueText, 700, function (text) { status.setText(text); });
					shown = d.value;
					if (from !== d.value) { Motion.flash(status, Format.tone(d.value - from, o.polarity)); }
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function figures(seed) {
				var s = Data.sample(seed);
				return { value: s.items.reduce(function (a, i) { return a + i.actual; }, 0) * 1000,
					reference: s.items.reduce(function (a, i) { return a + i.plan; }, 0) * 1000 };
			}
			return {
				options: {
					label: t("kpiTag.demo.sales"), unit: "USD", polarity: "up", referenceLabel: t("kpiTag.demo.plan"),
					note: t("kpiTag.demo.note"), source: Data.sampleMeta(), data: figures(7)
				},
				next: function (seed) { return figures(seed); }
			};
		}
	};
});
