(function () {
  'use strict';

  if (!document.body) return;

  /* The thesis footer belongs to the document itself.  Keeping it outside
     dashboard/POS internal scrollers gives every CafeKiosk screen one main
     page scrollbar that can reach the footer without resizing app panels. */
  document.documentElement.classList.add('ck-project-footer-page');
  document.body.classList.add('ck-project-footer-page');

  if (document.querySelector('.cafekiosk-developer-footer')) return;

  const footer = document.createElement('footer');
  footer.className = 'cafekiosk-developer-footer';
  footer.setAttribute('aria-label', 'CafeKiosk thesis project information');
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

  document.body.appendChild(footer);
})();
