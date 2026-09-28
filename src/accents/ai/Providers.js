/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Where a model can run. Bring your own key is always offered. Six choices:
 *   off        nothing leaves the page
 *   platform   the AI service the app's own platform provides (the app registers a transport)
 *   anthropic  Anthropic Claude, called directly with the person's key
 *   openai     OpenAI, called directly with the person's key
 *   gemini     Google Gemini, called directly with the person's key
 *   local      a model the person runs on their machine or in their network (OpenAI-compatible address)
 *
 * Key rules: a key typed by a person lives in this module's memory for this page visit only. It is
 * never written to storage, never logged, never shown again, and only ever sent to its own provider.
 *
 * Browser-direct calls suit prototypes and personal use. For production, register a "platform"
 * transport that calls your own server, so keys never reach the browser.
 */
sap.ui.define(["accents/core/I18n"], function (I18n) {
	"use strict";

	var t = I18n.use("accents.i18n.i18n");

	var keys = {};            // provider id -> key, memory only
	var platformTransport = null;

	var LIST = [
		// Company and product names stay as they are in every language.
		{ id: "off", label: t("providers.off"),
			where: t("providers.off.where") },
		{ id: "platform", label: t("providers.platform"),
			where: t("providers.platform.where") },
		{ id: "anthropic", label: "Anthropic Claude", needsKey: true, model: "claude-sonnet-5",
			where: t("providers.anthropic.where") },
		{ id: "openai", label: "OpenAI", needsKey: true, model: "",
			where: t("providers.openai.where") },
		{ id: "gemini", label: "Google Gemini", needsKey: true, model: "",
			where: t("providers.gemini.where") },
		{ id: "local", label: t("providers.local"), needsEndpoint: true, model: "",
			where: t("providers.local.where") }
	];

	/** Checks a self-hosted address. Returns an error sentence, or null when it is acceptable. */
	function checkEndpoint(value) {
		var u;
		try { u = new URL(value); } catch (e) { return t("providers.address.full"); }
		if (u.username || u.password) { return t("providers.address.credentials"); }
		if (u.search || u.hash) { return t("providers.address.query"); }
		var loopback = u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]" || /\.localhost$/.test(u.hostname);
		if (u.protocol === "http:" && !loopback) { return t("providers.address.https"); }
		if (u.protocol !== "http:" && u.protocol !== "https:") { return t("providers.address.scheme"); }
		return null;
	}

	/** Reads a server-sent-events stream and calls onData with each parsed JSON payload. */
	function readSse(response, onData, signal) {
		var reader = response.body.getReader();
		var decoder = new TextDecoder();
		var buffer = "";
		function pump() {
			return reader.read().then(function (r) {
				if (r.done || (signal && signal.aborted)) { return; }
				buffer += decoder.decode(r.value, { stream: true });
				var lines = buffer.split("\n");
				buffer = lines.pop();
				lines.forEach(function (line) {
					if (line.indexOf("data:") !== 0) { return; }
					var payload = line.slice(5).trim();
					if (!payload || payload === "[DONE]") { return; }
					try { onData(JSON.parse(payload)); } catch (e) { /* ignore keep-alive lines */ }
				});
				return pump();
			});
		}
		return pump();
	}

	function failed(response, who) {
		var known = [400, 401, 403, 404, 429].indexOf(response.status) >= 0;
		var plain = t(known ? "providers.error." + response.status : "providers.error.other");
		return new Error(t("providers.error.detail", plain, who, response.status));
	}

	var send = {
		anthropic: function (req) {
			var text = "";
			return fetch("https://api.anthropic.com/v1/messages", {
				method: "POST",
				signal: req.signal,
				headers: {
					"content-type": "application/json",
					"x-api-key": req.key,
					"anthropic-version": "2023-06-01",
					"anthropic-dangerous-direct-browser-access": "true"
				},
				body: JSON.stringify({ model: req.model, max_tokens: 1024, system: req.system, messages: req.messages, stream: true })
			}).then(function (res) {
				if (!res.ok) { throw failed(res, "Anthropic"); }
				return readSse(res, function (evt) {
					if (evt.type === "content_block_delta" && evt.delta && evt.delta.type === "text_delta") {
						text += evt.delta.text;
						req.onToken(evt.delta.text);
					}
				}, req.signal);
			}).then(function () { return { text: text, streamed: true }; });
		},

		openaiCompatible: function (req, url, who) {
			var text = "";
			var headers = { "content-type": "application/json" };
			if (req.key) { headers.authorization = "Bearer " + req.key; }
			return fetch(url, {
				method: "POST",
				signal: req.signal,
				headers: headers,
				body: JSON.stringify({ model: req.model, stream: true,
					messages: [{ role: "system", content: req.system }].concat(req.messages) })
			}).then(function (res) {
				if (!res.ok) { throw failed(res, who); }
				return readSse(res, function (evt) {
					var d = evt.choices && evt.choices[0] && evt.choices[0].delta;
					if (d && d.content) { text += d.content; req.onToken(d.content); }
				}, req.signal);
			}).then(function () { return { text: text, streamed: true }; });
		},

		gemini: function (req) {
			var url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(req.model) + ":generateContent";
			return fetch(url, {
				method: "POST",
				signal: req.signal,
				headers: { "content-type": "application/json", "x-goog-api-key": req.key },
				body: JSON.stringify({
					systemInstruction: { parts: [{ text: req.system }] },
					contents: req.messages.map(function (m) {
						return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
					})
				})
			}).then(function (res) {
				if (!res.ok) { throw failed(res, "Google"); }
				return res.json();
			}).then(function (json) {
				var parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
				// Whole answer at once: the assistant reveals it at reading pace. The words are the model's.
				return { text: parts.map(function (p) { return p.text || ""; }).join(""), streamed: false };
			});
		}
	};

	var Providers = {
		list: function () {
			return LIST.filter(function (p) { return p.id !== "platform" || !!platformTransport; });
		},
		get: function (id) {
			return LIST.find(function (p) { return p.id === id; }) || LIST[0];
		},
		checkEndpoint: checkEndpoint,

		/**
		 * Registers the app's own AI service. transport(request) receives
		 * { system, messages, onToken, signal } and resolves to { text, streamed }.
		 */
		usePlatform: function (transport) { platformTransport = transport; },

		/** Keys: memory only. */
		setKey: function (id, key) { if (key) { keys[id] = key; } else { delete keys[id]; } },
		/** Where the key in use comes from: "none", "session" (typed this visit) or "not needed". */
		keyOrigin: function (id) {
			var p = Providers.get(id);
			if (!p.needsKey) { return "not needed"; }
			return keys[id] ? "session" : "none";
		},

		/** Whether a provider is ready to answer, and if not, the reason in one sentence. */
		ready: function (cfg) {
			var p = Providers.get(cfg.provider);
			if (p.id === "off") { return t("providers.ready.off"); }
			if (p.needsKey && !keys[p.id]) { return t("providers.ready.key", p.label); }
			if (p.needsEndpoint) {
				if (!cfg.endpoint) { return t("providers.ready.address"); }
				var err = checkEndpoint(cfg.endpoint);
				if (err) { return err; }
			}
			if (p.id !== "platform" && !cfg.model) { return t("providers.ready.model"); }
			return null;
		},

		/** Sends a conversation. req: { provider, model, endpoint, system, messages, onToken, signal }. */
		send: function (req) {
			var p = Providers.get(req.provider);
			var r = Object.assign({}, req, { key: keys[p.id] });
			switch (p.id) {
				case "anthropic": return send.anthropic(r);
				case "openai": return send.openaiCompatible(r, "https://api.openai.com/v1/chat/completions", "OpenAI");
				case "gemini": return send.gemini(r);
				case "local": return send.openaiCompatible(r, req.endpoint.replace(/\/+$/, "") + "/chat/completions", t("providers.yourModel"));
				case "platform": return platformTransport(r);
				default: return Promise.reject(new Error(t("providers.ready.off")));
			}
		}
	};
	return Providers;
});
