CafeKiosk Inventory + Report Responsive Fix
Date: 2026-09-28

Inventory Monitor
- Restores vertical page scrolling on phones.
- Works when Chrome "Desktop site" is enabled by also detecting coarse/touch pointers.
- Removes the fixed 100dvh/overflow trap for Inventory on touch/smaller viewports.
- Stock Movements uses a horizontal card rail.
- Adds a visible draggable range slider above Stock Movements.
- Keeps a visible native horizontal scrollbar as a second way to navigate the movement rail.

Report & Analytics
- Removed the Analytics Breakdown section from the page markup.
- Removed the JavaScript calls that populated source/status/payment/product breakdown blocks.
- This prevents Analytics Breakdown from returning at wider breakpoints.

Preserved
- Approval PIN verification/reset fixes from the previous build.
- Existing order monitor and prior responsive fixes.
