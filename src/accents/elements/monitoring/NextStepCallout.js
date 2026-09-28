/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Next-step call-out: when something needs doing, one icon, a noun heading, one sentence saying what
 * and why, and one link to the screen where it is done. When its condition is false it is hidden
 * entirely; an empty call-out is noise. The link always goes somewhere: the caller supplies the target,
 * and it differs for objects that are already complete. It never animates.
 */
sap.ui.define([
	"sap/m/HBox",
	"sap/m/VBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Link",
	"sap/ui/core/Icon",
	"accents/core/Part",
	"accents/core/I18n"
], function (HBox, VBox, Title, Text, Link, Icon, Part, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.monitoring.i18n.i18n");

	/** Tone maps to the theme's semantic icon colours, so no colour is held here. */
	var COLOR = { bad: "Negative", critical: "Critical", good: "Positive", info: "Default" };
	var ICON = { bad: "sap-icon://error", critical: "sap-icon://alert", good: "sap-icon://sys-enter-2", info: "sap-icon://hint" };

	return {
		info: {
			controls: ["sap.ui.core.Icon", "sap.m.Title", "sap.m.Text", "sap.m.Link"],
			motion: "None. A call-out never animates.",
			still: true
		},

		/**
		 * options:
		 *   onLink  function (target) called when the link is pressed; required, so the link is never dead
		 *   data    { show, tone: "bad" | "critical" | "good" | "info", icon (optional), heading, text,
		 *             link: { text, target } }
		 *           show false hides the call-out.
		 */
		create: function (o) {
			var icon = new Icon({ size: "1.5rem", decorative: true }).addStyleClass("sapUiSmallMarginEnd");
			var heading = new Title({ text: "", level: "H3", titleStyle: "H6", wrapping: true });
			var sentence = new Text({ text: "" }).addStyleClass("sapUiTinyMarginTop");
			var current = null;
			var link = new Link({ text: "", press: function () { if (current && o.onLink) { o.onLink(current.link.target); } } })
				.addStyleClass("sapUiTinyMarginTop");
			var content = new HBox({ renderType: "Bare", alignItems: "Start", items: [
				icon,
				new VBox({ renderType: "Bare", items: [heading, sentence, link] })
			] }).addStyleClass("accCallout");

			var part = Part.make({
				key: "next-step-callout",
				content: content,
				empty: t("nextStepCallout.empty"),
				render: function (d) {
					current = d;
					content.setVisible(!!d.show);
					var tone = COLOR[d.tone] ? d.tone : "info";
					icon.setSrc(d.icon || ICON[tone]);
					icon.setColor(COLOR[tone]);
					heading.setText(d.heading);
					sentence.setText(d.text);
					var live = !!(d.link && d.link.target && o.onLink);
					link.setText(d.link ? d.link.text : "");
					link.setVisible(live);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			/** Shows only when at least one sample category is below its target; the count is read from the data. */
			function data(seed) {
				var missed = Data.sample(seed).items.filter(function (i) { return i.actual < i.target; }).length;
				return {
					show: missed > 0,
					tone: "critical",
					heading: t("nextStepCallout.demo.heading"),
					text: t(missed === 1 ? "nextStepCallout.demo.textOne" : "nextStepCallout.demo.textMany", missed),
					link: { text: t("nextStepCallout.demo.link"), target: "exception-items" }
				};
			}
			return {
				options: { data: data(7), onLink: function (target) { ctx.go(target); } },
				next: function (seed) { return data(seed); }
			};
		}
	};
});
