const INVENTORY_UPLOADER_SPREADSHEET_ID = "1KzVm-sNSR8SI-3_tcHJSE9bxWvNKSWcfBymlG6Ti6L8";
const INVENTORY_UPLOADER_SHEET_GID = 190180623;
const INVENTORY_UPLOADER_FORM_ID = "";
const INVENTORY_UPLOADER_FORM_PROPERTY = "GTPCS_INVENTORY_UPLOADER_FORM_ID";

const UPLOADER_ACTION_TITLE = "What do you want to do?";
const ADD_ITEM_ACTION = "Add new item";
const MARK_SOLD_ACTION = "Mark item sold / out of stock";

const ADD_FIELD_TITLES = {
  sku: "SKU",
  status: "Initial status",
  category: "Category",
  name: "Product name",
  quantity: "Quantity",
  price_local: "Local price CAD",
  price_shipped: "Shipped price CAD",
  condition: "Condition",
  short_description: "Short description",
  description: "Full description",
  specs: "Specs summary",
  cpu: "CPU",
  gpu: "GPU",
  motherboard: "Motherboard",
  ram: "RAM",
  storage: "Storage",
  psu: "PSU",
  case: "Case",
  cooling: "Cooling",
  os: "OS",
  image_url: "Main image URL",
  image_urls: "Additional image URLs",
  image_uploads: "Product images"
};

const MARK_SOLD_FIELD_TITLES = {
  item: "In-stock item to update",
  status: "New status",
  note: "Status note"
};

const INVENTORY_UPLOADER_HEADERS = [
  "sku",
  "status",
  "category",
  "name",
  "quantity",
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

const INVENTORY_UPLOADER_HEADER_ALIASES = {
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
  qty: "quantity",
  stock_qty: "quantity",
  stock_quantity: "quantity",
  item_quantity: "quantity",
  available_quantity: "quantity",
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

function setupGTPCSInventoryUploaderForm() {
  const form = getOrCreateUploaderForm_();

  form.setTitle("GTPCS Inventory Uploader");
  form.setDescription("Internal form for adding GTPCS catalog items and marking existing items sold or unavailable.");
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setConfirmationMessage("Inventory update received.");
  removeUploaderResponseDestination_(form);

  clearUploaderForm_(form);

  const actionItem = form.addMultipleChoiceItem()
    .setTitle(UPLOADER_ACTION_TITLE)
    .setRequired(true);

  const markSoldSection = form.addPageBreakItem()
    .setTitle("Mark Item Sold Or Out Of Stock")
    .setHelpText("Use this section to update an existing live inventory item.");

  addMarkSoldQuestions_(form);

  const addSection = form.addPageBreakItem()
    .setTitle("Add Inventory Item")
    .setHelpText("Use this section for new GPUs, gaming PCs, motherboards, and parts.");

  const addRoutes = addAddItemQuestions_(form);

  const pcSpecsSection = form.addPageBreakItem()
    .setTitle("Gaming PC Specs")
    .setHelpText("Only fill this section for full gaming PC listings.");

  addGamingPcSpecQuestions_(form);

  const addSubmitSection = form.addPageBreakItem()
    .setTitle("Finish Add Item")
    .setHelpText("Submit this inventory item update.");

  addRoutes.categoryItem.setChoices([
    addRoutes.categoryItem.createChoice("GPUs", addSubmitSection),
    addRoutes.categoryItem.createChoice("Gaming PCs", pcSpecsSection),
    addRoutes.categoryItem.createChoice("Motherboards", addSubmitSection),
    addRoutes.categoryItem.createChoice("Parts", addSubmitSection)
  ]);
  markSoldSection.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pcSpecsSection.setGoToPage(addSubmitSection);
  addSubmitSection.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  actionItem.setChoices([
    actionItem.createChoice(ADD_ITEM_ACTION, addSection),
    actionItem.createChoice(MARK_SOLD_ACTION, markSoldSection)
  ]);

  installGTPCSInventoryUploaderSubmitTrigger();
  installGTPCSInventoryUploaderChoiceSyncTrigger();

  Logger.log(`Inventory uploader edit URL: ${form.getEditUrl()}`);
  Logger.log(`Inventory uploader public URL: ${form.getPublishedUrl()}`);
  Logger.log(`Inventory uploader form ID: ${form.getId()}`);
}

function syncGTPCSInventoryUploaderChoices() {
  const form = getOrCreateUploaderForm_();
  const choices = getInStockInventoryChoices_();
  const item = findFormItemByTitle_(form, MARK_SOLD_FIELD_TITLES.item);

  if (!item) {
    throw new Error(`Could not find form item: ${MARK_SOLD_FIELD_TITLES.item}. Run setupGTPCSInventoryUploaderForm first.`);
  }

  item.asListItem()
    .setChoiceValues(choices.length ? choices : ["No in-stock items found"]);
}

function installGTPCSInventoryUploaderSubmitTrigger() {
  const form = getOrCreateUploaderForm_();
  deleteUploaderTriggers_("handleGTPCSInventoryUploaderSubmit");

  ScriptApp.newTrigger("handleGTPCSInventoryUploaderSubmit")
    .forForm(form)
    .onFormSubmit()
    .create();
}

function installGTPCSInventoryUploaderChoiceSyncTrigger() {
  deleteUploaderTriggers_("syncGTPCSInventoryUploaderChoices");

  ScriptApp.newTrigger("syncGTPCSInventoryUploaderChoices")
    .timeBased()
    .everyHours(1)
    .create();
}

function handleGTPCSInventoryUploaderSubmit(e) {
  const answers = normalizeUploaderAnswers_(e);
  const action = cleanUploaderValue_(answers[UPLOADER_ACTION_TITLE]);

  if (action === ADD_ITEM_ACTION) {
    addInventoryItemFromUploader_(answers);
    return;
  }

  if (action === MARK_SOLD_ACTION) {
    updateInventoryStatusFromUploader_(answers);
    return;
  }

  throw new Error(`Unsupported inventory uploader action: ${action}`);
}

function addAddItemQuestions_(form) {
  form.addTextItem()
    .setTitle(ADD_FIELD_TITLES.sku)
    .setHelpText("Optional. Leave blank to generate one from the product name.")
    .setRequired(false);

  form.addListItem()
    .setTitle(ADD_FIELD_TITLES.status)
    .setChoiceValues(["In Stock", "Coming Soon", "Reserved", "TBD", "Sold"])
    .setRequired(true);

  const categoryItem = form.addMultipleChoiceItem()
    .setTitle(ADD_FIELD_TITLES.category)
    .setRequired(true);

  form.addTextItem()
    .setTitle(ADD_FIELD_TITLES.name)
    .setRequired(true);

  form.addTextItem()
    .setTitle(ADD_FIELD_TITLES.quantity)
    .setHelpText("Number of units available. Use 1 for a unique PC build or one-off item.")
    .setRequired(false)
    .setValidation(FormApp.createTextValidation()
      .requireNumberGreaterThanOrEqualTo(0)
      .build());

  form.addTextItem()
    .setTitle(ADD_FIELD_TITLES.price_local)
    .setRequired(false);

  form.addTextItem()
    .setTitle(ADD_FIELD_TITLES.price_shipped)
    .setRequired(false);

  form.addListItem()
    .setTitle(ADD_FIELD_TITLES.condition)
    .setChoiceValues(["New", "Open Box", "Used", "Refurbished", "For Parts", "TBD"])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle(ADD_FIELD_TITLES.short_description)
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle(ADD_FIELD_TITLES.description)
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle(ADD_FIELD_TITLES.specs)
    .setRequired(false);

  addMediaQuestions_(form);

  return { categoryItem };
}

function addGamingPcSpecQuestions_(form) {
  form.addSectionHeaderItem()
    .setTitle("Gaming PC specs")
    .setHelpText("This section only appears when the category is Gaming PCs.");

  [
    "cpu",
    "gpu",
    "motherboard",
    "ram",
    "storage",
    "psu",
    "case",
    "cooling",
    "os"
  ].forEach(key => {
    form.addTextItem()
      .setTitle(ADD_FIELD_TITLES[key])
      .setRequired(false);
  });
}

function addMediaQuestions_(form) {
  form.addSectionHeaderItem()
    .setTitle("Image uploads")
    .setHelpText(`Apps Script cannot create Google Forms file-upload questions. After setup, manually add a File upload question titled exactly "${ADD_FIELD_TITLES.image_uploads}" directly below this note in the Add Inventory Item section. Uploaded files with that title will be published and written to the website inventory automatically.`);

  form.addTextItem()
    .setTitle(ADD_FIELD_TITLES.image_url)
    .setHelpText("Optional. Use if the image is already hosted somewhere public.")
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle(ADD_FIELD_TITLES.image_urls)
    .setHelpText("Optional gallery URLs. Separate with commas, pipes, or new lines.")
    .setRequired(false);
}

function addMarkSoldQuestions_(form) {
  const choices = getInStockInventoryChoices_();

  form.addListItem()
    .setTitle(MARK_SOLD_FIELD_TITLES.item)
    .setHelpText("This list is synced from current In Stock inventory.")
    .setChoiceValues(choices.length ? choices : ["No in-stock items found"])
    .setRequired(true);

  form.addListItem()
    .setTitle(MARK_SOLD_FIELD_TITLES.status)
    .setChoiceValues(["Sold", "Reserved", "TBD", "Coming Soon"])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle(MARK_SOLD_FIELD_TITLES.note)
    .setHelpText("Optional internal note. This is not written to the public catalog.")
    .setRequired(false);
}

function addInventoryItemFromUploader_(answers) {
  const sheet = getUploaderInventorySheet_();
  ensureUploaderInventoryHeaders_(sheet);

  const headers = getUploaderHeaders_(sheet);
  const now = new Date();
  const name = cleanUploaderValue_(answers[ADD_FIELD_TITLES.name]);
  const sku = cleanUploaderValue_(answers[ADD_FIELD_TITLES.sku]) || generateUploaderSku_(name);
  const uploadedImageUrls = publishUploaderUploadedImages_(answers[ADD_FIELD_TITLES.image_uploads]);
  const manualMainImageUrl = cleanUploaderValue_(answers[ADD_FIELD_TITLES.image_url]);
  const manualGalleryUrls = splitUploaderImageUrls_(answers[ADD_FIELD_TITLES.image_urls]);
  const imageUrls = uniqueUploaderValues_([manualMainImageUrl].concat(manualGalleryUrls, uploadedImageUrls));

  if (!name) {
    throw new Error("Product name is required to add an item.");
  }

  if (findUploaderRowBySku_(sheet, headers, sku)) {
    throw new Error(`SKU already exists: ${sku}`);
  }

  const values = {
    sku,
    status: cleanUploaderValue_(answers[ADD_FIELD_TITLES.status]) || "In Stock",
    category: cleanUploaderValue_(answers[ADD_FIELD_TITLES.category]) || "Parts",
    name,
    quantity: cleanUploaderValue_(answers[ADD_FIELD_TITLES.quantity]) || "1",
    price_local: cleanUploaderValue_(answers[ADD_FIELD_TITLES.price_local]),
    price_shipped: cleanUploaderValue_(answers[ADD_FIELD_TITLES.price_shipped]),
    condition: cleanUploaderValue_(answers[ADD_FIELD_TITLES.condition]),
    short_description: cleanUploaderValue_(answers[ADD_FIELD_TITLES.short_description]),
    description: cleanUploaderValue_(answers[ADD_FIELD_TITLES.description]),
    specs: cleanUploaderValue_(answers[ADD_FIELD_TITLES.specs]),
    cpu: cleanUploaderValue_(answers[ADD_FIELD_TITLES.cpu]),
    gpu: cleanUploaderValue_(answers[ADD_FIELD_TITLES.gpu]),
    motherboard: cleanUploaderValue_(answers[ADD_FIELD_TITLES.motherboard]),
    ram: cleanUploaderValue_(answers[ADD_FIELD_TITLES.ram]),
    storage: cleanUploaderValue_(answers[ADD_FIELD_TITLES.storage]),
    psu: cleanUploaderValue_(answers[ADD_FIELD_TITLES.psu]),
    case: cleanUploaderValue_(answers[ADD_FIELD_TITLES.case]),
    cooling: cleanUploaderValue_(answers[ADD_FIELD_TITLES.cooling]),
    os: cleanUploaderValue_(answers[ADD_FIELD_TITLES.os]),
    image_url: manualMainImageUrl || uploadedImageUrls[0] || "",
    image_urls: imageUrls.join("\n"),
    created_at: now,
    updated_at: now
  };

  const row = headers.map(header => values[header] || "");
  sheet.getRange(Math.max(sheet.getLastRow() + 1, 2), 1, 1, headers.length).setValues([row]);
  syncGTPCSInventoryUploaderChoices();
}

function updateInventoryStatusFromUploader_(answers) {
  const sheet = getUploaderInventorySheet_();
  ensureUploaderInventoryHeaders_(sheet);

  const headers = getUploaderHeaders_(sheet);
  const selectedItem = cleanUploaderValue_(answers[MARK_SOLD_FIELD_TITLES.item]);
  const sku = skuFromUploaderChoice_(selectedItem);
  const newStatus = cleanUploaderValue_(answers[MARK_SOLD_FIELD_TITLES.status]);

  if (!sku || selectedItem === "No in-stock items found") {
    throw new Error("Select a valid in-stock item to update.");
  }

  if (!newStatus) {
    throw new Error("New status is required.");
  }

  const row = findUploaderRowBySku_(sheet, headers, sku);
  if (!row) {
    throw new Error(`Could not find SKU in inventory sheet: ${sku}`);
  }

  setUploaderCellByHeader_(sheet, headers, row, "status", newStatus);
  setUploaderCellByHeader_(sheet, headers, row, "updated_at", new Date());
  syncGTPCSInventoryUploaderChoices();
}

function getInStockInventoryChoices_() {
  const sheet = getUploaderInventorySheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(header => canonicalUploaderHeader_(header));
  const skuCol = headers.indexOf("sku");
  const statusCol = headers.indexOf("status");
  const nameCol = headers.indexOf("name");
  const priceCol = headers.indexOf("price_local");

  if (skuCol < 0 || statusCol < 0 || nameCol < 0) return [];

  return values.slice(1)
    .filter(row => cleanUploaderValue_(row[statusCol]).toLowerCase() === "in stock")
    .map(row => {
      const sku = cleanUploaderValue_(row[skuCol]);
      const name = cleanUploaderValue_(row[nameCol]);
      const price = priceCol >= 0 ? cleanUploaderValue_(row[priceCol]) : "";
      return [sku, name, price].filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .slice(0, 500);
}

function getOrCreateUploaderForm_() {
  const properties = PropertiesService.getScriptProperties();
  const savedId = properties.getProperty(INVENTORY_UPLOADER_FORM_PROPERTY);
  const formId = INVENTORY_UPLOADER_FORM_ID || savedId;

  if (formId) {
    const form = FormApp.openById(formId);
    properties.setProperty(INVENTORY_UPLOADER_FORM_PROPERTY, form.getId());
    return form;
  }

  const form = FormApp.create("GTPCS Inventory Uploader");
  properties.setProperty(INVENTORY_UPLOADER_FORM_PROPERTY, form.getId());
  return form;
}

function getUploaderInventorySheet_() {
  const ss = SpreadsheetApp.openById(INVENTORY_UPLOADER_SPREADSHEET_ID);
  let sheet = ss.getSheetById(INVENTORY_UPLOADER_SHEET_GID);

  if (!sheet) {
    sheet = ss.getSheetByName("Inventory Database") || ss.getSheets()[0];
  }

  return sheet;
}

function ensureUploaderInventoryHeaders_(sheet) {
  const currentHeaders = getUploaderHeaders_(sheet);

  INVENTORY_UPLOADER_HEADERS.forEach(header => {
    if (!currentHeaders.includes(header)) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      currentHeaders.push(header);
    }
  });
}

function getUploaderHeaders_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(header => canonicalUploaderHeader_(header));
}

function findUploaderRowBySku_(sheet, headers, sku) {
  const skuCol = headers.indexOf("sku") + 1;
  if (!skuCol) return 0;

  const values = sheet.getRange(2, skuCol, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  const wanted = cleanUploaderValue_(sku).toLowerCase();

  for (let index = 0; index < values.length; index++) {
    if (cleanUploaderValue_(values[index][0]).toLowerCase() === wanted) {
      return index + 2;
    }
  }

  return 0;
}

function setUploaderCellByHeader_(sheet, headers, row, header, value) {
  const col = headers.indexOf(header) + 1;
  if (!col) {
    throw new Error(`Missing inventory column: ${header}`);
  }

  sheet.getRange(row, col).setValue(value);
}

function findFormItemByTitle_(form, title) {
  return form.getItems().find(item => item.getTitle && item.getTitle() === title) || null;
}

function clearUploaderForm_(form) {
  form.getItems().forEach(item => {
    form.deleteItem(item);
  });
}

function removeUploaderResponseDestination_(form) {
  try {
    form.removeDestination();
  } catch (error) {
    console.warn(`Skipped removing form response destination: ${error.message}`);
  }
}

function deleteUploaderTriggers_(functionName) {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === functionName)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

function normalizeUploaderAnswers_(event) {
  const answers = {};

  Object.entries(event && event.namedValues ? event.namedValues : {}).forEach(([question, value]) => {
    answers[question] = Array.isArray(value) ? value.join("\n") : value;
  });

  if (event && event.response) {
    event.response.getItemResponses().forEach(itemResponse => {
      const title = itemResponse.getItem().getTitle();
      const response = itemResponse.getResponse();

      if (Array.isArray(response)) {
        answers[title] = response.join("\n");
      } else if (response !== null && response !== undefined) {
        answers[title] = String(response);
      }
    });
  }

  return answers;
}

function publishUploaderUploadedImages_(value) {
  const fileIds = extractUploaderDriveFileIds_(value);

  return fileIds.map(fileId => {
    const file = DriveApp.getFileById(fileId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return `https://drive.google.com/open?id=${fileId}`;
  });
}

function extractUploaderDriveFileIds_(value) {
  return uniqueUploaderValues_(String(value || "")
    .split(/[\n,]+/)
    .map(part => {
      const cleaned = cleanUploaderValue_(part);
      const idMatch = cleaned.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileMatch = cleaned.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);

      if (idMatch) return idMatch[1];
      if (fileMatch) return fileMatch[1];
      if (/^[a-zA-Z0-9_-]{20,}$/.test(cleaned)) return cleaned;
      return "";
    })
    .filter(Boolean));
}

function splitUploaderImageUrls_(value) {
  return uniqueUploaderValues_(String(value || "")
    .split(/\n|\||,/)
    .map(cleanUploaderValue_)
    .filter(Boolean));
}

function uniqueUploaderValues_(values) {
  const seen = new Set();
  return values.filter(value => {
    const cleaned = cleanUploaderValue_(value);
    const key = cleaned.toLowerCase();

    if (!cleaned || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function skuFromUploaderChoice_(choice) {
  return cleanUploaderValue_(choice).split("|")[0].trim();
}

function generateUploaderSku_(name) {
  const base = cleanUploaderValue_(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "item";

  const stamp = Utilities.formatDate(new Date(), "America/Edmonton", "yyyyMMddHHmmss");
  return `${base}-${stamp}`;
}

function canonicalUploaderHeader_(header) {
  const normalized = normalizeUploaderHeader_(header);
  return INVENTORY_UPLOADER_HEADER_ALIASES[normalized] || normalized;
}

function normalizeUploaderHeader_(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\$/g, " price ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanUploaderValue_(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
