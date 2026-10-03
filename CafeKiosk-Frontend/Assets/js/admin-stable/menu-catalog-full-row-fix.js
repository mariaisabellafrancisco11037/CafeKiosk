(function () {
  'use strict';

  const ROW_HEIGHT = 224;
  const ROW_GAP = 12;
  const VISIBLE_ROWS = 2;
  const GRID_HEIGHT = (ROW_HEIGHT * VISIBLE_ROWS) + (ROW_GAP * (VISIBLE_ROWS - 1));
  const ROW_STEP = ROW_HEIGHT + ROW_GAP;

  let scrollTimer = null;
  let observer = null;

  function setImportant(el, prop, value) {
    if (!el) return;
    el.style.setProperty(prop, value, 'important');
  }

  function enforceLayout() {
    const body = document.body;
    const menuMain = document.querySelector('.menu-main');
    const menuView = document.getElementById('menuView');
    const panel = menuView ? menuView.querySelector('.product-panel') : null;
    const grid = document.getElementById('productGrid');

    if (!grid || !panel || !menuView || !menuMain) return;

    body.classList.add('ck-full-menu-cards');

    setImportant(menuMain, 'height', 'auto');
    setImportant(menuMain, 'min-height', '100dvh');
    setImportant(menuMain, 'overflow', 'visible');

    setImportant(menuView, 'height', 'auto');
    setImportant(menuView, 'min-height', '0');
    setImportant(menuView, 'overflow', 'visible');

    setImportant(panel, 'height', 'auto');
    setImportant(panel, 'min-height', '0');
    setImportant(panel, 'max-height', 'none');
    setImportant(panel, 'overflow', 'hidden');
    setImportant(panel, 'padding-bottom', '18px');

    setImportant(grid, 'height', GRID_HEIGHT + 'px');
    setImportant(grid, 'min-height', GRID_HEIGHT + 'px');
    setImportant(grid, 'max-height', GRID_HEIGHT + 'px');
    setImportant(grid, 'overflow-x', 'hidden');
    setImportant(grid, 'overflow-y', 'scroll');
    setImportant(grid, 'padding-top', '0');
    setImportant(grid, 'padding-bottom', '0');
    setImportant(grid, 'padding-right', '10px');
    setImportant(grid, 'grid-auto-rows', ROW_HEIGHT + 'px');
    setImportant(grid, 'align-content', 'start');
    setImportant(grid, 'scroll-snap-type', 'y mandatory');
    setImportant(grid, 'scroll-padding-top', '0');
    setImportant(grid, 'scrollbar-gutter', 'stable');

    grid.querySelectorAll('.product-card').forEach((card) => {
      setImportant(card, 'height', ROW_HEIGHT + 'px');
      setImportant(card, 'min-height', ROW_HEIGHT + 'px');
      setImportant(card, 'max-height', ROW_HEIGHT + 'px');
      setImportant(card, 'scroll-snap-align', 'start');
      setImportant(card, 'scroll-snap-stop', 'always');
    });
  }

  function snapGridToFullRow() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    const maxScroll = Math.max(0, grid.scrollHeight - grid.clientHeight);
    let target = Math.round(grid.scrollTop / ROW_STEP) * ROW_STEP;
    target = Math.max(0, Math.min(maxScroll, target));

    if (Math.abs(grid.scrollTop - target) > 1) {
      grid.scrollTo({ top: target, behavior: 'smooth' });
    }
  }

  function bindGrid() {
    const grid = document.getElementById('productGrid');
    if (!grid || grid.dataset.fullRowFixBound === '1') return;
    grid.dataset.fullRowFixBound = '1';

    grid.addEventListener('scroll', function () {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(snapGridToFullRow, 120);
    }, { passive: true });

    observer = new MutationObserver(function () {
      window.requestAnimationFrame(enforceLayout);
    });
    observer.observe(grid, { childList: true, subtree: false });
  }

  function init() {
    enforceLayout();
    bindGrid();

    window.addEventListener('resize', function () {
      window.requestAnimationFrame(enforceLayout);
    }, { passive: true });

    // Re-apply after other theme scripts finish decorating the page.
    window.setTimeout(enforceLayout, 50);
    window.setTimeout(enforceLayout, 250);
    window.setTimeout(enforceLayout, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
