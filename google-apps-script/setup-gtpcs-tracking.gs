const SPREADSHEET_ID = "1KzVm-sNSR8SI-3_tcHJSE9bxWvNKSWcfBymlG6Ti6L8";
const NOTIFY_EMAIL = "gtpcca@gmail.com";
const BUSINESS_NAME = "GTPCS";

function setupGTPCSTrackingSheetsStandalone() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const responseSheet = getOrCreateSheet_(ss, "Form Responses");
  setupFormResponsesSheet_(responseSheet);

  const orderSheet = getOrCreateSheet_(ss, "Order Tracking");
  setupOrderTrackingSheet_(orderSheet);

  SpreadsheetApp.flush();
}

function sendNewTicketEmail(e) {
  const namedValues = e && e.namedValues ? e.namedValues : {};
  const sheet = e.range.getSheet();
  const row = e.range.getRow();

  const ticketId = `GTPCS-${String(row - 1).padStart(4, "0")}`;

  addTicketInfo_(sheet, row, ticketId);

  let htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>New GTPCS Ticket: ${ticketId}</h2>
      <p>A new request was submitted through the GTPCS website/form.</p>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse;">
  `;

  for (const [question, answerArray] of Object.entries(namedValues)) {
    const answer = Array.isArray(answerArray) ? answerArray.join(", ") : answerArray;
    htmlBody += `
      <tr>
        <td><strong>${escapeHtml_(question)}</strong></td>
        <td>${escapeHtml_(answer)}</td>
      </tr>
    `;
  }

  htmlBody += `
      </table>
      <p>Open the GTPCS Google Sheet to manage this ticket.</p>
    </div>
  `;

  const plainBody =
    `New GTPCS Ticket: ${ticketId}\n\n` +
    Object.entries(namedValues)
      .map(([question, answerArray]) => {
        const answer = Array.isArray(answerArray) ? answerArray.join(", ") : answerArray;
        return `${question}: ${answer}`;
      })
      .join("\n");

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: `New GTPCS Ticket ${ticketId}`,
    body: plainBody,
    htmlBody
  });
}

function getOrCreateSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);

  if (!sheet && name === "Form Responses") {
    const oldSheet = ss.getSheetByName("Form Responses 1");
    if (oldSheet) {
      oldSheet.setName("Form Responses");
      sheet = oldSheet;
    }
  }

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  return sheet;
}

function setupFormResponsesSheet_(sheet) {
  const headers = [
    "Timestamp",
    "Name",
    "Email",
    "Phone",
    "Item/SKU",
    "Item Requested",
    "Pickup or Shipping",
    "Payment Method",
    "Message",
    "Ticket ID",
    "Ticket Status",
    "Internal Notes",
    "Linked Order ID"
  ];

  ensureHeaders_(sheet, headers);
  styleHeader_(sheet);

  const ticketStatusCol = getHeaders_(sheet).indexOf("Ticket Status") + 1;
  if (ticketStatusCol > 0) {
    applyDropdown_(sheet.getRange(2, ticketStatusCol, 500), [
      "New",
      "Contacted",
      "Pending Payment",
      "Reserved",
      "Completed",
      "Closed",
      "Rejected / Spam"
    ]);
  }
}

function setupOrderTrackingSheet_(sheet) {
  const headers = [
    "Order ID",
    "Date Created",
    "Source Ticket ID",
    "Customer Name",
    "Email",
    "Phone",
    "Item/SKU",
    "Item Name",
    "Order Status",
    "Payment Status",
    "Payment Method",
    "Sale Price CAD",
    "Amount Paid CAD",
    "Balance Due CAD",
    "Fulfillment",
    "Carrier",
    "Tracking Number",
    "Ship/Pickup Date",
    "Follow-up Date",
    "Internal Notes",
    "Last Updated"
  ];

  ensureHeaders_(sheet, headers);
  styleHeader_(sheet);

  const headersNow = getHeaders_(sheet);

  applyDropdownByHeader_(sheet, headersNow, "Order Status", [
    "New",
    "Contacted",
    "Reserved",
    "Pending Payment",
    "Paid",
    "Packed",
    "Shipped",
    "Picked Up",
    "Completed",
    "Cancelled",
    "Refunded"
  ]);

  applyDropdownByHeader_(sheet, headersNow, "Payment Status", [
    "Unpaid",
    "Deposit",
    "Paid",
    "Refunded",
    "Chargeback Risk",
    "Cancelled"
  ]);

  applyDropdownByHeader_(sheet, headersNow, "Payment Method", [
    "Cash",
    "Interac e-Transfer",
    "Wire",
    "PayPal G&S",
    "Credit Card",
    "Other"
  ]);

  applyDropdownByHeader_(sheet, headersNow, "Fulfillment", [
    "Local Pickup",
    "Shipping",
    "Local Delivery",
    "Hold / Reserve"
  ]);

  applyDropdownByHeader_(sheet, headersNow, "Carrier", [
    "",
    "Canada Post",
    "UPS",
    "FedEx",
    "Purolator",
    "DHL",
    "Other"
  ]);

  setupBalanceFormula_(sheet);

  sheet.getRange("L:N").setNumberFormat("$#,##0");
  sheet.getRange("B:B").setNumberFormat("yyyy-mm-dd");
  sheet.getRange("R:S").setNumberFormat("yyyy-mm-dd");
  sheet.getRange("U:U").setNumberFormat("yyyy-mm-dd");
}

function addTicketInfo_(sheet, row, ticketId) {
  ensureHeaders_(sheet, [
    "Ticket ID",
    "Ticket Status",
    "Internal Notes",
    "Linked Order ID"
  ]);

  const headers = getHeaders_(sheet);
  const ticketCol = headers.indexOf("Ticket ID") + 1;
  const statusCol = headers.indexOf("Ticket Status") + 1;

  if (ticketCol > 0) {
    sheet.getRange(row, ticketCol).setValue(ticketId);
  }

  if (statusCol > 0) {
    sheet.getRange(row, statusCol).setValue("New");
  }
}

function ensureHeaders_(sheet, requiredHeaders) {
  let headers = getHeaders_(sheet);

  requiredHeaders.forEach(header => {
    if (!headers.includes(header)) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(header);
      headers.push(header);
    }
  });
}

function getHeaders_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(h => String(h || "").trim());
}

function styleHeader_(sheet) {
  const lastCol = sheet.getLastColumn();
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, lastCol)
    .setFontWeight("bold")
    .setBackground("#162231")
    .setFontColor("#ffffff")
    .setWrap(true);
  sheet.getRange(2, 1, 500, lastCol).setWrap(true);
  sheet.autoResizeColumns(1, lastCol);
}

function applyDropdownByHeader_(sheet, headers, headerName, values) {
  const col = headers.indexOf(headerName) + 1;
  if (col > 0) {
    applyDropdown_(sheet.getRange(2, col, 500), values);
  }
}

function applyDropdown_(range, values) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  range.setDataValidation(rule);
}

function setupBalanceFormula_(sheet) {
  const headers = getHeaders_(sheet);

  const saleCol = headers.indexOf("Sale Price CAD") + 1;
  const paidCol = headers.indexOf("Amount Paid CAD") + 1;
  const balanceCol = headers.indexOf("Balance Due CAD") + 1;

  if (!saleCol || !paidCol || !balanceCol) return;

  const saleLetter = columnToLetter_(saleCol);
  const paidLetter = columnToLetter_(paidCol);

  const formulas = [];

  for (let r = 2; r <= 501; r++) {
    formulas.push([`=IF(${saleLetter}${r}="","",${saleLetter}${r}-${paidLetter}${r})`]);
  }

  sheet.getRange(2, balanceCol, 500, 1).setFormulas(formulas);
}

function columnToLetter_(column) {
  let temp = "";
  let letter = "";

  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }

  return letter;
}

function escapeHtml_(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
