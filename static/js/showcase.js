/** A single active film, poster-first loading, and native swipe navigation. */
export async function setupShowcase({reducedMotion}) {
  const section=document.querySelector('#demonstrations');
  const track=document.querySelector('#showcase-track');
  const tabs=document.querySelector('#showcase-tabs');
  const playButton=document.querySelector('#showcase-play');
  const previous=document.querySelector('#showcase-prev');
  const next=document.querySelector('#showcase-next');
  const response=await fetch('static/videos/showcase/manifest.json');
  if(!response.ok)throw new Error('Demonstration gallery is unavailable');
  const media=await response.json();
  const shots=[
    {id:'m06',name:'Faucet handle',category:'ROTATIONAL MANIPULATION',title:'Turn the faucet handle.',description:'Grasp the handle, rotate it, and turn on the water.',setup:'Single hand'},
    {id:'b11',name:'Laptop closing',category:'ARTICULATED CONTROL',title:'Close the laptop with two hands.',description:'Stabilize the base while the other hand closes the screen.',setup:'Bimanual'},
    {id:'m05',name:'Display button',category:'FEW-SHOT GEN TASK',title:'Press a new device’s power button.',description:'Press the display’s power button and change its state.',setup:'Single hand · Gen'}
  ];
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selected=0,visible=false,paused=reducedMotion,scrollTimer;
  track.innerHTML=shots.map((shot,index)=>`<article class="showcase-card${index===0?' is-active':''}" data-index="${index}" aria-label="${escape(shot.name)} demonstration"><div class="showcase-picture"><img src="${media[shot.id].poster}" alt="${escape(shot.name)} simulation" loading="lazy"><video muted loop playsinline preload="none" aria-label="${escape(shot.name)} edited demonstration"></video><div class="showcase-copy"><span>${shot.category}</span><h3>${shot.title}</h3></div><span class="showcase-badge">${shot.setup}</span></div><div class="showcase-caption"><p>${shot.description}</p><button data-inspect="${shot.id}" aria-label="Explore ${escape(shot.name)} task">Explore task </button></div></article>`).join('');
  tabs.innerHTML=shots.map((shot,index)=>`<button data-index="${index}" aria-pressed="${index===0}">${shot.name}</button>`).join('');
  const cards=[...track.querySelectorAll('.showcase-card')];
  const videos=cards.map(card=>card.querySelector('video'));
  function paintControls(){
    playButton.textContent=paused?'▶':'Ⅱ';
    playButton.setAttribute('aria-label',paused?'Play demonstration':'Pause demonstration');
    previous.disabled=selected===0;next.disabled=selected===shots.length-1;
    document.querySelector('#showcase-count').textContent=`${String(selected+1).padStart(2,'0')} / ${String(shots.length).padStart(2,'0')}`;
    [...tabs.children].forEach((tab,index)=>tab.setAttribute('aria-pressed',String(index===selected)));
    cards.forEach((card,index)=>card.classList.toggle('is-active',index===selected));
  }
  function updatePlayback(){
    videos.forEach((video,index)=>{
      if(index!==selected||!visible||paused||document.hidden){video.pause();return;}
      if(!video.getAttribute('src'))video.src=media[shots[index].id].video;
      video.play().catch(()=>{if(index===selected){paused=true;paintControls();}});
    });
    paintControls();
  }
  function select(index,scroll=true){
    selected=Math.max(0,Math.min(shots.length-1,index));
    if(scroll){
      const gutter=parseFloat(getComputedStyle(track).paddingLeft);
      track.scrollTo({left:cards[selected].offsetLeft-gutter,behavior:reducedMotion?'instant':'smooth'});
    }
    updatePlayback();
  }
  videos.forEach((video,index)=>{
    video.addEventListener('playing',()=>{if(index!==selected||!visible||paused){video.pause();return;}cards[index].classList.add('has-video');});
    video.addEventListener('waiting',()=>cards[index].classList.remove('has-video'));
    video.addEventListener('error',()=>{cards[index].classList.remove('has-video');if(index===selected){paused=true;paintControls();}});
  });
  [...tabs.children].forEach(tab=>tab.addEventListener('click',()=>select(Number(tab.dataset.index))));
  previous.addEventListener('click',()=>select(selected-1));next.addEventListener('click',()=>select(selected+1));
  playButton.addEventListener('click',()=>{paused=!paused;updatePlayback();});
  cards.forEach((card,index)=>{
    card.querySelector('.showcase-picture').addEventListener('click',()=>{if(index!==selected)select(index);else{paused=!paused;updatePlayback();}});
    card.querySelector('[data-inspect]').addEventListener('click',()=>{paused=true;updatePlayback();document.dispatchEvent(new CustomEvent('showcase-inspect',{detail:{taskId:shots[index].id}}));});
  });
  track.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();select(selected+(event.key==='ArrowRight'?1:-1));}});
  track.addEventListener('scroll',()=>{
    clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{
      const x=track.scrollLeft+parseFloat(getComputedStyle(track).paddingLeft);
      const nearest=cards.reduce((best,card,index)=>Math.abs(card.offsetLeft-x)<Math.abs(cards[best].offsetLeft-x)?index:best,0);
      if(nearest!==selected)select(nearest,false);
    },100);
  },{passive:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;updatePlayback();},{threshold:.25}).observe(track);
  document.addEventListener('visibilitychange',updatePlayback);
  addEventListener('resize',()=>select(selected),{passive:true});
  section.dataset.galleryReady='true';paintControls();
}
