(() => {
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
function sidebar(){return q('.sidebar,.staff-sidebar,.ck-sidebar')}
function initSidebar(){const sb=sidebar(); if(!sb)return; document.body.classList.add('ck-has-mobile-sidebar');
 if(q('.ck-nav-toggle')) return;
 const t=document.createElement('button');t.type='button';t.className='ck-nav-toggle';t.setAttribute('aria-label','Open navigation menu');t.setAttribute('aria-expanded','false');
 const b=document.createElement('div');b.className='ck-nav-backdrop';b.setAttribute('aria-hidden','true');
 const set=o=>{document.body.classList.toggle('ck-nav-open',o);t.setAttribute('aria-expanded',o?'true':'false')};
 t.onclick=()=>set(!document.body.classList.contains('ck-nav-open'));b.onclick=()=>set(false);sb.addEventListener('click',e=>{if(e.target.closest('a,.nav-btn,.staff-nav-button'))set(false)});document.addEventListener('keydown',e=>{if(e.key==='Escape')set(false)});window.addEventListener('resize',()=>{if(innerWidth>1024)set(false)});document.body.append(b,t)}
function initOrderSheet(){const panel=q('body.uniform-pos .cart-panel,body.kiosk-menu .order-summary');if(!panel||q('.ck-mobile-order-toggle'))return;const t=document.createElement('button');t.type='button';t.className='ck-mobile-order-toggle';t.textContent=document.body.classList.contains('kiosk-menu')?'View Order':'Order Summary';const c=document.createElement('button');c.type='button';c.className='ck-mobile-order-close';c.textContent='×';c.setAttribute('aria-label','Close order summary');t.onclick=()=>document.body.classList.add('ck-order-open');c.onclick=()=>document.body.classList.remove('ck-order-open');panel.prepend(c);document.body.append(t)}
function initAxis(){if(!document.body.classList.contains('kiosk-menu')||q('.kiosk-mobile-category-strip'))return;const sb=q('.sidebar'),search=q('.menu-search');if(!sb||!search)return;const originals=qa('.nav-btn',sb).filter(x=>!x.classList.contains('kiosk-sidebar-cancel'));if(!originals.length)return;const strip=document.createElement('nav');strip.className='kiosk-mobile-category-strip';strip.setAttribute('aria-label','Menu categories');originals.forEach(o=>{const b=document.createElement('button');b.type='button';b.className='kiosk-mobile-category-button'+(o.classList.contains('active')?' active':'');const im=q('img',o);if(im)b.appendChild(im.cloneNode(true));const s=document.createElement('span');s.textContent=o.textContent.trim();b.appendChild(s);b.onclick=()=>{o.click();qa('.kiosk-mobile-category-button',strip).forEach(x=>x.classList.remove('active'));b.classList.add('active')};strip.appendChild(b)});search.parentNode.insertBefore(strip,search)}
function init(){let v=q('meta[name="viewport"]');if(v)v.content='width=device-width,initial-scale=1,viewport-fit=cover';initSidebar();initAxis();initOrderSheet()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
