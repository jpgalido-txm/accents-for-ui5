/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Attachment list: the files attached to one object. Add, open, rename and remove, with the allowed
 * file types and size stated in words above the list, so nobody learns the rules by being refused.
 * A file that breaks a rule is not added, and the message says which rule and what to do. Removing
 * asks first, through the confirm action, because a removed file cannot be brought back.
 *
 * With local: true (the demo), files stay in this browser only and are gone after a reload; the list
 * says so. An app with a file service passes its own onAdd and onRemove instead.
 *
 * Built on sap.m.upload.UploadSet, which OpenUI5 marks as deprecated since 1.129 in favour of the
 * sap.m.plugins.UploadSetwithTable plugin. It still ships and works in 1.148; moving to the plugin
 * is a later change, and the options above stay the same when it happens.
 */
sap.ui.define([
	"sap/m/upload/UploadSet",
	"sap/m/upload/UploadSetItem",
	"sap/m/ObjectAttribute",
	"sap/m/Text",
	"sap/m/VBox",
	"accents/core/Part",
	"accents/core/Messages",
	"accents/core/Format",
	"accents/core/I18n",
	"accents/elements/transactional/ConfirmAction"
], function (UploadSet, UploadSetItem, ObjectAttribute, Text, VBox, Part, Messages, Format, I18n, ConfirmAction) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");

	function extension(name) { var m = /\.([^.]+)$/.exec(name || ""); return m ? m[1].toLowerCase() : ""; }
	function size(bytes) {
		if (bytes === null || bytes === undefined) { return Format.DASH; }
		return bytes < 1024 * 1024 ? t("attachments.sizeKb", Format.number(Math.max(1, bytes / 1024))) : t("attachments.sizeMb", Format.number(bytes / 1024 / 1024, 1));
	}

	function create(o) {
		var types = (o.types || ["pdf", "png", "jpg", "txt"]).map(function (x) { return x.toLowerCase(); });
		var maxMb = o.maxMb || 5;
		var group = o.group || t("attachments.group");
		var urls = [];

		var limits = new Text({ text: "" }).addStyleClass("accLabel sapUiTinyMarginBottom");
		var set = new UploadSet({
			instantUpload: false,
			showIcons: true,
			terminationEnabled: false,
			uploadEnabled: o.editable !== false,
			fileTypes: types,
			maxFileSize: maxMb,
			beforeItemAdded: function (e) {
				var item = e.getParameter("item");
				var file = item.getFileObject();
				var name = item.getFileName();
				var problem = types.indexOf(extension(name)) < 0 ? t("attachments.wrongType", name, list())
					: file && file.size > maxMb * 1024 * 1024 ? t("attachments.tooBig", name, Format.number(maxMb)) : null;
				if (problem) {
					e.preventDefault();
					Messages.add({ type: "Warning", text: problem, group: group });
				}
			},
			afterItemAdded: function (e) {
				// Keep the file in the browser: no upload, the item is complete at once.
				// The waiting item is swapped for a finished one after UploadSet has finished its own handling.
				var item = e.getParameter("item");
				var file = item.getFileObject();
				var name = item.getFileName();
				setTimeout(function () {
					set.removeIncompleteItem(item);
					item.destroy();
					set.insertItem(decorate(new UploadSetItem(), { name: name, type: file && file.type, size: file && file.size, added: new Date(),
						url: file ? keep(file) : null }), 0);
					changed();
				}, 0);
			},
			afterItemEdited: function () { changed(); },
			beforeItemRemoved: function (e) {
				e.preventDefault();
				var item = e.getParameter("item");
				ConfirmAction.ask({ verb: t("attachments.remove"), object: t("attachments.removeObject", item.getFileName()),
					consequence: o.local ? t("attachments.removeLocal") : t("attachments.removeServer"), danger: true }).then(function (yes) {
					if (!yes) { return; }
					set.removeItem(item);
					if (item.getUrl() && item.getUrl().indexOf("blob:") === 0) { URL.revokeObjectURL(item.getUrl()); }
					item.destroy();
					changed();
				});
			}
		});

		function list() { return types.map(function (x) { return x.toUpperCase(); }).join(", "); }
		function keep(blob) { var u = URL.createObjectURL(blob); urls.push(u); return u; }
		function decorate(item, f) {
			item.setFileName(f.name);
			if (f.type) { item.setMediaType(f.type); }
			if (f.url) { item.setUrl(f.url); }
			item.setUploadState("Complete");
			item.setVisibleEdit(o.editable !== false);
			item.setVisibleRemove(o.editable !== false);
			item.destroyAttributes();
			item.addAttribute(new ObjectAttribute({ title: t("attachments.size"), text: size(f.size) }));
			if (f.added) { item.addAttribute(new ObjectAttribute({ title: t("attachments.added"), text: Format.when(f.added) })); }
			if (f.by) { item.addAttribute(new ObjectAttribute({ title: t("attachments.by"), text: f.by })); }
			return item;
		}
		// UploadSet renders each file's icon as role="img" without a name (axe: role-img-alt), and rebuilds the
		// icons when it renders. Before each rendering of its list (a public aggregation), name every icon by
		// the file type, through the Icon's own alt property.
		set.getList().addEventDelegate({ onBeforeRendering: function () {
			set.getList().getItems().forEach(function (li) {
				(li.getContent ? li.getContent() : []).forEach(function (c) {
					if (c.isA("sap.ui.core.Icon") && !c.getAlt()) { c.setAlt(t("attachments.icon")); }
				});
			});
		} });
		function changed() { writeLimits(); if (o.onChange) { o.onChange(part.files()); } }
		function writeLimits() {
			var n = set.getItems().length;
			limits.setText(t("attachments.limits", list(), Format.number(maxMb)) + " " + (o.local ? t("attachments.localNote") : "") + " " + t("attachments.count", n));
		}

		var part = Part.make({
			key: "attachment-list",
			content: new VBox({ renderType: "Bare", items: [limits, set] }),
			onDestroy: function () { urls.forEach(function (u) { URL.revokeObjectURL(u); }); },
			render: function (files) {
				set.destroyItems();
				(files || []).forEach(function (f) {
					var url = f.url || (f.blob ? keep(f.blob) : null);
					set.addItem(decorate(new UploadSetItem(), Object.assign({}, f, { url: url, size: f.size || (f.blob && f.blob.size) })));
				});
				writeLimits();
			}
		});
		part.uploadSet = set;
		/** The files now in the list: [{ name, type, url }]. */
		part.files = function () {
			return set.getItems().map(function (i) { return { name: i.getFileName(), type: i.getMediaType(), url: i.getUrl() }; });
		};
		/** Switches adding, renaming and removing on or off (for reading and editing modes). */
		part.setEditable = function (b) {
			o.editable = b;
			set.setUploadEnabled(!!b);
			set.getItems().forEach(function (i) { i.setVisibleEdit(!!b); i.setVisibleRemove(!!b); });
			return part;
		};
		part.update(o.data || []);
		return part;
	}

	var api = {
		info: {
			controls: ["sap.m.upload.UploadSet", "sap.m.upload.UploadSetItem", "sap.m.ObjectAttribute", "Confirm action"],
			motion: "None. Files appear in the list at once.",
			still: true
		},

		/**
		 * options:
		 *   data      [{ name, type, size (bytes), added (Date), by, url or blob }] the files already attached
		 *   types     allowed file extensions (default pdf, png, jpg, txt)
		 *   maxMb     largest allowed file in megabytes (default 5)
		 *   local     true keeps added files in this browser only, and says so
		 *   editable  false hides add, rename and remove
		 *   group     message group; onChange(files)
		 */
		create: create,

		/** Two small text files for demos, made in the browser. */
		sampleFiles: function () {
			var now = Date.now();
			return [
				{ name: t("attachments.demo.file1") + ".txt", type: "text/plain", blob: new Blob([t("attachments.demo.body1")], { type: "text/plain" }),
					added: new Date(now - 26 * 3600000), by: t("sample.person.1") },
				{ name: t("attachments.demo.file2") + ".txt", type: "text/plain", blob: new Blob([t("attachments.demo.body2")], { type: "text/plain" }),
					added: new Date(now - 3 * 3600000), by: t("sample.person.2") }
			];
		},

		example: function () {
			return { options: { data: api.sampleFiles(), local: true, maxMb: 5 }, next: function () { return api.sampleFiles(); } };
		}
	};
	return api;
});
