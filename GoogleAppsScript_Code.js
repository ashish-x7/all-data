/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: AUTOMATIC DATA UPLOAD API
 * =========================================================================
 * 
 * SETUP INSTRUCTIONS (One-time only - Takes 1-2 minutes):
 * 1. Open your Sales Google Sheet in browser:
 *    https://docs.google.com/spreadsheets/d/119tM2RQueW-6y-SvMaXUB2nbcztTldQnKrrucTbUI-k/edit
 * 2. Click "Extensions" (ऊपर मेनू में) > "Apps Script".
 * 3. Delete any code inside Code.gs and PASTE ALL CODE FROM THIS FILE.
 * 4. Click "Save" icon (or Ctrl+S).
 * 5. Click the blue "Deploy" button (top-right) > "New deployment".
 * 6. Click the gear icon ⚙️ next to "Select type" > select "Web app".
 * 7. Set configuration:
 *      - Description: "Upload API"
 *      - Execute as: "Me" (your email)
 *      - Who has access: "Anyone" (महत्वपूर्ण: Anyone सेलेक्ट करें ताकि डैशबोर्ड डेटा भेज सके)
 * 8. Click "Deploy".
 * 9. If prompted, click "Authorize access", choose your Google account,
 *    click "Advanced", then click "Go to Untitled project (unsafe)" and "Allow".
 * 10. Copy the generated "Web app URL" (looks like https://script.google.com/macros/s/.../exec)
 * 11. Paste that URL into the Dashboard "Upload Data" popup or Configure Sheet settings!
 * =========================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 30 seconds for other concurrent executions
  if (!lock.tryLock(30000)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Server is busy processing another request. Please try again."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No data received in request payload.");
    }

    var payload = JSON.parse(e.postData.contents);
    var tabName = (payload.tabName || '').trim();
    var rows = payload.rows;

    if (!tabName) {
      throw new Error("Target tab name is missing.");
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw new Error("No rows provided for upload.");
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);

    // If exact name not found, search case-insensitively
    if (!sheet) {
      var allSheets = ss.getSheets();
      for (var i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getName().trim().toUpperCase() === tabName.toUpperCase()) {
          sheet = allSheets[i];
          break;
        }
      }
    }

    // If still not found, create the tab automatically
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }

    var lastRow = sheet.getLastRow();
    var startRow = lastRow + 1;
    var numRows = rows.length;
    var numCols = rows[0].length;

    // Batch insert all rows directly to Google Sheet
    sheet.getRange(startRow, 1, numRows, numCols).setValues(rows);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: numRows + " records successfully uploaded to " + tabName + "!",
      tab: tabName,
      uploadedCount: numRows,
      startRow: startRow,
      endRow: startRow + numRows - 1
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "BillReturn Sync Google Apps Script Upload Webhook is active and working!"
  })).setMimeType(ContentService.MimeType.JSON);
}
