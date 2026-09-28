# Manager Order Queue Match Staff Fix V4

- Restores the Manager Live Order table at full available height.
- Removes the wasted spacer between Status and Live Order.
- Keeps Preparation Queue directly above Status.
- Keeps pagination directly below the Live Order table.
- Matches the working Staff Order Queue content layout.
- Does not remove or wrap the Live Order table.
- Preserves all Security #1, kiosk order, PIN, inventory, report, and tenant-isolation changes.

Root cause: `uniform-theme.js` hides the original page-title grid child after creating the shared top header, leaving five visible content rows. The previous Manager override incorrectly reserved six rows, so the Live Order card was placed in a fixed 52px track while pagination consumed the flexible row.
