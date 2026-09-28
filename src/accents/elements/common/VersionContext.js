/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Version context: a read-only statement, above a list or a diagnostic page, of which version the
 * figures belong to. It cannot change the version (that is the version bar's job) and never animates.
 */
sap.ui.define([
	"sap/m/HBox",
	"sap/m/Text",
	"sap/m/Label",
	"sap/m/Title",
	"sap/m/ObjectStatus",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/I18n"
], function (HBox, Text, Label, Title, ObjectStatus, Part, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.common.i18n.i18n");

	return {
		info: {
			controls: ["sap.m.Label", "sap.m.Text", "sap.m.ObjectStatus"],
			motion: "None. A version statement never animates.",
			still: true
		},

		/**
		 * options:
		 *   data  { name, kind ("Base plan", "Scenario"...), savedAt (date), savedBy }
		 */
		create: function (o) {
			var label = new Label({ text: t("versionContext.version"), showColon: true });
			var name = new Title({ text: "", level: "H3", titleStyle: "H6" });
			var detail = new Text({ text: "" }).addStyleClass("accLabel");
			var lock = new ObjectStatus({ text: t("versionContext.readOnly"), icon: "sap-icon://locked", tooltip: t("versionContext.readOnlyTooltip") });
			var content = new HBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Center", items: [label, name, detail, lock] });
			name.addStyleClass("sapUiTinyMarginBegin sapUiSmallMarginEnd");
			detail.addStyleClass("sapUiSmallMarginEnd");
			label.addStyleClass("accLabel");

			var part = Part.make({
				key: "version-context",
				content: content,
				empty: t("versionContext.empty"),
				render: function (d) {
					name.setText(d.kind ? t("versionContext.nameKind", d.name, d.kind) : d.name);
					var when = d.savedAt ? Format.when(d.savedAt) : "";
					detail.setText(when && d.savedBy ? t("versionContext.savedAtBy", when, d.savedBy)
						: when ? t("versionContext.savedAt", when)
							: d.savedBy ? t("versionContext.savedBy", d.savedBy) : t("versionContext.neverSaved"));
				}
			});
			if (o && o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function v() {
				var meta = Data.sampleMeta();
				return { name: t("versionContext.demo.name", Data.SAMPLE_TODAY.slice(0, 4)), kind: t("versionContext.demo.kind"), savedAt: meta.readAt, savedBy: t("versionContext.demo.savedBy") };
			}
			return { options: { data: v() }, next: function () { return v(); } };
		}
	};
});
