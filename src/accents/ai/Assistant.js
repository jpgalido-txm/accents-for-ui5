/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * The assistant. Present in every app, off until someone chooses where a model runs.
 *
 * Two ways in, one conversation:
 *  - the header button asks about the page the person is on;
 *  - an object button (objectButton) on a thing a person acts on — a row, an alert, an option, a case —
 *    opens the same conversation already about that object, with a starter question filled in.
 * Never put an object button on a chart, a KPI figure, a legend, a column header, a count or a title.
 * If you cannot say what the button would ask, it does not belong there.
 *
 * Model output sits on the AI surface and, once complete, carries a label saying a model wrote it.
 * Nothing the model writes is final or sent anywhere without a person acting on it.
 */
sap.ui.define([
	"sap/ui/Device",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Text",
	"sap/m/Title",
	"sap/m/Label",
	"sap/m/Link",
	"sap/m/Input",
	"sap/m/Select",
	"sap/m/TextArea",
	"sap/m/BusyIndicator",
	"sap/m/MessageStrip",
	"sap/m/ScrollContainer",
	"sap/m/IllustratedMessage",
	"sap/ui/core/Item",
	"sap/m/FlexItemData",
	"accents/ai/Providers",
	"accents/brand",
	"accents/core/I18n"
], function (Device, Dialog, Button, VBox, HBox, Text, Title, Label, Link, Input, Select, TextArea, BusyIndicator,
	MessageStrip, ScrollContainer, IllustratedMessage, Item, FlexItemData, Providers, brand, I18n) {
	"use strict";

	var t = I18n.use("accents.i18n.i18n");

	var STORE = "accents.ai";

	function loadConfig() {
		var c = null;
		try { c = JSON.parse(window.localStorage.getItem(STORE)); } catch (e) { c = null; }
		c = c || {};
		return { provider: Providers.get(c.provider).id, models: c.models || {}, endpoint: c.endpoint || "" };
	}
	function saveConfig(c) {
		// Preferences only. Keys are never part of this object.
		try { window.localStorage.setItem(STORE, JSON.stringify({ provider: c.provider, models: c.models, endpoint: c.endpoint })); } catch (e) { /* ignore */ }
	}

	function factsText(facts) {
		if (!facts) { return ""; }
		return Object.keys(facts).map(function (k) { return "- " + k + ": " + facts[k]; }).join("\n");
	}

	/**
	 * Assistant.create({ app, pageContext })
	 *   app          the app's name, used in the model's instructions
	 *   pageContext  function returning { title, facts } for the page the person is on
	 *   onSettings   function that opens the app's settings (the shell provides it)
	 */
	function create(o) {
		var cfg = loadConfig();
		var acknowledged = false;
		var messages = [];
		var about = null;          // { title, facts } of the current conversation
		var dialog = null, body = null, chat = null, scroller = null, input = null, sendBtn = null, chip = null, backLink = null;
		var abort = null;
		var stick = true;
		var listeners = [];

		function provider() { return Providers.get(cfg.provider); }
		function model() { return cfg.models[cfg.provider] !== undefined ? cfg.models[cfg.provider] : (provider().model || ""); }
		function readiness() { return Providers.ready({ provider: cfg.provider, endpoint: cfg.endpoint, model: model() }); }
		function changed() { saveConfig(cfg); listeners.forEach(function (f) { f(); }); if (dialog && dialog.isOpen()) { show(); } }

		function system() {
			return "You are the assistant inside the app \"" + (o.app || brand.name) + "\". " +
				"The person is looking at: " + (about ? about.title : "the current page") + ".\n" +
				(about && about.facts ? "Facts from the app:\n" + factsText(about.facts) + "\n" : "") +
				"Answer in plain, short sentences. Use only the facts given or general knowledge, and say so when you do not know. " +
				"Never invent figures. Never claim you changed anything in the system; you cannot.";
		}

		function scrollDown() {
			var el = scroller && scroller.getDomRef();
			if (el && stick) { el.scrollTop = el.scrollHeight; }
		}

		function modelTurn() {
			var thinking = new BusyIndicator({ text: t("assistant.thinking"), size: "1rem" });
			var answer = new Text({ text: "", renderWhitespace: true, visible: false });
			var box = new VBox({ items: [thinking, answer], renderType: "Bare" }).addStyleClass("accAi accTurnModel");
			chat.addItem(box);
			return {
				box: box,
				add: function (piece) {
					if (thinking.getVisible()) { thinking.setVisible(false); answer.setVisible(true); }
					answer.setText(answer.getText() + piece);
					setTimeout(scrollDown, 0);
				},
				done: function () {
					thinking.setVisible(false);
					answer.setVisible(true);
					box.addItem(new Text({ text: model() ? t("assistant.writtenByModel", provider().label, model())
						: t("assistant.writtenBy", provider().label) }).addStyleClass("accAiLabel sapUiTinyMarginTop"));
					setTimeout(scrollDown, 0);
				},
				fail: function (err) {
					thinking.setVisible(false);
					box.removeStyleClass("accAi");
					box.addItem(new MessageStrip({ type: "Error", showIcon: true, text: err.message }));
				}
			};
		}

		/** Reveals a whole answer at reading pace when the provider does not stream. */
		function reveal(turn, text, signal) {
			var words = text.split(/(\s+)/);
			return new Promise(function (resolve) {
				var i = 0;
				(function next() {
					if (signal.aborted || i >= words.length) { resolve(); return; }
					turn.add(words.slice(i, i + 6).join(""));
					i += 6;
					setTimeout(next, 60);
				})();
			});
		}

		function busy(on) {
			sendBtn.setText(on ? t("assistant.stop") : t("assistant.send"));
			sendBtn.setType(on ? "Default" : "Emphasized");
			input.setEnabled(!on);
		}

		function submit() {
			if (abort) { abort.abort(); return; }
			var q = input.getValue().trim();
			if (!q) { return; }
			input.setValue("");
			chat.addItem(new Text({ text: q, renderWhitespace: true }).addStyleClass("accTurnUser"));
			messages.push({ role: "user", content: q });
			stick = true;
			var turn = modelTurn();
			var controller = new AbortController();
			abort = controller;
			busy(true);
			var collected = "";
			Providers.send({
				provider: cfg.provider, model: model(), endpoint: cfg.endpoint, system: system(), messages: messages.slice(),
				signal: controller.signal, onToken: function (piece) { collected += piece; turn.add(piece); }
			}).then(function (res) {
				if (!res.streamed) { collected = res.text; return reveal(turn, res.text, controller.signal); }
			}).then(function () {
				messages.push({ role: "assistant", content: collected });
				turn.done();
			}, function (err) {
				if (err.name === "AbortError") { turn.done(); messages.push({ role: "assistant", content: collected }); return; }
				turn.fail(err);
				messages.pop();
			}).then(function () { abort = null; busy(false); });
		}

		function setChip() {
			if (!chip) { return; }
			chip.setText(t("assistant.askingAbout", about ? about.title : t("assistant.thisPage")));
			backLink.setVisible(!!(about && about.object));
		}

		function newConversation() {
			if (abort) { abort.abort(); }
			messages = [];
			if (chat) { chat.destroyItems(); }
		}

		function chatView() {
			if (!chat) {
				chat = new VBox({ renderType: "Bare" }).addStyleClass("accChat");
				scroller = new ScrollContainer({ vertical: true, horizontal: false, height: "100%", content: [chat] });
				scroller.addEventDelegate({ onAfterRendering: function () {
					var el = scroller.getDomRef();
					el.addEventListener("scroll", function () { stick = el.scrollTop + el.clientHeight >= el.scrollHeight - 24; });
				} });
				input = new TextArea({ rows: 2, growing: true, growingMaxLines: 6, width: "100%", maxLength: 4000,
					placeholder: t("assistant.placeholder") });
				input.addEventDelegate({ onsapenter: function (e) { if (!e.shiftKey) { e.preventDefault(); submit(); } } });
				sendBtn = new Button({ text: t("assistant.send"), type: "Emphasized", press: submit });
				chip = new Text().addStyleClass("accAboutChip");
				backLink = new Link({ text: t("assistant.backToPage"), press: function () { about = pageAbout(); setChip(); } });
				var dock = new VBox({ renderType: "Bare", items: [
					new HBox({ items: [chip, backLink], justifyContent: "SpaceBetween", wrap: "Wrap" }),
					new HBox({ items: [input, sendBtn], alignItems: "End", renderType: "Bare" }).addStyleClass("sapUiTinyMarginTop")
				] }).addStyleClass("accChatDock");
				input.setLayoutData(new FlexItemData({ growFactor: 1 }));
				sendBtn.addStyleClass("sapUiTinyMarginBegin");
				chat._view = new VBox({ items: [scroller, dock], height: "100%", renderType: "Bare",
					justifyContent: "SpaceBetween" });
				scroller.setLayoutData(new FlexItemData({ growFactor: 1, baseSize: "0" }));
			}
			setChip();
			return chat._view;
		}

		function offView() {
			var reason = readiness();
			return new VBox({ renderType: "Bare", items: [
				new IllustratedMessage({ illustrationType: "sapIllus-NoActivities", illustrationSize: "Spot",
					title: cfg.provider === "off" ? t("assistant.off.title") : t("assistant.notReady.title"),
					description: cfg.provider === "off" ? t("assistant.off.description") : reason,
					enableDefaultTitleAndDescription: false,
					additionalContent: [new Button({ text: t("assistant.openSettings"), type: "Emphasized",
						press: function () { dialog.close(); if (o.onSettings) { o.onSettings(); } } })] })
			] }).addStyleClass("accPopPad");
		}

		function ackView() {
			var p = provider();
			return new VBox({ renderType: "Bare", alignItems: "Start", items: [
				new Title({ text: t("assistant.ack.title"), level: "H3" }),
				new Text({ text: t("assistant.ack.explains") }).addStyleClass("sapUiSmallMarginTop"),
				new Text({ text: t("assistant.ack.cannotChange") }).addStyleClass("sapUiSmallMarginTop"),
				new Text({ text: p.where }).addStyleClass("sapUiSmallMarginTop"),
				new Text({ text: t("assistant.ack.canBeWrong") }).addStyleClass("sapUiSmallMarginTop"),
				new Button({ text: t("assistant.ack.understand"), type: "Emphasized", press: function () { acknowledged = true; show(); } }).addStyleClass("sapUiMediumMarginTop")
			] }).addStyleClass("accPopPad");
		}

		function show() {
			var view = readiness() ? offView() : (!acknowledged ? ackView() : chatView());
			if (body.getItems()[0] !== view) {
				body.removeAllItems().forEach(function (c) { if (c !== (chat && chat._view)) { c.destroy(); } });
				body.addItem(view);
			}
			var inChat = view === (chat && chat._view);
			// "New conversation" only when there is a conversation to start over.
			dialog.getBeginButton().setVisible(inChat);
			if (inChat) { setTimeout(function () { input.focus(); }, 50); }
		}

		function ensureDialog() {
			if (dialog) { return; }
			body = new VBox({ renderType: "Bare", height: "100%" });
			dialog = new Dialog({
				title: t("assistant.title"),
				contentWidth: "30rem",
				contentHeight: "36rem",
				resizable: true,
				draggable: true,
				stretch: Device.system.phone,
				verticalScrolling: false,
				horizontalScrolling: false,
				content: [body],
				beginButton: new Button({ text: t("assistant.newConversation"), press: function () { newConversation(); about = pageAbout(); setChip(); } }),
				endButton: new Button({ text: t("assistant.close"), press: function () { dialog.close(); } })
			});
		}

		function pageAbout() {
			var c = o.pageContext ? o.pageContext() : null;
			return c ? { title: c.title, facts: c.facts, object: false } : null;
		}

		var api = {
			/** Opens the assistant about the current page. */
			open: function () {
				ensureDialog();
				if (!about || about.object) { about = pageAbout(); }
				show();
				dialog.open();
			},
			/** Opens the same conversation about one object. o: { title, facts, question }. */
			askAbout: function (obj) {
				ensureDialog();
				if (!about || about.title !== obj.title) { newConversation(); }
				about = { title: obj.title, facts: obj.facts, object: true };
				show();
				dialog.open();
				if (input && obj.question) { input.setValue(obj.question); }
			},
			/** The header button. */
			headerButton: function () {
				return new Button({ icon: "sap-icon://ai", type: "Transparent", tooltip: t("assistant.button"),
					press: api.open }).addStyleClass("accAiButton");
			},
			/** A per-object button. obj: { title, facts, question }; question is the starter question. */
			objectButton: function (obj) {
				return new Button({ icon: "sap-icon://ai", type: "Transparent",
					tooltip: t("assistant.askAbout", obj.title),
					press: function () { api.askAbout(typeof obj.get === "function" ? obj.get() : obj); } }).addStyleClass("accAiButton");
			},
			/** The model section of the settings dialog. */
			settingsContent: function () {
				var where = new Text();
				var status = new Text().addStyleClass("sapUiTinyMarginTop");
				var select = new Select({ width: "100%", selectedKey: cfg.provider,
					items: Providers.list().map(function (p) { return new Item({ key: p.id, text: p.label }); }),
					change: function (e) { cfg.provider = e.getParameter("selectedItem").getKey(); refresh(); changed(); } });
				var keyInput = new Input({ type: "Password", width: "100%", value: "",
					change: function () { Providers.setKey(cfg.provider, keyInput.getValue().trim()); keyInput.setValue(""); refresh(); changed(); } });
				var forget = new Button({ text: t("assistant.forgetKey"), type: "Transparent",
					press: function () { Providers.setKey(cfg.provider, ""); refresh(); changed(); } });
				var modelInput = new Input({ width: "100%", change: function () { cfg.models[cfg.provider] = modelInput.getValue().trim(); refresh(); changed(); } });
				var endpoint = new Input({ width: "100%", value: cfg.endpoint, placeholder: "http://localhost:11434/v1",
					change: function () {
						var v = endpoint.getValue().trim();
						var err = v ? Providers.checkEndpoint(v) : null;
						endpoint.setValueState(err ? "Error" : "None");
						endpoint.setValueStateText(err || "");
						if (!err) { cfg.endpoint = v; }
						refresh(); changed();
					} });
				var keyBox = new VBox({ items: [new Label({ text: t("assistant.key"), labelFor: keyInput }), keyInput, forget] }).addStyleClass("sapUiSmallMarginTop");
				var modelBox = new VBox({ items: [new Label({ text: t("assistant.model"), labelFor: modelInput }), modelInput] }).addStyleClass("sapUiSmallMarginTop");
				var endBox = new VBox({ items: [new Label({ text: t("assistant.address"), labelFor: endpoint }), endpoint] }).addStyleClass("sapUiSmallMarginTop");
				function refresh() {
					var p = provider();
					where.setText(p.where);
					keyBox.setVisible(!!p.needsKey);
					var origin = Providers.keyOrigin(p.id);
					keyInput.setPlaceholder(origin === "session" ? t("assistant.keySet") : t("assistant.keyPaste"));
					forget.setVisible(origin === "session");
					modelBox.setVisible(p.id !== "off" && p.id !== "platform");
					modelInput.setValue(model());
					endBox.setVisible(!!p.needsEndpoint);
					var reason = readiness();
					status.setText(p.id === "off" ? "" : reason ? t("assistant.notReady", reason) : t("assistant.ready"));
				}
				refresh();
				return new VBox({ renderType: "Bare", items: [
					new Label({ text: t("assistant.where"), labelFor: select }), select,
					where.addStyleClass("sapUiTinyMarginTop"), keyBox, modelBox, endBox, status
				] });
			},
			/** Called when settings change (the shell uses it to keep the header honest). */
			onChange: function (fn) { listeners.push(fn); },
			isOn: function () { return !readiness(); },
			providerLabel: function () { return provider().label; }
		};
		return api;
	}

	return { create: create };
});
