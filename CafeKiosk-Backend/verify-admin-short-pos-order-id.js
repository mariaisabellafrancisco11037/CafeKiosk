const fs = require("fs");
const path = require("path");
const assert = require("assert");

const monitorPath = path.join(__dirname, "..", "CafeKiosk-Frontend", "Assets", "js", "admin-stable", "order-monitor.js");
const pagePath = path.join(__dirname, "..", "CafeKiosk-Frontend", "Admin", "order-monitor.php");
const monitor = fs.readFileSync(monitorPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");

assert(/displayOrderNumber/.test(monitor), "Admin Order Monitor does not consume backend displayOrderNumber.");
assert(/const displayId\s*=/.test(monitor), "Admin Order Monitor does not create a compact display ID.");
assert(/`POS-\$\{compactOrderNumber/.test(monitor), "Admin POS display ID is not POS-#### style.");
assert(/order\.displayId \|\| order\.id/.test(monitor), "Admin table/detail rendering does not prefer the compact display ID.");
assert(/admin-short-pos-id-20261009/.test(page), "Admin Order Monitor cache-busting version was not updated.");

console.log("Admin Order Monitor compact POS order ID wiring verified.");
