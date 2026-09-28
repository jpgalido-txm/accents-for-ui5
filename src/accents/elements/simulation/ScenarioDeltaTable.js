/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Scenario delta table: one row per item with the base, the scenario, and the change between them.
 * The change is drawn as a small bar centred on zero, coloured by the figure's polarity and always
 * paired with its signed number. The percent change says "n/a" when a percent would mislead (the base
 * is zero, or the value changes sign), and its tooltip says which.
 */
sap.ui.define([
	"sap/ui/core/Control",
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/Text",
	"sap/m/ObjectStatus",
	"sap/m/HBox",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/Tokens",
	"accents/core/I18n"
], function (Control, Table, Column, ColumnListItem, Text, ObjectStatus, HBox, Part, Format, Motion, Tokens, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.simulation.i18n.i18n");

	/*
	 * A custom control because UI5 has no in-cell bar that grows either way from a centre line
	 * (sap.m.ProgressIndicator only grows one way from zero). Colours come from Tokens.
	 */
	var DeltaBar = Control.extend("accents.elements.simulation.DeltaBar", {
		metadata: {
			properties: {
				value: { type: "float", defaultValue: 0 },
				max: { type: "float", defaultValue: 1 },
				tone: { type: "string", defaultValue: "none" },
				width: { type: "sap.ui.core.CSSSize", defaultValue: "4rem" }
			}
		},
		init: function () { this._stop = Tokens.onChange(this.invalidate.bind(this)); },
		exit: function () { this._stop(); },
		renderer: {
			apiVersion: 2,
			render: function (rm, c) {
				var v = c.getValue() || 0, max = Math.abs(c.getMax()) || 1;
				var half = Math.min(50, Math.abs(v) / max * 50);
				var colour = Tokens.status(c.getTone() === "good" ? "good" : c.getTone() === "bad" ? "bad" : "neutral");
				rm.openStart("span", c).attr("aria-hidden", "true")
					.style("display", "inline-block").style("position", "relative").style("vertical-align", "middle")
					.style("width", c.getWidth()).style("height", "0.75rem").style("margin-left", "0.5rem").openEnd();
				rm.openStart("span").style("position", "absolute").style("left", "50%").style("top", "0").style("bottom", "0")
					.style("width", "1px").style("background-color", Tokens.line()).openEnd().close("span");
				if (half > 0) {
					rm.openStart("span").style("position", "absolute").style("top", "0.125rem").style("bottom", "0.125rem")
						.style("left", (v >= 0 ? 50 : 50 - half) + "%").style("width", half + "%")
						.style("background-color", colour).style("border-radius", "2px").openEnd().close("span");
				}
				rm.close("span");
			}
		}
	});

	/** Why a percent is not shown, or null when it is. */
	function noPercentReason(scenario, base) {
		if (base === null || base === undefined || scenario === null || scenario === undefined) { return t("scenarioDeltaTable.noPercent.missing"); }
		if (base === 0) { return t("scenarioDeltaTable.noPercent.zero"); }
		if ((base < 0) !== (scenario < 0)) { return t("scenarioDeltaTable.noPercent.sign"); }
		return null;
	}

	return {
		info: {
			controls: ["sap.m.Table", "sap.m.ObjectStatus", "accents.elements.simulation.DeltaBar (custom: UI5 has no two-way in-cell bar)"],
			motion: "Changed scenario and change cells flash once, left to right, when the data changes.",
			still: false
		},

		/**
		 * options:
		 *   itemLabel      column header for the item ("Category")
		 *   baseLabel      default "Base"; scenarioLabel default "Scenario"
		 *   polarity       "up" when higher is better (default), "down" when lower is better; a row may override
		 *   format         function (value) -> text; default Format.number
		 *   onSelect       optional: makes rows pressable; receives the row
		 *   data           [{ id, name, base, scenario, polarity? }]
		 */
		create: function (o) {
			var fmt = o.format || function (v) { return Format.number(v); };
			/** A signed change in the table's own number format: "+$1,200", "−$300". */
			function signed(v) {
				if (v === null || v === undefined) { return Format.DASH; }
				return (v > 0 ? "+" : v < 0 ? Format.MINUS : "") + fmt(Math.abs(v));
			}
			var table = new Table({
				fixedLayout: false,
				popinLayout: "GridSmall",
				columns: [
					new Column({ header: new Text({ text: o.itemLabel || t("scenarioDeltaTable.item") }) }),
					new Column({ header: new Text({ text: o.baseLabel || t("scenarioDeltaTable.base") }), hAlign: "End", minScreenWidth: "Tablet", demandPopin: true }),
					new Column({ header: new Text({ text: o.scenarioLabel || t("scenarioDeltaTable.scenario") }), hAlign: "End" }),
					new Column({ header: new Text({ text: t("scenarioDeltaTable.change") }), hAlign: "End" }),
					new Column({ header: new Text({ text: t("scenarioDeltaTable.changePercent") }), hAlign: "End", minScreenWidth: "Tablet", demandPopin: true })
				]
			});
			if (o.onSelect) {
				table.setMode("None");
				table.attachItemPress(function (e) {
					var id = e.getParameter("listItem").data("id");
					var row = (part.data() || []).filter(function (r) { return String(r.id) === id; })[0];
					if (row) { o.onSelect(row); }
				});
			}
			var pending = [];
			table.addEventDelegate({ onAfterRendering: function () {
				var cells = pending.map(function (p) { return { el: p.control.getDomRef(), column: p.column, tone: p.tone }; })
					.filter(function (c) { return !!c.el; });
				pending = [];
				Motion.sweep(cells);
			} });

			var part = Part.make({
				key: "scenario-delta-table",
				content: table,
				empty: t("scenarioDeltaTable.empty"),
				render: function (rows, prev) {
					if (!rows.length) { part.state("empty"); return; }
					var before = {};
					(prev || []).forEach(function (r) { before[r.id] = r; });
					var max = rows.reduce(function (m, r) {
						return Math.max(m, Math.abs((r.scenario === null || r.base === null) ? 0 : r.scenario - r.base));
					}, 0) || 1;
					pending = [];
					table.destroyItems();
					rows.forEach(function (r) {
						var missing = r.scenario === null || r.scenario === undefined || r.base === null || r.base === undefined;
						var delta = missing ? null : r.scenario - r.base;
						var tone = Format.tone(delta, r.polarity || o.polarity || "up");
						var pct = Format.change(r.scenario, r.base);
						var reason = pct === null ? noPercentReason(r.scenario, r.base) : null;
						var scen = new Text({ text: fmt(r.scenario), wrapping: false }).addStyleClass("accTabular");
						var deltaText = new ObjectStatus({ text: signed(delta), state: Format.state(tone) }).addStyleClass("accDelta");
						var bar = new DeltaBar({ value: delta || 0, max: max, tone: tone, tooltip: t("scenarioDeltaTable.bar", signed(delta)) });
						var change = new HBox({ renderType: "Bare", justifyContent: "End", alignItems: "Center", items: [deltaText, bar] });
						var pctStatus = new ObjectStatus({ text: pct === null ? (missing ? Format.DASH : t("scenarioDeltaTable.notApplicable")) : Format.delta(pct, "percent"),
							state: pct === null ? "None" : Format.state(tone), tooltip: reason || "" }).addStyleClass("accDelta");
						var item = new ColumnListItem({ type: o.onSelect ? "Navigation" : "Inactive", cells: [
							new Text({ text: r.name }),
							new Text({ text: fmt(r.base), wrapping: false }).addStyleClass("accTabular"),
							scen, change, pctStatus
						] });
						item.data("id", String(r.id));
						table.addItem(item);
						var old = before[r.id];
						if (old && (old.scenario !== r.scenario || old.base !== r.base)) {
							pending.push({ control: scen, column: 2, tone: "none" });
							pending.push({ control: deltaText, column: 3, tone: tone });
						}
					});
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function rows(seed) {
				var r = Data.rng(seed * 31);
				return Data.sample(seed).items.map(function (i, k) {
					var base = Math.round(i.actual * 10) * 100;
					var scenario = Math.round(base * (0.9 + r() * 0.22));
					if (k === 5) { base = 0; scenario = Math.round(20000 + r() * 30000); }
					if (k === 6) { base = -Math.round(10000 + r() * 20000); scenario = Math.round(5000 + r() * 15000); }
					return { id: i.id, name: i.name, base: base, scenario: scenario };
				});
			}
			return {
				options: { itemLabel: t("scenarioDeltaTable.demo.item"), baseLabel: t("scenarioDeltaTable.base"), scenarioLabel: t("scenarioDeltaTable.scenario"), polarity: "up",
					format: function (v) { return Format.money(v, "USD"); }, data: rows(7) },
				next: function (seed) { return rows(seed); }
			};
		}
	};
});
