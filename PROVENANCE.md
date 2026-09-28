# How Accents was written

Accents for UI5 is original work. It was written from scratch in September 2026 using a **clean-room
method**, so that it contains no one else's text, code or images.

## The method

1. **Ideas only.** The author's earlier private design notes were reduced to a written list of general
   design ideas, such as "colour the fact, not the container" or "every app offers a theme choice". A
   separate reader wrote that list in its own words. It holds no text, code, file names, colour values
   or references to any organisation, system or product screen. Ideas are not protected by copyright;
   the text and code that express them are, which is why only ideas crossed over.
2. **Fresh authorship.** Everything in this repository was written from that idea list, public
   documentation (OpenUI5, Apache ECharts, the WCAG guidelines) and measurement of the running
   software. The authors never opened the earlier notes.
3. **Kinds of component, not their content.** To find gaps, the public component lists of two design
   systems (SAP Fiori elements and Adobe Spectrum) were read for the *kinds* of component a business-app
   framework needs. Their text, code and visuals were not copied.
4. **Checked.** A rule checker scans every file for words that must not appear, and every screen is
   rendered and audited before release.

A full private record of who could see what at each step, with dates, is kept by the author and is
available to legal reviewers on request.

## What Accents does not contain

- No text, code, screenshots or images from the author's earlier notes or from any employer or client.
- No SAP screenshots and no copy of SAP's design guideline text.
- None of SAP's paid libraries (`sap.viz`, `sap.suite.*`, `sap.ui.comp`, `sap.gantt`, `sap.ui.export`).
  Charts use Apache ECharts; spreadsheet export is Accents' own code.
- No SAP "72" typeface: its file's own licence says it may not be copied. Accents uses Inter under the SIL
  Open Font Licence instead.
- No employer, client or customer names. The sample data is for a made-up retailer, "Harbor & Pine".

## Names

Accents selects OpenUI5's themes by their technical identifiers, such as `sap_horizon`. It uses no SAP
trademark as a name for anything of its own. See [NOTICE](NOTICE) for the trademark statement.
