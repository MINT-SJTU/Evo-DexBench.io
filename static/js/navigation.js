/** Shared full-width navigation, with a keyboard-accessible compact menu. */
export function setupNavigation(){
  const header=document.querySelector('.site-header'),nav=header.querySelector('nav');
  const toggle=header.querySelector('.nav-toggle');
  const close=()=>{header.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');};
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';header.classList.toggle('menu-open',open);toggle.setAttribute('aria-expanded',String(open));});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('menu-open')){close();toggle.focus();}});
  document.addEventListener('click',event=>{if(!header.contains(event.target))close();});
  nav.addEventListener('click',event=>{if(event.target.closest('a'))close();});
  const links=[...nav.querySelectorAll('a[href^="#"]')];
  let queued=false;
  function update(){
    queued=false;header.classList.toggle('is-scrolled',scrollY>80);
    const hero=document.querySelector('#hero-stage');header.classList.toggle('over-hero',!!hero&&hero.getBoundingClientRect().bottom>header.offsetHeight);
    let active=links[0];
    for(const link of links){const section=document.querySelector(link.getAttribute('href'));if(section&&section.getBoundingClientRect().top<innerHeight*.4)active=link;}
    for(const link of links){if(link===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
  }
  addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});
  addEventListener('resize',()=>{if(innerWidth>1050)close();},{passive:true});update();
}
