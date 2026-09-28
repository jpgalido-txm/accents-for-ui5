/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Source line: at the foot of every screen that shows data. Where the data came from, whether it is
 * live or sample, which model produced any projection, and when it was read. It never moves and never
 * animates.
 */
sap.ui.define([
	"sap/m/Text",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/I18n"
], function (Text, Part, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.common.i18n.i18n");

	function describe(d) {
		var bits = [t("sourceLine.source", d.source || t("sourceLine.notStated"))];
		bits.push(d.mode === "live" ? t("sourceLine.live") : t("sourceLine.sample"));
		if (d.model) { bits.push(t("sourceLine.model", d.model)); }
		if (d.readAt) { bits.push(t("sourceLine.readAt", Format.when(d.readAt))); }
		return bits.join(" · ");
	}

	return {
		info: {
			controls: ["sap.m.Text"],
			motion: "None. A source line never animates.",
			still: true
		},

		/** options: data { source, mode: "live" | "sample", model, readAt } */
		create: function (o) {
			var text = new Text({ text: "", wrapping: true }).addStyleClass("accSource");
			var part = Part.make({
				key: "source-line",
				content: text,
				empty: t("sourceLine.empty"),
				render: function (d) { text.setText(describe(d)); }
			});
			if (o && o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			return {
				options: { data: Data.sampleMeta() },
				next: function () { return Data.sampleMeta(); }
			};
		}
	};
});
