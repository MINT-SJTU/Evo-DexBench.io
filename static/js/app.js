const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Preserve a direct section link after async media panels establish their heights.
 * User input cancels the correction so it never pulls an active reader back.
 * @returns {()=>void} */
function prepareSectionNavigation(){
  const hash=location.hash;
  if(!/^#(research|principle|tasks|dataset|evaluation|results|resources|demonstrations|task-gallery|hero-stage|highlights|faq)$/.test(hash))return()=>{};
  const controller=new AbortController();let interrupted=false;
  for(const event of ['wheel','touchstart','pointerdown','keydown'])addEventListener(event,()=>{interrupted=true;controller.abort();},{once:true,passive:true,signal:controller.signal});
  return()=>{
    controller.abort();
    if(!interrupted&&location.hash===hash)requestAnimationFrame(()=>document.getElementById(hash.slice(1))?.scrollIntoView({behavior:'instant',block:'start'}));
  };
}
const finishInitialNavigation=prepareSectionNavigation();
import {observeMedia,whenNear} from './media-loading.js?v=20261030-load1';
observeMedia();
import { setupTaskWall } from './task-wall.js?v=20261030-load1';
import { setupNavigation } from './navigation.js?v=20261016-results1';
setupNavigation();
import { setupModelComparison, MODELS, modelLabel } from './model-comparison.js?v=20261027-calm1';
import { setupCoreComparison, setupDatasetInspector, setupEvaluation } from './chapters.js?v=20261030-load1';
import { renderTransferHeatmap } from './transfer-heatmap.js?v=20261027-calm1';
import { renderEvidenceChart } from './evidence-chart.js?v=20261027-calm1';
let data, hdMedia = {}, hoverMedia = {}, layoutMedia = {}, currentFamily = 0, currentTask = 0, currentLayout = 0;
let resultMode = 'baseline', selectedModel = 'π0.5', resultFamily = 'button', transferTarget = 'm05';

let plotMetric=0,plotRows=[];
const previewStops=new WeakMap();
let stopActivePreview;
const previewObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)previewStops.get(entry.target)?.();}),{threshold:.1});

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  setTimeout(() => $('#toast').classList.remove('visible'), 2800);
}

function attachPreview(button, taskId) {
  const media = hdMedia[taskId] || hoverMedia[taskId];
  if (!media) return;
  let preview;
  const start = () => {
    if (reducedMotion) return;
    if(stopActivePreview && stopActivePreview!==stop)stopActivePreview();
    stopActivePreview=stop;
    if (!preview) {
      preview=document.createElement('video'); preview.className='task-hover-video';
      preview.muted=true; preview.loop=true; preview.playsInline=true; preview.preload='none';
      preview.src=media.video; preview.setAttribute('aria-hidden','true');
      (button.querySelector('.task-media') || button).append(preview);
      preview.addEventListener('playing',()=>button.classList.add('preview-playing'));
    }
    preview.play().catch(()=>{});
  };
  const stop=()=>{if(preview)preview.pause();button.classList.remove('preview-playing');if(stopActivePreview===stop)stopActivePreview=undefined;};
  button.addEventListener('pointerenter',start); button.addEventListener('pointerleave',stop);
  button.addEventListener('focus',start); button.addEventListener('blur',stop);
  previewStops.set(button,stop);previewObserver.observe(button);
}
function openTask(index) {
  stopActivePreview?.();
  currentTask=index; currentLayout=0; renderTask();
  $('#dialog-title').textContent=data.families[currentFamily].tasks[index].name;
  if(!$('#task-dialog').open)$('#task-dialog').showModal();
}
function renderFamily() {
  const family = data.families[currentFamily];
  $$('#task-list button').forEach(button=>{previewObserver.unobserve(button);previewStops.delete(button);});
  $$('#task-list video').forEach(video=>{video.pause();video.removeAttribute('src');video.load();});
  $$('#family-tabs button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===currentFamily)));
  $('#family-title').textContent=family.title;
  $('#family-description').textContent=family.description;
  const card=(task,i)=>{
    const media=hdMedia[task.id] || hoverMedia[task.id];
    const poster=media?.poster || task.scenes[0];
    return `<button data-task="${i}" class="task-card ${task.role==='Gen'?'is-gen':''} ${media?.width===media?.height?'square-recording':'wide-recording'}" style="--media-ratio:${media?.width||16}/${media?.height||9}" aria-label="${escape(task.name)} — ${task.role} task. Hover to preview; click for details."><span class="task-media"><img data-src="${poster}" alt="" loading="lazy"><span class="preview-cue">▶ <span>Hover to play${media?.speed>1?' · '+media.speed+'×':''}</span></span></span><span class="task-card-bottom"><span class="task-name">${escape(task.name)}</span><span class="task-role">${task.role}${task.role==='Gen'?' · 8 demos':''}</span></span>${task.role==='Gen'?`<span class="gen-instruction">${escape(task.instruction)}</span>`:''}</button>`;
  };
  $('#task-list').innerHTML=family.tasks.slice(0,4).map(card).join('')+`<div class="atlas-convergence" aria-hidden="true"><svg viewBox="0 0 1000 100" preserveAspectRatio="none"><path d="M125 0 Q125 55 500 82 M375 0 Q375 55 500 82 M625 0 Q625 55 500 82 M875 0 Q875 55 500 82 M500 82 V100"/></svg><span>SAME INTERACTION · NEW TASK</span></div>`+card(family.tasks[4],4);
  $$('#task-list button').forEach(button=>{
    const index=Number(button.dataset.task); attachPreview(button,family.tasks[index].id);
    button.addEventListener('click',()=>openTask(index));
  });
  observeMedia();
  if(!reducedMotion)$('#atlas').animate([{opacity:.35,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'cubic-bezier(.16,1,.3,1)'});
}

function renderTask() {
  const task=data.families[currentFamily].tasks[currentTask];
  const media=layoutMedia[`${task.id}-l${currentLayout+1}`];
  const video=$('#task-video'),status=$('#task-media-status');
  $$('#task-list button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===currentTask)));
  $$('.layout-controls button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===currentLayout)));
  $('#task-instruction').textContent=task.instruction;
  $('#view-label').textContent=`LAYOUT L${currentLayout+1} · 720p · 30 fps`;
  const note=$('#task-source-note');note.hidden=!media?.original_resolution;
  note.textContent=media?.original_resolution?'Original synchronized recording · 224 × 224 per camera, shown side by side at 720p.':'';
  video.closest('.task-view').classList.toggle('original-recording',Boolean(media?.original_resolution));
  video.pause();video.removeAttribute('src');video.load();
  status.hidden=false;status.textContent=`Loading layout L${currentLayout+1}…`;
  if(!media){status.textContent='This layout video is unavailable. Please refresh to retry.';return;}
  video.poster=media.poster;video.src=media.video;
  video.setAttribute('aria-label',`${task.name}, layout L${currentLayout+1} demonstration`);
  video.play().catch(error=>{if(error.name==='NotAllowedError')status.hidden=true;});
}

function selectControl(id, label, values, selected) {
  return `<label>${label}<select id="${id}">${values.map(([value, name]) => `<option value="${escape(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${escape(name)}</option>`).join('')}</select></label>`;
}

function renderResults() {
  $$('.result-modes button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === resultMode)));
  const taskLookup = Object.fromEntries(data.families.flatMap(family => family.tasks.map(task => [task.id, task])));
  let rows;plotMetric=0;
  const heatmap=$('#transfer-heatmap');
  heatmap.hidden=resultMode!=='transfer';
  if (resultMode === 'baseline') {
    $('#result-controls').innerHTML = selectControl('model-select','Policy',MODELS.map(x=>[x,modelLabel(x)]),selectedModel) + selectControl('result-family','Task family',data.families.map(x=>[x.id,x.title]),resultFamily);
    const family = data.families.find(family=>family.id === resultFamily);
    rows = family.tasks.flatMap(task => {
      const reported = data.baselines.filter(row=>row.model === selectedModel && row.task === task.id);
      return reported.length ? reported : [{model:selectedModel, task:task.id, training:task.role,values:Array(7).fill(null),protocol:'Not yet reported',source:null}];
    });
    $('#result-context').textContent = '';
    $('#model-select').addEventListener('change',event=>{selectedModel=event.target.value;renderResults();});
    $('#result-family').addEventListener('change',event=>{resultFamily=event.target.value;renderResults();});
  } else if (resultMode === 'transfer') {
    const transferEpoch=data.transferSchedules[transferTarget];
    $('#result-controls').innerHTML = `<div class="transfer-target-picker"><span>Gen target</span><div class="transfer-targets" role="group" aria-label="Choose Gen target">${['m05','m10','m15'].map(id=>`<button type="button" data-gen-target="${id}" aria-pressed="${id===transferTarget}">${escape(taskLookup[id].name)}</button>`).join('')}</div></div>` + `<div class="transfer-schedule"><span>Independent training schedule</span><strong>${transferEpoch} epochs</strong></div>`;
    rows = data.transfer.filter(row=>row.task===transferTarget && row.epochs===transferEpoch);
    $('#result-context').textContent = `π0.5 · ${transferEpoch} epochs · 8 Gen demonstrations · 1:1 Core–Gen sampling in joint training.`;
    renderTransferHeatmap(heatmap,data,{target:transferTarget,onSelectTarget:target=>{transferTarget=target;renderResults();}});
    $$('[data-gen-target]').forEach(button=>button.addEventListener('click',()=>{transferTarget=button.dataset.genTarget;renderResults();$(`[data-gen-target="${transferTarget}"]`).focus();}));
  }
  const settingName=value=>value.replace('Single1 core','Button Core').replace('Single2 core','Rotation Core').replace('Single3 core','Access Core').replace('Gen only','Gen only · 8 demos');
  plotRows=rows.map(row=>({label:resultMode==='baseline'?taskLookup[row.task].name:settingName(row.setting),detail:resultMode==='transfer'?`${row.epochs} epochs · independent training`:[row.training].filter(Boolean).join(' · '),values:row.values,source:null}));
  renderResultPlot(true);
}
function renderResultPlot(resetCondition=false){
  renderEvidenceChart({rows:plotRows,mode:resultMode,metric:plotMetric,resetCondition,reducedMotion,onMetric:value=>{plotMetric=value;renderResultPlot();}});
}
async function init() {
  const response = await fetch('static/data/data.json',{cache:'no-cache'});
  if (!response.ok) throw new Error('Content unavailable');
  data = await response.json();
  const query=new URLSearchParams(location.search),requestedModel=query.get('model');if(MODELS.includes(requestedModel))selectedModel=requestedModel;
  const requestedFamily=data.families.find(f=>f.tasks.some(t=>t.id===query.get('task')));if(requestedFamily)resultFamily=requestedFamily.id;
  const readJSON=async path=>{const r=await fetch(path,{cache:'no-cache'});return r.ok?r.json():{};};
  [hdMedia,hoverMedia,layoutMedia]=await Promise.all(['hd','hover','layouts'].map(name=>readJSON(`static/videos/${name}.json`)));
  $('#family-tabs').innerHTML = data.families.map((family,i)=>`<button data-family="${i}" aria-pressed="${i===0}"><img data-src="${family.tasks[4].scenes[0]}" alt="" loading="lazy"><span><b>${escape(family.title)}</b><small>${family.setup}</small><small>4 Core + 1 Gen</small></span></button>`).join('');
  $$('#family-tabs button').forEach(button=>button.addEventListener('click',()=>{currentFamily=Number(button.dataset.family);currentTask=0;currentLayout=0;renderFamily();}));
  $$('.layout-controls button').forEach(button=>button.addEventListener('click',()=>{currentLayout=Number(button.dataset.layout);renderTask();}));
  $('#task-video').addEventListener('loadeddata',()=>{$('#task-media-status').hidden=true;});
  $('#task-video').addEventListener('error',()=>{const status=$('#task-media-status');status.hidden=false;status.textContent='Video could not load. Select the layout to retry.';});
  $$('.result-modes button').forEach(button=>button.addEventListener('click',()=>{resultMode=button.dataset.mode;renderResults();}));
  $('#copy-citation').addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText($('#bibtex').textContent);toast('BibTeX copied');}
    catch {const range=document.createRange();range.selectNodeContents($('#bibtex'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);toast('Citation selected. Press Ctrl+C to copy.');}
  });
  $('#close-task').addEventListener('click',()=>$('#task-dialog').close());
  $('#task-dialog').addEventListener('close',()=>$('#task-video').pause());
  $('#task-dialog').addEventListener('click',event=>{if(event.target===$('#task-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
  $$('.transfer-card').forEach(button=>{
    const id=button.dataset.previewTask; attachPreview(button,id);
    const media=hdMedia[id];if(media?.poster)button.querySelector('img').src=media.poster;
    button.addEventListener('click',()=>{currentFamily=0;renderFamily();openTask(data.families[0].tasks.findIndex(task=>task.id===id),true);});
  });
  document.addEventListener('showcase-inspect',event=>{
    const id=event.detail.taskId;
    currentFamily=data.families.findIndex(family=>family.tasks.some(task=>task.id===id));
    renderFamily();openTask(data.families[currentFamily].tasks.findIndex(task=>task.id===id),true);
  });
  whenNear($('#task-gallery'),()=>setupTaskWall({families:data.families,reducedMotion}).catch(error=>{console.error(error);$('#task-gallery').classList.add('is-unavailable');}));
  renderFamily();renderResults();
  setupModelComparison($('#model-overview'),data,{onSelectModel:(model,scope)=>{selectedModel=model;resultMode='baseline';if(scope!=='shared')resultFamily=data.families.find(f=>f.tasks.some(t=>t.id===scope)).id;renderResults();document.querySelector('.results-detail-heading').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});}});
  setupCoreComparison({reducedMotion});setupEvaluation();
  whenNear($('#dataset-console'),()=>setupDatasetInspector({reducedMotion}).catch(error=>{console.error(error);$('#dataset-note').textContent='Dataset recordings are temporarily unavailable. Please refresh to retry.';}));
  if(location.hash)document.fonts.ready.then(finishInitialNavigation);
}
init().catch(error=>{
  console.error(error);
  $('#atlas').innerHTML='<p>Task content could not be loaded. Please refresh the page.</p>';
  $('#result-context').textContent='Results could not be loaded. Please refresh the page.';
});
