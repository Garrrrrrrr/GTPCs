const TICKET_RESET_SPREADSHEET_ID = "1IAUdWy1FdKKoTHgMCI11Kr9Ic73Vq9Skdc2vSLwxOSI";
const FORM_RESPONSES_SHEET_NAME = "Form Responses";
const ORDER_TRACKING_SHEET_NAME = "Order Tracking";

const FORM_RESPONSE_HEADERS = [
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

const ORDER_TRACKING_HEADERS = [
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

const FORM_RESPONSE_ALIASES = {
  timestamp: "Timestamp",
  date: "Timestamp",
  submitted_at: "Timestamp",
  request_type: "Request Type",
  type: "Request Type",
  name: "Name",
  customer_name: "Name",
  full_name: "Name",
  email: "Email",
  email_address: "Email",
  customer_email: "Email",
  phone: "Phone",
  phone_number: "Phone",
  customer_phone: "Phone",
  item_sku: "Item/SKU",
  sku: "Item/SKU",
  item: "Item Requested",
  item_name: "Item Requested",
  product: "Item Requested",
  product_name: "Item Requested",
  pickup_or_shipping: "Pickup or Shipping",
  handoff: "Pickup or Shipping",
  fulfillment: "Pickup or Shipping",
  payment_method: "Payment Method",
  message: "Message",
  notes: "Message",
  page_url: "Page URL",
  source_url: "Page URL",
  user_agent: "User Agent",
  ticket_id: "Ticket ID",
  ticket_status: "Ticket Status",
  status: "Ticket Status",
  internal_notes: "Internal Notes",
  linked_order_id: "Linked Order ID",
  order_id: "Linked Order ID"
};

const ORDER_TRACKING_ALIASES = {
  order_id: "Order ID",
  date_created: "Date Created",
  created_at: "Date Created",
  source_ticket_id: "Source Ticket ID",
  ticket_id: "Source Ticket ID",
  customer_name: "Customer Name",
  name: "Customer Name",
  email: "Email",
  customer_email: "Email",
  phone: "Phone",
  customer_phone: "Phone",
  item_sku: "Item/SKU",
  sku: "Item/SKU",
  item_name: "Item Name",
  product_name: "Item Name",
  order_status: "Order Status",
  status: "Order Status",
  payment_status: "Payment Status",
  payment_method: "Payment Method",
  sale_price_cad: "Sale Price CAD",
  sale_price: "Sale Price CAD",
  price: "Sale Price CAD",
  amount_paid_cad: "Amount Paid CAD",
  amount_paid: "Amount Paid CAD",
  paid: "Amount Paid CAD",
  balance_due_cad: "Balance Due CAD",
  balance_due: "Balance Due CAD",
  fulfillment: "Fulfillment",
  carrier: "Carrier",
  tracking_number: "Tracking Number",
  ship_pickup_date: "Ship/Pickup Date",
  shipping_pickup_date: "Ship/Pickup Date",
  pickup_date: "Ship/Pickup Date",
  follow_up_date: "Follow-up Date",
  followup_date: "Follow-up Date",
  internal_notes: "Internal Notes",
  notes: "Internal Notes",
  last_updated: "Last Updated",
  updated_at: "Last Updated"
};

function resetGTPCSTicketAndOrderTrackingSafe() {
  const ss = SpreadsheetApp.openById(TICKET_RESET_SPREADSHEET_ID);

  const responseSheet = getOrCreateTicketResetSheet_(ss, FORM_RESPONSES_SHEET_NAME);
  const orderSheet = getOrCreateTicketResetSheet_(ss, ORDER_TRACKING_SHEET_NAME);

  const responseRows = readTicketResetRowsByHeader_(responseSheet, FORM_RESPONSE_HEADERS, FORM_RESPONSE_ALIASES);
  const orderRows = readTicketResetRowsByHeader_(orderSheet, ORDER_TRACKING_HEADERS, ORDER_TRACKING_ALIASES);

  backupTicketResetSheet_(ss, responseSheet);
  backupTicketResetSheet_(ss, orderSheet);

  rebuildFormResponsesSheet_(responseSheet, responseRows);
  rebuildOrderTrackingSheet_(orderSheet, orderRows);

  SpreadsheetApp.flush();
}

function resetGTPCSTicketAndOrderTrackingBlank() {
  const ss = SpreadsheetApp.openById(TICKET_RESET_SPREADSHEET_ID);

  const responseSheet = getOrCreateTicketResetSheet_(ss, FORM_RESPONSES_SHEET_NAME);
  const orderSheet = getOrCreateTicketResetSheet_(ss, ORDER_TRACKING_SHEET_NAME);

  backupTicketResetSheet_(ss, responseSheet);
  backupTicketResetSheet_(ss, orderSheet);

  rebuildFormResponsesSheet_(responseSheet, []);
  rebuildOrderTrackingSheet_(orderSheet, []);

  SpreadsheetApp.flush();
}

function getOrCreateTicketResetSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);

  if (!sheet && name === FORM_RESPONSES_SHEET_NAME) {
    const oldSheet = ss.getSheetByName("Form Responses 1");
    if (oldSheet) {
      oldSheet.setName(FORM_RESPONSES_SHEET_NAME);
      sheet = oldSheet;
    }
  }

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  return sheet;
}

function readTicketResetRowsByHeader_(sheet, requiredHeaders, aliases) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(header => canonicalTicketResetHeader_(header, aliases));
  const rows = [];

  values.slice(1).forEach(row => {
    const item = {};

    row.forEach((value, index) => {
      const header = headers[index];
      if (!requiredHeaders.includes(header)) return;
      if (value === "" || value === null || value === undefined) return;
      if (!item[header]) item[header] = value;
    });

    if (rowHasAnyValue_(item)) {
      rows.push(item);
    }
  });

  return rows;
}

function rebuildFormResponsesSheet_(sheet, rows) {
  rebuildTicketResetSheet_(sheet, FORM_RESPONSE_HEADERS, rows);
  styleTicketResetSheet_(sheet, FORM_RESPONSE_HEADERS.length);

  applyTicketResetDropdownByHeader_(sheet, FORM_RESPONSE_HEADERS, "Ticket Status", [
    "New",
    "Contacted",
    "Pending Payment",
    "Reserved",
    "Completed",
    "Closed",
    "Rejected / Spam"
  ]);

  applyDateFormatByHeader_(sheet, FORM_RESPONSE_HEADERS, "Timestamp");
  setColumnWidths_(sheet, [
    155, 130, 170, 220, 140, 140, 240, 170,
    150, 360, 280, 260, 140, 150, 260, 150
  ]);
}

function rebuildOrderTrackingSheet_(sheet, rows) {
  rebuildTicketResetSheet_(sheet, ORDER_TRACKING_HEADERS, rows);
  styleTicketResetSheet_(sheet, ORDER_TRACKING_HEADERS.length);

  applyTicketResetDropdownByHeader_(sheet, ORDER_TRACKING_HEADERS, "Order Status", [
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

  applyTicketResetDropdownByHeader_(sheet, ORDER_TRACKING_HEADERS, "Payment Status", [
    "Unpaid",
    "Deposit",
    "Paid",
    "Refunded",
    "Chargeback Risk",
    "Cancelled"
  ]);

  applyTicketResetDropdownByHeader_(sheet, ORDER_TRACKING_HEADERS, "Payment Method", [
    "Cash",
    "Interac e-Transfer",
    "Wire",
    "PayPal G&S",
    "Credit Card",
    "Other"
  ]);

  applyTicketResetDropdownByHeader_(sheet, ORDER_TRACKING_HEADERS, "Fulfillment", [
    "Local Pickup",
    "Shipping",
    "Local Delivery",
    "Hold / Reserve"
  ]);

  applyTicketResetDropdownByHeader_(sheet, ORDER_TRACKING_HEADERS, "Carrier", [
    "",
    "Canada Post",
    "UPS",
    "FedEx",
    "Purolator",
    "DHL",
    "Other"
  ]);

  applyCurrencyFormatByHeader_(sheet, ORDER_TRACKING_HEADERS, "Sale Price CAD");
  applyCurrencyFormatByHeader_(sheet, ORDER_TRACKING_HEADERS, "Amount Paid CAD");
  applyCurrencyFormatByHeader_(sheet, ORDER_TRACKING_HEADERS, "Balance Due CAD");
  applyDateFormatByHeader_(sheet, ORDER_TRACKING_HEADERS, "Date Created");
  applyDateFormatByHeader_(sheet, ORDER_TRACKING_HEADERS, "Ship/Pickup Date");
  applyDateFormatByHeader_(sheet, ORDER_TRACKING_HEADERS, "Follow-up Date");
  applyDateFormatByHeader_(sheet, ORDER_TRACKING_HEADERS, "Last Updated");
  setupTicketResetBalanceFormula_(sheet, ORDER_TRACKING_HEADERS);

  setColumnWidths_(sheet, [
    130, 130, 150, 180, 220, 140, 140, 240, 150, 150,
    160, 130, 140, 140, 140, 130, 180, 140, 140, 300, 140
  ]);
}

function rebuildTicketResetSheet_(sheet, headers, rows) {
  ensureTicketResetSheetSize_(sheet, Math.max(rows.length + 1, 100), headers.length);

  const filter = sheet.getFilter();
  if (filter) {
    filter.remove();
  }

  sheet.clear();

  if (sheet.getMaxColumns() > headers.length) {
    sheet.deleteColumns(headers.length + 1, sheet.getMaxColumns() - headers.length);
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length) {
    const mappedRows = rows.map(row => headers.map(header => row[header] || ""));
    sheet.getRange(2, 1, mappedRows.length, headers.length).setValues(mappedRows);
  }
}

function styleTicketResetSheet_(sheet, headerCount) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headerCount)
    .setFontWeight("bold")
    .setBackground("#162231")
    .setFontColor("#ffffff")
    .setWrap(true);

  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), headerCount)
    .setWrap(true)
    .setVerticalAlignment("top");

  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), headerCount).createFilter();
}

function applyTicketResetDropdownByHeader_(sheet, headers, headerName, values) {
  const col = headers.indexOf(headerName) + 1;
  if (!col) return;

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}

function applyCurrencyFormatByHeader_(sheet, headers, headerName) {
  const col = headers.indexOf(headerName) + 1;
  if (!col) return;
  sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat("$#,##0");
}

function applyDateFormatByHeader_(sheet, headers, headerName) {
  const col = headers.indexOf(headerName) + 1;
  if (!col) return;
  sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat("yyyy-mm-dd");
}

function setupTicketResetBalanceFormula_(sheet, headers) {
  const saleCol = headers.indexOf("Sale Price CAD") + 1;
  const paidCol = headers.indexOf("Amount Paid CAD") + 1;
  const balanceCol = headers.indexOf("Balance Due CAD") + 1;

  if (!saleCol || !paidCol || !balanceCol) return;

  const saleLetter = ticketResetColumnToLetter_(saleCol);
  const paidLetter = ticketResetColumnToLetter_(paidCol);
  const formulas = [];

  for (let row = 2; row <= Math.max(sheet.getMaxRows(), 501); row++) {
    formulas.push([`=IF(${saleLetter}${row}="","",${saleLetter}${row}-${paidLetter}${row})`]);
  }

  sheet.getRange(2, balanceCol, formulas.length, 1).setFormulas(formulas);
}

function setColumnWidths_(sheet, widths) {
  widths.forEach((width, index) => {
    sheet.setColumnWidth(index + 1, width);
  });
}

function ensureTicketResetSheetSize_(sheet, rows, columns) {
  if (sheet.getMaxRows() < rows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  }

  if (sheet.getMaxColumns() < columns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
  }
}

function backupTicketResetSheet_(ss, sourceSheet) {
  const backup = sourceSheet.copyTo(ss);
  const timestamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyyMMdd-HHmmss");
  backup.setName(`Backup ${sourceSheet.getName()} ${timestamp}`);
}

function rowHasAnyValue_(row) {
  return Object.values(row).some(value => value !== "" && value !== null && value !== undefined);
}

function canonicalTicketResetHeader_(header, aliases) {
  const normalized = normalizeTicketResetHeader_(header);
  return aliases[normalized] || ticketResetHeaderByNormalizedName_(normalized, aliases) || "";
}

function ticketResetHeaderByNormalizedName_(normalized, aliases) {
  const allHeaders = FORM_RESPONSE_HEADERS.concat(ORDER_TRACKING_HEADERS);
  return allHeaders.find(header => normalizeTicketResetHeader_(header) === normalized) || aliases[normalized] || "";
}

function normalizeTicketResetHeader_(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\$/g, " price ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function ticketResetColumnToLetter_(column) {
  let temp = "";
  let letter = "";

  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }

  return letter;
}
