"use strict";

const state = require("./appStateStore");

function blank() {
  return {
    products: {},
    categoryDefaults: {},
    updatedAt: new Date().toISOString()
  };
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function demoCategoryDefaults() {
  try {
    const catalog = require("../data/demo-cafe-catalog.json");
    const defaults = {};

    for (const category of Array.isArray(catalog?.categories) ? catalog.categories : []) {
      const key = String(category?.configKey || category?.key || "").trim();
      const sizes = Array.isArray(category?.sizes) ? category.sizes : [];

      if (!key || !sizes.length) continue;

      defaults[key] = sizes.map(size => ({
        label: String(size?.label || "").trim(),
        priceAdd: Math.max(0, Number(size?.priceAdd ?? size?.price ?? 0) || 0),
        multiplier: Math.max(0.01, Number(size?.multiplier ?? 1) || 1)
      })).filter(size => size.label);
    }

    return defaults;
  } catch (error) {
    console.warn("Demo category size defaults could not be loaded:", error.message);
    return {};
  }
}

function demoProductDefaults() {
  try {
    const config = require("../data/demo-cafe-menu-config.json");
    return asObject(config?.products);
  } catch (error) {
    console.warn("Demo product customization defaults could not be loaded:", error.message);
    return {};
  }
}

function mergeDemoProduct(defaultValue, savedValue) {
  const base = asObject(defaultValue);
  const saved = asObject(savedValue);
  const merged = { ...base, ...saved };

  // An explicitly saved empty array means the owner intentionally removed the
  // field. If the property was never saved, keep the bundled Demo Cafe default.
  if (!Object.prototype.hasOwnProperty.call(saved, "sizes")) {
    merged.sizes = Array.isArray(base.sizes) ? base.sizes : [];
  }
  if (!Object.prototype.hasOwnProperty.call(saved, "customizations")) {
    merged.customizations = Array.isArray(base.customizations) ? base.customizations : [];
  }

  return merged;
}

function mergeDemoDefaults(cafeId, config) {
  const source = {
    ...blank(),
    ...asObject(config),
    products: asObject(config?.products),
    categoryDefaults: asObject(config?.categoryDefaults)
  };

  if (String(cafeId) !== "cafe-1") return source;

  const categoryDefaults = demoCategoryDefaults();
  const productDefaults = demoProductDefaults();
  const products = {};

  for (const [key, value] of Object.entries(productDefaults)) {
    products[key] = mergeDemoProduct(value, source.products[key]);
  }

  // Preserve any owner-created products that are not part of the bundled 180.
  for (const [key, value] of Object.entries(source.products)) {
    if (!Object.prototype.hasOwnProperty.call(products, key)) products[key] = value;
  }

  return {
    ...source,
    products,
    categoryDefaults: {
      ...categoryDefaults,
      ...source.categoryDefaults
    }
  };
}

function publicView(config = {}) {
  const source = asObject(config);
  const products = {};

  for (const [key, rawValue] of Object.entries(asObject(source.products))) {
    const value = asObject(rawValue);
    products[key] = {
      productName: String(value.productName || ""),
      category: String(value.category || ""),
      sizes: (Array.isArray(value.sizes) ? value.sizes : []).map(size => ({
        label: String(size?.label || "").trim(),
        priceAdd: Math.max(0, Number(size?.priceAdd ?? size?.price ?? 0) || 0),
        multiplier: Math.max(0.01, Number(size?.multiplier ?? 1) || 1)
      })).filter(size => size.label),
      customizations: (Array.isArray(value.customizations) ? value.customizations : []).map(group => ({
        key: String(group?.key || "customization"),
        label: String(group?.label || "Customization"),
        type: group?.type === "radio" ? "radio" : "checkbox",
        required: group?.required === true,
        options: (Array.isArray(group?.options) ? group.options : []).map(option => ({
          label: String(option?.label || option?.value || "").trim(),
          value: String(option?.value || option?.label || "").trim(),
          price: Math.max(0, Number(option?.price ?? option?.additionalPrice ?? 0) || 0)
        })).filter(option => option.label)
      })).filter(group => group.options.length),
      // Optional recipe ingredients are public menu choices too. Only expose the
      // fields the kiosk needs; inventory stock quantities stay private.
      ingredients: (Array.isArray(value.ingredients) ? value.ingredients : [])
        .filter(ingredient => String(ingredient?.mode || "").toLowerCase() === "option")
        .map(ingredient => ({
          name: String(ingredient?.name || "").trim(),
          mode: "option",
          optionValue: String(ingredient?.optionValue || ingredient?.optionName || ingredient?.name || "").trim(),
          optionPrice: Math.max(0, Number(ingredient?.optionPrice ?? ingredient?.priceAdd ?? ingredient?.additionalPrice ?? 0) || 0)
        }))
        .filter(ingredient => ingredient.optionValue),
      updatedAt: value.updatedAt || null
    };
  }

  const categoryDefaults = {};
  for (const [key, sizes] of Object.entries(asObject(source.categoryDefaults))) {
    categoryDefaults[key] = (Array.isArray(sizes) ? sizes : []).map(size => ({
      label: String(size?.label || "").trim(),
      priceAdd: Math.max(0, Number(size?.priceAdd ?? size?.price ?? 0) || 0),
      multiplier: Math.max(0.01, Number(size?.multiplier ?? 1) || 1)
    })).filter(size => size.label);
  }

  return {
    products,
    categoryDefaults,
    updatedAt: source.updatedAt || null
  };
}

async function get(cafeId = "cafe-1") {
  const row = await state.getState(cafeId, "menu-config", null);
  const config = row && typeof row === "object" ? row : blank();
  return mergeDemoDefaults(cafeId, config);
}

async function put(cafeId = "cafe-1", cfg = {}) {
  const current = await get(cafeId);

  const next = {
    products:
      cfg.products && typeof cfg.products === "object"
        ? cfg.products
        : current.products || {},
    categoryDefaults:
      cfg.categoryDefaults && typeof cfg.categoryDefaults === "object"
        ? cfg.categoryDefaults
        : current.categoryDefaults || {},
    updatedAt: new Date().toISOString()
  };

  await state.setState(cafeId, "menu-config", next);
  return mergeDemoDefaults(cafeId, next);
}

module.exports = { get, put, publicView };
