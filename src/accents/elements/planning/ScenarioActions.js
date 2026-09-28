/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Scenario actions: simulate, save and discard for one scenario, plus an optional live mode that
 * simulates on its own each time a setting is released. Each button is enabled only when it would do
 * something. Save says honestly where the scenario was kept. Discard asks first only when more than
 * one change would be lost.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/FlexBox",
	"sap/m/Button",
	"sap/m/Switch",
	"sap/m/Label",
	"sap/m/Text",
	"accents/elements/transactional/ConfirmAction",
	"sap/m/MessageToast",
	"accents/core/Part",
	"accents/core/Motion",
	"accents/core/I18n"
], function (VBox, FlexBox, Button, Switch, Label, Text, ConfirmAction, MessageToast, Part, Motion, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.planning.i18n.i18n");

	/** One sentence for n, from the key ending "One" when n is 1 and "Many" otherwise. */
	function plural(n, key) { return t(key + (n === 1 ? "One" : "Many"), n); }

	return {
		info: {
			controls: ["sap.m.Button", "sap.m.Switch", "ConfirmAction (sap.m.Dialog)", "sap.m.MessageToast"],
			motion: "The status line pulses once when the number of pending changes changes.",
			still: false
		},

		/**
		 * options:
		 *   data {
		 *     unsimulated: settings changed since the last simulation (number)
		 *     unsaved:     simulated changes not yet saved (number)
		 *     live:        true when live mode is on
		 *     readOnly:    true for a completed scenario: nothing can be simulated, saved or discarded
		 *     keptIn:      where Save keeps the scenario, said plainly
		 *                  (default "this browser session only; nothing is sent to any system")
		 *   }
		 *   onSimulate()          recompute the figures from the current settings
		 *   onSave()              keep the scenario; may return a sentence saying where it went
		 *   onDiscard()           return to the last saved state
		 *   onLive(on)            optional: live mode was switched; without it the switch is left out
		 *   onStatus(state)       optional: told { unsimulated, unsaved } after every action
		 *
		 * part.changed(n)   tell the actions that n settings changed (default 1); in live mode this
		 *                   simulates at once, which is what "recompute on release" calls.
		 */
		create: function (o) {
			var s = { unsimulated: 0, unsaved: 0, live: false, readOnly: false, keptIn: "" };
			var status = new Text({ text: "" }).addStyleClass("accLabel");
			var simulate = new Button({ text: t("scenarioActions.simulate"), icon: "sap-icon://play", type: "Emphasized" });
			var save = new Button({ text: t("scenarioActions.save"), icon: "sap-icon://save" });
			var discard = new Button({ text: t("scenarioActions.discard"), icon: "sap-icon://undo", type: "Transparent" });
			var liveLabel = new Label({ text: t("scenarioActions.live"), visible: !!o.onLive });
			var live = new Switch({ visible: !!o.onLive });
			liveLabel.setLabelFor(live);

			function tell() { if (o.onStatus) { o.onStatus({ unsimulated: s.unsimulated, unsaved: s.unsaved }); } }

			function doSimulate() {
				if (s.readOnly || s.unsimulated === 0) { return; }
				s.unsaved += s.unsimulated;
				s.unsimulated = 0;
				if (o.onSimulate) { o.onSimulate(); }
				draw(true);
				tell();
			}

			function doDiscard() {
				s.unsimulated = 0;
				s.unsaved = 0;
				if (o.onDiscard) { o.onDiscard(); }
				draw(true);
				tell();
				MessageToast.show(t("scenarioActions.discarded"));
			}

			simulate.attachPress(doSimulate);
			save.attachPress(function () {
				var where = o.onSave ? o.onSave() : null;
				s.unsaved = 0;
				draw(true);
				tell();
				MessageToast.show(t("scenarioActions.saved", typeof where === "string" && where ? where : s.keptIn));
			});
			discard.attachPress(function () {
				var lost = s.unsimulated + s.unsaved;
				if (lost <= 1) { doDiscard(); return; }
				// Rule 19: losing work goes through the shared confirmation, which names what is lost.
				ConfirmAction.ask({
					verb: t("scenarioActions.discard"),
					object: t("scenarioActions.confirm.object"),
					consequence: plural(lost, "scenarioActions.confirm.text"),
					danger: true
				}).then(function (yes) { if (yes) { doDiscard(); } });
			});
			live.attachChange(function (e) {
				s.live = e.getParameter("state");
				if (o.onLive) { o.onLive(s.live); }
				if (s.live) { doSimulate(); }
				draw(false);
			});

			function statusText() {
				if (s.readOnly) { return t("scenarioActions.readOnly"); }
				var bits = [];
				if (s.unsimulated) { bits.push(plural(s.unsimulated, "scenarioActions.unsimulated")); }
				if (s.unsaved) { bits.push(plural(s.unsaved, "scenarioActions.unsaved")); }
				return bits.length ? bits.join(" · ") : t("scenarioActions.allDone");
			}

			function draw(changed) {
				var ro = s.readOnly;
				live.setState(s.live);
				live.setEnabled(!ro);
				simulate.setEnabled(!ro && !s.live && s.unsimulated > 0);
				simulate.setTooltip(ro ? t("scenarioActions.simulate.readOnly")
					: s.live ? t("scenarioActions.simulate.live")
						: s.unsimulated ? t("scenarioActions.simulate.ready") : t("scenarioActions.simulate.nothing"));
				save.setEnabled(!ro && s.unsaved > 0 && s.unsimulated === 0);
				save.setTooltip(ro ? t("scenarioActions.save.readOnly")
					: s.unsimulated ? t("scenarioActions.save.simulateFirst")
						: s.unsaved ? t("scenarioActions.save.ready", s.keptIn) : t("scenarioActions.save.nothing"));
				discard.setEnabled(!ro && s.unsimulated + s.unsaved > 0);
				discard.setTooltip(ro ? t("scenarioActions.discard.readOnly") : t("scenarioActions.discard.ready"));
				var text = statusText();
				var was = status.getText();
				status.setText(text);
				if (changed && was && was !== text) { setTimeout(function () { Motion.pulse(status); }, 0); }
			}

			var content = new VBox({ renderType: "Bare", items: [
				new FlexBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [
					simulate.addStyleClass("sapUiTinyMarginEnd"), save.addStyleClass("sapUiTinyMarginEnd"), discard.addStyleClass("sapUiSmallMarginEnd"),
					liveLabel.addStyleClass("sapUiTinyMarginEnd"), live
				] }),
				status.addStyleClass("sapUiTinyMarginTop")
			] });

			var part = Part.make({
				key: "scenario-actions",
				content: content,
				empty: t("scenarioActions.empty"),
				render: function (d, prev) {
					s.unsimulated = d.unsimulated || 0;
					s.unsaved = d.unsaved || 0;
					s.live = !!d.live && !!o.onLive;
					s.readOnly = !!d.readOnly;
					s.keptIn = d.keptIn || t("scenarioActions.keptIn");
					draw(!!prev);
				}
			});
			part.changed = function (n) {
				if (s.readOnly) { return part; }
				s.unsimulated += n || 1;
				if (s.live) { doSimulate(); } else { draw(true); tell(); }
				return part;
			};
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function make(seed) {
				var r = Data.rng(seed);
				return { unsimulated: 1 + Math.floor(r() * 3), unsaved: Math.floor(r() * 4), live: false };
			}
			return {
				options: {
					data: make(7),
					onSimulate: function () {},
					onSave: function () { return t("scenarioActions.keptIn"); },
					onDiscard: function () {},
					onLive: function () {}
				},
				next: function (seed) { return make(seed); }
			};
		}
	};
});
