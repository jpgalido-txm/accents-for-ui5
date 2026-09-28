/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Driver mix: a compact stacked bar showing how much each lever contributes to an option's result.
 * Each lever keeps one colour on every screen (Tokens.category). Pressing the bar opens a dialog with
 * the share view: every lever named, with its share and amount, so the colours never have to be decoded.
 * Small enough to sit in a table row (compact), or with a named key underneath when it stands alone.
 */
sap.ui.define([
	"sap/ui/core/Control",
	"sap/m/HBox",
	"sap/m/VBox",
	"sap/m/Text",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/ui/Device",
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Tokens",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/I18n",
	"accents/elements/optimisation/sampleOptions"
], function (Control, HBox, VBox, Text, Dialog, Button, Device, Part, Chart, Tokens, Format, Motion, I18n, sampleOptions) {
	"use strict";

	var t = I18n.use("accents.elements.optimisation.i18n.i18n");

	/**
	 * A custom control, because OpenUI5 has no micro chart: a row of proportional segments, one per
	 * lever, coloured from the theme's palette through Tokens.category. It is also used, with a single
	 * segment, as the colour key beside each lever's name. Pressable (click, Enter or Space) when asked.
	 */
	var MixBar = Control.extend("accents.elements.optimisation.MixBar", {
		metadata: {
			properties: {
				width: { type: "sap.ui.core.CSSSize", defaultValue: "100%" },
				height: { type: "sap.ui.core.CSSSize", defaultValue: "0.75rem" },
				label: { type: "string", defaultValue: "" },
				pressable: { type: "boolean", defaultValue: false }
			},
			events: { press: {} }
		},
		renderer: {
			apiVersion: 2,
			render: function (rm, c) {
				var parts = (c._parts || []).filter(function (p) { return p.value > 0; });
				rm.openStart("div", c).class("accMixBar")
					.style("display", "flex").style("gap", "1px").style("overflow", "hidden").style("border-radius", "0.125rem")
					.style("width", c.getWidth()).style("height", c.getHeight()).style("min-width", "0")
					.attr("role", c.getPressable() ? "button" : "img").attr("aria-label", c.getLabel());
				if (c.getPressable()) { rm.attr("tabindex", "0").style("cursor", "pointer"); }
				if (c.getTooltip_AsString()) { rm.attr("title", c.getTooltip_AsString()); }
				rm.openEnd();
				parts.forEach(function (p) {
					rm.openStart("div").style("flex", p.value + " 1 0").style("min-width", "2px")
						.style("background-color", Tokens.category(p.lever)).openEnd().close("div");
				});
				rm.close("div");
			}
		},
		init: function () {
			this._parts = [];
			this._stop = Tokens.onChange(this.invalidate.bind(this));
		},
		exit: function () { this._stop(); },
		setParts: function (parts) { this._parts = parts || []; this.invalidate(); return this; },
		// Stopping propagation keeps a press on the bar from also selecting the table row it sits in.
		ontap: function (e) { if (this.getPressable()) { e.stopPropagation(); this.firePress(); } },
		onsapselect: function (e) { if (this.getPressable()) { e.preventDefault(); e.stopPropagation(); this.firePress(); } }
	});

	function total(mix) { return mix.reduce(function (s, m) { return s + Math.max(0, m.value || 0); }, 0); }
	function describe(mix) {
		var sum = total(mix);
		return mix.map(function (m) { return t("driverMix.share", m.name, Format.percent(sum ? m.value / sum : null, 0)); }).join(", ");
	}

	/** The share view: one chart of each lever's share, largest first, with the amount beside it. */
	function openShare(mix, o) {
		var fmt = o.format || Format.short;
		var sum = total(mix);
		var rows = mix.slice().sort(function (a, b) { return b.value - a.value; });
		var chart = new Chart({ label: t("driverMix.chartLabel"), height: "12rem" });
		chart.setBuilder(function (data, k) {
			return k.base({
				tooltip: { trigger: "item", confine: true, formatter: function (p) {
					var r = data[p.dataIndex];
					return t("driverMix.chartTooltip", r.name, Format.percent(sum ? r.value / sum : null), fmt(r.value));
				} },
				grid: { left: 8, right: 96, top: 8, bottom: 8, containLabel: true },
				xAxis: k.axis("value", { max: 1, axisLabel: { show: false }, splitLine: { show: false } }),
				yAxis: k.axis("category", { inverse: true, data: data.map(function (r) { return r.name; }) }),
				series: [{
					type: "bar", barMaxWidth: 18,
					data: data.map(function (r) {
						return { value: sum ? r.value / sum : 0, itemStyle: { color: Tokens.category(r.lever), borderRadius: [0, 3, 3, 0] } };
					}),
					label: Object.assign(k.labels(data.length, function (p) {
						var r = data[p.dataIndex];
						return t("driverMix.barLabel", Format.percent(sum ? r.value / sum : null, 0), fmt(r.value));
					}), { position: "right" })
				}]
			});
		});
		chart.setData(rows);
		var dialog = new Dialog({
			title: t("driverMix.dialogTitle"),
			contentWidth: "28rem",
			stretch: Device.system.phone,
			content: [new VBox({ renderType: "Bare", items: [
				new Text({ text: o.title ? t("driverMix.introFor", o.title, fmt(sum)) : t("driverMix.intro", fmt(sum)) }).addStyleClass("sapUiSmallMarginBottom"),
				chart
			] })],
			endButton: new Button({ text: t("driverMix.close"), press: function () { dialog.close(); } }),
			afterClose: function () { dialog.destroy(); }
		}).addStyleClass("sapUiContentPadding");
		dialog.open();
		return dialog;
	}

	var DriverMix = {
		info: {
			controls: ["accents.elements.optimisation.MixBar (custom: OpenUI5 has no micro chart)", "sap.m.Dialog",
				"accents.core.Chart (Apache ECharts)"],
			motion: "The bar flashes once when its mix changes. The share view's bars grow when the dialog opens.",
			still: false
		},

		MixBar: MixBar,

		/**
		 * options:
		 *   compact  true for the bar alone (table rows); false adds a named key underneath
		 *   title    what the mix belongs to ("Option 3"), used in the share view
		 *   format   function (value) -> text for amounts; default Format.short
		 *   width    bar width (default "100%"; give a fixed width inside table cells that may pop in)
		 *   height   bar height (default "0.75rem")
		 *   data     [{ lever, name, value }] where lever is the fixed category key
		 */
		create: function (o) {
			o = o || {};
			var bar = new MixBar({ width: o.width || "100%", height: o.height || "0.75rem", pressable: true,
				press: function () { if (part.data()) { openShare(part.data(), o); } } });
			var pending = false;
			bar.addEventDelegate({ onAfterRendering: function () {
				if (pending) { pending = false; Motion.flash(bar, "none"); }
			} });
			var key = new HBox({ renderType: "Bare", wrap: "Wrap", visible: !o.compact }).addStyleClass("sapUiTinyMarginTop");
			var content = o.compact ? bar : new VBox({ renderType: "Bare", items: [bar, key] });

			var part = Part.make({
				key: "driver-mix",
				content: content,
				empty: t("driverMix.empty"),
				render: function (mix, prev) {
					var text = describe(mix);
					bar.setLabel(t("driverMix.label", text));
					bar.setTooltip(t("driverMix.tooltip", text));
					bar.setParts(mix);
					if (prev && describe(prev) !== text) { pending = true; }
					if (!o.compact) {
						key.destroyItems();
						var sum = total(mix);
						mix.forEach(function (m) {
							key.addItem(new HBox({ renderType: "Bare", alignItems: "Center", items: [
								new MixBar({ width: "0.625rem", height: "0.625rem", label: t("driverMix.swatch", m.name) }).setParts([{ lever: m.lever, value: 1 }]),
								new Text({ text: t("driverMix.share", m.name, Format.percent(sum ? m.value / sum : null, 0)) }).addStyleClass("accLabel sapUiTinyMarginBegin")
							] }).addStyleClass("sapUiSmallMarginEnd"));
						});
					}
					if (!total(mix)) { part.state("empty"); }
				}
			});
			part.openShare = function () { return part.data() ? openShare(part.data(), o) : null; };
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			/** The best option of a seeded demo run, with its contribution by lever. */
			function best(seed) { return sampleOptions.run(Data, seed).options[0]; }
			return {
				options: { title: t("driverMix.demo.title"), format: function (v) { return Format.money(v * 1000, "USD", true); }, data: best(7).mix },
				next: function (seed) { return best(seed).mix; }
			};
		}
	};
	return DriverMix;
});
