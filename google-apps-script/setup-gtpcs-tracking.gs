const TICKET_SPREADSHEET_ID = "1IAUdWy1FdKKoTHgMCI11Kr9Ic73Vq9Skdc2vSLwxOSI";
const NOTIFY_EMAIL = "gtpcca@gmail.com";
const BUSINESS_NAME = "GTPCS";
const PUBLIC_FORM_TOKEN = "gtpcs-public-request-v1";
const RATE_LIMIT_SECONDS = 3600;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;

function setupGTPCSTrackingSheetsStandalone() {
  const ss = getTicketSpreadsheet_();

  const responseSheet = getOrCreateSheet_(ss, "Form Responses");
  setupFormResponsesSheet_(responseSheet);

  const orderSheet = getOrCreateSheet_(ss, "Order Tracking");
  setupOrderTrackingSheet_(orderSheet);

  SpreadsheetApp.flush();
}

function doGet() {
  return HtmlService
    .createHtmlOutput(`${BUSINESS_NAME} Ticket System is running for spreadsheet ${TICKET_SPREADSHEET_ID}.`)
    .setTitle(`${BUSINESS_NAME} Ticket System`);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const params = e && e.parameter ? e.parameter : {};
    const validationError = validateWebTicket_(params);
    if (validationError) {
      logWebTicketError_(params, validationError);
      return htmlResponse_({ ok: false, error: validationError });
    }

    const rateLimitKey = buildRateLimitKey_(params);
    if (isRateLimited_(rateLimitKey)) {
      logWebTicketError_(params, "Too many requests. Please try again later.");
      return htmlResponse_({ ok: false, error: "Too many requests. Please try again later." });
    }

    const ss = getTicketSpreadsheet_();
    const sheet = getOrCreateSheet_(ss, "Form Responses");

    setupFormResponsesSheet_(sheet);

    const row = Math.max(sheet.getLastRow() + 1, 2);
    const ticketId = `GTPCS-${String(row - 1).padStart(4, "0")}`;
    const values = buildWebTicketValues_(params, ticketId);

    setRowValuesByHeader_(sheet, row, values);
    sendWebTicketEmail_(ticketId, values);
    recordRateLimit_(rateLimitKey);

    SpreadsheetApp.flush();

    return htmlResponse_({ ok: true, ticketId });
  } catch (error) {
    const errorMessage = String(error && error.message ? error.message : error);
    logWebTicketError_(e && e.parameter ? e.parameter : {}, errorMessage);
    return htmlResponse_({ ok: false, error: errorMessage });
  } finally {
    lock.releaseLock();
  }
}

function getTicketSpreadsheet_() {
  return SpreadsheetApp.openById(TICKET_SPREADSHEET_ID);
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
    "Request Type",
    "Name",
    "Email",
    "Phone",
    "Item/SKU",
    "Item Requested",
    "Pickup or Shipping",
    "Payment Method",
    "Message",
    "Page URL",
    "User Agent",
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

function validateWebTicket_(params) {
  if (cleanParam_(params.company_website)) {
    return "Rejected.";
  }

  if (cleanParam_(params.form_token) !== PUBLIC_FORM_TOKEN) {
    return "Invalid request.";
  }

  const name = cleanParam_(params.name);
  const email = cleanParam_(params.email);
  const message = cleanParam_(params.message);

  if (!name || !email || !message) {
    return "Name, email, and message are required.";
  }

  if (name.length > 120) {
    return "Name is too long.";
  }

  if (message.length < 8 || message.length > 4000) {
    return "Message must be between 8 and 4000 characters.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "A valid email is required.";
  }

  return "";
}

function buildRateLimitKey_(params) {
  const email = cleanParam_(params.email).toLowerCase();
  const fingerprint = cleanParam_(params.user_agent).slice(0, 120);
  return Utilities.base64EncodeWebSafe(`${email}|${fingerprint}`).slice(0, 80);
}

function isRateLimited_(key) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get(`rl:${key}`);
  const count = raw ? Number(raw) : 0;
  return count >= RATE_LIMIT_MAX_SUBMISSIONS;
}

function recordRateLimit_(key) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `rl:${key}`;
  const raw = cache.get(cacheKey);
  const count = raw ? Number(raw) : 0;
  cache.put(cacheKey, String(count + 1), RATE_LIMIT_SECONDS);
}

function htmlResponse_(data) {
  const payload = JSON.stringify(Object.assign({ source: "gtpcs-request-form" }, data)).replace(/</g, "\\u003c");
  const message = data.ok
    ? `Request received. Ticket ID: ${escapeHtml_(data.ticketId)}`
    : `Request failed: ${escapeHtml_(data.error)}`;

  return HtmlService
    .createHtmlOutput(`<!doctype html>
<html>
<body>
  <p>${message}</p>
  <script>
    try {
      window.parent.postMessage(${payload}, "*");
      window.top.postMessage(${payload}, "*");
    } catch (error) {}
  </script>
</body>
</html>`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function buildWebTicketValues_(params, ticketId) {
  return {
    "Timestamp": new Date(),
    "Request Type": cleanParam_(params.request_type),
    "Name": cleanParam_(params.name),
    "Email": cleanParam_(params.email),
    "Phone": cleanParam_(params.phone),
    "Item/SKU": cleanParam_(params.sku),
    "Item Requested": cleanParam_(params.item_name),
    "Pickup or Shipping": cleanParam_(params.handoff),
    "Payment Method": "",
    "Message": cleanParam_(params.message),
    "Page URL": cleanParam_(params.page_url),
    "User Agent": cleanParam_(params.user_agent),
    "Ticket ID": ticketId,
    "Ticket Status": "New",
    "Internal Notes": "",
    "Linked Order ID": ""
  };
}

function logWebTicketError_(params, errorMessage) {
  try {
    const ss = getTicketSpreadsheet_();
    const sheet = getOrCreateSheet_(ss, "Request Errors");
    const headers = [
      "Timestamp",
      "Error",
      "Request Type",
      "Name",
      "Email",
      "Phone",
      "Item/SKU",
      "Item Requested",
      "Pickup or Shipping",
      "Message",
      "Page URL",
      "User Agent",
      "Honeypot Filled"
    ];

    ensureHeaders_(sheet, headers);
    styleHeader_(sheet);

    sheet.appendRow([
      new Date(),
      errorMessage,
      cleanParam_(params.request_type),
      cleanParam_(params.name),
      cleanParam_(params.email),
      cleanParam_(params.phone),
      cleanParam_(params.sku),
      cleanParam_(params.item_name),
      cleanParam_(params.handoff),
      cleanParam_(params.message),
      cleanParam_(params.page_url),
      cleanParam_(params.user_agent),
      cleanParam_(params.company_website) ? "Yes" : "No"
    ]);
  } catch (logError) {
    console.error(logError);
  }
}

function setRowValuesByHeader_(sheet, row, valuesByHeader) {
  ensureHeaders_(sheet, Object.keys(valuesByHeader));
  const headers = getHeaders_(sheet);

  Object.entries(valuesByHeader).forEach(([header, value]) => {
    const col = headers.indexOf(header) + 1;
    if (col > 0) {
      sheet.getRange(row, col).setValue(value);
    }
  });
}

function sendWebTicketEmail_(ticketId, valuesByHeader) {
  let htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>New GTPCS Ticket: ${ticketId}</h2>
      <p>A new request was submitted through GTPCS.ca.</p>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse;">
  `;

  Object.entries(valuesByHeader).forEach(([label, value]) => {
    htmlBody += `
      <tr>
        <td><strong>${escapeHtml_(label)}</strong></td>
        <td>${escapeHtml_(value)}</td>
      </tr>
    `;
  });

  htmlBody += `
      </table>
      <p>Open the GTPCS Google Sheet to manage this ticket.</p>
    </div>
  `;

  const plainBody =
    `New GTPCS Ticket: ${ticketId}\n\n` +
    Object.entries(valuesByHeader)
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n");

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: `New GTPCS Ticket ${ticketId}`,
    body: plainBody,
    htmlBody
  });
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

function cleanParam_(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
