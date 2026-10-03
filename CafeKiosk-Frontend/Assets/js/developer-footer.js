(function () {
  'use strict';

  if (document.querySelector('.cafekiosk-developer-footer')) return;

  const footer = document.createElement('footer');
  footer.className = 'cafekiosk-developer-footer';
  footer.setAttribute('aria-label', 'CafeKiosk project information');
  footer.innerHTML = `
    <div class="ck-footer-inner">
      <div class="ck-footer-credit">
        <strong>Developed by:</strong> <strong class="ck-footer-developer-name">Maria Isabella Francisco</strong>
        <em class="ck-footer-role">(Developer of CafeKiosk)</em>
      </div>
      <div class="ck-footer-contributors">
        <strong>Project Contributors:</strong>
        <strong class="ck-footer-contributor-list">Janine May S. Andrada &bull; Gabriel D. Bigcas &bull; John Paul M. Tupas</strong>
      </div>
      <div class="ck-footer-notice">
        <strong>Thesis Project Notice:</strong> CafeKiosk was developed as part of an academic thesis in fulfillment of degree requirements, focusing on the design, implementation, and evaluation of a web-based cafe management and self-service ordering system.
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
