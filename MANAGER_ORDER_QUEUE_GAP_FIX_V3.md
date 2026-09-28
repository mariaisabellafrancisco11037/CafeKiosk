# Manager Order Queue Gap Fix V3

This build restores the original Manager Order Queue markup and fixes only the CSS conflict that created the blank space between the Status row and Live Order table.

Root cause:
- `uniform-theme.js` adds `cku-v2` and `cku-content` at runtime.
- `uniform-theme.css` has a more-specific 4-row queue grid rule.
- The Manager page has six visible sections: title, filters, preparation queue, status, live table, pagination.
- The 4-row rule created implicit grid rows and pushed/collapsed the Live Order table.

Fix:
- Preserve Status and Live Order as separate direct children.
- Override the runtime Manager grid with six explicit rows.
- Keep Live Order as `42px toolbar + flexible table`.
- No wrapper or table removal.
