import { CONDITION_COPY } from './protocol-parameters.js?v=20261016-studio1';
export function setupCoreComparison({reducedMotion}) {
  const panel=document.querySelector('#core-comparison');
  const source=document.querySelector('#source-demo'),target=document.querySelector('#target-demo');
  let visible=false,paused=reducedMotion,mode='matched';
  const sources={
    matched:{video:'assets/media/hero-selected.mp4',poster:'assets/media/hero-selected-unlit.jpg',name:'Lamp button',family:'Button-driven interaction',note:'Both tasks displace a localized control to change device state. Four Core tasks provide different instances of this interaction.'},
    different:{video:'assets/media/showcase/m06.mp4',poster:'assets/media/showcase/m06.jpg',name:'Faucet handle',family:'Rotational manipulation',note:'This Core task uses directed rotation rather than a button press. Changing the source family tests which experience helps the target task.'}
  };
  const update=()=>{
    for(const video of [source,target]){
      if(!visible||paused||document.hidden){video.pause();continue;}
      if(!video.getAttribute('src'))video.src=video===source?sources[mode].video:'assets/media/showcase/m05.mp4';
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
  const conditions=CONDITION_COPY.map(c=>[c.name,c.description,c.change,c.keep]);
  const panel=document.querySelector('.evaluation-panel');
  panel.innerHTML=`<div class="protocol-rail"><div><b>01</b><span><strong>Fix the task</strong><small>Same goal. Same scoring.</small></span></div><i aria-hidden="true">→</i><div><b>02</b><span><strong>Vary one condition</strong><small>Change one axis at a time.</small></span></div><i aria-hidden="true">→</i><div><b>03</b><span><strong>Measure outcomes</strong><small>Success and partial progress.</small></span></div></div><div class="protocol-stage" data-condition="0"><div class="protocol-copy"><div class="protocol-kicker"><span class="panel-kicker">CONTROLLED EVALUATION</span><span class="protocol-tour-label">Auto tour · 5s</span></div><div class="protocol-title"><span id="condition-number">01</span><h3 id="condition-title">Nominal</h3></div><p id="condition-description"></p><dl><div><dt>VARY</dt><dd id="condition-change"></dd></div><div><dt>KEEP</dt><dd id="condition-fixed"></dd></div></dl><div class="protocol-example"><strong>Parameter example · within configured bounds</strong><span id="condition-example"></span></div></div><div class="protocol-diagram"><img class="protocol-fallback" src="assets/protocol-scene.png?v=20261016-studio1" alt="Reference setup for the 3D evaluation schematic"><span class="diagram-caption">Loading condition-specific parameter view…</span></div></div><div class="condition-selector" id="condition-selector" role="group" aria-label="Evaluation condition"></div><div class="protocol-schedule"><div class="schedule-total"><strong>100</strong><span>evaluation episodes<small>20 per condition · reference schedule</small></span></div><div class="episode-dots" id="episode-dots" aria-label="Five groups of twenty evaluation episodes"></div><div class="protocol-measures"><span>SUCCESS RATE <b>Task completed?</b></span><span>STAGE SCORE <b>How much progress?</b></span></div></div><p class="panel-footnote">Reference schedule: 5 seeds, 3 layouts, 100 episodes. Blocks show allocation. Physical and spatial values here follow the faucet task; bounds and object parameters vary by task.</p>`;
  const selector=document.querySelector('#condition-selector'),dots=document.querySelector('#episode-dots');
  selector.innerHTML=conditions.map(([name],i)=>`<button data-condition="${i}" aria-pressed="${i===0}"><span>0${i+1}</span>${name}<b></b></button>`).join('');
  dots.innerHTML=conditions.map(([name],i)=>`<div data-episode-group="${i}" aria-label="${name}: twenty episodes">${'<i></i>'.repeat(20)}<span>${name}</span></div>`).join('');
  let selected=0,visible=false,timer=0;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const activate=index=>{
    selected=index;
    [...selector.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    [...dots.children].forEach((g,i)=>g.classList.toggle('is-selected',i===index));
    document.querySelector('#condition-title').textContent=conditions[index][0];
    document.querySelector('#condition-description').textContent=conditions[index][1];
    document.querySelector('#condition-number').textContent=String(index+1).padStart(2,'0');
    document.querySelector('#condition-change').textContent=conditions[index][2];
    document.querySelector('#condition-fixed').textContent=conditions[index][3];
    document.querySelector('#condition-example').textContent=CONDITION_COPY[index].example;
    document.querySelector('.protocol-stage').dataset.condition=index;

  };
  function scheduleTour(){
    clearTimeout(timer);panel.classList.remove('tour-running');
    if(!visible||document.hidden||motion.matches||selector.querySelector(':focus-visible'))return;
    void panel.offsetWidth;panel.classList.add('tour-running');
    timer=setTimeout(()=>{activate((selected+1)%conditions.length);scheduleTour();},5000);
  }
  selector.addEventListener('click',e=>{const b=e.target.closest('button');if(b){activate(Number(b.dataset.condition));scheduleTour();}});
  selector.addEventListener('focusin',scheduleTour);selector.addEventListener('focusout',()=>setTimeout(scheduleTour,0));
  document.addEventListener('visibilitychange',scheduleTour);motion.addEventListener('change',scheduleTour);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;scheduleTour();},{threshold:.25}).observe(panel.querySelector('.protocol-stage'));
  addEventListener('pagehide',()=>clearTimeout(timer));addEventListener('pageshow',scheduleTour);
  activate(0);
  // Reserve each field's tallest condition at the current width and font size.
  // Measuring all five copies prevents scroll anchoring jumps without clipping text.
  const copy=panel.querySelector('.protocol-copy');
  const fields=['#condition-description','#condition-change','#condition-fixed','#condition-example'];
  const values=CONDITION_COPY.map(c=>[c.description,c.change,c.keep,c.example]);
  let measuredWidth=0;
  function reserveCopyHeight(){
    const width=copy.getBoundingClientRect().width;if(!width)return;measuredWidth=width;
    const measure=copy.cloneNode(true);measure.setAttribute('aria-hidden','true');measure.inert=true;
    measure.style.cssText=`position:fixed;left:-10000px;top:0;visibility:hidden;width:${width}px;pointer-events:none;`;
    const nodes=fields.map(id=>measure.querySelector(id));measure.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    nodes.forEach(node=>{node.style.minHeight='0';node.style.height='auto';node.style.display='block';});
    panel.querySelector('.protocol-stage').append(measure);const heights=fields.map(()=>0);
    for(const row of values)nodes.forEach((node,i)=>{node.textContent=row[i];heights[i]=Math.max(heights[i],Math.ceil(node.getBoundingClientRect().height));});
    measure.remove();fields.forEach((id,i)=>{const node=copy.querySelector(id);node.style.display='block';node.style.minHeight=`${heights[i]}px`;});
  }
  reserveCopyHeight();document.fonts.ready.then(reserveCopyHeight);
  new ResizeObserver(()=>{if(Math.abs(copy.getBoundingClientRect().width-measuredWidth)>.5)reserveCopyHeight();}).observe(copy);
  const diagram=document.querySelector('.protocol-diagram');
  const sceneLoader=new IntersectionObserver(entries=>{
    if(!entries.some(e=>e.isIntersecting))return;
    sceneLoader.disconnect();
    import('./protocol-scene.js?v=20261017-layouts2').then(module=>module.mountProtocolScene(diagram)).catch(()=>{diagram.querySelector('.diagram-caption').textContent='Static reference view · condition descriptions remain interactive';});
  },{rootMargin:'300px'});sceneLoader.observe(diagram);
  setupProtocolExamples(panel);
}


/** Actual task replays supplement the schematic, without claiming perturbed rollouts.
 * @param {HTMLElement} panel */
function setupProtocolExamples(panel){
  const examples=[['m01','Lamp button','Press','assets/media/hero-selected.mp4','assets/media/hero-selected.jpg'],['m06','Faucet handle','Rotate','assets/media/showcase/m06.mp4','assets/media/showcase/m06.jpg'],['b11','Laptop closing','Coordinate','assets/media/showcase/b11.mp4','assets/media/showcase/b11.jpg']];
  const section=document.createElement('div');section.className='protocol-task-examples';
  section.innerHTML=`<div class="protocol-examples-heading"><h3>Different tasks. The same evaluation axes.</h3><p>Task demonstrations · not perturbation rollouts</p></div><div class="protocol-example-films">${examples.map(([id,name,verb,src,poster])=>`<button data-task="${id}" aria-label="Watch ${name}"><div><video muted loop playsinline preload="none" poster="${poster}" data-video="${src}"></video></div><span><small>${verb}</small><strong>${name}</strong><b aria-hidden="true"></b></span></button>`).join('')}</div>`;
  panel.querySelector('.protocol-schedule').before(section);
  const videos=[...section.querySelectorAll('video')];let visible=false;const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function play(){videos.forEach(video=>{if(!visible||document.hidden||motion.matches||document.querySelector('dialog[open]')){video.pause();return;}if(!video.src)video.src=video.dataset.video;video.play().catch(()=>{});});}
  section.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('showcase-inspect',{detail:{taskId:button.dataset.task}}));play();}));
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;play();},{threshold:.1}).observe(section);
  document.addEventListener('visibilitychange',play);motion.addEventListener('change',play);document.querySelector('#task-dialog').addEventListener('close',play);
}

export async function setupDatasetInspector({reducedMotion}) {
  const root=document.querySelector('#dataset-console');
  const manifest=await fetch('assets/media/dataset/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('Dataset metadata unavailable');return r.json();});
  const signals=await fetch(manifest.signals,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('Recorded signals unavailable');return r.json();});
  const cameras=['context','interaction','wrist'];
  const names={context:'Context',interaction:'Interaction',wrist:manifest.cameras.wrist.view_label||'Wrist'};
  const grid=document.querySelector('#camera-grid'),play=document.querySelector('#dataset-play'),seek=document.querySelector('#dataset-seek');
  const contact=document.querySelector('#dataset-contact'),time=document.querySelector('#dataset-time');
  let loaded=false,loading=false,visible=false,playing=false,userPaused=reducedMotion,raf=0,lastSample=-1;
  const urls=[];const duration=manifest.duration_seconds;
  root.querySelector('.console-heading h3').textContent=manifest.title||'Synchronized observations';
  root.querySelector('.panel-kicker').textContent='SUSTAINED CONTACT / THREE SYNCHRONIZED VIEWS';
  root.querySelector('.recording-tag').textContent=manifest.rerendered?'HD SIMULATION REPLAY':'ORIGINAL RECORDING';
  document.querySelector('#dataset-note').textContent=`${manifest.excerpt_description||''} Three ${manifest.width} × ${manifest.height} views and tactile signals share the same ${manifest.rerendered?'replay steps':'observation IDs'}. Playback: ${manifest.fps} Hz. Tactile samples: ${manifest.signal_sample_hz} Hz.${manifest.rerendered?' HD views are rendered for visualization; original dataset images are 224 × 224.':''}`;
  grid.innerHTML=cameras.map((key,i)=>`<figure class="camera-tile"><div class="camera-media" style="aspect-ratio:${manifest.cameras[key].width}/${manifest.cameras[key].height}"><img src="${manifest.cameras[key].poster}?episode=${encodeURIComponent(manifest.episode_id)}" alt="${names[key]} camera view"><video muted playsinline preload="none" aria-label="${names[key]} camera recording"></video></div><figcaption><span>0${i+1} / ${names[key]}</span><small>${manifest.cameras[key].width} × ${manifest.cameras[key].height}</small></figcaption></figure>`).join('');
  const videos=[...grid.querySelectorAll('video')],master=videos[0];
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
  document.querySelector('#recorded-peak').textContent=`Recorded peak ${maximum.toFixed(2)} N`;
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
      document.querySelector('#taxel-sample-time').textContent=`Sample at ${signals.time_seconds[sample].toFixed(1)} s`;
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
  contact.addEventListener('click',()=>{userPaused=true;setPlaying(false);const peaks=signals.force_n.map(values=>Math.max(...values));const index=peaks.indexOf(Math.max(...peaks));seekTo(signals.time_seconds[index]+.002);});
  new IntersectionObserver(entries=>{if(entries[0].isIntersecting)load();},{rootMargin:'400px'}).observe(root);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){load();if(loaded&&!userPaused&&!document.hidden)setPlaying(true);}else setPlaying(false);},{threshold:.15}).observe(root);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
  addEventListener('pagehide',event=>{if(!event.persisted){setPlaying(false);urls.forEach(URL.revokeObjectURL);}});
  updateReadout();
}
