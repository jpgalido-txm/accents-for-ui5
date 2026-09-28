/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Applied settings: a tag that states exactly which settings produced the figures on screen. The
 * settings are read back from the calculation's answer, not taken from what the person asked for, so
 * if the two differ the tag tells the truth. When the controls have been changed since, the tag turns
 * to a warning and says the figures are out of date. Pressing it lists each setting as applied and as
 * it is now.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/GenericTag",
	"sap/m/Text",
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/ObjectStatus",
	"sap/m/ResponsivePopover",
	"accents/core/Part",
	"accents/core/Motion",
	"accents/core/Format",
	"accents/core/I18n"
], function (VBox, GenericTag, Text, Table, Column, ColumnListItem, ObjectStatus, ResponsivePopover, Part, Motion, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.planning.i18n.i18n");

	function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

	return {
		info: {
			controls: ["sap.m.GenericTag", "sap.m.ResponsivePopover", "sap.m.Table"],
			motion: "The tag flashes once when a new calculation brings different applied settings.",
			still: false
		},

		/**
		 * options:
		 *   data {
		 *     applied:  [{ key, label, value, text }]  settings as the calculation reports it used them
		 *     current:  { key: value }                  what the controls hold now (optional)
		 *     texts:    { key: text }                   how to show a current value (optional; else String(value))
		 *   }
		 *
		 * part.setCurrent(current, texts)  the controls changed; the tag re-checks at once
		 */
		create: function (o) {
			var d = null;
			var pop = null;
			var tag = new GenericTag({ text: "", design: "Full", status: "None" });
			var note = new Text({ text: "", visible: false }).addStyleClass("accLabel sapUiTinyMarginTop");

			function differs() {
				if (!d || !d.current) { return []; }
				return d.applied.filter(function (a) { return a.key in d.current && !same(d.current[a.key], a.value); });
			}
			function nowText(a) {
				if (!d.current || !(a.key in d.current)) { return a.text; }
				return d.texts && d.texts[a.key] !== undefined ? d.texts[a.key] : String(d.current[a.key]);
			}

			function draw() {
				var off = differs();
				var summary = d.applied.map(function (a) { return a.label + " " + a.text; }).join(" · ");
				tag.setText(t("appliedSettings.tag", summary));
				tag.setStatus(off.length ? "Warning" : "Success");
				tag.setTooltip(off.length
					? t(off.length === 1 ? "appliedSettings.tooltip.changedOne" : "appliedSettings.tooltip.changedMany", off.length)
					: t("appliedSettings.tooltip.current"));
				note.setText(off.length ? t("appliedSettings.note", off.length,
					off.map(function (a) { return a.label; }).join(", ")) : "");
				note.setVisible(off.length > 0);
			}

			tag.attachPress(function () {
				if (!d) { return; }
				if (!pop) {
					pop = new ResponsivePopover({ title: t("appliedSettings.title"), placement: "Bottom", contentWidth: "24rem" }).addStyleClass("sapUiContentPadding");
				}
				pop.destroyContent();
				var table = new Table({ columns: [
					new Column({ header: new Text({ text: t("appliedSettings.column.setting") }) }),
					new Column({ header: new Text({ text: t("appliedSettings.column.applied") }) }),
					new Column({ header: new Text({ text: t("appliedSettings.column.now") }) })
				] });
				d.applied.forEach(function (a) {
					var changed = d.current && a.key in d.current && !same(d.current[a.key], a.value);
					table.addItem(new ColumnListItem({ cells: [
						new Text({ text: a.label }),
						new Text({ text: a.text }),
						new ObjectStatus({ text: changed ? t("appliedSettings.changed", nowText(a)) : nowText(a), state: changed ? "Warning" : "None",
							icon: changed ? "sap-icon://alert" : "" })
					] }));
				});
				pop.addContent(table);
				pop.openBy(tag);
			});

			var part = Part.make({
				key: "applied-settings",
				content: new VBox({ renderType: "Bare", items: [tag, note] }),
				empty: t("appliedSettings.empty"),
				render: function (data, prev) {
					d = { applied: data.applied || [], current: data.current || null, texts: data.texts || null };
					draw();
					if (prev && !same(prev.applied, data.applied)) { setTimeout(function () { Motion.flash(tag, "none"); }, 0); }
				}
			});
			part.setCurrent = function (current, texts) {
				if (!d) { return part; }
				d.current = current;
				if (texts) { d.texts = texts; }
				draw();
				return part;
			};
			if (o && o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function make(seed) {
				var r = Data.rng(seed);
			var pct = function (v) { return Format.delta(v / 100, "percent", 0); };
				var price = Math.round(r() * 8);
				var drift = r() > 0.4;
				return {
					applied: [
						{ key: "price", label: t("appliedSettings.demo.price"), value: price, text: pct(price) },
						{ key: "spread", label: t("appliedSettings.demo.spread"), value: "top", text: t("appliedSettings.demo.topDown") },
						{ key: "budget", label: t("appliedSettings.demo.budget"), value: false, text: t("appliedSettings.demo.calculated") }
					],
					current: { price: drift ? price + 2 : price, spread: "top", budget: false },
					texts: { price: pct(drift ? price + 2 : price), spread: t("appliedSettings.demo.topDown"), budget: t("appliedSettings.demo.calculated") }
				};
			}
			return { options: { data: make(7) }, next: function (seed) { return make(seed); } };
		}
	};
});
