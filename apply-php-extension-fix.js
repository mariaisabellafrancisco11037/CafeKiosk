/**
 * CafeKiosk HTML -> PHP extension compatibility patch
 * ---------------------------------------------------
 * This keeps the existing Node/Express backend on port 5000.
 *
 * What it does:
 *  1. Renames frontend *.html files to *.php (if any remain).
 *  2. Updates local .html references to .php in CafeKiosk frontend.
 *  3. Updates backend source references/redirects from .html to .php.
 *  4. Adds an Express MIME compatibility layer so renamed .php pages
 *     are sent to Chrome as text/html even though Node is NOT a PHP engine.
 *  5. Creates a backup of every changed file before modifying it.
 *
 * IMPORTANT:
 * This is for files that were only RENAMED from HTML to PHP.
 * Node/Express does NOT execute real <?php ... ?> code.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const PATCH_MARKER = "CAFEKIOSK_PHP_EXTENSION_COMPAT_V1";

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch (_) {
    return false;
  }
}

function findProjectRoot(startDir) {
  const candidates = [
    startDir,
    path.resolve(startDir, "CafeKiosk"),
    path.resolve(startDir, ".."),
    path.resolve(startDir, "..", "CafeKiosk")
  ];

  for (const candidate of candidates) {
    const frontend = path.join(candidate, "CafeKiosk-Frontend");
    const backend = path.join(candidate, "CafeKiosk-Backend");
    if (exists(frontend) && exists(backend)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find CafeKiosk-Frontend and CafeKiosk-Backend.\n" +
    "Put this file inside your CafeKiosk project folder, then run it again."
  );
}

const PROJECT_ROOT = findProjectRoot(__dirname);
const FRONTEND = path.join(PROJECT_ROOT, "CafeKiosk-Frontend");
const BACKEND = path.join(PROJECT_ROOT, "CafeKiosk-Backend");
const SERVER_FILE = path.join(BACKEND, "server.js");

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const BACKUP = path.join(
  PROJECT_ROOT,
  "php-extension-backup-" + stamp
);

const excludedFolders = new Set([
  "node_modules",
  ".git",
  ".vscode",
  "php-extension-backup"
]);

function shouldSkipDir(name) {
  if (excludedFolders.has(name)) return true;
  return name.startsWith("php-extension-backup-");
}

function walk(dir) {
  const results = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && shouldSkipDir(entry.name)) {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }

  return results;
}

function relativeToProject(file) {
  return path.relative(PROJECT_ROOT, file);
}

function backupFile(file) {
  const rel = relativeToProject(file);
  const dest = path.join(BACKUP, rel);

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (!exists(dest)) {
    fs.copyFileSync(file, dest);
  }
}

function replaceHtmlReferences(file) {
  const allowed = new Set([
    ".js",
    ".php",
    ".html",
    ".css",
    ".json"
  ]);

  if (!allowed.has(path.extname(file).toLowerCase())) {
    return false;
  }

  let original;
  try {
    original = fs.readFileSync(file, "utf8");
  } catch (_) {
    return false;
  }

  if (!original.toLowerCase().includes(".html")) {
    return false;
  }

  // The project was intentionally renamed from HTML pages to PHP pages.
  // Update all old page-extension references in project source only.
  const updated = original.replace(/\.html\b/gi, ".php");

  if (updated === original) {
    return false;
  }

  backupFile(file);
  fs.writeFileSync(file, updated, "utf8");
  return true;
}

function renameFrontendHtmlFiles() {
  const htmlFiles = walk(FRONTEND)
    .filter(file => path.extname(file).toLowerCase() === ".html");

  let count = 0;

  // Deep files first is not strictly required, but keeps output predictable.
  htmlFiles.sort((a, b) => b.length - a.length);

  for (const oldFile of htmlFiles) {
    const newFile =
      oldFile.slice(0, -5) + ".php";

    backupFile(oldFile);

    if (exists(newFile)) {
      console.log(
        "SKIP rename (PHP already exists):",
        relativeToProject(newFile)
      );
      continue;
    }

    fs.renameSync(oldFile, newFile);
    console.log(
      "RENAMED:",
      relativeToProject(oldFile),
      "->",
      relativeToProject(newFile)
    );
    count++;
  }

  return count;
}

function patchServerMimeCompatibility() {
  if (!exists(SERVER_FILE)) {
    throw new Error("CafeKiosk-Backend/server.js was not found.");
  }

  let source = fs.readFileSync(SERVER_FILE, "utf8");

  // First update physical page names and redirects.
  const phpSource = source.replace(/\.html\b/gi, ".php");

  if (phpSource !== source) {
    backupFile(SERVER_FILE);
    source = phpSource;
  }

  if (source.includes(PATCH_MARKER)) {
    fs.writeFileSync(SERVER_FILE, source, "utf8");
    return {
      changed: phpSource !== fs.readFileSync(SERVER_FILE, "utf8"),
      alreadyInstalled: true
    };
  }

  const block = `

// =====================================================
// ${PATCH_MARKER}
// PHP-EXTENSION COMPATIBILITY
//
// CafeKiosk pages were renamed from .html to .php,
// while Node/Express remains the web server.
//
// This does NOT execute PHP code. It only tells the
// browser that renamed .php files contain HTML markup.
// =====================================================
app.use(
    (req, res, next) => {
        const requestPath =
            String(
                req.path ||
                ""
            ).toLowerCase();

        // Direct static request such as:
        // /Admin/dashboard.php or /POS/pos.php
        if (
            requestPath.endsWith(
                ".php"
            )
        ) {
            res.setHeader(
                "Content-Type",
                "text/html; charset=utf-8"
            );
        }

        // Extensionless Express routes such as /login,
        // /staff-login, /pos, etc. use res.sendFile().
        const originalSendFile =
            res.sendFile.bind(
                res
            );

        res.sendFile =
            function (
                filePath,
                options,
                callback
            ) {
                if (
                    String(
                        filePath ||
                        ""
                    )
                    .toLowerCase()
                    .endsWith(
                        ".php"
                    )
                ) {
                    res.setHeader(
                        "Content-Type",
                        "text/html; charset=utf-8"
                    );
                }

                return originalSendFile(
                    filePath,
                    options,
                    callback
                );
            };

        next();
    }
);
// =====================================================
// END ${PATCH_MARKER}
// =====================================================

`;

  // Put it after app/server/PORT setup and before page/static routes.
  // Preferred insertion point: immediately before the PATHS section.
  const pathsMarker =
    "// =====================================================\n// PATHS\n// =====================================================";

  if (source.includes(pathsMarker)) {
    backupFile(SERVER_FILE);
    source = source.replace(
      pathsMarker,
      block + pathsMarker
    );
  } else {
    // Fallback: insert before first app.use().
    const firstUse = source.indexOf("app.use(");

    if (firstUse === -1) {
      throw new Error(
        "Could not find a safe insertion point in server.js."
      );
    }

    backupFile(SERVER_FILE);
    source =
      source.slice(0, firstUse) +
      block +
      source.slice(firstUse);
  }

  fs.writeFileSync(SERVER_FILE, source, "utf8");

  return {
    changed: true,
    alreadyInstalled: false
  };
}

function patchProjectReferences() {
  let changed = 0;

  const frontendFiles = walk(FRONTEND);

  for (const file of frontendFiles) {
    if (replaceHtmlReferences(file)) {
      changed++;
    }
  }

  // Backend source only; never touch node_modules.
  const backendFiles = walk(BACKEND)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return [
        ".js",
        ".json"
      ].includes(ext);
    });

  for (const file of backendFiles) {
    if (replaceHtmlReferences(file)) {
      changed++;
    }
  }

  return changed;
}

function printPhpPages() {
  const pages = walk(FRONTEND)
    .filter(file => path.extname(file).toLowerCase() === ".php")
    .map(relativeToProject)
    .sort();

  console.log("");
  console.log("PHP pages now in the frontend:");
  for (const page of pages) {
    console.log("  -", page);
  }
}

function main() {
  console.log("");
  console.log("==============================================");
  console.log("CafeKiosk HTML -> PHP Extension Fix");
  console.log("==============================================");
  console.log("Project:", PROJECT_ROOT);
  console.log("");

  fs.mkdirSync(BACKUP, { recursive: true });

  const renamed =
    renameFrontendHtmlFiles();

  const referencesChanged =
    patchProjectReferences();

  const mimeResult =
    patchServerMimeCompatibility();

  printPhpPages();

  console.log("");
  console.log("==============================================");
  console.log("DONE");
  console.log("==============================================");
  console.log("Renamed HTML files:", renamed);
  console.log("Files with references updated:", referencesChanged);
  console.log(
    "PHP MIME compatibility:",
    mimeResult.alreadyInstalled
      ? "already installed"
      : "installed"
  );
  console.log("Backup:", BACKUP);
  console.log("");
  console.log("Restart your existing backend:");
  console.log("  cd CafeKiosk-Backend");
  console.log("  node server.js");
  console.log("");
  console.log("Laptop login:");
  console.log("  http://127.0.0.1:5000/login");
  console.log("");
  console.log("Tablet login:");
  console.log("  http://YOUR-LAPTOP-IP:5000/login");
  console.log("");
  console.log(
    "NOTE: Node is still the backend. This patch does not execute real PHP code."
  );
  console.log("");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("PATCH FAILED:");
  console.error(error.message);
  console.error("");
  process.exitCode = 1;
}
