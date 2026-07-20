// ═══════════════════════════════════════════════════════════════════
// PROVENTURE MAPS GRABBER — Google Apps Script (v1.2)
// Paste this into your Apps Script editor and re-deploy as a Web App
// Features:
//   ✅ Auto-insert styled headers
//   ✅ Duplicate detection
//   ✅ Color-code rows by rating (green/yellow/red)
//   ✅ Clickable Maps URL hyperlink
//   ✅ Auto-sort sheet by rating (highest first) after each save
// ═══════════════════════════════════════════════════════════════════

const HEADERS = ["Timestamp", "Name", "Phone", "Website", "Address", "Rating", "Reviews", "Category", "Maps URL", "Status"];

// Column index constants (1-based)
const COL_TIMESTAMP = 1;
const COL_NAME      = 2;
const COL_RATING    = 6;
const COL_MAPS_URL  = 9;
const COL_STATUS    = 10;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var name        = (data.name        || "").trim();
    var mapsUrl     = (data.mapsUrl     || "").trim();
    var rating      = parseFloat(data.rating) || 0;
    var searchLabel = (data.searchLabel || "Leads").trim();

    // Clean sheet name (tab name cannot exceed 30 chars or contain forbidden characters)
    var sheetName = searchLabel.replace(/[\\\/\?\*\:\[\]]/g, "").substring(0, 30);
    if (!sheetName) sheetName = "Leads";

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    // ── Auto-create sheet tab & insert headers if it does not exist ──
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.getRange(1, 1, 1, HEADERS.length)
           .setBackground("#0f172a")
           .setFontColor("#38bdf8")
           .setFontWeight("bold");
      sheet.setFrozenRows(1);
      
      // Set column widths for readability
      sheet.setColumnWidth(COL_NAME,      200);
      sheet.setColumnWidth(COL_MAPS_URL,  80);
      sheet.setColumnWidth(5,             250); // Address
    }

    // ── Duplicate detection: skip if name already exists in Name column ──
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var finder = sheet.getRange(2, COL_NAME, lastRow - 1, 1).createTextFinder(name).matchEntireCell(true).matchCase(false);
      var cell = finder.findNext();
      if (cell) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: "duplicate", message: "Lead already exists: " + name }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ── Build the new row ──
    var newRow = [
      new Date(),
      name,
      data.phone    || "N/A",
      data.website  || "N/A",
      data.address  || "N/A",
      data.rating   || "N/A",
      data.reviews  || "N/A",
      data.category || "N/A",
      mapsUrl       || "N/A",
      "New"
    ];

    sheet.appendRow(newRow);
    var appendedRow = sheet.getLastRow();

    // ── Clickable Maps URL: replace plain text with HYPERLINK formula ──
    if (mapsUrl && mapsUrl !== "N/A") {
      sheet.getRange(appendedRow, COL_MAPS_URL)
           .setFormula('=HYPERLINK("' + mapsUrl + '","📍 Open Map")');
    }

    // ── Color-code the row based on rating ──
    var rowRange = sheet.getRange(appendedRow, 1, 1, HEADERS.length);
    if (rating >= 4.5) {
      rowRange.setBackground("#052e16"); // Deep green — premium lead
      sheet.getRange(appendedRow, COL_RATING).setFontColor("#4ade80").setFontWeight("bold");
    } else if (rating >= 3.5) {
      rowRange.setBackground("#1c1917"); // Dark amber — decent lead
      sheet.getRange(appendedRow, COL_RATING).setFontColor("#fbbf24").setFontWeight("bold");
    } else if (rating > 0) {
      rowRange.setBackground("#1f0c0c"); // Deep red — low quality
      sheet.getRange(appendedRow, COL_RATING).setFontColor("#f87171").setFontWeight("bold");
    }

    // ── Auto-sort by Rating column (highest first), keeping header frozen ──
    if (sheet.getLastRow() > 2) {
      var dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length);
      dataRange.sort({ column: COL_RATING, ascending: false });
    }

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

