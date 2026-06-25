const INVENTORY_SPREADSHEET_ID = "1KzVm-sNSR8SI-3_tcHJSE9bxWvNKSWcfBymlG6Ti6L8";
const INVENTORY_SHEET_GID = 190180623;
const INVENTORY_SHEET_NAME = "Inventory Database";

const INVENTORY_HEADERS = [
  "sku",
  "status",
  "category",
  "name",
  "price_local",
  "price_shipped",
  "condition",
  "short_description",
  "description",
  "specs",
  "cpu",
  "gpu",
  "motherboard",
  "ram",
  "storage",
  "psu",
  "case",
  "cooling",
  "os",
  "image_url",
  "image_urls",
  "created_at",
  "updated_at"
];

const INVENTORY_HEADER_ALIASES = {
  item_sku: "sku",
  product_sku: "sku",
  item_id: "sku",
  existing_sku_or_item: "sku",
  existing_sku_or_item_number: "sku",
  stock_status: "status",
  availability: "status",
  item_status: "status",
  type: "category",
  product_type: "category",
  item_category: "category",
  product_name: "name",
  item_name: "name",
  title: "name",
  local_price: "price_local",
  local_price_cad: "price_local",
  price_local_cad: "price_local",
  pickup_price: "price_local",
  price: "price_local",
  shipped_price: "price_shipped",
  shipped_price_cad: "price_shipped",
  shipping_price: "price_shipped",
  condition_notes: "condition",
  condition_and_notes: "condition",
  notes: "description",
  item_description: "description",
  full_description: "description",
  extra_specs_notes: "specs",
  extra_specs_or_notes: "specs",
  short_desc: "short_description",
  summary: "short_description",
  image: "image_url",
  photo: "image_url",
  photo_url: "image_url",
  photos: "image_urls",
  images: "image_urls",
  gallery: "image_urls",
  product_photos: "image_urls",
  photo_urls_album_url: "image_urls",
  photo_urls_or_album_url: "image_urls",
  created: "created_at",
  date_added: "created_at",
  timestamp: "created_at",
  last_updated: "updated_at"
};

function resetGTPCSInventoryDatabaseSafe() {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const sheet = getInventorySheet_(ss);
  const existingRows = readExistingInventoryRows_(sheet);

  backupSheet_(ss, sheet);
  rebuildInventorySheet_(sheet, existingRows);

  SpreadsheetApp.flush();
}

function resetGTPCSInventoryDatabaseBlank() {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const sheet = getInventorySheet_(ss);

  backupSheet_(ss, sheet);
  rebuildInventorySheet_(sheet, []);

  SpreadsheetApp.flush();
}

function getInventorySheet_(ss) {
  let sheet = ss.getSheetById(INVENTORY_SHEET_GID);

  if (!sheet) {
    sheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
  }

  if (!sheet) {
    sheet = ss.insertSheet(INVENTORY_SHEET_NAME);
  }

  if (sheet.getName() !== INVENTORY_SHEET_NAME && !ss.getSheetByName(INVENTORY_SHEET_NAME)) {
    sheet.setName(INVENTORY_SHEET_NAME);
  }

  return sheet;
}

function readExistingInventoryRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(header => canonicalInventoryHeader_(header));
  const rows = [];

  values.slice(1).forEach(row => {
    const item = {};

    row.forEach((value, index) => {
      const header = headers[index];
      if (!INVENTORY_HEADERS.includes(header)) return;
      if (value === "" || value === null || value === undefined) return;
      if (!item[header]) item[header] = value;
    });

    if (item.sku || item.name) {
      rows.push(item);
    }
  });

  return rows;
}

function rebuildInventorySheet_(sheet, rows) {
  ensureInventorySheetSize_(sheet, Math.max(rows.length + 1, 100), INVENTORY_HEADERS.length);

  const existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }

  sheet.clear();

  if (sheet.getMaxColumns() > INVENTORY_HEADERS.length) {
    sheet.deleteColumns(INVENTORY_HEADERS.length + 1, sheet.getMaxColumns() - INVENTORY_HEADERS.length);
  }

  sheet.getRange(1, 1, 1, INVENTORY_HEADERS.length).setValues([INVENTORY_HEADERS]);

  if (rows.length) {
    const mappedRows = rows.map(row => INVENTORY_HEADERS.map(header => row[header] || ""));
    sheet.getRange(2, 1, mappedRows.length, INVENTORY_HEADERS.length).setValues(mappedRows);
  }

  styleInventorySheet_(sheet);
  applyInventoryValidations_(sheet);
  applyInventoryFormats_(sheet);
}

function styleInventorySheet_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, INVENTORY_HEADERS.length);

  sheet.setFrozenRows(1);
  headerRange
    .setFontWeight("bold")
    .setBackground("#162231")
    .setFontColor("#ffffff")
    .setWrap(true);

  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), INVENTORY_HEADERS.length)
    .setWrap(true)
    .setVerticalAlignment("top");

  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 260);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 180);
  sheet.setColumnWidth(8, 260);
  sheet.setColumnWidth(9, 360);
  sheet.setColumnWidth(10, 320);
  sheet.setColumnWidth(20, 300);
  sheet.setColumnWidth(21, 380);

  const filter = sheet.getFilter();
  if (filter) {
    filter.remove();
  }

  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), INVENTORY_HEADERS.length).createFilter();
}

function applyInventoryValidations_(sheet) {
  applyInventoryDropdown_(sheet, "status", [
    "In Stock",
    "Reserved",
    "Sold",
    "Coming Soon",
    "TBD"
  ]);

  applyInventoryDropdown_(sheet, "category", [
    "GPUs",
    "Gaming PCs",
    "Motherboards",
    "Parts"
  ]);

  applyInventoryDropdown_(sheet, "condition", [
    "New",
    "Open Box",
    "Used",
    "Refurbished",
    "For Parts",
    "TBD"
  ]);
}

function applyInventoryFormats_(sheet) {
  applyInventoryColumnFormat_(sheet, "price_local", "$#,##0");
  applyInventoryColumnFormat_(sheet, "price_shipped", "$#,##0");
  applyInventoryColumnFormat_(sheet, "created_at", "yyyy-mm-dd");
  applyInventoryColumnFormat_(sheet, "updated_at", "yyyy-mm-dd");
}

function applyInventoryDropdown_(sheet, header, values) {
  const col = INVENTORY_HEADERS.indexOf(header) + 1;
  if (!col) return;

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}

function applyInventoryColumnFormat_(sheet, header, format) {
  const col = INVENTORY_HEADERS.indexOf(header) + 1;
  if (!col) return;
  sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat(format);
}

function ensureInventorySheetSize_(sheet, rows, columns) {
  if (sheet.getMaxRows() < rows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  }

  if (sheet.getMaxColumns() < columns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
  }
}

function backupSheet_(ss, sourceSheet) {
  const backup = sourceSheet.copyTo(ss);
  const timestamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyyMMdd-HHmmss");
  backup.setName(`Backup ${sourceSheet.getName()} ${timestamp}`);
}

function canonicalInventoryHeader_(header) {
  const normalized = normalizeInventoryHeader_(header);
  return INVENTORY_HEADER_ALIASES[normalized] || normalized;
}

function normalizeInventoryHeader_(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\$/g, " price ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
