/** Presentation layer: scroll reveals, the highlights carousel and the FAQ toggle.
 * Independent of app.js, so the page content still works if this module fails. */
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fade headings up as they enter. Content stays visible without JS or with reduced motion. */
function setupReveal(){
  const items=[...document.querySelectorAll('.rv')];
  if(reducedMotion||!items.length||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      entry.target.classList.add('in');observer.unobserve(entry.target);
    }
  },{rootMargin:'0px 0px -6% 0px'});
  document.documentElement.classList.add('rv-ready');
  items.forEach(item=>observer.observe(item));
}

/** A centred, looping carousel: the current card sits in the middle with neighbours on both sides.
 * One clip plays at a time and advances to the next card when it ends. */
function setupHighlights(){
  const section=document.querySelector('#highlights');
  if(!section)return;
  const track=section.querySelector('.hl-track'),originals=[...track.querySelectorAll('.hcard')],count=originals.length;
  const dots=[...section.querySelectorAll('.hl-pager button')],toggle=section.querySelector('.hl-play');
  // A second set fills the outer slots, so neither edge is ever empty on wide screens.
  // Whichever copy reaches the centre plays; the pager tracks the logical slide.
  const clones=originals.map(card=>{const clone=card.cloneNode(true);clone.classList.add('is-clone');return clone;});
  track.append(...clones);
  const cards=[...originals,...clones],total=cards.length,videos=cards.map(card=>card.querySelector('video'));
  let position=0,current=0,centre=0,playing=!reducedMotion,visible=false,frame=0;
  const mod=(n,m)=>((n%m)+m)%m;

  const showPoster=video=>{if(video?.dataset.poster){video.poster=video.dataset.poster;delete video.dataset.poster;}};
  const load=video=>{showPoster(video);if(video.dataset.src){video.src=video.dataset.src;delete video.dataset.src;}};

  function place(){
    cards.forEach((card,k)=>{
      const slot=mod(k-position+total/2,total)-total/2,previous=Number(card.style.getPropertyValue('--slot')||slot);
      // Cards that wrap round travel off-screen, so they jump instead of sliding across.
      if(Math.abs(slot-previous)>count){card.classList.add('no-motion');card.style.setProperty('--slot',String(slot));void card.offsetWidth;card.classList.remove('no-motion');}
      else card.style.setProperty('--slot',String(slot));
      card.classList.toggle('is-current',slot===0);
      card.setAttribute('aria-hidden',String(slot!==0));
    });
  }
  function progress(){
    frame=0;const video=videos[centre];
    const value=video.duration?video.currentTime/video.duration:0;
    dots[current].style.setProperty('--p',String(Math.min(1,value)));
    if(playing&&visible&&!video.paused)frame=requestAnimationFrame(progress);
  }
  function sync(){
    videos.forEach((video,k)=>{
      if(k===centre)return;
      if(!video.paused)video.pause();
      if(video.currentTime)video.currentTime=0;
    });
    dots.forEach((dot,i)=>{
      if(i===current)dot.setAttribute('aria-current','true');else{dot.removeAttribute('aria-current');dot.style.setProperty('--p','0');}
    });
    const video=videos[centre];
    if(playing&&visible){
      load(video);
      video.play().then(()=>{if(!frame)frame=requestAnimationFrame(progress);}).catch(()=>{});
    }else video.pause();
  }
  /** Move by the shortest way round to the chosen card. */
  function goTo(index){
    const step=mod(index-current+count/2,count)-count/2;
    if(!step)return;
    position+=step;current=mod(position,count);centre=mod(position,total);place();sync();
  }
  function setPlaying(value){
    playing=value;section.classList.toggle('is-paused',!value);
    toggle.setAttribute('aria-label',value?'Pause highlights':'Play highlights');
    sync();
  }

  // Swipe or drag sideways; vertical page scrolling stays native.
  let startX=null,startY=0,dragging=false;
  track.addEventListener('pointerdown',event=>{if(event.button!==0)return;startX=event.clientX;startY=event.clientY;dragging=false;});
  track.addEventListener('pointermove',event=>{
    if(startX===null)return;const dx=event.clientX-startX;
    if(!dragging&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(event.clientY-startY)){dragging=true;track.classList.add('is-dragging');track.setPointerCapture(event.pointerId);}
    if(dragging)track.style.setProperty('--drag',`${dx}px`);
  });
  const endDrag=event=>{
    if(startX===null)return;const dx=event.clientX-startX;startX=null;
    track.classList.remove('is-dragging');track.style.setProperty('--drag','0px');
    if(dragging&&Math.abs(dx)>40)goTo(mod(current+(dx<0?1:-1),count));
  };
  track.addEventListener('pointerup',endDrag);track.addEventListener('pointercancel',endDrag);
  // A click on a neighbouring card brings it to the centre; drags never count as clicks.
  track.addEventListener('click',event=>{
    if(dragging){event.preventDefault();dragging=false;return;}
    const card=event.target.closest('.hcard');if(!card||card.classList.contains('is-current'))return;
    goTo(cards.indexOf(card)%count);
  });
  track.addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();goTo(mod(current+(event.key==='ArrowRight'?1:-1),count));}
  });

  // Posters load near the viewport; clips play only while the section is on screen.
  new IntersectionObserver((entries,observer)=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    cards.forEach(card=>showPoster(card.querySelector('video')));observer.disconnect();
  },{rootMargin:'500px 0px'}).observe(section);
  new IntersectionObserver(entries=>{
    visible=entries.some(entry=>entry.isIntersecting);sync();
  },{threshold:.35}).observe(track);

  videos.forEach((video,k)=>video.addEventListener('ended',()=>{
    if(k!==centre)return;
    dots[current].style.setProperty('--p','1');
    if(playing)goTo((current+1)%count);
  }));
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>{
    if(i===current){videos[centre].currentTime=0;if(!playing)setPlaying(true);else sync();return;}
    goTo(i);
  }));
  toggle.addEventListener('click',()=>setPlaying(!playing));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)videos[centre].pause();else sync();});
  section.classList.toggle('is-paused',!playing);
  toggle.setAttribute('aria-label',playing?'Pause highlights':'Play highlights');
  place();track.classList.add('is-ready');
}

/** "Expand all" mirrors the open state of every question. */
function setupFaq(){
  const button=document.querySelector('.faq-all'),items=[...document.querySelectorAll('.faq details')];
  if(!button||!items.length)return;
  const sync=()=>{
    const open=items.every(item=>item.open);
    button.setAttribute('aria-expanded',String(open));button.textContent=open?'Collapse all':'Expand all';
  };
  button.addEventListener('click',()=>{
    const open=button.getAttribute('aria-expanded')!=='true';
    items.forEach(item=>{item.open=open;});sync();
  });
  items.forEach(item=>item.addEventListener('toggle',sync));
}

setupReveal();
setupHighlights();
setupFaq();
