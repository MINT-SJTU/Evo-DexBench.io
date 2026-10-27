import {observeMedia,whenNear} from './media-loading.js?v=20261018-perf2';
import { CONDITION_COPY } from './protocol-parameters.js?v=20261027-calm1';
export function setupCoreComparison({reducedMotion}) {
  const panel=document.querySelector('#core-comparison');
  const source=document.querySelector('#source-demo'),target=document.querySelector('#target-demo');
  let visible=false,paused=reducedMotion,mode='matched';
  const sources={
    matched:{video:'static/videos/hero-selected.mp4',poster:'static/videos/hero-selected-unlit.jpg',name:'Lamp button',family:'Button-driven',note:'Both tasks press a localized control to change a device’s state.'},
    different:{video:'static/videos/showcase/m06.mp4',poster:'static/videos/showcase/m06.jpg',name:'Faucet handle',family:'Rotational manipulation',note:'A rotation task from another family. Does its experience still help?'}
  };
  const update=()=>{
    for(const video of [source,target]){
      if(!visible||paused||document.hidden){video.pause();continue;}
      if(!video.getAttribute('src'))video.src=video===source?sources[mode].video:'static/videos/showcase/m05.mp4';
      video.play().catch(()=>{});
    }
  };
  [source,target].forEach(video=>{
    video.addEventListener('playing',()=>{if(paused||!visible){video.pause();return;}video.classList.add('is-playing');});
    video.addEventListener('error',()=>video.classList.remove('is-playing'));
  });
  panel.querySelectorAll('[data-relatedness]').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.relatedness;source.pause();source.classList.remove('is-playing');source.removeAttribute('src');source.load();
    document.querySelector('#source-poster').src=sources[mode].poster;
    delete document.querySelector('#source-poster').dataset.src;
    document.querySelector('#source-name').textContent=sources[mode].name;
    document.querySelector('#source-family').textContent=sources[mode].family;
    document.querySelector('#relatedness-note').textContent=sources[mode].note;
    panel.dataset.relatedness=mode;
    panel.querySelectorAll('[data-relatedness]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    update();
  }));
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{paused=event.matches;update();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();},{threshold:.35}).observe(panel);
  document.addEventListener('visibilitychange',update);update();
}

export function setupEvaluation(){
  const panel=document.querySelector('.evaluation-panel');
  // Supermimic-style list: each condition is a pill; the selected one opens to a two-line explanation.
  panel.innerHTML=`<div class="protocol-stage" data-condition="0"><div class="protocol-copy"><div class="condition-list" id="condition-selector" role="group" aria-label="Evaluation condition">${CONDITION_COPY.map((c,i)=>`<button type="button" data-condition="${i}" aria-pressed="${i===0}"><span class="cond-head"><i aria-hidden="true"></i>${c.name}</span><span class="cond-more"><span class="cond-body"><b>${c.lead}</b> ${c.detail}</span></span><s class="cond-timer" aria-hidden="true"></s></button>`).join('')}</div></div><div class="protocol-diagram"><img class="protocol-fallback" data-src="static/images/protocol-scene.png?v=20261016-studio1" alt="Reference setup for the 3D evaluation schematic"><span class="diagram-caption">Loading the 3D view…</span></div></div>`;
  const selector=panel.querySelector('#condition-selector'),stage=panel.querySelector('.protocol-stage');
  let selected=0,visible=false,timer=0,manual=false;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const activate=index=>{
    selected=index;
    [...selector.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    stage.dataset.condition=index;
  };
  // The tour steps every five seconds until the reader picks a condition.
  function scheduleTour(){
    clearTimeout(timer);panel.classList.remove('tour-running');
    if(manual||!visible||document.hidden||motion.matches||selector.querySelector(':focus-visible'))return;
    void panel.offsetWidth;panel.classList.add('tour-running');
    timer=setTimeout(()=>{activate((selected+1)%CONDITION_COPY.length);scheduleTour();},5000);
  }
  selector.addEventListener('click',e=>{const b=e.target.closest('button');if(b){manual=true;activate(Number(b.dataset.condition));scheduleTour();}});
  selector.addEventListener('focusin',scheduleTour);selector.addEventListener('focusout',()=>setTimeout(scheduleTour,0));
  document.addEventListener('visibilitychange',scheduleTour);motion.addEventListener('change',scheduleTour);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;scheduleTour();},{threshold:.25}).observe(stage);
  addEventListener('pagehide',()=>clearTimeout(timer));addEventListener('pageshow',scheduleTour);
  activate(0);
  const diagram=panel.querySelector('.protocol-diagram');
  const sceneLoader=new IntersectionObserver(entries=>{
    if(!entries.some(e=>e.isIntersecting))return;
    sceneLoader.disconnect();
    import('./protocol-scene.js?v=20261027-calm1').then(module=>module.mountProtocolScene(diagram)).catch(()=>{diagram.querySelector('.diagram-caption').textContent='Static reference view';});
  },{rootMargin:'300px'});sceneLoader.observe(diagram);
  observeMedia(panel);
}

export async function setupDatasetInspector({reducedMotion}) {
  const root=document.querySelector('#dataset-console');
  const manifest=await fetch('static/videos/dataset/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('Dataset metadata unavailable');return r.json();});
  const signals=await fetch(manifest.signals,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('Recorded signals unavailable');return r.json();});
  const cameras=['context','interaction','wrist'];
  const names={context:'Context',interaction:'Interaction',wrist:manifest.cameras.wrist.view_label||'Wrist'};
  const grid=document.querySelector('#camera-grid'),play=document.querySelector('#dataset-play'),seek=document.querySelector('#dataset-seek');
  const contact=document.querySelector('#dataset-contact'),time=document.querySelector('#dataset-time');
  let loaded=false,loading=false,visible=false,playing=false,userPaused=reducedMotion,raf=0,lastSample=-1;
  const urls=[];const duration=manifest.duration_seconds;
  root.querySelector('.console-heading h3').textContent=manifest.title||'Synchronized observations';
  root.querySelector('.recording-tag').textContent=manifest.rerendered?'HD replay':'Original recording';
  document.querySelector('#dataset-note').textContent=manifest.rerendered?`HD views are re-rendered for display; dataset images are 224 × 224. Video ${manifest.fps} Hz, touch ${manifest.signal_sample_hz} Hz.`:`Video ${manifest.fps} Hz, touch ${manifest.signal_sample_hz} Hz.`;
  grid.innerHTML=cameras.map((key)=>`<figure class="camera-tile"><div class="camera-media" style="aspect-ratio:${manifest.cameras[key].width}/${manifest.cameras[key].height}"><img data-src="${manifest.cameras[key].poster}?episode=${encodeURIComponent(manifest.episode_id)}" alt="${names[key]} camera view"><video muted playsinline preload="none" aria-label="${names[key]} camera recording"></video><span class="camera-tag">${names[key]}</span></div></figure>`).join('');
  observeMedia(grid);const videos=[...grid.querySelectorAll('video')],master=videos[0];
  const svgNS='http://www.w3.org/2000/svg';
  const heatmap=document.querySelector('#taxel-grid');
  const cells=Array.from({length:123},(_,i)=>{
    const cell=document.createElementNS(svgNS,'rect');cell.setAttribute('x',String((i%41)*12));cell.setAttribute('y',String(Math.floor(i/41)*16));cell.setAttribute('width','10');cell.setAttribute('height','13');cell.setAttribute('rx','1.5');
    const tip=document.createElementNS(svgNS,'title');cell.append(tip);heatmap.append(cell);return cell;
  });
  const summary=signals.per_video_frame_summary;
  const maximum=Math.max(...summary.max_force_n);
  const forceScale=Math.ceil(maximum/5)*5||1;
  document.querySelector('.sensor-legend>span:last-child').innerHTML=`<i></i>0 <b></b>${forceScale} N`;
  const trace=document.querySelector('#force-trace');
  const points=summary.max_force_n.map((value,i)=>`${(i/(summary.max_force_n.length-1)*490+5).toFixed(2)},${(82-value/maximum*70).toFixed(2)}`).join(' ');
  trace.innerHTML=`<path d="M5 82H495M5 47H495M5 12H495" class="trace-grid"/><polyline points="${points}" class="trace-line"/><line id="force-cursor" x1="5" y1="5" x2="5" y2="86"/><circle id="force-marker" cx="5" cy="82" r="3"/>`;
  document.querySelector('#recorded-peak').textContent=`Peak ${maximum.toFixed(1)} N`;
  function updateReadout(){
    const t=master.currentTime||0;
    time.textContent=`${t.toFixed(1)} / ${duration.toFixed(1)} s`;
    seek.value=String(t/duration*1000);
    const frame=Math.min(summary.max_force_n.length-1,Math.round(t*manifest.fps));
    const x=5+frame/(summary.max_force_n.length-1)*490,y=82-summary.max_force_n[frame]/maximum*70;
    const cursor=document.querySelector('#force-cursor');cursor.setAttribute('x1',String(x));cursor.setAttribute('x2',String(x));
    document.querySelector('#force-marker').setAttribute('cx',String(x));document.querySelector('#force-marker').setAttribute('cy',String(y));
    document.querySelector('#current-force').textContent=summary.max_force_n[frame].toFixed(2);
    let sample=0;while(sample+1<signals.time_seconds.length&&signals.time_seconds[sample+1]<=t)sample++;
    if(sample!==lastSample){
      const values=signals.force_n[sample];
      cells.forEach((cell,i)=>{
        const intensity=Math.min(1,Math.sqrt(Math.max(0,values[i])/forceScale));
        cell.style.fill=values[i]>0?`rgb(${Math.round(220-35*intensity)},${Math.round(176-104*intensity)},${Math.round(136-88*intensity)})`:'#d1d0c4';
        cell.querySelector('title').textContent=`Channel ${i} · ${signals.taxel_names[i]} · ${values[i].toFixed(3)} N`;
      });
      document.querySelector('#taxel-sample-time').textContent=`${signals.time_seconds[sample].toFixed(1)} s`;
      heatmap.setAttribute('aria-label',`Recorded force at ${signals.time_seconds[sample].toFixed(1)} seconds: ${values.filter(v=>v>0).length} of 123 channels active.`);
      lastSample=sample;
    }
  }
  function loop(){
    raf=0;if(!playing)return;
    for(const video of videos.slice(1))if(!video.seeking&&Math.abs(video.currentTime-master.currentTime)>.06)video.currentTime=master.currentTime;
    updateReadout();if(master.ended){setPlaying(false);return;}raf=requestAnimationFrame(loop);
  }
  async function setPlaying(value){
    if(!loaded)return;
    playing=value;play.textContent=value?'Ⅱ':'▶';play.setAttribute('aria-label',value?'Pause synchronized observations':'Play synchronized observations');
    if(raf)cancelAnimationFrame(raf);
    if(value){
      if(master.ended||master.currentTime>=duration-.06)videos.forEach(v=>v.currentTime=0);
      try{await Promise.all(videos.map(v=>v.play()));if(!playing){videos.forEach(v=>v.pause());return;}raf=requestAnimationFrame(loop);}catch{playing=false;videos.forEach(v=>v.pause());play.textContent='▶';play.setAttribute('aria-label','Play synchronized observations');}
    }else{videos.forEach(v=>v.pause());updateReadout();}
  }
  function seekTo(t){
    videos.forEach(video=>video.currentTime=Math.min(t,duration-.04));
    updateReadout();
  }
  async function load(){
    if(loading||loaded)return;loading=true;play.textContent='…';
    try{
      await Promise.all(videos.map(async(video,i)=>{
        const response=await fetch(`${manifest.cameras[cameras[i]].video}?episode=${encodeURIComponent(manifest.episode_id)}`);if(!response.ok)throw new Error('Camera recording unavailable');
        const url=URL.createObjectURL(await response.blob());urls.push(url);
        await new Promise((resolve,reject)=>{video.addEventListener('loadeddata',resolve,{once:true});video.addEventListener('error',reject,{once:true});video.src=url;video.load();});
      }));
      loaded=true;root.dataset.inspectorReady='true';play.disabled=false;seek.disabled=false;contact.disabled=false;play.textContent='▶';
      videos.forEach(v=>v.addEventListener('seeked',updateReadout));
      if(visible&&!userPaused&&!document.hidden)setPlaying(true);
    }catch{document.querySelector('#dataset-note').textContent='The recordings could not load. Refresh to retry.';}
    finally{loading=false;}
  }
  play.addEventListener('click',()=>{userPaused=playing;setPlaying(!playing);});
  seek.addEventListener('input',()=>{const nextTime=Number(seek.value)/1000*duration;userPaused=true;setPlaying(false);seekTo(nextTime);});
  contact?.addEventListener('click',()=>{userPaused=true;setPlaying(false);const peaks=signals.force_n.map(values=>Math.max(...values));const index=peaks.indexOf(Math.max(...peaks));seekTo(signals.time_seconds[index]+.002);});
  new IntersectionObserver(entries=>{if(entries[0].isIntersecting)load();},{rootMargin:'400px'}).observe(root);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){load();if(loaded&&!userPaused&&!document.hidden)setPlaying(true);}else setPlaying(false);},{threshold:.15}).observe(root);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
  addEventListener('pagehide',event=>{if(!event.persisted){setPlaying(false);urls.forEach(URL.revokeObjectURL);}});
  updateReadout();
}
