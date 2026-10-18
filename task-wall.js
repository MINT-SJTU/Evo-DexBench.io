/** @typedef {{id:string,name:string,role:string}} Task */
/** @param {{families:Array<{title:string,tasks:Task[]}>,reducedMotion:boolean}} options */
export async function setupTaskWall({families,reducedMotion}){
  const section=document.querySelector('#task-gallery'),rowsHost=section.querySelector('.task-wall-rows');
  const response=await fetch('assets/media/wall/manifest.json');
  if(!response.ok)throw new Error('Task preview media unavailable');
  const media=await response.json();
  const ordered=Array.from({length:5},(_,i)=>families.map(f=>({...f.tasks[i],family:f.title}))).flat();
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let visible=false,paused=reducedMotion,timer;
  const cards=[],rows=[];
  for(let index=0;index<3;index++){
    const row=document.createElement('div');row.className='task-wall-row';
    row.setAttribute('aria-label',`Task demonstrations, row ${index+1}`);
    const tasks=ordered.slice(index*10,index*10+10);
    row.innerHTML=`<div class="task-wall-track">${[0,1].map(copy=>`<div class="task-wall-group" ${copy?'aria-hidden="true"':''}>${tasks.map(task=>`<button class="task-wall-card" data-task="${task.id}" ${copy?'tabindex="-1"':''} aria-label="Watch ${escape(task.name)}"><img src="${media[task.id].poster}" alt="" loading="lazy" width="640" height="360"><video muted loop playsinline preload="none" aria-hidden="true"></video><span class="wall-card-copy"><small>${escape(task.family)}</small><strong>${escape(task.name)}</strong></span><span class="wall-open" aria-hidden="true"></span></button>`).join('')}</div>`).join('')}</div>`;
    rowsHost.append(row);rows.push(row);
    const rowCards=[...row.querySelectorAll('.task-wall-card')];cards.push(...rowCards);
    for(const card of rowCards){
      const video=card.querySelector('video');
      video.addEventListener('playing',()=>card.classList.add('has-video'));
      video.addEventListener('error',()=>card.classList.remove('has-video'));
      if(card.tabIndex===-1)card.addEventListener('pointerdown',event=>event.preventDefault());
      card.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('showcase-inspect',{detail:{taskId:card.dataset.task}})));
      card.addEventListener('pointerenter',update);card.addEventListener('focus',update);
    }
    row.addEventListener('focusout',()=>{if(!row.matches(':focus-within'))row.scrollLeft=0;});
  }
  function update(){
    const running=visible&&!paused&&!document.hidden&&!document.querySelector('dialog[open]');
    section.classList.toggle('wall-running',running);
    const chosen=new Set();
    if(running)for(const row of rows){
      const bounds=row.getBoundingClientRect(),center=(bounds.left+bounds.right)/2;
      const candidates=[...row.querySelectorAll('.task-wall-card')].filter(card=>{
        const r=card.getBoundingClientRect();return r.right>bounds.left+40&&r.left<bounds.right-40&&r.bottom>0&&r.top<innerHeight;
      }).sort((a,b)=>{
        const score=card=>card.matches(':hover,:focus')?-10000:Math.abs(card.getBoundingClientRect().left+card.clientWidth/2-center);
        return score(a)-score(b);
      });
      candidates.slice(0,innerWidth<761?1:2).forEach(card=>chosen.add(card));
    }
    for(const card of cards){
      const video=card.querySelector('video');
      if(!chosen.has(card)){video.pause();continue;}
      if(!video.getAttribute('src'))video.src=media[card.dataset.task].video;
      if(video.paused)video.play().catch(()=>{});
    }
  }
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{paused=event.matches;update();});
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;clearInterval(timer);
    if(visible)timer=setInterval(update,300);update();
  },{threshold:0}).observe(section);
  document.addEventListener('visibilitychange',update);
  document.querySelector('#task-dialog').addEventListener('close',update);
  addEventListener('pagehide',()=>{clearInterval(timer);cards.forEach(card=>card.querySelector('video').pause());});
  addEventListener('pageshow',()=>{clearInterval(timer);if(visible)timer=setInterval(update,300);update();});
  section.dataset.ready='true';update();
}
