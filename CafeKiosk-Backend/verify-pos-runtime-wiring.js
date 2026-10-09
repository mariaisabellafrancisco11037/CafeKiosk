"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const posJs = fs.readFileSync(path.join(root, "CafeKiosk-Frontend", "Assets", "js", "pos.js"), "utf8");
const pages = [
  path.join(root, "CafeKiosk-Frontend", "pos", "pos.php"),
  path.join(root, "CafeKiosk-Frontend", "Manager", "pos.php")
].map(file => ({ file, html: fs.readFileSync(file, "utf8") }));

function fail(message) {
  console.error(`❌ POS runtime wiring check failed: ${message}`);
  process.exit(1);
}

if (posJs.includes('$("checkoutButton")')) {
  fail("pos.js still references the removed #checkoutButton element.");
}
if (!posJs.includes('confirmPOSOrder(event.currentTarget)')) {
  fail("Confirm & Send Order is not wired to pass the real trigger button.");
}
if (!posJs.includes('await showPOSOrderForwardedDialog(')) {
  fail("success confirmation is not called after the order POST succeeds.");
}
for (const { file, html } of pages) {
  for (const id of ["posReviewConfirm", "posOrderSentModal", "posOrderSentOk", "paymentMethod", "cashReceived", "serviceType"]) {
    if (!html.includes(`id="${id}"`)) fail(`${path.basename(path.dirname(file))}/${path.basename(file)} is missing #${id}.`);
  }
}
console.log("✅ POS runtime wiring verified: submit button exists, no removed checkoutButton dependency, and success dialog is wired.");
