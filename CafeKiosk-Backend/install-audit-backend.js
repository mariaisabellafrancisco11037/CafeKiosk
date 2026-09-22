// ============================================================
// ONE-TIME AUDIT BACKEND INSTALLER
// Run from CafeKiosk-Backend:
//     node install-audit-backend.js
//
// It backs up server.js and adds ONLY the audit middleware + route.
// ============================================================

const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const backupPath = path.join(__dirname, "server.js.before-audit-backup");

if (!fs.existsSync(serverPath)) {
  console.error("server.js was not found in this folder.");
  process.exit(1);
}

let source = fs.readFileSync(serverPath, "utf8");
const original = source;

if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, original, "utf8");
  console.log("Backup created:", backupPath);
}

const middlewareMount = `\n// =====================================================\n// AUDIT LOG CAPTURE\n// Records successful/failed state-changing API activity.\n// =====================================================\n\napp.use(\n    \"/api\",\n    require(\"./middleware/auditLogMiddleware\")\n);\n\n`;

if (!source.includes('require("./middleware/auditLogMiddleware")')) {
  const apiMarker = "// =====================================================\n// API ROUTES";

  if (source.includes(apiMarker)) {
    source = source.replace(apiMarker, middlewareMount + apiMarker);
  } else {
    const firstOrderMount = /app\.use\(\s*[\"']\/api\/orders[\"']/m;
    const match = source.match(firstOrderMount);
    if (match && match.index !== undefined) {
      source = source.slice(0, match.index) + middlewareMount + source.slice(match.index);
    } else {
      console.error("Could not find the API route section in server.js.");
      console.error("No changes were written.");
      process.exit(1);
    }
  }
}

const auditRouteMount = `\n// =====================================================\n// AUDIT LOG API\n// =====================================================\n\napp.use(\n    \"/api/audit-logs\",\n    require(\"./routes/auditLogs\")\n);\n\n`;

if (!source.includes('"/api/audit-logs"') && !source.includes("'/api/audit-logs'")) {
  const futureMarker = "// =====================================================\n// FUTURE ROUTES";

  if (source.includes(futureMarker)) {
    source = source.replace(futureMarker, auditRouteMount + futureMarker);
  } else {
    const listenMarker = /server\.listen\s*\(/m;
    const match = source.match(listenMarker);
    if (match && match.index !== undefined) {
      source = source.slice(0, match.index) + auditRouteMount + source.slice(match.index);
    } else {
      source += auditRouteMount;
    }
  }
}

if (source === original) {
  console.log("Audit backend is already installed in server.js.");
} else {
  fs.writeFileSync(serverPath, source, "utf8");
  console.log("server.js updated successfully.");
}

console.log("\nNext:");
console.log("1. Restart the CafeKiosk backend.");
console.log("2. Log in, create/update an order, edit inventory/menu, etc.");
console.log("3. Open /Admin/audit-logs.php");
