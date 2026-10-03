(function () {
  'use strict';

  if (document.querySelector('.cafekiosk-developer-footer')) return;

  const footer = document.createElement('footer');
  footer.className = 'cafekiosk-developer-footer';
  footer.setAttribute('aria-label', 'CafeKiosk project information');
  footer.innerHTML = `
    <div class="ck-footer-inner">
      <div class="ck-footer-credit">
        <strong>Developed by:</strong> Maria Isabella Francisco
        <span class="ck-footer-role">(Developer of CafeKiosk)</span>
      </div>
      <div class="ck-footer-contributors">
        <strong>Project Contributors:</strong>
        <span class="ck-footer-contributor-list">Janine May S. Andrada &bull; Gabriel D. Bigcas &bull; John Paul M. Tupas</span>
      </div>
      <div class="ck-footer-notice">
        Academic Project Notice: CafeKiosk was developed for educational and academic purposes as part of a school project.
      </div>
    </div>`;

  /* Most pages scroll on the document, so the footer belongs after the page.
     A few dashboards deliberately lock body scrolling and give <main> its own
     vertical scroller; only in that case place the footer inside that scroller. */
  const scrollableMain = Array.from(document.querySelectorAll('main')).find((el) => {
    const style = window.getComputedStyle(el);
    return style.overflowY === 'auto' || style.overflowY === 'scroll';
  });

  (scrollableMain || document.body).appendChild(footer);
})();
