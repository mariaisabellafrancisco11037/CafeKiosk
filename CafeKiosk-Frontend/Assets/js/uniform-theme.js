/* =========================================================
   CAFEKIOSK UNIFORM THEME HELPERS
   - Adds page scope classes
   - Normalizes Admin / Staff profile cards
   - Replaces text/emoji nav icons with the same SVG language
   - Uses the active CafeKiosk session name when available
========================================================= */

(() => {
  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    order: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    'order queue': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5h14M5 12h14M5 19h14"/><circle cx="3" cy="5" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="19" r="1"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
    'menu management': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3h11l5 5v13H3z"/><path d="M14 3v5h5"/><path d="M7 12h8M7 16h8"/></svg>',
    'promotions & discount': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
    inventory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="M8 17v-3M13 17V8M18 17V5"/></svg>',
    'audit logs': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 2h6a2 2 0 0 1 2 2v1H7V4a2 2 0 0 1 2-2z"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 11h8M8 15h5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };

  const PERSON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>';

  function parseJson(value) {
    try { return JSON.parse(value || 'null'); } catch { return null; }
  }

  function inferArea() {
    const path = String(location.pathname || '').toLowerCase();
    const body = document.body;

    if (path.includes('/admin/')) {
      body.classList.add('uniform-admin');
      return 'admin';
    }

    if (path.includes('/manager/') || path.includes('manager-dashboard') || path.includes('manager-pos') || path.includes('manager-order-queue')) {
      body.classList.add('uniform-pos', 'uniform-manager');
      return 'manager';
    }

    if (path.includes('/pos/') || path.endsWith('/pos') || path.includes('order-queue') || path.includes('staff-dashboard')) {
      body.classList.add('uniform-pos');
      return 'staff';
    }

    if (path.includes('/kiosk/')) {
      body.classList.add('uniform-kiosk');
      if (path.includes('kiosk.php')) body.classList.add('kiosk-home');
      if (path.includes('order-type')) body.classList.add('kiosk-order-type');
      if (path.includes('menu.php')) body.classList.add('kiosk-menu');
      if (path.includes('checkout')) body.classList.add('kiosk-receipt');
      return 'kiosk';
    }

    if (path.includes('/auth/')) {
      body.classList.add('uniform-auth');
      return 'auth';
    }

    return '';
  }

  function getSession(area) {
    if (area === 'admin') {
      return parseJson(localStorage.getItem('cafeAdminSession')) || window.CafeAuth?.session || null;
    }

    if (area === 'manager') {
      return parseJson(localStorage.getItem('cafeManagerSession')) || window.CafeAuth?.session || null;
    }

    if (area === 'staff') {
      return parseJson(localStorage.getItem('cafeStaffSession')) || parseJson(localStorage.getItem('cafeManagerSession')) || parseJson(localStorage.getItem('cafeAdminSession')) || window.CafeAuth?.session || null;
    }

    return null;
  }

  function displayName(session, area) {
    const raw = String(
      session?.displayName ||
      session?.name ||
      session?.username ||
      session?.userName ||
      ''
    ).trim();

    if (raw) return raw;
    return area === 'admin' ? "Admin's Name" : area === 'manager' ? "Manager's Name" : "Staff's Name";
  }

  function displayRole(session, area) {
    const role = String(session?.role || '').trim();
    if (role) return /^admin$/i.test(role) ? 'Administrator' : role;
    return area === 'admin' ? 'Administrator' : area === 'manager' ? 'Manager' : 'Staff';
  }

  function profileMarkup(name, role, area) {
    const nameId = area === 'admin' ? 'adminName' : area === 'manager' ? 'managerName' : 'staffName';
    return `
      <span class="uniform-profile-avatar" aria-hidden="true">${PERSON_ICON}</span>
      <span class="uniform-profile-copy">
        <strong id="${nameId}" class="uniform-profile-name">${escapeHtml(name)}</strong>
        <small>${escapeHtml(role)}</small>
      </span>
      <span class="uniform-profile-caret" aria-hidden="true">⌄</span>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizeProfiles(area) {
    if (!['admin', 'manager', 'staff'].includes(area)) return;

    const session = getSession(area);
    const name = displayName(session, area);
    const role = displayRole(session, area);

    const selectors = area === 'admin'
      ? ['.admin-profile-card', '.admin-profile', '.ck-profile', '#admin-profile-button']
      : area === 'manager'
        ? ['.manager-profile', '.staff-profile']
        : ['.staff-profile'];

    const seen = new Set();
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add('uniform-profile-card');
        el.innerHTML = profileMarkup(name, role, area);
        el.setAttribute('aria-label', `${name} - ${role}`);
      });
    });

    if (area === 'staff' || area === 'manager') {
      const cart = document.querySelector('.pos-container .cart-panel');
      if (cart && !cart.querySelector('.uniform-pos-profile')) {
        const profile = document.createElement('button');
        profile.type = 'button';
        profile.className = 'staff-profile uniform-pos-profile uniform-profile-card';
        profile.setAttribute('aria-label', `${name} - ${role}`);
        profile.innerHTML = profileMarkup(name, role, area);
        cart.prepend(profile);
      }
    }
  }

  function normalizeNavIcons() {
    document.querySelectorAll('.staff-nav-link, .staff-nav-button, .ck-nav > a').forEach(link => {
      const labelElement = link.querySelector('.label') || link.querySelector('span:last-child');
      const label = String(labelElement?.textContent || link.textContent || '').trim().toLowerCase();
      const normalized = label.replace(/\s+/g, ' ');
      const key = (normalized === 'pos' || normalized === 'manager pos') ? 'menu' : normalized;
      const icon = ICONS[key];
      if (!icon) return;

      let iconElement = link.querySelector('.staff-nav-icon, .ico');
      if (!iconElement) {
        iconElement = document.createElement('span');
        iconElement.className = 'staff-nav-icon';
        link.prepend(iconElement);
      }
      iconElement.innerHTML = icon;
    });
  }

  function normalizeExtensionSidebar() {
    document.querySelectorAll('.ck-sidebar').forEach(sidebar => {
      sidebar.classList.add('uniform-sidebar');
    });
    document.querySelectorAll('.ck-nav > a').forEach(link => link.classList.add('staff-nav-link'));
  }

  function boot() {
    const area = inferArea();
    normalizeExtensionSidebar();
    normalizeNavIcons();
    normalizeProfiles(area);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

/* =========================================================
   CAFEKIOSK UNIFORM THEME V2 — LOCKED SHELL CONTROLLER
   Creates one non-scrolling top header and aligns each page
   to the same sidebar/header grid without changing page logic.
========================================================= */
(() => {
  const PERSON_ICON_V2 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>';

  const PAGE_META = {
    'dashboard.php': { kicker: 'SYSTEM OVERVIEW', title: 'Admin Dashboard', desc: 'Live overview of orders, sales, POS, Kiosk, menu and inventory.' },
    'order-monitor.php': { kicker: 'LIVE OPERATIONS', title: 'Order Monitor', desc: 'Monitor and manage live POS and Kiosk orders.' },
    'menu-management.php': { kicker: 'ADMIN CATALOG', title: 'Menu Management', desc: 'Manage categories, menu items and availability.' },
    'promotions-discount.php': { kicker: 'PROMOTIONS', title: 'Promotions & Discount', desc: 'Create and manage discount rules for POS and Kiosk.' },
    'inventory.php': { kicker: 'STOCK CONTROL', title: 'Inventory Monitor', desc: 'Track ingredient stock levels and stock movements.' },
    'report.php': { kicker: 'ADMIN ANALYTICS', title: 'Report & Analytics', desc: 'Review sales, orders and product performance.' },
    'audit-logs.php': { kicker: 'ADMIN SECURITY', title: 'Audit Logs', desc: 'Review important system and user activity.' },
    'user.php': { kicker: 'ADMIN ACCOUNTS', title: 'User Management', desc: 'Manage administrator and staff accounts.' },
    'settings.php': { kicker: 'SYSTEM CONFIGURATION', title: 'Settings', desc: 'Manage CafeKiosk configuration and preferences.' },
    'staff-dashboard': { kicker: 'STAFF WORKSPACE', title: 'Staff Dashboard', desc: 'Your shift overview, queue status and quick actions.' },
    'staff-dashboard.php': { kicker: 'STAFF WORKSPACE', title: 'Staff Dashboard', desc: 'Your shift overview, queue status and quick actions.' },
    'manager-dashboard': { kicker: 'MANAGER OPERATIONS', title: 'Manager Dashboard', desc: 'Cafe operations, sales, queue and stock visibility.' },
    'manager-pos': { kicker: 'MANAGER OPERATIONS', title: 'Manager POS', desc: 'Take orders with Manager permissions and operational oversight.' },
    'manager-order-queue': { kicker: 'MANAGER OPERATIONS', title: 'Manager Order Queue', desc: 'Review and manage live cafe orders.' },
    'pos.php': { kicker: 'STAFF WORKSPACE', title: 'POS Menu', desc: 'Create customer orders from the staff point of sale.' },
    'order-queue.php': { kicker: 'STAFF WORKSPACE', title: 'Order Queue', desc: 'Track and update POS and Kiosk orders.' },
    'menu.php': { kicker: 'SELF-SERVICE', title: 'Kiosk Menu', desc: 'Browse the CafeKiosk menu and build an order.' }
  };

  function parseJsonV2(value) {
    try { return JSON.parse(value || 'null'); } catch { return null; }
  }

  function pageNameV2() {
    const path = String(location.pathname || '').replace(/\/+$/, '').toLowerCase();
    const cleanMap = {
      '/admin/dashboard':'dashboard.php', '/admin/order-monitor':'order-monitor.php',
      '/admin/menu-management':'menu-management.php', '/admin/promotions':'promotions-discount.php',
      '/admin/inventory':'inventory.php', '/admin/report':'report.php',
      '/admin/audit-logs':'audit-logs.php', '/admin/users':'user.php', '/admin/settings':'settings.php',
      '/staff-dashboard':'staff-dashboard', '/pos':'pos.php', '/order-queue':'order-queue.php',
      '/manager-dashboard':'dashboard.php', '/manager-pos':'pos.php', '/manager-order-queue':'order-queue.php',
      '/menu':'menu.php'
    };
    if (cleanMap[path]) return cleanMap[path];
    const raw = path.split('/').filter(Boolean).pop() || '';
    return raw.toLowerCase();
  }

  function areaV2() {
    const p = String(location.pathname || '').toLowerCase();
    if (p.includes('/admin/')) return 'admin';
    if (p.includes('/manager/') || p.includes('manager-dashboard') || p.includes('manager-pos') || p.includes('manager-order-queue')) return 'manager';
    if (p.includes('/pos/') || p.includes('staff-dashboard') || p.endsWith('/pos')) return 'staff';
    if (p.includes('/kiosk/menu')) return 'kiosk';
    return '';
  }

  function sessionV2(area) {
    if (area === 'admin') {
      return parseJsonV2(localStorage.getItem('cafeAdminSession')) || window.CafeAuth?.session || null;
    }
    if (area === 'manager') {
      return parseJsonV2(localStorage.getItem('cafeManagerSession')) || window.CafeAuth?.session || null;
    }
    if (area === 'staff') {
      return parseJsonV2(localStorage.getItem('cafeStaffSession')) || parseJsonV2(localStorage.getItem('cafeManagerSession')) || parseJsonV2(localStorage.getItem('cafeAdminSession')) || window.CafeAuth?.session || null;
    }
    return null;
  }

  function escapeV2(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function profileDataV2(area) {
    if (area === 'kiosk') return { name: 'Self-Service Kiosk', role: 'Customer Mode' };
    const session = sessionV2(area);
    const fallback = area === 'admin' ? 'CafeKiosk Administrator' : area === 'manager' ? 'CafeKiosk Manager' : 'CafeKiosk Staff';
    const name = String(session?.displayName || session?.fullName || session?.full_name || session?.name || session?.username || session?.userName || fallback).trim();
    const roleRaw = String(session?.role || '').trim();
    const role = roleRaw ? (/^admin$/i.test(roleRaw) ? 'Administrator' : roleRaw) : (area === 'admin' ? 'Administrator' : area === 'manager' ? 'Manager' : 'Staff');
    return { name, role };
  }

  function buildProfileV2(area) {
    const { name, role } = profileDataV2(area);
    const el = document.createElement('div');
    el.className = 'cku-profile-card';
    el.setAttribute('aria-label', `${name} - ${role}`);
    el.innerHTML = `
      <span class="cku-profile-avatar" aria-hidden="true">${PERSON_ICON_V2}</span>
      <span class="cku-profile-copy">
        <strong>${escapeV2(name)}</strong>
        <small>${escapeV2(role)}</small>
      </span>
      <span class="cku-profile-caret" aria-hidden="true">⌄</span>
    `;
    return el;
  }

  function shellForV2(area) {
    if (area === 'admin') {
      return document.querySelector('.queue-shell, .queue-app, .menu-shell, .inventory-shell, .ck-shell');
    }
    if (area === 'manager') {
      return document.querySelector('.manager-dashboard-shell, .pos-container, .queue-app');
    }
    if (area === 'staff') {
      return document.querySelector('.pos-container, .queue-app');
    }
    if (area === 'kiosk') {
      return document.querySelector('body.kiosk-menu .container');
    }
    return null;
  }

  function sidebarForV2(shell, area) {
    if (!shell) return null;
    if (area === 'admin') return shell.querySelector(':scope > .staff-sidebar, :scope > .sidebar.admin-sidebar, :scope > .ck-sidebar, :scope > .sidebar');
    return shell.querySelector(':scope > .sidebar');
  }

  function mainForV2(shell) {
    if (!shell) return null;
    return shell.querySelector(':scope > main');
  }

  function rightForV2(shell, area) {
    if (!shell) return null;
    if (area === 'admin') return shell.querySelector(':scope > .queue-right');
    if (area === 'manager') return shell.querySelector(':scope > .cart-panel, :scope > .queue-right');
    if (area === 'staff') return shell.querySelector(':scope > .cart-panel, :scope > .queue-right');
    if (area === 'kiosk') return shell.querySelector(':scope > .order-summary');
    return null;
  }

  function collectHeaderToolsV2(file) {
    const selectorsByFile = {
      'dashboard.php': ['#connectionPill', '#refreshBtn'],
      'order-monitor.php': ['#conn-status'],
      'menu-management.php': ['.catalog-state'],
      'inventory.php': ['.catalog-state'],
      'order-queue.php': ['.live-indicator']
    };
    const tools = [];
    (selectorsByFile[file] || []).forEach(selector => {
      const el = document.querySelector(selector);
      if (el && !tools.includes(el)) tools.push(el);
    });
    return tools;
  }

  function markOldHeadersV2(main, file) {
    if (!main) return;
    const selectors = [
      '.monitor-header',
      '.menu-topbar',
      '.inventory-topbar',
      '.page-topbar',
      '.ck-topbar',
      '.page-title-box'
    ];
    selectors.forEach(selector => {
      main.querySelectorAll(selector).forEach(el => el.classList.add('cku-original-header'));
    });

    // Extension topbars live inside main and should also be hidden.
    if (['user.php', 'settings.php', 'promotions-discount.php'].includes(file)) {
      main.querySelectorAll('.ck-topbar').forEach(el => el.classList.add('cku-original-header'));
    }
  }

  function addKioskLabelV2(sidebar) {
    if (!sidebar || sidebar.querySelector('.cku-kiosk-label, .staff-label')) return;
    const label = document.createElement('div');
    label.className = 'cku-kiosk-label';
    label.textContent = 'KIOSK';
    const logo = sidebar.querySelector('.logo');
    if (logo) logo.insertAdjacentElement('afterend', label);
    else sidebar.prepend(label);
  }

  function buildHeaderV2(area, file, tools) {
    let meta = PAGE_META[file];
    if (area === 'manager') {
      if (file === 'dashboard.php') meta = { kicker: 'MANAGER OPERATIONS', title: 'Manager Dashboard', desc: 'Cafe operations, sales, queue and stock visibility.' };
      if (file === 'pos.php') meta = { kicker: 'MANAGER OPERATIONS', title: 'Manager POS', desc: 'Take orders with Manager permissions and operational oversight.' };
      if (file === 'order-queue.php') meta = { kicker: 'MANAGER OPERATIONS', title: 'Manager Order Queue', desc: 'Review and manage live cafe orders.' };
    }
    meta = meta || { kicker: area === 'admin' ? 'ADMIN' : area === 'manager' ? 'MANAGER' : area === 'staff' ? 'STAFF' : 'KIOSK', title: document.title.replace(/^CafeKiosk\s*-\s*/i, ''), desc: '' };
    const header = document.createElement('header');
    header.className = 'cku-topbar';
    header.setAttribute('data-uniform-header', 'true');

    const title = document.createElement('section');
    title.className = 'cku-title-card';
    title.innerHTML = `
      <span class="cku-title-kicker">${escapeV2(meta.kicker)}</span>
      <h1>${escapeV2(meta.title)}</h1>
    `;

    const right = document.createElement('div');
    right.className = 'cku-header-right';

    const toolWrap = document.createElement('div');
    toolWrap.className = 'cku-header-tools';
    tools.forEach(tool => toolWrap.appendChild(tool));

    right.appendChild(toolWrap);
    right.appendChild(buildProfileV2(area));
    header.appendChild(title);
    header.appendChild(right);
    return header;
  }

  function installMobileNavigationV2(area, header, sidebar) {
    if (area !== 'admin' || !header || !sidebar) return;

    let toggle = header.querySelector('.cku-mobile-menu-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'cku-mobile-menu-toggle';
      toggle.setAttribute('aria-label', 'Open navigation menu');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<span></span><span></span><span></span>';
      header.prepend(toggle);
    }

    let backdrop = document.querySelector('.cku-mobile-nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('button');
      backdrop.type = 'button';
      backdrop.className = 'cku-mobile-nav-backdrop';
      backdrop.setAttribute('aria-label', 'Close navigation menu');
      document.body.appendChild(backdrop);
    }

    const setOpen = open => {
      document.body.classList.toggle('cku-mobile-nav-open', Boolean(open));
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    };

    toggle.addEventListener('click', event => {
      event.stopPropagation();
      setOpen(!document.body.classList.contains('cku-mobile-nav-open'));
    });
    backdrop.addEventListener('click', () => setOpen(false));
    sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setOpen(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) setOpen(false);
    });
  }

  function normalizeLockedShellV2() {
    const area = areaV2();
    if (!area) return;

    const file = pageNameV2();
    const shell = shellForV2(area);
    const sidebar = sidebarForV2(shell, area);
    const main = mainForV2(shell);
    const right = rightForV2(shell, area);
    if (!shell || !sidebar || !main) return;

    document.body.classList.add('cku-v2');
    shell.classList.add('cku-shell');
    sidebar.classList.add('cku-sidebar');
    main.classList.add('cku-content');

    if (right) {
      shell.classList.add('cku-has-right');
      right.classList.add('cku-right');
    }

    if (area === 'kiosk') addKioskLabelV2(sidebar);

    // Move live/refresh tools before hiding their old page header.
    const tools = collectHeaderToolsV2(file);
    markOldHeadersV2(main, file);

    const existing = shell.querySelector(':scope > [data-uniform-header="true"]');
    if (existing) existing.remove();

    const header = buildHeaderV2(area, file, tools);
    sidebar.insertAdjacentElement('afterend', header);
    installMobileNavigationV2(area, header, sidebar);
  }


  function installSearchAutofillGuardV2() {
    const selectors = [
      'input[type="search"]',
      '#search-input', '#orderSearch', '#searchInput', '#inventorySearch', '#userSearch'
    ];
    const inputs = Array.from(document.querySelectorAll(selectors.join(',')));
    if (!inputs.length) return;

    const sessions = [
      parseJsonV2(localStorage.getItem('cafeAdminSession')),
      parseJsonV2(localStorage.getItem('cafeManagerSession')),
      parseJsonV2(localStorage.getItem('cafeStaffSession')),
      window.CafeAuth?.session || null
    ].filter(Boolean);

    const loginIds = new Set();
    sessions.forEach(session => {
      [session?.username, session?.userId, session?.userName].forEach(value => {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized) loginIds.add(normalized);
      });
    });

    const clearAccidentalLoginAutofill = input => {
      if (input.dataset.ckuSearchDirty === 'true') return;
      const current = String(input.value || '').trim().toLowerCase();
      if (current && loginIds.has(current)) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    inputs.forEach((input, index) => {
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocapitalize', 'none');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('data-lpignore', 'true');
      input.setAttribute('data-1p-ignore', 'true');
      input.name = input.name && !/user(name|id)|login/i.test(input.name)
        ? input.name
        : `cafekiosk_search_${index}`;

      input.addEventListener('input', event => {
        if (event.isTrusted) input.dataset.ckuSearchDirty = 'true';
      });
      input.addEventListener('focus', () => clearAccidentalLoginAutofill(input));
      clearAccidentalLoginAutofill(input);
    });

    // Chrome can apply remembered username autofill shortly after page load.
    [80, 300, 900, 1800].forEach(delay => {
      setTimeout(() => inputs.forEach(clearAccidentalLoginAutofill), delay);
    });
    window.addEventListener('pageshow', () => {
      setTimeout(() => inputs.forEach(clearAccidentalLoginAutofill), 60);
    });
  }

  // This script is loaded after the page-specific scripts so moving existing
  // controls keeps their already-attached event handlers intact.
  function bootUniformV2() {
    normalizeLockedShellV2();
    installSearchAutofillGuardV2();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootUniformV2, { once: true });
  } else {
    bootUniformV2();
  }
})();
