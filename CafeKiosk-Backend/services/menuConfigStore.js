"use strict";

const state = require("./appStateStore");

function blank() {
  return {
    products: {},
    categoryDefaults: {},
    updatedAt: new Date().toISOString()
  };
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

function mergeDemoDefaults(cafeId, config) {
  if (String(cafeId) !== "cafe-1") return config;

  const defaults = demoCategoryDefaults();

  return {
    ...config,
    products:
      config?.products && typeof config.products === "object"
        ? config.products
        : {},
    categoryDefaults: {
      ...defaults,
      ...(config?.categoryDefaults && typeof config.categoryDefaults === "object"
        ? config.categoryDefaults
        : {})
    }
  };
}

async function get(cafeId = "cafe-1") {
  const row = await state.getState(cafeId, "menu-config", null);
  const config =
    row && typeof row === "object"
      ? row
      : blank();

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
  return next;
}

module.exports = { get, put };
