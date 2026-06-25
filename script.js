(function () {
  "use strict";

  var PLACEHOLDER_IMAGE = "assets/placeholder-product.svg";
  var PUBLIC_FIELDS = [
    "sku", "status", "category", "name", "price_local", "price_shipped",
    "condition", "short_description", "description", "specs", "cpu", "gpu",
    "motherboard", "ram", "storage", "psu", "case", "cooling", "os",
    "image_url", "image_urls", "created_at", "updated_at"
  ];

  var state = {
    products: [],
    filters: {
      category: "All",
      status: "All",
      search: "",
      sort: "newest"
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    setupRequestLinks();

    if (document.body.dataset.page === "request") {
      setupRequestForm();
      refreshIcons();
      return;
    }

    loadInventory()
      .then(function (products) {
        state.products = products;
        routePage();
      })
      .catch(function (error) {
        showLoadError(error);
      })
      .finally(refreshIcons);
  });

  function setupNav() {
    var toggle = document.querySelector(".nav-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", function () {
      var isOpen = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  function setupRequestLinks() {
    document.querySelectorAll("[data-request-link]").forEach(function (link) {
      link.setAttribute("href", buildRequestLink());
    });
  }

  function routePage() {
    var page = document.body.dataset.page;

    if (page === "home") {
      renderFeaturedProducts();
    }

    if (page === "inventory") {
      setupInventoryPage();
      renderInventoryProducts();
    }

    if (page === "product") {
      renderProductDetail();
    }

    refreshIcons();
  }

  function loadInventory() {
    if (!window.CONFIG || !CONFIG.inventoryCsvUrl) {
      return Promise.reject(new Error("Inventory CSV URL is missing in config.js."));
    }

    if (!window.Papa) {
      return Promise.reject(new Error("PapaParse did not load. Check the CDN script tag or network access."));
    }

    return new Promise(function (resolve, reject) {
      Papa.parse(CONFIG.inventoryCsvUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          if (results.errors && results.errors.length) {
            reject(new Error(results.errors[0].message));
            return;
          }

          var products = (results.data || [])
            .map(normalizeRow)
            .filter(function (product) {
              return product.name || product.sku;
            });

          resolve(products);
        },
        error: function (error) {
          reject(error);
        }
      });
    });
  }

  function normalizeHeader(header) {
    return String(header || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/\$/g, " price ")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function canonicalKey(key) {
    var aliases = {
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

    return aliases[key] || key;
  }

  function normalizeRow(row, index) {
    var clean = {};

    Object.keys(row || {}).forEach(function (header) {
      var key = canonicalKey(normalizeHeader(header));
      if (!PUBLIC_FIELDS.includes(key)) return;

      var value = cleanValue(row[header]);
      if (value && !clean[key]) {
        clean[key] = value;
      }
    });

    clean.sku = clean.sku || slugify(clean.name || "item-" + index);
    clean.name = clean.name || clean.sku;
    clean.category = normalizeCategory(clean.category);
    clean.status = normalizeStatus(clean.status);
    clean.priceLocalDisplay = formatPrice(clean.price_local);
    clean.priceShippedDisplay = formatPrice(clean.price_shipped);
    clean.priceLocalValue = priceNumber(clean.price_local);
    clean.createdTime = dateTime(clean.created_at || clean.updated_at);
    clean.images = collectImages(clean);
    clean.cardImage = clean.images[0] || PLACEHOLDER_IMAGE;
    clean.requestLabel = requestButtonLabel(clean.status);
    clean.searchText = [
      clean.sku, clean.status, clean.category, clean.name, clean.condition,
      clean.short_description, clean.description, clean.specs, clean.cpu,
      clean.gpu, clean.motherboard, clean.ram, clean.storage, clean.psu,
      clean.case, clean.cooling, clean.os
    ].filter(Boolean).join(" ").toLowerCase();

    return clean;
  }

  function cleanValue(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function normalizeStatus(status) {
    var raw = String(status || "").trim().toLowerCase();
    if (!raw) return "TBD";
    if (["in stock", "instock", "available", "for sale", "active"].includes(raw)) return "In Stock";
    if (["reserved", "pending", "hold", "on hold"].includes(raw)) return "Reserved";
    if (["sold", "sold out", "unavailable"].includes(raw)) return "Sold";
    if (["coming soon", "incoming", "soon"].includes(raw)) return "Coming Soon";
    if (["tbd", "unknown", "ask", "ask for details"].includes(raw)) return "TBD";
    return titleCase(status);
  }

  function normalizeCategory(category) {
    var raw = String(category || "").trim().toLowerCase();
    if (!raw) return "Parts";
    if (["gpu", "gpus", "graphics card", "graphics cards", "video card", "video cards"].includes(raw)) return "GPUs";
    if (["gaming pc", "gaming pcs", "pc", "pcs", "system", "systems", "desktop"].includes(raw)) return "Gaming PCs";
    if (["motherboard", "motherboards", "mobo"].includes(raw)) return "Motherboards";
    if (["part", "parts", "component", "components", "pc parts"].includes(raw)) return "Parts";
    return titleCase(category);
  }

  function formatPrice(value) {
    var cleaned = cleanValue(value);
    if (!cleaned) return "";
    var numeric = priceNumber(cleaned);
    if (/^\$/.test(cleaned) || /cad/i.test(cleaned) || Number.isNaN(numeric)) {
      return cleaned;
    }
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: numeric % 1 === 0 ? 0 : 2
    }).format(numeric);
  }

  function priceNumber(value) {
    var numeric = Number(String(value || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(numeric) ? numeric : Number.NaN;
  }

  function dateTime(value) {
    var time = Date.parse(value || "");
    return Number.isFinite(time) ? time : 0;
  }

  function titleCase(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\b[a-z]/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
  }

  function collectImages(product) {
    var values = [];
    if (product.image_urls) values = values.concat(splitImageUrls(product.image_urls));
    if (product.image_url) values.push(product.image_url);

    return values
      .map(normalizeImageUrl)
      .filter(Boolean)
      .filter(function (url, index, all) {
        return all.indexOf(url) === index;
      });
  }

  function splitImageUrls(value) {
    return String(value || "")
      .split(/[\n|,]+/)
      .map(function (url) {
        return url.trim();
      })
      .filter(Boolean);
  }

  function normalizeImageUrl(url) {
    var raw = cleanValue(url);
    if (!raw) return "";

    if (/\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(raw)) {
      return raw;
    }

    var fileMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    var openMatch = raw.match(/drive\.google\.com\/open\?id=([^&]+)/i);
    var ucMatch = raw.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
    var id = fileMatch && fileMatch[1] || openMatch && openMatch[1] || ucMatch && ucMatch[1];

    if (id) {
      return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(id) + "&sz=w1200";
    }

    return raw;
  }

  function renderFeaturedProducts() {
    var target = document.getElementById("featured-products");
    if (!target) return;

    var products = state.products
      .filter(function (product) {
        return product.status !== "Sold";
      })
      .sort(function (a, b) {
        if (a.status === "In Stock" && b.status !== "In Stock") return -1;
        if (a.status !== "In Stock" && b.status === "In Stock") return 1;
        return b.createdTime - a.createdTime;
      })
      .slice(0, 6);

    renderProductGrid(target, products, "No featured inventory is currently listed.");
  }

  function setupInventoryPage() {
    var params = new URLSearchParams(window.location.search);
    var categoryParam = params.get("category");

    var categoryFilter = document.getElementById("category-filter");
    var statusFilter = document.getElementById("status-filter");
    var sortFilter = document.getElementById("sort-filter");
    var search = document.getElementById("search");

    if (categoryParam) {
      state.filters.category = normalizeCategory(categoryParam);
      if (categoryFilter) categoryFilter.value = state.filters.category;
    }

    if (categoryFilter) {
      categoryFilter.addEventListener("change", function () {
        state.filters.category = categoryFilter.value;
        renderInventoryProducts();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", function () {
        state.filters.status = statusFilter.value;
        renderInventoryProducts();
      });
    }

    if (sortFilter) {
      sortFilter.addEventListener("change", function () {
        state.filters.sort = sortFilter.value;
        renderInventoryProducts();
      });
    }

    if (search) {
      search.addEventListener("input", function () {
        state.filters.search = search.value.trim().toLowerCase();
        renderInventoryProducts();
      });
    }
  }

  function renderInventoryProducts() {
    var target = document.getElementById("inventory-products");
    if (!target) return;

    var products = state.products
      .filter(function (product) {
        if (state.filters.category === "Sold") return product.status === "Sold";
        if (state.filters.category !== "All" && product.category !== state.filters.category) return false;
        if (state.filters.status !== "All" && product.status !== state.filters.status) return false;
        if (state.filters.search && !product.searchText.includes(state.filters.search)) return false;
        return true;
      })
      .sort(sortProducts);

    var count = document.getElementById("result-count");
    if (count) {
      count.textContent = products.length + " item" + (products.length === 1 ? "" : "s") + " shown";
    }

    renderProductGrid(target, products, "No inventory matches the current filters.");
  }

  function sortProducts(a, b) {
    if (state.filters.sort === "price-asc") {
      return sortablePrice(a) - sortablePrice(b);
    }
    if (state.filters.sort === "price-desc") {
      return sortablePrice(b) - sortablePrice(a);
    }
    return (b.createdTime || 0) - (a.createdTime || 0);
  }

  function sortablePrice(product) {
    return Number.isFinite(product.priceLocalValue) ? product.priceLocalValue : Number.MAX_SAFE_INTEGER;
  }

  function renderProductGrid(target, products, emptyMessage) {
    if (!products.length) {
      target.innerHTML = emptyState(emptyMessage);
      return;
    }

    target.innerHTML = products.map(productCardHtml).join("");
    refreshIcons();
  }

  function productCardHtml(product) {
    var isSold = product.status === "Sold";
    var requestButton = isSold
      ? '<span class="button disabled" aria-disabled="true">Sold</span>'
      : '<a class="button primary" href="' + escapeAttr(buildRequestLink(product)) + '"><i data-lucide="send"></i>' + escapeHtml(product.requestLabel) + '</a>';

    return [
      '<article class="product-card ' + (isSold ? "is-sold" : "") + '">',
      '  <a class="product-media" href="product.html?sku=' + encodeURIComponent(product.sku) + '">',
      '    <img src="' + escapeAttr(product.cardImage) + '" alt="' + escapeAttr(product.name) + '" loading="lazy" onerror="this.src=\'' + PLACEHOLDER_IMAGE + '\'">',
      '    <span class="badge ' + statusClass(product.status) + '">' + escapeHtml(product.status) + '</span>',
      '  </a>',
      '  <div class="product-body">',
      '    <div class="product-kicker"><span>' + escapeHtml(product.category) + '</span><span>' + escapeHtml(product.condition || "") + '</span></div>',
      '    <h3 class="product-title"><a href="product.html?sku=' + encodeURIComponent(product.sku) + '">' + escapeHtml(product.name) + '</a></h3>',
      priceListHtml(product),
      product.short_description ? '    <p class="product-desc">' + escapeHtml(product.short_description) + '</p>' : "",
      '    <div class="card-actions">',
      requestButton,
      '      <a class="button ghost" href="product.html?sku=' + encodeURIComponent(product.sku) + '"><i data-lucide="info"></i>View Details</a>',
      '    </div>',
      '  </div>',
      '</article>'
    ].join("");
  }

  function priceListHtml(product) {
    var rows = [];
    if (product.priceLocalDisplay) rows.push('<div class="price-row"><span>Local</span><strong>' + escapeHtml(product.priceLocalDisplay) + '</strong></div>');
    if (product.priceShippedDisplay) rows.push('<div class="price-row"><span>Shipped</span><strong>' + escapeHtml(product.priceShippedDisplay) + '</strong></div>');
    return rows.length ? '<div class="price-list">' + rows.join("") + '</div>' : "";
  }

  function renderProductDetail() {
    var target = document.getElementById("product-detail");
    if (!target) return;

    var sku = new URLSearchParams(window.location.search).get("sku");
    var product = state.products.find(function (item) {
      return item.sku === sku;
    });

    if (!sku || !product) {
      target.innerHTML = emptyState("Product not found. It may have been removed from current inventory.");
      refreshIcons();
      return;
    }

    document.title = product.name + " | GTPCS";
    target.innerHTML = productDetailHtml(product);
    setupGallery();
    refreshIcons();
  }

  function productDetailHtml(product) {
    var images = product.images.length ? product.images : [PLACEHOLDER_IMAGE];
    var isSold = product.status === "Sold";
    var requestButton = isSold
      ? '<span class="button disabled" aria-disabled="true">Sold</span>'
      : '<a class="button primary" href="' + escapeAttr(buildRequestLink(product)) + '"><i data-lucide="send"></i>' + escapeHtml(product.requestLabel) + '</a>';

    return [
      '<div class="detail-grid">',
      '  <div class="gallery">',
      '    <div class="gallery-main"><img data-gallery-main src="' + escapeAttr(images[0]) + '" alt="' + escapeAttr(product.name) + '" onerror="this.src=\'' + PLACEHOLDER_IMAGE + '\'"></div>',
      thumbRowHtml(images, product.name),
      '  </div>',
      '  <div class="product-copy">',
      '    <p class="eyebrow">' + escapeHtml(product.category) + '</p>',
      '    <h1>' + escapeHtml(product.name) + '</h1>',
      '    <div class="detail-meta">',
      '      <span class="badge ' + statusClass(product.status) + '">' + escapeHtml(product.status) + '</span>',
      product.condition ? '      <span class="badge tbd">' + escapeHtml(product.condition) + '</span>' : "",
      '    </div>',
      '    <div class="detail-price">' + priceListHtml(product) + '</div>',
      product.description ? '    <p>' + escapeHtml(product.description) + '</p>' : product.short_description ? '    <p>' + escapeHtml(product.short_description) + '</p>' : "",
      '    <div class="action-row">' + requestButton + '<a class="button ghost" href="inventory.html"><i data-lucide="arrow-left"></i>Back to Inventory</a></div>',
      specsHtml(product),
      notesHtml(),
      '  </div>',
      '</div>'
    ].join("");
  }

  function thumbRowHtml(images, name) {
    if (images.length < 2) return "";
    return '<div class="thumb-row">' + images.map(function (image, index) {
      return '<button class="thumb ' + (index === 0 ? "active" : "") + '" type="button" data-gallery-src="' + escapeAttr(image) + '" aria-label="Show image ' + (index + 1) + '"><img src="' + escapeAttr(image) + '" alt="' + escapeAttr(name) + ' image ' + (index + 1) + '" loading="lazy" onerror="this.src=\'' + PLACEHOLDER_IMAGE + '\'"></button>';
    }).join("") + '</div>';
  }

  function specsHtml(product) {
    var rows = [];
    [
      ["CPU", product.cpu],
      ["GPU", product.gpu],
      ["Motherboard", product.motherboard],
      ["RAM", product.ram],
      ["Storage", product.storage],
      ["PSU", product.psu],
      ["Case", product.case],
      ["Cooling", product.cooling],
      ["OS", product.os]
    ].forEach(function (row) {
      if (row[1]) rows.push(row);
    });

    rows = rows.concat(parseSpecs(product.specs));

    if (!rows.length) return "";

    return '<div class="spec-table"><table><tbody>' + rows.map(function (row) {
      return '<tr><th scope="row">' + escapeHtml(row[0]) + '</th><td>' + escapeHtml(row[1]) + '</td></tr>';
    }).join("") + '</tbody></table></div>';
  }

  function parseSpecs(specs) {
    var value = cleanValue(specs);
    if (!value) return [];

    try {
      var parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.keys(parsed).map(function (key) {
          return [titleCase(key.replace(/_/g, " ")), String(parsed[key])];
        });
      }
    } catch (error) {
      /* Plain text specs are handled below. */
    }

    return value
      .split(/\n|;/)
      .map(function (line) {
        var parts = line.split(/:|-/, 2);
        if (parts.length < 2) return ["Spec", line.trim()];
        return [parts[0].trim(), parts[1].trim()];
      })
      .filter(function (row) {
        return row[0] && row[1];
      });
  }

  function notesHtml() {
    return [
      '<div class="notes-panel">',
      '  <h3>Pickup and shipping</h3>',
      '  <p>Located in Edmonton, Alberta.</p>',
      '  <p>Local pickup is available on most items. Shipping may be available on select items with tracking, insurance, and signature requirement.</p>',
      '  <p>High-value orders are manually reviewed before finalizing.</p>',
      '</div>'
    ].join("");
  }

  function setupGallery() {
    var main = document.querySelector("[data-gallery-main]");
    var thumbs = document.querySelectorAll("[data-gallery-src]");
    if (!main || !thumbs.length) return;

    thumbs.forEach(function (thumb) {
      thumb.addEventListener("click", function () {
        main.src = thumb.dataset.gallerySrc;
        thumbs.forEach(function (item) {
          item.classList.toggle("active", item === thumb);
        });
      });
    });
  }

  function buildRequestLink(product) {
    var pageUrl = window.CONFIG && CONFIG.requestPageUrl ? CONFIG.requestPageUrl : "request.html";
    var params = new URLSearchParams();

    if (product) {
      params.set("item", product.name || "");
      params.set("sku", product.sku || "");
      params.set("status", product.status || "");
      params.set("category", product.category || "");
      if (product.priceLocalDisplay) params.set("price", product.priceLocalDisplay);
    }

    var query = params.toString();
    return pageUrl + (query ? "?" + query : "");
  }

  function setupRequestForm() {
    var form = document.getElementById("request-form");
    if (!form) return;

    var params = new URLSearchParams(window.location.search);
    setFieldValue("request-item", params.get("item") || "");
    setFieldValue("request-sku", params.get("sku") || "");
    setFieldValue("request-status", params.get("status") || "");
    setFieldValue("request-category", params.get("category") || "");
    setFieldValue("request-price", params.get("price") || "");

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var item = fieldValue("request-item") || "Inventory item";
      var email = window.CONFIG && CONFIG.contactEmail ? CONFIG.contactEmail : "sales@gtpcs.ca";
      var subject = "Purchase Request - " + item;
      var lines = [
        "Purchase request from GTPCS.ca",
        "",
        "Item: " + item,
        "SKU: " + fieldValue("request-sku"),
        "Status: " + fieldValue("request-status"),
        "Category: " + fieldValue("request-category"),
        "Listed price: " + fieldValue("request-price"),
        "",
        "Buyer name: " + fieldValue("buyer-name"),
        "Buyer email: " + fieldValue("buyer-email"),
        "Phone: " + fieldValue("buyer-phone"),
        "Preferred handoff: " + fieldValue("handoff"),
        "",
        "Message:",
        fieldValue("buyer-message")
      ];

      window.location.href = "mailto:" + encodeURIComponent(email) +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
    });
  }

  function setFieldValue(id, value) {
    var field = document.getElementById(id);
    if (field) field.value = value || "";
  }

  function fieldValue(id) {
    var field = document.getElementById(id);
    return field ? field.value.trim() : "";
  }

  function requestButtonLabel(status) {
    if (status === "Reserved") return "Ask About Availability";
    if (status === "Coming Soon") return "Ask About ETA";
    if (status === "TBD") return "Ask for Details";
    return "Request to Buy";
  }

  function statusClass(status) {
    return slugify(status || "TBD");
  }

  function emptyState(message) {
    return '<div class="empty-state"><h3>No items shown</h3><p>' + escapeHtml(message) + '</p></div>';
  }

  function showLoadError(error) {
    var message = error && error.message ? error.message : "The inventory sheet could not be loaded.";
    var html = '<div class="error-state"><h3>Inventory unavailable</h3><p>' + escapeHtml(message) + '</p><p>If the Google Sheet is private, publish or share it publicly so GitHub Pages can read the CSV export.</p></div>';
    ["featured-products", "inventory-products", "product-detail"].forEach(function (id) {
      var target = document.getElementById(id);
      if (target) target.innerHTML = html;
    });

    var count = document.getElementById("result-count");
    if (count) count.textContent = "Inventory unavailable";
  }

  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  window.normalizeImageUrl = normalizeImageUrl;
})();
