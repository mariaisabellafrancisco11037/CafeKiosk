(() => {
  "use strict";

  const trigger = document.getElementById("importMenuBtn");
  if (!trigger) return;

  const state = {
    catalog: null,
    inventory: [],
    csvRows: [],
    imageEntries: [],
    zipFiles: [],
    zipDetails: [],
    duplicateImageNames: [],
    customizationRows: [],
    plan: null,
    busy: false
  };

  function apiUrl() {
    if (location.protocol === "http:" || location.protocol === "https:") {
      const port = location.port;
      if (!port || port === "80" || port === "443" || port === "5000") return location.origin;
      return `${location.protocol}//${location.hostname}:5000`;
    }
    const saved = String(localStorage.getItem("cafeBackendUrl") || "").trim();
    return saved ? saved.replace(/\/$/, "") : "http://127.0.0.1:5000";
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[c]);
  }

  function baseName(path) {
    return String(path || "").replace(/\\/g, "/").split("/").pop() || "";
  }

  function stripExtension(name) {
    return baseName(name).replace(/\.[^.]+$/, "");
  }

  function normalizeName(value) {
    let s = stripExtension(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    // Friendly matching for files such as 21_Black_Coffee.png or C21_Black_Coffee.png.
    s = s.replace(/^(?:[a-z]{0,4}\d{1,4})[\s._]+/i, "");
    s = s.replace(/^\d{1,4}[\s._]+/, "");
    s = s.replace(/&/g, " and ");
    s = s.replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
    return s;
  }

  function normalizeCatalogCategory(value) {
    const key = String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-").replace(/-+/g, "-");
    const map = {
      coffee: "coffee", coffees: "coffee",
      "non-coffee": "non-coffee", "non-coffees": "non-coffee", noncoffee: "non-coffee", noncoffees: "non-coffee",
      "milk-tea": "milktea", milktea: "milktea", "milk-teas": "milktea", milkteas: "milktea",
      food: "food", foods: "food",
      snack: "snack", snacks: "snack",
      dessert: "dessert", desserts: "dessert"
    };
    return map[key] || key;
  }

  function configCategoryKey(value) {
    const key = String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-").replace(/-+/g, "-");
    if (["coffee", "coffees"].includes(key)) return "coffee";
    if (["non-coffee", "non-coffees", "noncoffee", "noncoffees"].includes(key)) return "non-coffee";
    if (["milk-tea", "milktea", "milk-teas", "milkteas"].includes(key)) return "milk-tea";
    if (["food", "foods"].includes(key)) return "foods";
    if (["snack", "snacks"].includes(key)) return "snacks";
    if (["dessert", "desserts"].includes(key)) return "dessert";
    return key;
  }

  function productMatchKey(name, category) {
    return `${normalizeCatalogCategory(category)}|${normalizeName(name)}`;
  }

  function productConfigKey(name, category) {
    return `${configCategoryKey(category)}::${String(name || "").trim().toLowerCase()}`;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    const input = String(text || "").replace(/^\uFEFF/, "");

    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      if (quoted) {
        if (ch === '"' && input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else if (ch === '"') {
          quoted = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field.replace(/\r$/, ""));
        if (row.some(cell => String(cell).trim())) rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
    row.push(field.replace(/\r$/, ""));
    if (row.some(cell => String(cell).trim())) rows.push(row);
    if (!rows.length) return [];

    const headers = rows.shift().map(h => String(h).trim().toLowerCase().replace(/[\s-]+/g, "_"));
    const alias = {
      product: "name", product_name: "name", item: "name", item_name: "name", name: "name",
      category: "category", menu_category: "category",
      price: "price", base_price: "price",
      description: "description", desc: "description",
      availability: "availability", status: "availability",
      image: "image", image_filename: "image", filename: "image", photo: "image",
      sizes: "sizes", size_config: "sizes", cup_sizes: "sizes",
      ingredients: "ingredients", recipe: "ingredients", ingredient_usage: "ingredients"
    };

    return rows.map((cells, index) => {
      const obj = { __line: index + 2 };
      headers.forEach((h, i) => {
        const key = alias[h] || h;
        obj[key] = String(cells[i] ?? "").trim();
      });
      return obj;
    });
  }

  function parseSizes(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    return raw.split(";").map(part => part.trim()).filter(Boolean).map(part => {
      const bits = part.split(":").map(x => x.trim());
      const label = bits[0] || "";
      const priceAdd = Number(bits[1] || 0);
      const multiplier = Number(bits[2] || 1);
      if (!label || !Number.isFinite(priceAdd) || priceAdd < 0 || !Number.isFinite(multiplier) || multiplier <= 0) {
        throw new Error(`Invalid size “${part}”. Use Size:AddedPrice:Multiplier.`);
      }
      return { label, priceAdd, multiplier };
    });
  }

  function parseIngredients(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    return raw.split(";").map(part => part.trim()).filter(Boolean).map(part => {
      const bits = part.split(":").map(x => x.trim());
      const name = bits[0] || "";
      const amount = Number(bits[1]);
      const mode = String(bits[2] || "required").toLowerCase() === "option" ? "option" : "required";
      const optionValue = bits[3] || "";
      if (!name || !Number.isFinite(amount) || amount <= 0) {
        throw new Error(`Invalid ingredient “${part}”. Use Ingredient:Amount:required.`);
      }
      if (mode === "option" && !optionValue) {
        throw new Error(`Optional ingredient “${name}” needs an option name.`);
      }
      return { name, amount, mode, optionValue, scaleWithSize: true };
    });
  }

  function csvEscape(value) {
    const s = String(value ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function downloadTemplate() {
    const headers = ["name", "category", "price", "description", "availability", "image", "sizes", "ingredients"];
    const examples = [
      ["Black Coffee", "Coffees", "100", "Freshly brewed black coffee", "Available", "Black_Coffee.png", "Regular:0:1;Large:25:1.5", "Coffee Beans:18:required;Filtered Water:220:required"],
      ["Cafe Au Lait", "Coffees", "140", "Coffee with steamed milk", "Available", "Cafe_Au_Lait.png", "Regular:0:1;Large:25:1.5", "Coffee Beans:18:required;Fresh Milk:160:required"],
      ["Vietnamese Coffee", "Coffees", "150", "Bold coffee with condensed milk", "Available", "Vietnamese_Coffee.png", "16 oz:0:1;22 oz:30:1.4", "Coffee Beans:20:required;Condensed Milk:45:required"],
      ["Iced Caramel Macchiato", "Coffees", "180", "Iced espresso, milk and caramel", "Available", "Iced_Caramel_Macchiato.png", "16 oz:0:1;22 oz:30:1.4", "Coffee Beans:18:required;Fresh Milk:180:required;Caramel Syrup:25:required"]
    ];
    const csv = [headers, ...examples].map(row => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CafeKiosk_Menu_Import_Template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCustomizationTemplate() {
    const csv = [
      ["menu_item","customization_group","option","additional_price","selection_required"],
      ["Croffle","Dip","No Dip","0","false"],
      ["Croffle","Dip","Biscoff","20","false"],
      ["Croffle","Dip","Nutella","20","false"]
    ].map(row => row.map(csvEscape).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a"); a.href=url; a.download="CafeKiosk_Item_Customizations_Template.csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function parseCustomizationCsv(text) {
    return parseCsv(text).map(row => ({
      menuItem: String(row.menu_item || row.item_name || row.product || row.name || "").trim(),
      group: String(row.customization_group || row.group || "Add-ons").trim() || "Add-ons",
      option: String(row.option || row.option_name || row.value || "").trim(),
      additionalPrice: Math.max(0, Number(row.additional_price || row.price || 0) || 0),
      required: /^(1|true|yes|required)$/i.test(String(row.selection_required || row.required || "")),
      __line: row.__line
    })).filter(row => row.menuItem || row.option);
  }

  async function saveCustomizationRows(rows, menuConfig, catalogProducts) {
    if (!rows.length) return;
    const byName=new Map((catalogProducts||[]).map(p=>[normalizeName(p.name),p]));
    const grouped=new Map();
    for(const row of rows){
      if(!row.menuItem || !row.option) throw new Error(`Customization CSV line ${row.__line}: menu_item and option are required.`);
      const product=byName.get(normalizeName(row.menuItem));
      if(!product) throw new Error(`Customization CSV line ${row.__line}: menu item “${row.menuItem}” was not found.`);
      const category=product.categoryKey || product.category;
      const key=productConfigKey(product.name,category);
      if(!grouped.has(key)) grouped.set(key,{product,groups:new Map()});
      const entry=grouped.get(key); const gkey=row.group.toLowerCase();
      if(!entry.groups.has(gkey)) entry.groups.set(gkey,{key:gkey.replace(/[^a-z0-9]+/g,"-")||"addons",label:row.group,type:row.required?"radio":"checkbox",required:row.required,options:[]});
      entry.groups.get(gkey).options.push({label:row.option,value:row.option,price:row.additionalPrice});
    }
    for(const [key,entry] of grouped){
      const existing=menuConfig.products?.[key]||{};
      const productConfig={...existing,productName:entry.product.name,category:entry.product.categoryKey||entry.product.category,customizations:[...entry.groups.values()],updatedAt:new Date().toISOString()};
      const payload=await fetchJson(`${apiUrl()}/api/menu-config/product`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({productKey:key,previousKey:key,productConfig})});
      if(payload.config) menuConfig=payload.config;
    }
  }

  function mimeForName(name) {
    const ext = String(name || "").toLowerCase().split(".").pop();
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (ext === "gif") return "image/gif";
    return "image/jpeg";
  }

  async function unzipImages(file) {
    if (!file) return [];
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const min = Math.max(0, bytes.length - 65557);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= min; i -= 1) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("The ZIP file could not be read.");

    const total = view.getUint16(eocd + 10, true);
    const centralOffset = view.getUint32(eocd + 16, true);
    let offset = centralOffset;
    const decoder = new TextDecoder("utf-8");
    const out = [];

    for (let index = 0; index < total; index += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) break;
      const flags = view.getUint16(offset + 8, true);
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const nameLen = view.getUint16(offset + 28, true);
      const extraLen = view.getUint16(offset + 30, true);
      const commentLen = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const nameBytes = bytes.slice(offset + 46, offset + 46 + nameLen);
      const name = decoder.decode(nameBytes);

      if (!name.endsWith("/") && /\.(png|jpe?g|webp)$/i.test(name)) {
        if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error(`Invalid ZIP entry: ${name}`);
        const localNameLen = view.getUint16(localOffset + 26, true);
        const localExtraLen = view.getUint16(localOffset + 28, true);
        const dataStart = localOffset + 30 + localNameLen + localExtraLen;
        const compressed = bytes.slice(dataStart, dataStart + compressedSize);
        let raw;

        if (method === 0) {
          raw = compressed;
        } else if (method === 8 && typeof DecompressionStream !== "undefined") {
          const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
          raw = new Uint8Array(await new Response(stream).arrayBuffer());
        } else {
          throw new Error(`ZIP compression for ${baseName(name)} is not supported by this browser.`);
        }

        // Bit 11 indicates UTF-8. Modern generated ZIPs use UTF-8; the decoder above is safe for our menu files.
        void flags;
        out.push({ name: baseName(name), blob: new Blob([raw], { type: mimeForName(name) }) });
      }
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return out;
  }

  async function loadSelectedImages() {
    const map = new Map();
    const zipInput = document.getElementById("ckImportZip");
    const filesInput = document.getElementById("ckImportImages");
    const zipFiles = Array.from(zipInput?.files || []);
    const duplicateNames = [];
    const zipDetails = [];

    // MULTI-ZIP SUPPORT: every selected ZIP is opened and merged into one image queue.
    // This lets owners select all 10-image category batches (for example 1-10, 11-20,
    // 21-30 ... 171-180) in a single bulk-import operation.
    for (let i = 0; i < zipFiles.length; i += 1) {
      const zipFile = zipFiles[i];
      const entries = await unzipImages(zipFile);
      zipDetails.push({ name: zipFile.name, count: entries.length });
      for (const entry of entries) {
        const key = baseName(entry.name).toLowerCase();
        if (map.has(key)) {
          duplicateNames.push(`${baseName(entry.name)} (${zipFile.name})`);
          continue; // Keep the first copy so imports are deterministic.
        }
        map.set(key, { ...entry, sourceZip: zipFile.name });
      }
    }

    // Loose image files can be mixed with ZIPs. They are merged into the same queue.
    for (const file of Array.from(filesInput?.files || [])) {
      if (!String(file.type || "").startsWith("image/") && !/\.(png|jpe?g|webp)$/i.test(file.name)) continue;
      const key = baseName(file.name).toLowerCase();
      if (map.has(key)) {
        duplicateNames.push(`${baseName(file.name)} (selected image)`);
        continue;
      }
      map.set(key, { name: baseName(file.name), blob: file, sourceZip: "Selected images" });
    }

    return { entries: [...map.values()], zipFiles, zipDetails, duplicateNames };
  }

  function updateZipSelectionSummary() {
    const input = document.getElementById("ckImportZip");
    const summary = document.getElementById("ckImportZipSummary");
    if (!summary) return;
    const files = Array.from(input?.files || []);
    if (!files.length) {
      summary.textContent = "No ZIP files selected.";
      return;
    }
    const totalMb = files.reduce((sum, file) => sum + Number(file.size || 0), 0) / (1024 * 1024);
    summary.textContent = `${files.length} ZIP file${files.length === 1 ? "" : "s"} selected • ${totalMb.toFixed(1)} MB total`;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, { ...options, credentials: "include" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || `Request failed (HTTP ${response.status})`);
    return body;
  }

  function imageMaps(entries) {
    const exact = new Map();
    const normalized = new Map();
    for (const entry of entries) {
      exact.set(baseName(entry.name).toLowerCase(), entry);
      const key = normalizeName(entry.name);
      if (!normalized.has(key)) normalized.set(key, []);
      normalized.get(key).push(entry);
    }
    return { exact, normalized };
  }

  function findImage(row, maps) {
    const explicit = baseName(row.image || "").toLowerCase();
    if (explicit && maps.exact.has(explicit)) return maps.exact.get(explicit);
    const key = normalizeName(row.name);
    const candidates = maps.normalized.get(key) || [];
    return candidates.length === 1 ? candidates[0] : null;
  }

  function validateAvailability(value) {
    return String(value || "Available").trim().toLowerCase() === "unavailable" ? "Unavailable" : "Available";
  }

  async function preparePreview() {
    const csvFile = document.getElementById("ckImportCsv")?.files?.[0] || null;
    const customFile = document.getElementById("ckImportCustomCsv")?.files?.[0] || null;
    const errors = [];
    setPreviewBusy(true);
    setErrors("");

    try {
      const imageSelection = await loadSelectedImages();
      state.imageEntries = imageSelection.entries;
      state.zipFiles = imageSelection.zipFiles;
      state.zipDetails = imageSelection.zipDetails;
      state.duplicateImageNames = imageSelection.duplicateNames;
      state.csvRows = csvFile ? parseCsv(await csvFile.text()) : [];
      state.customizationRows = customFile ? parseCustomizationCsv(await customFile.text()) : [];
      state.catalog = await fetchJson(`${apiUrl()}/api/catalog`, { cache: "no-store" });
      const existingProducts = Array.isArray(state.catalog.products) ? state.catalog.products : [];
      const maps = imageMaps(state.imageEntries);

      let inventory = [];
      if (state.csvRows.some(row => String(row.ingredients || "").trim())) {
        const inv = await fetchJson(`${apiUrl()}/api/menu-availability/inventory-config`, { cache: "no-store" });
        inventory = Array.isArray(inv.ingredients) ? inv.ingredients : [];
      }
      state.inventory = inventory;
      const ingredientMap = new Map(inventory.map(item => [normalizeName(item.name), item]));

      if (!state.csvRows.length && !state.imageEntries.length && !state.customizationRows.length) {
        throw new Error("Choose a Menu CSV, Item Customizations CSV, image ZIP, or images first.");
      }

      const existingByKey = new Map(existingProducts.map(p => [productMatchKey(p.name, p.categoryKey || p.category), p]));
      const rows = [];
      const seen = new Set();

      if (state.csvRows.length) {
        state.csvRows.forEach(raw => {
          const lineErrors = [];
          const name = String(raw.name || "").trim();
          const category = String(raw.category || "").trim();
          const price = Number(raw.price);
          if (!name) lineErrors.push("name is required");
          if (!category) lineErrors.push("category is required");
          if (!Number.isFinite(price) || price < 0) lineErrors.push("price must be 0 or higher");
          const key = productMatchKey(name, category);
          if (name && category && seen.has(key)) lineErrors.push("duplicate product in CSV");
          seen.add(key);

          let sizes = null;
          let ingredients = null;
          try { sizes = parseSizes(raw.sizes); } catch (e) { lineErrors.push(e.message); }
          try { ingredients = parseIngredients(raw.ingredients); } catch (e) { lineErrors.push(e.message); }

          if (ingredients) {
            for (const ingredient of ingredients) {
              if (!ingredientMap.has(normalizeName(ingredient.name))) {
                lineErrors.push(`ingredient not found in Inventory: ${ingredient.name}`);
              }
            }
          }

          const imageEntry = name ? findImage({ ...raw, name }, maps) : null;
          const existing = existingByKey.get(key) || null;
          const normalized = {
            __line: raw.__line,
            name,
            category,
            price,
            description: String(raw.description || "").trim(),
            availability: validateAvailability(raw.availability),
            image: String(raw.image || "").trim(),
            sizes,
            ingredients,
            imageEntry,
            existing,
            errors: lineErrors
          };
          rows.push(normalized);
          if (lineErrors.length) errors.push(`Line ${raw.__line}: ${lineErrors.join("; ")}`);
        });
      } else {
        const byImageKey = new Map();
        for (const entry of state.imageEntries) {
          const key = normalizeName(entry.name);
          if (!byImageKey.has(key)) byImageKey.set(key, []);
          byImageKey.get(key).push(entry);
        }

        for (const product of existingProducts) {
          const candidates = byImageKey.get(normalizeName(product.name)) || [];
          if (candidates.length === 1) {
            rows.push({
              name: product.name,
              category: product.category,
              price: Number(product.price || 0),
              availability: product.availability || "Available",
              existing: product,
              imageEntry: candidates[0],
              sizes: null,
              ingredients: null,
              errors: []
            });
          }
        }
      }

      const matchedImageNames = new Set(rows.filter(r => r.imageEntry).map(r => r.imageEntry.name.toLowerCase()));
      const unmatchedImages = state.imageEntries.filter(entry => !matchedImageNames.has(entry.name.toLowerCase()));
      const validRows = rows.filter(row => !row.errors.length);

      state.plan = {
        mode: state.csvRows.length ? "full" : "images",
        rows,
        validRows,
        errors,
        unmatchedImages
      };

      renderPreview(state.plan);
      document.getElementById("ckImportStart").disabled = Boolean(errors.length) || (validRows.length === 0 && state.customizationRows.length === 0);
    } catch (error) {
      state.plan = null;
      renderPreview(null);
      setErrors(error.message || String(error));
      document.getElementById("ckImportStart").disabled = true;
    } finally {
      setPreviewBusy(false);
    }
  }

  function renderPreview(plan) {
    const body = document.getElementById("ckImportPreviewBody");
    if (!body) return;
    if (!plan) {
      body.innerHTML = '<tr><td colspan="6">Choose files, then click <b>Prepare Preview</b>.</td></tr>';
      setStat("ckStatRows", "0");
      setStat("ckStatImages", "0");
      setStat("ckStatNew", "0");
      setStat("ckStatUpdate", "0");
      return;
    }

    const rows = plan.rows;
    const imageCount = rows.filter(r => r.imageEntry).length;
    const newCount = plan.mode === "full" ? rows.filter(r => !r.existing).length : 0;
    const updateCount = plan.mode === "full" ? rows.filter(r => r.existing).length : rows.length;
    setStat("ckStatRows", String(rows.length));
    setStat("ckStatImages", String(imageCount));
    setStat("ckStatNew", String(newCount));
    setStat("ckStatUpdate", String(updateCount));

    const preview = rows.slice(0, 60);
    body.innerHTML = preview.map(row => {
      const status = row.errors.length
        ? `<span class="ck-import-status-error">${esc(row.errors.join("; "))}</span>`
        : row.existing
          ? '<span class="ck-import-status-ok">Update</span>'
          : '<span class="ck-import-status-ok">New</span>';
      return `<tr>
        <td>${esc(row.name)}</td>
        <td>${esc(row.category)}</td>
        <td>₱${Number(row.price || 0).toFixed(2)}</td>
        <td>${row.imageEntry ? esc(row.imageEntry.name) : '<span class="ck-import-status-warn">No image</span>'}</td>
        <td>${row.sizes ? esc(row.sizes.map(s => s.label).join(", ")) : "—"}</td>
        <td>${status}</td>
      </tr>`;
    }).join("") + (rows.length > preview.length ? `<tr><td colspan="6">…and ${rows.length - preview.length} more items.</td></tr>` : "");

    const notes = [];
    if (Array.isArray(state.zipFiles) && state.zipFiles.length) {
      notes.push(`ZIP files loaded: ${state.zipFiles.length} • unique images found: ${state.imageEntries.length}`);
    }
    if (Array.isArray(state.duplicateImageNames) && state.duplicateImageNames.length) {
      notes.push(`Duplicate filenames skipped (${state.duplicateImageNames.length}): ${state.duplicateImageNames.slice(0, 10).join(", ")}${state.duplicateImageNames.length > 10 ? "…" : ""}`);
    }
    if (plan.unmatchedImages.length) {
      notes.push(`Unmatched images (${plan.unmatchedImages.length}): ${plan.unmatchedImages.slice(0, 12).map(x => x.name).join(", ")}${plan.unmatchedImages.length > 12 ? "…" : ""}`);
    }
    if (plan.errors.length) notes.push(...plan.errors.slice(0, 20));
    setErrors(notes.join("\n"));
  }

  function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setErrors(value) {
    const el = document.getElementById("ckImportErrors");
    if (el) el.textContent = value || "";
  }

  function setPreviewBusy(busy) {
    const btn = document.getElementById("ckImportPreview");
    if (!btn) return;
    btn.disabled = busy;
    btn.textContent = busy ? "Preparing…" : "Prepare Preview";
  }

  function setProgress(percent, label) {
    const wrap = document.getElementById("ckImportProgress");
    const bar = document.getElementById("ckImportProgressBar");
    const copy = document.getElementById("ckImportProgressLabel");
    const pct = document.getElementById("ckImportProgressPct");
    if (wrap) wrap.hidden = false;
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    if (copy) copy.textContent = label || "Working…";
    if (pct) pct.textContent = `${Math.round(percent)}%`;
  }

  function hideProgress() {
    const wrap = document.getElementById("ckImportProgress");
    if (wrap) wrap.hidden = true;
  }

  async function imageToOptimizedDataUrl(entry) {
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`Could not read ${entry.name}`));
      reader.readAsDataURL(entry.blob);
    });

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not decode ${entry.name}`));
      img.src = source;
    });

    let maxDimension = 560;
    let quality = 0.70;
    let result = source;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
      const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
      const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      result = canvas.toDataURL("image/jpeg", quality);
      if (result.length <= 105000) return result;
      if (quality > .50) quality -= .07;
      else maxDimension = Math.max(420, Math.round(maxDimension * .82));
    }
    if (result.length > 150000) throw new Error(`${entry.name} is still too large after optimization.`);
    return result;
  }

  async function uploadImage(product, entry) {
    const image = await imageToOptimizedDataUrl(entry);
    await fetchJson(`${apiUrl()}/api/catalog/product-image`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        name: product.name,
        category: product.categoryKey || product.category,
        image
      })
    });
  }

  async function runPool(tasks, limit, onDone) {
    let next = 0;
    let done = 0;
    async function worker() {
      while (true) {
        const index = next++;
        if (index >= tasks.length) return;
        await tasks[index]();
        done += 1;
        onDone?.(done, tasks.length);
      }
    }
    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
    await Promise.all(workers);
  }

  async function saveFlexibleConfig(row, menuConfig, ingredientByName) {
    if (!row.sizes && !row.ingredients) return;
    const key = productConfigKey(row.name, row.category);
    const existing = menuConfig.products?.[key] || {};
    const categoryDefaults = menuConfig.categoryDefaults?.[configCategoryKey(row.category)] || [];
    const sizes = row.sizes || existing.sizes || categoryDefaults || [{ label: "Regular", priceAdd: 0, multiplier: 1 }];
    const richIngredients = row.ingredients
      ? row.ingredients.map(item => {
          const master = ingredientByName.get(normalizeName(item.name));
          return {
            name: master?.name || item.name,
            amount: item.amount,
            unit: master?.unit || "g",
            stock: Number(master?.stock || 0),
            lowStockThreshold: Number(master?.lowStockThreshold || 0),
            mode: item.mode,
            optionValue: item.optionValue,
            scaleWithSize: true
          };
        })
      : (Array.isArray(existing.ingredients) ? existing.ingredients : []);

    const productConfig = {
      ...existing,
      productName: row.name,
      category: row.category,
      sizes,
      ingredients: richIngredients,
      sizesCustomized: Boolean(row.sizes) || existing.sizesCustomized === true
    };

    const payload = await fetchJson(`${apiUrl()}/api/menu-config/product`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productKey: key, previousKey: key, productConfig })
    });
    if (payload.config) {
      menuConfig.products = payload.config.products || menuConfig.products;
      menuConfig.categoryDefaults = payload.config.categoryDefaults || menuConfig.categoryDefaults;
    }
  }

  async function saveRecipe(row, ingredientByName) {
    if (!row.ingredients) return;
    const ingredients = row.ingredients.map(item => {
      const master = ingredientByName.get(normalizeName(item.name));
      if (!master) throw new Error(`Ingredient not found in Inventory: ${item.name}`);
      return {
        ingredientId: master.id,
        amount: item.amount,
        mode: item.mode,
        optionValue: item.optionValue,
        scaleWithSize: true
      };
    });
    await fetchJson(`${apiUrl()}/api/menu-availability/recipe`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName: row.name,
        category: normalizeCatalogCategory(row.category),
        ingredients
      })
    });
  }

  async function startImport() {
    if (!state.plan || state.busy) return;
    state.busy = true;
    const start = document.getElementById("ckImportStart");
    const cancel = document.getElementById("ckImportCancel");
    const close = document.getElementById("ckImportClose");
    [start, cancel, close].forEach(btn => { if (btn) btn.disabled = true; });
    setErrors("");

    try {
      let resultCatalog = state.catalog;
      const validRows = state.plan.validRows;
      setProgress(5, state.plan.mode === "full" ? "Saving menu items…" : "Preparing image replacements…");

      if (state.plan.mode === "full") {
        const existingProducts = Array.isArray(state.catalog.products) ? state.catalog.products : [];
        const merged = existingProducts.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          categoryKey: p.categoryKey,
          price: Number(p.price || 0),
          description: p.description || "",
          image: p.image || "",
          availability: p.availability === "Unavailable" ? "Unavailable" : "Available"
        }));
        const byKey = new Map(merged.map((p, i) => [productMatchKey(p.name, p.categoryKey || p.category), i]));

        for (const row of validRows) {
          const key = productMatchKey(row.name, row.category);
          const existingIndex = byKey.get(key);
          const next = {
            ...(existingIndex !== undefined ? merged[existingIndex] : {}),
            name: row.name,
            category: row.category,
            price: row.price,
            description: row.description,
            availability: row.availability
          };
          if (existingIndex !== undefined) merged[existingIndex] = next;
          else {
            byKey.set(key, merged.length);
            merged.push(next);
          }
        }

        const categoryMap = new Map();
        for (const c of Array.isArray(state.catalog.categories) ? state.catalog.categories : []) {
          categoryMap.set(normalizeCatalogCategory(c.canonicalKey || c.name), { name: c.name, image: c.image || "", canonicalKey: c.canonicalKey || "" });
        }
        for (const row of validRows) {
          const key = normalizeCatalogCategory(row.category);
          if (!categoryMap.has(key)) categoryMap.set(key, { name: row.category, image: "", canonicalKey: key });
        }

        const compactProducts = merged.map((p, index) => {
          const compact = {
            id: p.id,
            name: p.name,
            category: p.category,
            categoryKey: p.categoryKey,
            price: Number(p.price || 0),
            description: p.description || "",
            availability: p.availability === "Unavailable" ? "Unavailable" : "Available",
            sortOrder: index
          };
          const image = String(p.image || "");
          // Product images are uploaded separately so the catalog request stays
          // safely below the server's JSON body limit. Omitting a data URL tells
          // MySQL to preserve the image already stored for existing products.
          if (image && !image.startsWith("data:image/")) compact.image = image;
          return compact;
        });

        resultCatalog = await fetchJson(`${apiUrl()}/api/catalog`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: [...categoryMap.values()], products: compactProducts })
        });
        setProgress(18, "Menu items saved. Applying sizes and recipes…");

        const needsConfig = validRows.some(row => row.sizes || row.ingredients);
        if (needsConfig) {
          const configPayload = await fetchJson(`${apiUrl()}/api/menu-config`, { cache: "no-store" });
          const menuConfig = configPayload.config || { products: {}, categoryDefaults: {} };
          const ingredientByName = new Map(state.inventory.map(item => [normalizeName(item.name), item]));
          const configRows = validRows.filter(row => row.sizes || row.ingredients);
          let configDone = 0;
          for (const row of configRows) {
            await saveFlexibleConfig(row, menuConfig, ingredientByName);
            await saveRecipe(row, ingredientByName);
            configDone += 1;
            setProgress(18 + (22 * configDone / Math.max(1, configRows.length)), `Saving sizes and recipes (${configDone}/${configRows.length})…`);
          }
        }
      }

      const resultProducts = Array.isArray(resultCatalog.products) ? resultCatalog.products : (Array.isArray(state.catalog.products) ? state.catalog.products : []);
      if (state.customizationRows.length) {
        const configPayload = await fetchJson(`${apiUrl()}/api/menu-config`, { cache: "no-store" });
        await saveCustomizationRows(state.customizationRows, configPayload.config || {products:{},categoryDefaults:{}}, resultProducts);
      }
      const productMap = new Map(resultProducts.map(p => [productMatchKey(p.name, p.categoryKey || p.category), p]));
      const imageJobs = validRows.filter(row => row.imageEntry).map(row => {
        const product = productMap.get(productMatchKey(row.name, row.category)) || row.existing;
        return { row, product };
      }).filter(job => job.product);

      if (imageJobs.length) {
        let imageDone = 0;
        const startPercent = state.plan.mode === "full" ? 42 : 8;
        const span = state.plan.mode === "full" ? 53 : 87;
        const tasks = imageJobs.map(job => async () => uploadImage(job.product, job.row.imageEntry));
        await runPool(tasks, 3, (done, total) => {
          imageDone = done;
          setProgress(startPercent + span * (done / total), `Uploading images (${done}/${total})…`);
        });
        void imageDone;
      }

      setProgress(100, "Import complete.");
      setErrors(state.plan.unmatchedImages.length
        ? `Import completed. ${state.plan.unmatchedImages.length} image(s) did not match a menu item and were skipped.`
        : "Import completed successfully. Reloading Menu Management…");
      setTimeout(() => window.location.reload(), 950);
    } catch (error) {
      setErrors(`Import stopped: ${error.message || error}`);
      setProgress(0, "Import needs attention.");
      [start, cancel, close].forEach(btn => { if (btn) btn.disabled = false; });
      state.busy = false;
    }
  }

  function buildModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "ck-import-backdrop";
    backdrop.id = "ckImportBackdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="ck-import-modal" role="dialog" aria-modal="true" aria-labelledby="ckImportTitle">
        <header class="ck-import-header">
          <div>
            <span class="ck-import-kicker">BULK MENU TOOLS</span>
            <h2 id="ckImportTitle">Import Menu & Customizations</h2>
          </div>
          <button class="ck-import-close" id="ckImportClose" type="button" aria-label="Close">×</button>
        </header>
        <div class="ck-import-body">
          <p class="ck-import-note">
            <b>Bulk menu import:</b> upload the menu CSV to create/update products, prices, descriptions, sizes, and recipes. Item customizations can be imported separately. Product images can be imported from one or more ZIP files or selected directly. Images are optimized, saved to the authenticated cafe's MySQL product record, and remain tenant-scoped.
          </p>
          <div class="ck-import-input-grid">
            <div class="ck-import-box">
              <strong>1. Menu CSV (optional)</strong>
              <span>Use this when creating or updating menu item details. Leave blank for image-only replacement.</span>
              <input id="ckImportCsv" type="file" accept=".csv,text/csv">
              <button class="ck-import-template-btn" id="ckImportTemplate" type="button">Download CSV Template</button>
            </div>
            <div class="ck-import-box">
              <strong>2. Item Customizations CSV (optional)</strong>
              <span>Attach item-specific dips, flavors, toppings, and paid options without creating them as menu products.</span>
              <input id="ckImportCustomCsv" type="file" accept=".csv,text/csv">
              <button class="ck-import-template-btn" id="ckImportCustomTemplate" type="button">Download Customization Template</button>
            </div>
            <div class="ck-import-box">
              <strong>3. Image ZIPs (optional)</strong>
              <span>Select multiple ZIP batches at once. All ZIPs are merged and matched to the CSV/products by filename.</span>
              <input id="ckImportZip" type="file" accept=".zip,application/zip,application/x-zip-compressed" multiple>
              <small id="ckImportZipSummary" class="ck-import-file-summary">No ZIP files selected.</small>
            </div>
            <div class="ck-import-box">
              <strong>4. Image selection (optional)</strong>
              <span>Select many PNG/JPG/WebP files at once instead of using a ZIP.</span>
              <input id="ckImportImages" type="file" accept="image/png,image/jpeg,image/webp" multiple>
            </div>
          </div>
          <button class="ck-import-preview-btn" id="ckImportPreview" type="button">Prepare Preview</button>
          <div class="ck-import-summary">
            <div class="ck-import-stat"><b id="ckStatRows">0</b><span>Items matched / parsed</span></div>
            <div class="ck-import-stat"><b id="ckStatImages">0</b><span>Images matched</span></div>
            <div class="ck-import-stat"><b id="ckStatNew">0</b><span>New products</span></div>
            <div class="ck-import-stat"><b id="ckStatUpdate">0</b><span>Updates</span></div>
          </div>
          <div class="ck-import-preview-wrap">
            <table class="ck-import-preview-table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Image</th><th>Sizes</th><th>Action</th></tr></thead>
              <tbody id="ckImportPreviewBody"><tr><td colspan="6">Choose files, then click <b>Prepare Preview</b>.</td></tr></tbody>
            </table>
          </div>
          <div class="ck-import-errors" id="ckImportErrors"></div>
          <div class="ck-import-progress" id="ckImportProgress" hidden>
            <div class="ck-import-progress-head"><span id="ckImportProgressLabel">Working…</span><b id="ckImportProgressPct">0%</b></div>
            <div class="ck-import-progress-track"><div class="ck-import-progress-bar" id="ckImportProgressBar"></div></div>
          </div>
        </div>
        <footer class="ck-import-footer">
          <button class="ck-import-cancel-btn" id="ckImportCancel" type="button">Cancel</button>
          <button class="ck-import-start-btn" id="ckImportStart" type="button" disabled>Start Import</button>
        </footer>
      </section>`;
    document.body.appendChild(backdrop);

    document.getElementById("ckImportTemplate")?.addEventListener("click", downloadTemplate);
    document.getElementById("ckImportCustomTemplate")?.addEventListener("click", downloadCustomizationTemplate);
    document.getElementById("ckImportZip")?.addEventListener("change", updateZipSelectionSummary);
    document.getElementById("ckImportPreview")?.addEventListener("click", preparePreview);
    document.getElementById("ckImportStart")?.addEventListener("click", startImport);
    document.getElementById("ckImportClose")?.addEventListener("click", closeModal);
    document.getElementById("ckImportCancel")?.addEventListener("click", closeModal);
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeModal();
    });
  }

  function openModal() {
    const backdrop = document.getElementById("ckImportBackdrop");
    if (!backdrop) return;
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (state.busy) return;
    const backdrop = document.getElementById("ckImportBackdrop");
    if (backdrop) backdrop.hidden = true;
    document.body.style.overflow = "";
    hideProgress();
  }

  buildModal();
  trigger.addEventListener("click", openModal);
})();
