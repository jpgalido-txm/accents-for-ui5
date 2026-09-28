/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * The data adapter for OData V4 services, which is what SAP S/4HANA, SAP BTP and CAP services speak.
 * Elements take plain data, so this module turns service rows into plain rows, keeps track of whether
 * data is live, and lets the server's own messages reach the Messages list (the V4 model does that).
 *
 *   var people = OData.source({
 *     service: "https://example.com/odata/v4/orders/",
 *     path: "/Orders", select: ["ID", "customer", "amount"], orderby: "amount desc", top: 50,
 *     shape: function (row) { return { name: row.customer, value: row.amount }; },
 *     sample: function () { return Data.sample(7).items.map(...); }
 *   });
 *   people.load().then(function (r) { part.update(r.data); sourceLine.update(r.meta); });
 *
 * Writing goes through the model: bind controls to it, then OData.save(model) or OData.discard(model).
 */
sap.ui.define([
	"sap/ui/model/odata/v4/ODataModel",
	"accents/core/Data",
	"accents/core/Messages",
	"accents/core/I18n"
], function (ODataModel, Data, Messages, I18n) {
	"use strict";

	var t = I18n.use("accents.i18n.i18n");

	var models = {};
	var CHANGES = "accChanges";

	function plain(error) {
		// The service's own message when it sent one; otherwise a sentence without technical detail.
		var status = error && error.status;
		if (status === 401 || status === 403) { return t("odata.noAccess"); }
		if (status === 404) { return t("odata.notFound"); }
		if (error && error.error && error.error.message) { return error.error.message; }
		return t("odata.noAnswer");
	}

	var OData = {
		/** One shared model per service address. Changes wait in one group until OData.save. */
		model: function (service, options) {
			if (!models[service]) {
				models[service] = new ODataModel(Object.assign({
					serviceUrl: service,
					autoExpandSelect: true,
					operationMode: "Server",
					groupId: "$auto",
					updateGroupId: CHANGES
				}, options || {}));
			}
			return models[service];
		},

		/**
		 * Reads a list once and resolves to { data, meta }. o: { service, path, select, expand, filter,
		 * orderby, top, shape }. shape turns one service row into the element's plain row.
		 */
		list: function (o) {
			var params = {};
			if (o.select) { params.$select = [].concat(o.select).join(","); }
			if (o.expand) { params.$expand = o.expand; }
			if (o.filter) { params.$filter = o.filter; }
			if (o.orderby) { params.$orderby = o.orderby; }
			if (o.count) { params.$count = true; }
			var binding = OData.model(o.service).bindList(o.path, null, [], [], params);
			return binding.requestContexts(0, o.top || 100).then(function (contexts) {
				var rows = contexts.map(function (c) { return c.getObject(); });
				return {
					data: o.shape ? rows.map(o.shape) : rows,
					meta: { mode: "live", source: o.label || (o.service.replace(/\/$/, "") + o.path), readAt: new Date(),
						total: o.count ? binding.getCount() : undefined }
				};
			}, function (err) {
				Messages.dropTechnical();
				Messages.add({ type: "Error", text: plain(err), group: o.label || o.path });
				throw err;
			});
		},

		/** A Data.source over a service: live by default, sample data only when asked for (?data=sample). */
		source: function (o) {
			return Data.source({ live: function () { return OData.list(o); }, sample: o.sample, sampleMeta: o.sampleMeta });
		},

		/** Whether a model holds changes nobody has saved yet. */
		pending: function (model) { return model.hasPendingChanges(CHANGES); },

		/**
		 * Sends every waiting change in one request. Resolves true when all were accepted. The server's
		 * messages for rejected changes are already in the Messages list, next to their fields.
		 */
		save: function (model) {
			return model.submitBatch(CHANGES).then(function () {
				var ok = !model.hasPendingChanges(CHANGES);
				if (ok) { Messages.add({ type: "Success", text: t("odata.saved") }); }
				return ok;
			}, function (err) {
				Messages.dropTechnical();
				Messages.add({ type: "Error", text: plain(err) });
				return false;
			});
		},

		/** Throws away every waiting change. */
		discard: function (model) { model.resetChanges(CHANGES); },

		CHANGES: CHANGES
	};
	return OData;
});
