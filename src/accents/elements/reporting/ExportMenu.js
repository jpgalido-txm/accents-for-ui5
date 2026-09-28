/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Export: downloads the rows and columns on screen as a spreadsheet (.xlsx) or a text file (.csv).
 * The first rows of either file state the report, the filters that produced the data, when it was
 * exported and where the data came from; then the column headers, the rows in the order shown, and
 * the totals row. Group subtotals are left out of the files so the rows stay sortable in a
 * spreadsheet; every row of a collapsed group is still included.
 *
 * sap.ui.export is SAPUI5 only (paid), so this file carries its own small XLSX writer:
 *  - An .xlsx file is a ZIP archive of XML parts (Office Open XML, ECMA-376). The archive here uses
 *    "stored" entries (no compression), each with a local header, a CRC-32 checksum, a central
 *    directory and an end record, as the ZIP format (PKWARE APPNOTE) describes.
 *  - The parts are [Content_Types].xml, _rels/.rels, xl/workbook.xml, xl/_rels/workbook.xml.rels,
 *    xl/styles.xml and one sheet, xl/worksheets/sheet1.xml.
 *  - Text is written as inline strings (<c t="inlineStr">); numbers are written as numbers, so
 *    they add up in a spreadsheet; percentages as fractions with a percent format; dates as
 *    spreadsheet serial days with a date format. The header row is frozen.
 */
sap.ui.define([
	"sap/m/MenuButton",
	"sap/m/Menu",
	"sap/m/MenuItem",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Messages",
	"accents/core/I18n",
	"accents/elements/reporting/Snapshot",
	"accents/elements/reporting/sampleReport"
], function (MenuButton, Menu, MenuItem, Part, Format, Messages, I18n, Snapshot, sampleReport) {
	"use strict";

	var t = I18n.use("accents.elements.reporting.i18n.i18n");

	/* ---------- ZIP (stored entries) ---------- */
	var CRC_TABLE = (function () {
		var table = new Uint32Array(256);
		for (var n = 0; n < 256; n++) {
			var c = n;
			for (var k = 0; k < 8; k++) { c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; }
			table[n] = c >>> 0;
		}
		return table;
	})();
	function crc32(bytes) {
		var c = 0xFFFFFFFF;
		for (var i = 0; i < bytes.length; i++) { c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); }
		return (c ^ 0xFFFFFFFF) >>> 0;
	}
	/** files: [{ name, text }] -> Uint8Array of a ZIP archive with stored (uncompressed) entries. */
	function zip(files, when) {
		var enc = new TextEncoder();
		var d = when || new Date();
		var time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
		var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
		var locals = [], centrals = [], offset = 0;
		files.forEach(function (f) {
			var name = enc.encode(f.name);
			var data = enc.encode(f.text);
			var crc = crc32(data);
			var local = new DataView(new ArrayBuffer(30));
			local.setUint32(0, 0x04034B50, true);   // local file header signature
			local.setUint16(4, 20, true);            // version needed: 2.0
			local.setUint16(6, 0x0800, true);        // flags: names are UTF-8
			local.setUint16(8, 0, true);             // method: stored
			local.setUint16(10, time, true);
			local.setUint16(12, date, true);
			local.setUint32(14, crc, true);
			local.setUint32(18, data.length, true);  // compressed size
			local.setUint32(22, data.length, true);  // uncompressed size
			local.setUint16(26, name.length, true);
			local.setUint16(28, 0, true);            // extra field length
			locals.push(new Uint8Array(local.buffer), name, data);
			var central = new DataView(new ArrayBuffer(46));
			central.setUint32(0, 0x02014B50, true);  // central directory signature
			central.setUint16(4, 20, true);          // version made by
			central.setUint16(6, 20, true);          // version needed
			central.setUint16(8, 0x0800, true);
			central.setUint16(10, 0, true);
			central.setUint16(12, time, true);
			central.setUint16(14, date, true);
			central.setUint32(16, crc, true);
			central.setUint32(20, data.length, true);
			central.setUint32(24, data.length, true);
			central.setUint16(28, name.length, true);
			central.setUint16(30, 0, true);          // extra
			central.setUint16(32, 0, true);          // comment
			central.setUint16(34, 0, true);          // disk number
			central.setUint16(36, 0, true);          // internal attributes
			central.setUint32(38, 0, true);          // external attributes
			central.setUint32(42, offset, true);     // offset of the local header
			centrals.push(new Uint8Array(central.buffer), name);
			offset += 30 + name.length + data.length;
		});
		var centralSize = centrals.reduce(function (s, p) { return s + p.length; }, 0);
		var end = new DataView(new ArrayBuffer(22));
		end.setUint32(0, 0x06054B50, true);          // end of central directory signature
		end.setUint16(8, files.length, true);
		end.setUint16(10, files.length, true);
		end.setUint32(12, centralSize, true);
		end.setUint32(16, offset, true);
		var parts = locals.concat(centrals, [new Uint8Array(end.buffer)]);
		var out = new Uint8Array(parts.reduce(function (s, p) { return s + p.length; }, 0));
		var at = 0;
		parts.forEach(function (p) { out.set(p, at); at += p.length; });
		return out;
	}

	/* ---------- the workbook ---------- */
	function esc(s) {
		// Characters XML 1.0 does not allow are dropped; the five special ones are escaped.
		return String(s).replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	}
	function colName(i) {
		var s = "";
		for (var n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; }
		return s;
	}
	/** Spreadsheet serial day for a calendar date (days since 30 Dec 1899), read in UTC. */
	function serial(d) { return (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(1899, 11, 30)) / 86400000; }

	// Style indexes in styles.xml below.
	var S = { text: 0, bold: 1, int: 2, dec: 3, pct: 4, date: 5, boldInt: 6, boldDec: 7, boldPct: 8 };
	var STYLES = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
		"<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" +
		"<numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"0.0%\"/></numFmts>" +
		"<fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts>" +
		"<fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills>" +
		"<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>" +
		"<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>" +
		"<cellXfs count=\"9\">" +
		"<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>" +
		"<xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\"/>" +
		"<xf numFmtId=\"3\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
		"<xf numFmtId=\"4\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
		"<xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
		"<xf numFmtId=\"14\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/>" +
		"<xf numFmtId=\"3\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyNumberFormat=\"1\"/>" +
		"<xf numFmtId=\"4\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyNumberFormat=\"1\"/>" +
		"<xf numFmtId=\"164\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyNumberFormat=\"1\"/>" +
		"</cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>";

	/** The lines above the data, shared by both formats: [label, value] pairs. */
	function preamble(snap) {
		return [
			[t("exportMenu.title"), snap.title],
			[t("exportMenu.filters"), snap.filters],
			[t("exportMenu.exported"), Format.when(snap.at)],
			[t("exportMenu.source"), snap.source || Format.DASH],
			[t("exportMenu.rows"), snap.rows.length]
		];
	}

	function missing(v) { return v === null || v === undefined || v === "" || (typeof v === "number" && isNaN(v)); }

	/** Builds the .xlsx bytes for a snapshot (see Snapshot.of). */
	function xlsx(snap) {
		var rows = [];
		function cell(ref, v, style, kind) {
			if (missing(v)) { return ""; }
			// Numbers keep 10 significant digits, which drops floating-point noise such as 2984.4449999999997.
			if (kind === "n") { return "<c r=\"" + ref + "\" s=\"" + style + "\"><v>" + Number(v.toPrecision(10)) + "</v></c>"; }
			return "<c r=\"" + ref + "\" s=\"" + style + "\" t=\"inlineStr\"><is><t xml:space=\"preserve\">" + esc(v) + "</t></is></c>";
		}
		function line(r, cells) { rows.push("<row r=\"" + r + "\">" + cells.join("") + "</row>"); }
		var r = 0;
		preamble(snap).forEach(function (p, i) {
			r += 1;
			line(r, [cell("A" + r, p[0], S.bold), typeof p[1] === "number" ? cell("B" + r, p[1], S.int, "n") : cell("B" + r, p[1], i === 0 ? S.bold : S.text)]);
		});
		r += 1; // one empty row between the preamble and the table
		r += 1;
		var headRow = r;
		line(r, snap.columns.map(function (c, i) { return cell(colName(i) + r, Snapshot.header(c), S.bold); }));
		function valueCell(c, i, v, bold) {
			var ref = colName(i) + r;
			if (c.type === "date") { var d = Snapshot.asDate(v); return d ? cell(ref, serial(d), S.date, "n") : ""; }
			if (Snapshot.numeric(c) && typeof v === "number" && isFinite(v)) {
				var style = c.type === "percent" ? (bold ? S.boldPct : S.pct) : (c.digits ? (bold ? S.boldDec : S.dec) : (bold ? S.boldInt : S.int));
				return cell(ref, v, style, "n");
			}
			return cell(ref, v, bold ? S.bold : S.text);
		}
		snap.rows.forEach(function (row) {
			r += 1;
			line(r, snap.columns.map(function (c, i) { return valueCell(c, i, row[c.key], false); }));
		});
		if (snap.totals) {
			r += 1;
			line(r, snap.columns.map(function (c, i) {
				if (i === 0) { return cell("A" + r, t("exportMenu.total"), S.bold); }
				return c.total ? valueCell(c, i, snap.totals[c.key], true) : "";
			}));
		}
		var widths = snap.columns.map(function (c, i) {
			var w = Math.max(10, Math.min(40, Snapshot.header(c).length + 2, i === 0 ? 40 : 40));
			return "<col min=\"" + (i + 1) + "\" max=\"" + (i + 1) + "\" width=\"" + (c.type === "text" ? Math.max(w, 18) : Math.max(w, 14)) + "\" customWidth=\"1\"/>";
		});
		var sheet = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
			"<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" +
			"<sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"" + headRow + "\" topLeftCell=\"A" + (headRow + 1) +
			"\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews>" +
			"<sheetFormatPr defaultRowHeight=\"15\"/>" +
			"<cols>" + widths.join("") + "</cols>" +
			"<sheetData>" + rows.join("") + "</sheetData></worksheet>";
		var sheetName = esc(String(snap.title || t("exportMenu.title")).replace(/[\[\]:*?/\\]/g, " ").slice(0, 31).trim() || "Sheet1");
		var files = [
			{ name: "[Content_Types].xml", text: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
				"<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
				"<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
				"<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
				"<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" +
				"<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>" +
				"<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>" +
				"</Types>" },
			{ name: "_rels/.rels", text: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
				"<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
				"<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>" +
				"</Relationships>" },
			{ name: "xl/workbook.xml", text: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
				"<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">" +
				"<sheets><sheet name=\"" + sheetName + "\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>" },
			{ name: "xl/_rels/workbook.xml.rels", text: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
				"<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
				"<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>" +
				"<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>" +
				"</Relationships>" },
			{ name: "xl/styles.xml", text: STYLES },
			{ name: "xl/worksheets/sheet1.xml", text: sheet }
		];
		return zip(files, snap.at);
	}

	/* ---------- CSV ---------- */
	function csvField(v) {
		var s = v === null || v === undefined ? "" : String(v);
		return /[",\r\n;]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s;
	}
	/** Plain values a spreadsheet can read: numbers with a dot, percentages as fractions, dates as YYYY-MM-DD. */
	function csvValue(c, v) {
		if (missing(v)) { return ""; }
		if (c.type === "date") { var d = Snapshot.asDate(v); return d ? d.toISOString().slice(0, 10) : ""; }
		if (Snapshot.numeric(c) && typeof v === "number") { return String(Math.round(v * 1e6) / 1e6); }
		return v;
	}
	function csv(snap) {
		var lines = preamble(snap).map(function (p) { return csvField(p[0]) + "," + csvField(p[1]); });
		lines.push("");
		lines.push(snap.columns.map(function (c) { return csvField(Snapshot.header(c)); }).join(","));
		snap.rows.forEach(function (row) { lines.push(snap.columns.map(function (c) { return csvField(csvValue(c, row[c.key])); }).join(",")); });
		if (snap.totals) {
			lines.push(snap.columns.map(function (c, i) { return i === 0 ? csvField(t("exportMenu.total")) : c.total ? csvField(csvValue(c, snap.totals[c.key])) : ""; }).join(","));
		}
		return "\uFEFF" + lines.join("\r\n") + "\r\n";
	}

	function fileName(base, ext, at) {
		var d = at || new Date();
		var stamp = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
		var clean = String(base || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
		return clean + "-" + stamp + "." + ext;
	}
	function download(bytesOrText, type, name) {
		var blob = new Blob([bytesOrText], { type: type });
		var url = URL.createObjectURL(blob);
		var a = document.createElement("a");
		a.href = url;
		a.download = name;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
	}

	return {
		info: {
			controls: ["sap.m.MenuButton", "sap.m.Menu", "sap.m.MenuItem"],
			motion: "None. Exporting never animates.",
			still: true
		},

		/** For tests and for apps that want the files without the button. */
		xlsx: xlsx,
		csv: csv,
		zip: zip,
		crc32: crc32,

		/**
		 * options:
		 *   name   the file name's start ("sales-report"); the date is added
		 *   from   function () -> a snapshot (Snapshot.of({ title, table, filterBar, source }))
		 */
		create: function (o) {
			function run(kind) {
				var snap = o.from();
				if (!snap || !snap.rows.length) {
					Messages.add({ type: "Warning", text: t("exportMenu.none"), group: t("exportMenu.button") });
					return;
				}
				var name = fileName(o.name || snap.title, kind, snap.at);
				if (kind === "xlsx") { download(xlsx(snap), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name); }
				else { download(csv(snap), "text/csv;charset=utf-8", name); }
				Messages.add({ type: "Success", text: t("exportMenu.done", name, snap.rows.length), group: t("exportMenu.button") });
			}
			var button = new MenuButton({
				text: t("exportMenu.button"),
				icon: "sap-icon://download",
				type: "Transparent",
				tooltip: t("exportMenu.tooltip"),
				menu: new Menu({ items: [
					new MenuItem({ text: t("exportMenu.xlsx"), icon: "sap-icon://excel-attachment", press: function () { run("xlsx"); } }),
					new MenuItem({ text: t("exportMenu.csv"), icon: "sap-icon://document-text", press: function () { run("csv"); } })
				] })
			});
			var part = Part.make({
				key: "export-menu",
				content: button,
				render: function (d) { button.setEnabled(d.enabled !== false); }
			});
			part.run = run;
			part.update({ enabled: true });
			return part;
		},

		example: function (Data) {
			// The demo exports the sample report as a report table would show it: grouped by group, largest sales first.
			var columns = sampleReport.columns();
			var meta = Data.sampleMeta();
			var rows = sampleReport.rows(7).sort(function (a, b) { return a.group.localeCompare(b.group) || b.sales - a.sales; });
			return {
				options: {
					name: t("sample.title"),
					from: function () {
						return { title: t("sample.title"), filters: t("snapshot.noFilters"),
							source: t("snapshot.sourceSample", meta.source, Format.when(meta.readAt)), columns: columns, rows: rows,
							totals: Snapshot.totals(columns, rows), at: new Date() };
					}
				}
			};
		}
	};
});
