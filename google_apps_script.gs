// ═══════════════════════════════════════════════════════════════════
// PROVENTURE MAPS GRABBER — Google Apps Script (Updated)
// Paste this into your Apps Script editor and re-deploy as a Web App
// ═══════════════════════════════════════════════════════════════════

const HEADERS = ["Timestamp", "Name", "Phone", "Website", "Address", "Rating", "Reviews", "Category", "Maps URL", "Status"];

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // ── Auto-insert headers if row 1 is empty ──
    if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === "") {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.getRange(1, 1, 1, HEADERS.length)
           .setBackground("#0f172a")
           .setFontColor("#38bdf8")
           .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    var data = JSON.parse(e.postData.contents);
    var name = (data.name || "").trim();

    // ── Duplicate detection: skip if name already exists in column B ──
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existingNames = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
      if (existingNames.includes(name)) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: "duplicate", message: "Lead already exists: " + name }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ── Append the new lead ──
    sheet.appendRow([
      new Date(),
      name,
      data.phone    || "N/A",
      data.website  || "N/A",
      data.address  || "N/A",
      data.rating   || "N/A",
      data.reviews  || "N/A",
      data.category || "N/A",
      data.mapsUrl  || "N/A",
      "New"          // default CRM status
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
