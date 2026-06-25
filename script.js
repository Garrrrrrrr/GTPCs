(function () {
  "use strict";

  var PLACEHOLDER_IMAGE = "/assets/placeholder-product.svg";
  var PUBLIC_FIELDS = [
    "sku", "status", "category", "name", "price_local", "price_shipped",
    "quantity", "condition", "short_description", "description", "specs", "cpu", "gpu",
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
  var STATIC_PAGES = ["request", "repair", "about", "privacy", "terms"];

  document.addEventListener("DOMContentLoaded", function () {
    normalizeCleanUrl();
    setupNav();
    setupRequestLinks();

    if (document.body.dataset.page === "request") {
      setupRequestPage();
      refreshIcons();
      return;
    }

    if (STATIC_PAGES.includes(document.body.dataset.page)) {
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

  function normalizeCleanUrl() {
    var cleanPaths = {
      "/index.html": "/",
      "/inventory.html": "/inventory/",
      "/inventory/index.html": "/inventory/",
      "/product.html": "/product/",
      "/product/index.html": "/product/",
      "/request.html": "/request/",
      "/request/index.html": "/request/",
      "/repair.html": "/repair/",
      "/repair/index.html": "/repair/",
      "/about.html": "/about/",
      "/about/index.html": "/about/",
      "/privacy.html": "/privacy/",
      "/privacy/index.html": "/privacy/",
      "/terms.html": "/terms/",
      "/terms/index.html": "/terms/"
    };
    var cleanPath = cleanPaths[window.location.pathname];

    if (cleanPath) {
      window.history.replaceState(null, "", cleanPath + window.location.search + window.location.hash);
    }
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
      '  <a class="product-media" href="/product/?sku=' + encodeURIComponent(product.sku) + '">',
      '    <img src="' + escapeAttr(product.cardImage) + '" alt="' + escapeAttr(product.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMAGE + '\'">',
      '    <span class="badge ' + statusClass(product.status) + '">' + escapeHtml(product.status) + '</span>',
      '  </a>',
      '  <div class="product-body">',
      '    <div class="product-kicker"><span>' + escapeHtml(product.category) + '</span><span>' + escapeHtml(product.condition || "") + '</span></div>',
      '    <h3 class="product-title"><a href="/product/?sku=' + encodeURIComponent(product.sku) + '">' + escapeHtml(product.name) + '</a></h3>',
      priceListHtml(product),
      product.short_description ? '    <p class="product-desc">' + escapeHtml(product.short_description) + '</p>' : "",
      '    <div class="card-actions">',
      requestButton,
      '      <a class="button ghost" href="/product/?sku=' + encodeURIComponent(product.sku) + '"><i data-lucide="info"></i>View Details</a>',
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
      '    <div class="gallery-main"><img data-gallery-main src="' + escapeAttr(images[0]) + '" alt="' + escapeAttr(product.name) + '" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMAGE + '\'"></div>',
      thumbRowHtml(images, product.name),
      '  </div>',
      '  <div class="product-copy">',
      '    <p class="eyebrow">' + escapeHtml(product.category) + '</p>',
      '    <h1>' + escapeHtml(product.name) + '</h1>',
      '    <div class="detail-meta">',
      '      <span class="badge ' + statusClass(product.status) + '">' + escapeHtml(product.status) + '</span>',
      product.condition ? '      <span class="badge tbd">' + escapeHtml(product.condition) + '</span>' : "",
      product.quantity ? '      <span class="badge tbd">Qty ' + escapeHtml(product.quantity) + '</span>' : "",
      '    </div>',
      '    <div class="detail-price">' + priceListHtml(product) + '</div>',
      product.description ? '    <p>' + escapeHtml(product.description) + '</p>' : product.short_description ? '    <p>' + escapeHtml(product.short_description) + '</p>' : "",
      '    <div class="action-row">' + requestButton + '<a class="button ghost" href="/inventory/"><i data-lucide="arrow-left"></i>Back to Inventory</a></div>',
      specsHtml(product),
      notesHtml(),
      '  </div>',
      '</div>'
    ].join("");
  }

  function thumbRowHtml(images, name) {
    if (images.length < 2) return "";
    return '<div class="thumb-row">' + images.map(function (image, index) {
      return '<button class="thumb ' + (index === 0 ? "active" : "") + '" type="button" data-gallery-src="' + escapeAttr(image) + '" aria-label="Show image ' + (index + 1) + '"><img src="' + escapeAttr(image) + '" alt="' + escapeAttr(name) + ' image ' + (index + 1) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMAGE + '\'"></button>';
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
    var pageUrl = window.CONFIG && CONFIG.requestPageUrl ? CONFIG.requestPageUrl : "/request/";
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

  function setupRequestPage() {
    var params = new URLSearchParams(window.location.search);
    var item = params.get("item");
    var sku = params.get("sku");
    var message = document.getElementById("requested-item-message");
    var form = document.getElementById("request-form");
    var status = document.getElementById("request-form-status");
    var submit = document.getElementById("request-submit");
    var frame = document.getElementById("request-submit-frame");
    var webAppUrl = window.CONFIG && CONFIG.appsScriptWebAppUrl ? CONFIG.appsScriptWebAppUrl : "";
    var hasWebAppUrl = webAppUrl && !/^PASTE_/i.test(webAppUrl);
    var confirmationTimer = null;
    var frameFallbackTimer = null;
    var activeJsonpScript = null;
    var activeRequestId = "";
    var fallbackInProgress = false;

    if (message && (item || sku)) {
      message.textContent = "You are requesting: " + [item, sku].filter(Boolean).join(" - ");
      message.hidden = false;
    }

    setFieldValue("request-item", item || "");
    setFieldValue("request-sku", sku || "");
    setFieldValue("page-url", window.location.href);
    setFieldValue("user-agent", window.navigator.userAgent);
    setFieldValue("form-token", window.CONFIG && CONFIG.requestFormToken ? CONFIG.requestFormToken : "");

    if (sku === "REPAIR") {
      setFieldValue("request-type", "Repair");
    }

    if (!form) return;

    if (hasWebAppUrl) {
      form.setAttribute("action", webAppUrl);
    } else {
      if (submit) submit.disabled = true;
      if (status) {
        status.textContent = "The request form is ready, but the Apps Script Web App URL still needs to be added in config.js.";
        status.classList.add("notice-warning");
      }
    }

    var submitted = false;
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!hasWebAppUrl) {
        return;
      }

      setFieldValue("company-website", "");
      setFieldValue("page-url", window.location.href);
      setFieldValue("user-agent", window.navigator.userAgent);
      setFieldValue("form-token", window.CONFIG && CONFIG.requestFormToken ? CONFIG.requestFormToken : "");
      activeRequestId = buildRequestId();
      fallbackInProgress = false;
      hideSubmissionFrame();
      submitted = true;
      if (submit) submit.disabled = true;
      if (status) {
        status.textContent = "Submitting request...";
        status.classList.remove("notice-warning");
      }

      window.clearTimeout(confirmationTimer);
      window.clearTimeout(frameFallbackTimer);
      removeActiveJsonpScript();
      confirmationTimer = window.setTimeout(function () {
        if (!submitted) return;

        if (status) {
          status.textContent = "Request timed out before GTPCS received confirmation. Please try again or email GTPCS directly.";
          status.classList.add("notice-warning");
        }
        removeActiveJsonpScript();
        if (submit) submit.disabled = false;
        submitted = false;
      }, 30000);

      submitRequestWithJsonp(form, webAppUrl)
        .then(handleRequestResult)
        .catch(function () {
          submitRequestWithFallbackFrame(form, webAppUrl);
        });
    });

    window.addEventListener("message", function (event) {
      var data = event.data || {};
      if (!data || data.source !== "gtpcs-request-form" || !submitted) return;

      window.clearTimeout(confirmationTimer);
      window.clearTimeout(frameFallbackTimer);
      hideSubmissionFrame();

      if (status) {
        status.textContent = data.ok
          ? "Request submitted. GTPCS will review it and reply by email."
          : "Request failed: " + (data.error || "Please check the form and try again.");
        status.classList.toggle("notice-warning", !data.ok);
      }

      if (data.ok) {
        resetRequestForm();
      }

      if (submit) submit.disabled = false;
      submitted = false;
    });

    if (frame) {
      frame.addEventListener("load", function () {
        if (!submitted) return;

        if (fallbackInProgress) {
          window.clearTimeout(confirmationTimer);
          window.clearTimeout(frameFallbackTimer);
          if (status) {
            status.textContent = "Request submitted. GTPCS will review it and reply by email.";
            status.classList.remove("notice-warning");
          }
          hideSubmissionFrame();
          if (submit) submit.disabled = false;
          submitted = false;
          fallbackInProgress = false;
          resetRequestForm();
          return;
        }

        window.clearTimeout(frameFallbackTimer);
        frameFallbackTimer = window.setTimeout(function () {
          if (!submitted) return;

          window.clearTimeout(confirmationTimer);
          if (status) {
            status.textContent = "Request status could not be confirmed. Please try again or email GTPCS directly.";
            status.classList.add("notice-warning");
          }
          hideSubmissionFrame();
          if (submit) submit.disabled = false;
          submitted = false;
        }, 1200);
      });
    }

    function hideSubmissionFrame() {
      if (frame) frame.hidden = true;
    }

    function showSubmissionFrame() {
      if (frame) frame.hidden = false;
    }

    function submitRequestWithJsonp(formElement, actionUrl) {
      return new Promise(function (resolve, reject) {
        var callbackName = "gtpcsRequestCallback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
        var requestUrl = new URL(actionUrl);
        var formData = new FormData(formElement);

        requestUrl.searchParams.set("action", "submit");
        requestUrl.searchParams.set("callback", callbackName);
        requestUrl.searchParams.set("request_id", activeRequestId);
        requestUrl.searchParams.set("_", String(Date.now()));
        formData.forEach(function (value, key) {
          requestUrl.searchParams.set(key, value);
        });

        window[callbackName] = function (data) {
          cleanup();
          resolve(data || { ok: false, error: "GTPCS ticket tracking returned an empty response." });
        };

        activeJsonpScript = document.createElement("script");
        activeJsonpScript.async = true;
        activeJsonpScript.src = requestUrl.toString();
        activeJsonpScript.onerror = function () {
          cleanup();
          reject(new Error("Request script failed to load."));
        };

        function cleanup() {
          window.clearTimeout(confirmationTimer);
          if (activeJsonpScript && activeJsonpScript.parentNode) {
            activeJsonpScript.parentNode.removeChild(activeJsonpScript);
          }
          activeJsonpScript = null;
          try {
            delete window[callbackName];
          } catch (error) {
            window[callbackName] = undefined;
          }
        }

        document.head.appendChild(activeJsonpScript);
      });
    }

    function submitRequestWithFallbackFrame(formElement, actionUrl) {
      if (!frame) {
        handleRequestResult({ ok: false, error: "The request could not reach GTPCS ticket tracking." });
        return;
      }

      var fallbackForm = document.createElement("form");
      var formData = new FormData(formElement);

      fallbackForm.method = "POST";
      fallbackForm.action = actionUrl;
      fallbackForm.target = frame.name || "request-submit-frame";
      fallbackForm.hidden = true;

      appendHiddenFallbackField(fallbackForm, "action", "submit");
      appendHiddenFallbackField(fallbackForm, "response", "html");
      appendHiddenFallbackField(fallbackForm, "request_id", activeRequestId);
      appendHiddenFallbackField(fallbackForm, "_", String(Date.now()));
      formData.forEach(function (value, key) {
        appendHiddenFallbackField(fallbackForm, key, value);
      });

      fallbackInProgress = true;
      if (status) {
        status.textContent = "Submitting request...";
        status.classList.remove("notice-warning");
      }
      document.body.appendChild(fallbackForm);
      fallbackForm.submit();
      window.setTimeout(function () {
        if (fallbackForm.parentNode) fallbackForm.parentNode.removeChild(fallbackForm);
      }, 1000);
    }

    function appendHiddenFallbackField(formElement, name, value) {
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value == null ? "" : String(value);
      formElement.appendChild(input);
    }

    function handleRequestResult(data) {
      if (!submitted) return;

      window.clearTimeout(confirmationTimer);
      window.clearTimeout(frameFallbackTimer);
      hideSubmissionFrame();

      if (status) {
        status.textContent = data.ok
          ? "Request submitted. GTPCS will review it and reply by email. Ticket ID: " + (data.ticketId || "pending")
          : "Request failed: " + (data.error || "Please check the form and try again.");
        status.classList.toggle("notice-warning", !data.ok);
      }

      if (data.ok) {
        resetRequestForm();
      }

      if (submit) submit.disabled = false;
      submitted = false;
    }

    function removeActiveJsonpScript() {
      if (activeJsonpScript && activeJsonpScript.parentNode) {
        activeJsonpScript.parentNode.removeChild(activeJsonpScript);
      }
      activeJsonpScript = null;
    }

    function resetRequestForm() {
      form.reset();
      setFieldValue("company-website", "");
      setFieldValue("page-url", window.location.href);
      setFieldValue("user-agent", window.navigator.userAgent);
      setFieldValue("form-token", window.CONFIG && CONFIG.requestFormToken ? CONFIG.requestFormToken : "");
    }

    function buildRequestId() {
      if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
      }
      return "gtpcs-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
    }
  }

  function setFieldValue(id, value) {
    var field = document.getElementById(id);
    if (field) field.value = value || "";
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
