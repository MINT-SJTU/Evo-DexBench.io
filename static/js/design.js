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

/** One clip plays at a time; it advances to the next card when it ends. */
function setupHighlights(){
  const section=document.querySelector('#highlights');
  if(!section)return;
  const track=section.querySelector('.hl-track'),cards=[...track.querySelectorAll('.hcard')];
  const dots=[...section.querySelectorAll('.hl-pager button')],toggle=section.querySelector('.hl-play');
  const videos=cards.map(card=>card.querySelector('video'));
  let current=0,playing=!reducedMotion,visible=false,frame=0,lockUntil=0,lockTimer=0;
  const ratios=new Map();

  const showPoster=video=>{if(video.dataset.poster){video.poster=video.dataset.poster;delete video.dataset.poster;}};
  const load=video=>{showPoster(video);if(video.dataset.src){video.src=video.dataset.src;delete video.dataset.src;}};

  function progress(){
    frame=0;const video=videos[current];
    const value=video.duration?video.currentTime/video.duration:0;
    dots[current].style.setProperty('--p',String(Math.min(1,value)));
    if(playing&&visible&&!video.paused)frame=requestAnimationFrame(progress);
  }
  function sync(){
    videos.forEach((video,i)=>{
      if(i===current)return;
      if(!video.paused)video.pause();
      if(video.currentTime)video.currentTime=0;
      dots[i].style.setProperty('--p','0');
    });
    dots.forEach((dot,i)=>{if(i===current)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
    cards.forEach((card,i)=>card.classList.toggle('is-current',i===current));
    const video=videos[current];
    if(playing&&visible){
      load(video);
      video.play().then(()=>{if(!frame)frame=requestAnimationFrame(progress);}).catch(()=>{});
    }else video.pause();
  }
  function goTo(index,behavior=reducedMotion?'instant':'smooth'){
    const card=cards[index],first=cards[0];
    // Hold the chosen card while a smooth scroll passes over its neighbours.
    lockUntil=performance.now()+900;clearTimeout(lockTimer);lockTimer=setTimeout(settle,950);
    track.scrollTo({left:card.offsetLeft-first.offsetLeft,behavior});
    if(index!==current){current=index;sync();}
  }
  function setPlaying(value){
    playing=value;section.classList.toggle('is-paused',!value);
    toggle.setAttribute('aria-label',value?'Pause highlights':'Play highlights');
    sync();
  }

  // The most visible card is the current one, whether reached by swipe, keys or the pager.
  function settle(){
    if(performance.now()<lockUntil)return;
    let best=current,bestRatio=-1;
    cards.forEach((card,i)=>{const ratio=ratios.get(card)??0;if(ratio>bestRatio+.01){best=i;bestRatio=ratio;}});
    if(best!==current){current=best;sync();}
  }
  const cardObserver=new IntersectionObserver(entries=>{
    for(const entry of entries)ratios.set(entry.target,entry.intersectionRatio);
    settle();
  },{root:track,threshold:[0,.25,.5,.75,.95,1]});
  cards.forEach(card=>cardObserver.observe(card));
  track.addEventListener('scrollend',()=>{lockUntil=0;settle();});

  // Posters load near the viewport; clips play only while the section is on screen.
  new IntersectionObserver((entries,observer)=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    videos.forEach(showPoster);observer.disconnect();
  },{rootMargin:'500px 0px'}).observe(section);
  new IntersectionObserver(entries=>{
    visible=entries.some(entry=>entry.isIntersecting);sync();
  },{threshold:.35}).observe(track);

  videos.forEach((video,i)=>video.addEventListener('ended',()=>{
    if(i!==current)return;
    dots[i].style.setProperty('--p','1');
    if(playing)goTo((current+1)%cards.length);
  }));
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>{
    if(i===current){videos[i].currentTime=0;if(!playing)setPlaying(true);else sync();return;}
    goTo(i);
  }));
  toggle.addEventListener('click',()=>setPlaying(!playing));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)videos[current].pause();else sync();});
  section.classList.toggle('is-paused',!playing);
  toggle.setAttribute('aria-label',playing?'Pause highlights':'Play highlights');
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
