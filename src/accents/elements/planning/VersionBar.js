/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Version bar: sits at the top of a planning page and answers "whose figures am I looking at?".
 * It names the base version and what it is made of, holds the open scenarios as tokens (the base
 * token cannot be removed), makes a new scenario as a copy of the base, and, while changes are not
 * simulated or not saved, shows a marker next to the version name and a warning strip underneath.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/FlexBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Label",
	"sap/m/Button",
	"sap/m/Tokenizer",
	"sap/m/Token",
	"sap/m/ObjectStatus",
	"sap/m/MessageStrip",
	"accents/core/Part",
	"accents/core/Motion",
	"accents/core/Format",
	"accents/core/I18n"
], function (VBox, HBox, FlexBox, Title, Text, Label, Button, Tokenizer, Token, ObjectStatus, MessageStrip, Part, Motion, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.planning.i18n.i18n");

	/** One sentence for n, from the key ending "One" when n is 1 and "Many" otherwise. */
	function plural(n, key) { return t(key + (n === 1 ? "One" : "Many"), n); }

	/** The warning sentence while work is pending, or "" when nothing is pending. */
	function pendingSentence(d) {
		var bits = [];
		if (d.unsimulated > 0) { bits.push(plural(d.unsimulated, "versionBar.unsimulated")); }
		if (d.unsaved > 0) { bits.push(plural(d.unsaved, "versionBar.unsaved")); }
		if (!bits.length) { return ""; }
		return t("versionBar.pending", bits.length === 2 ? t("versionBar.both", bits[0], bits[1]) : bits[0]);
	}

	return {
		info: {
			controls: ["sap.m.Tokenizer", "sap.m.Token", "sap.m.ObjectStatus", "sap.m.MessageStrip", "sap.m.Button"],
			motion: "The pending marker pulses once when the number of pending changes changes. Nothing else moves.",
			still: false
		},

		/**
		 * options:
		 *   data  {
		 *     base:        { key, name, description }   the version everything compares to
		 *     scenarios:   [{ key, name }]               open scenarios, each a copy of the base
		 *     active:      key of the version whose figures are on screen (default: base)
		 *     unsimulated: settings changed since the last simulation (number)
		 *     unsaved:     simulated changes not yet saved (number)
		 *     readOnly:    true for a completed version; no new scenarios, no removal
		 *   }
		 *   onSelect(key)             optional: a token was chosen as the version on screen
		 *   onCreate(scenario, all)   optional: a new scenario was made (the bar adds it itself)
		 *   onRemove(key, all)        optional: a scenario was closed (the bar removes it itself)
		 */
		create: function (o) {
			var current = null;
			var name = new Title({ text: "", level: "H2", titleStyle: "H5", wrapping: true });
			var made = new Text({ text: "" }).addStyleClass("accLabel");
			var marker = new ObjectStatus({ text: "", state: "Warning", icon: "sap-icon://edit", visible: false }).addStyleClass("sapUiSmallMarginBegin");
			// Tokens wrap onto more lines rather than running past a narrow screen.
			var tokens = new Tokenizer({ renderMode: "Loose", multiLine: true, maxWidth: "100%" });
			var add = new Button({ text: t("versionBar.newScenario"), icon: "sap-icon://copy", type: "Transparent" });
			var strip = new MessageStrip({ type: "Warning", showIcon: true, text: "", visible: false }).addStyleClass("sapUiTinyMarginTop");

			function all() { return current ? [current.base].concat(current.scenarios) : []; }
			function nameOf(key) {
				var v = all().find(function (x) { return x.key === key; });
				return v ? v.name : key;
			}

			function select(key) {
				if (!current || current.active === key) { draw(); return; }
				current.active = key;
				draw();
				if (o.onSelect) { o.onSelect(key); }
			}

			tokens.attachTokenDelete(function (e) {
				(e.getParameter("tokens") || []).forEach(function (tok) {
					var key = tok.getKey();
					if (!current || key === current.base.key) { return; }
					current.scenarios = current.scenarios.filter(function (s) { return s.key !== key; });
					if (current.active === key) { current.active = current.base.key; }
					if (o.onRemove) { o.onRemove(key, current.scenarios.slice()); }
				});
				draw();
			});

			add.attachPress(function () {
				if (!current) { return; }
				var n = current.scenarios.length + 1;
				var used = all().map(function (v) { return v.key; });
				while (used.indexOf("S" + n) >= 0) { n += 1; }
				var s = { key: "S" + n, name: t("versionBar.scenarioName", n) };
				current.scenarios.push(s);
				current.active = s.key;
				draw();
				if (o.onCreate) { o.onCreate(s, current.scenarios.slice()); }
				if (o.onSelect) { o.onSelect(s.key); }
			});

			function draw() {
				var d = current;
				var active = d.active || d.base.key;
				name.setText(active === d.base.key ? d.base.name : t("versionBar.against", nameOf(active), d.base.name));
				made.setText(d.base.description ? t("versionBar.madeOf", d.base.description) : "");
				made.setVisible(!!d.base.description);

				tokens.destroyTokens();
				all().forEach(function (v) {
					var isBase = v.key === d.base.key;
					var token = new Token({ key: v.key, text: isBase ? t("versionBar.baseToken", v.name) : v.name, selected: v.key === active,
						editable: !isBase && !d.readOnly });
					token.setTooltip(isBase ? t("versionBar.base.tooltip") : t("versionBar.scenario.tooltip"));
					token.attachSelect(function () { select(v.key); });
					token.attachDeselect(function () { if (v.key === active) { setTimeout(draw, 0); } });
					tokens.addToken(token);
				});

				add.setEnabled(!d.readOnly);
				add.setTooltip(d.readOnly ? t("versionBar.add.readOnly") : t("versionBar.add.ready"));

				var pending = (d.unsimulated || 0) + (d.unsaved || 0);
				var before = marker.getVisible() ? marker.data("n") : 0;
				marker.data("n", pending);
				marker.setText(t(d.unsimulated > 0 ? "versionBar.notSimulated" : "versionBar.unsaved", pending));
				marker.setVisible(pending > 0);
				strip.setText(pendingSentence(d));
				strip.setVisible(pending > 0);
				if (pending > 0 && before !== pending) {
					setTimeout(function () { Motion.pulse(marker); }, 0);
				}
			}

			var content = new VBox({ renderType: "Bare", items: [
				new HBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [name, marker] }),
				made,
				new FlexBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [
					new Label({ text: t("versionBar.openVersions"), showColon: true }).addStyleClass("sapUiTinyMarginEnd"), tokens, add
				] }).addStyleClass("sapUiTinyMarginTop"),
				strip
			] });

			var part = Part.make({
				key: "version-bar",
				content: content,
				empty: t("versionBar.empty"),
				render: function (d) {
					current = {
						base: d.base,
						scenarios: (d.scenarios || []).map(function (s) { return Object.assign({}, s); }),
						active: d.active || d.base.key,
						unsimulated: d.unsimulated || 0,
						unsaved: d.unsaved || 0,
						readOnly: !!d.readOnly
					};
					draw();
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function make(seed) {
				var r = Data.rng(seed);
				return {
					base: { key: "BASE", name: t("versionBar.demo.base"), description: t("versionBar.demo.description", Format.period(Data.SAMPLE_TODAY)) },
					scenarios: [{ key: "S1", name: t("versionBar.demo.priceUp") }, { key: "S2", name: t("versionBar.demo.promotion") }],
					active: "S1",
					unsimulated: 1 + Math.floor(r() * 3),
					unsaved: 2 + Math.floor(r() * 4)
				};
			}
			return { options: { data: make(7) }, next: function (seed) { return make(seed); } };
		}
	};
});
