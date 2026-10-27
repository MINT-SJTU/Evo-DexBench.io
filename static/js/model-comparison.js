export const MODELS=['π0.5','DP-T','DP-C','KineDex','SmolVLA','QwenOFT'];
/** Public method label; stable data keys and checkpoint URLs stay unchanged. */
export const modelLabel=model=>model==='QwenOFT'?'StarVLA-OFT':model;
/** @typedef {{model:string,task:string,training:string,protocol:string,values:Array<number|null>,source:string|null}} BaselineRow */
/** @typedef {{id:string,title:string,tasks:Array<{id:string,name:string,role:string}>}} TaskFamily */
/** @typedef {{baselines:BaselineRow[],families:TaskFamily[],baselineTasks:string[]}} ResultData */
/** @typedef {{model:string,value:number|null,reported:number,total:number,records:BaselineRow[]}} ComparisonRow */
const METRICS=['Total SR','Stage score','Nominal','Camera','Lighting','Physical','Spatial'];
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** @param {ResultData} data @returns {string[]} */
export function paperTasks(data){
  return data.baselineTasks;
}
/** A fixed shared task set; a missing metric never becomes a zero.
 * @param {ResultData} data @param {string} scope @param {number} metric @returns {ComparisonRow[]} */
export function comparisonRows(data,scope,metric){
  const ids=scope==='shared'?paperTasks(data):[scope];
  return MODELS.map(model=>{
    const records=ids.map(id=>data.baselines.find(r=>r.model===model&&r.task===id));
    const reported=records.filter(r=>r?.values[metric]!=null);
    const value=reported.length===ids.length&&ids.length?reported.reduce((sum,r)=>sum+r.values[metric],0)/ids.length:null;
    return {model,value,reported:reported.length,total:ids.length,records:records.filter(Boolean)};
  });
}

/** Descending scores, with missing values last and stable ordering for ties. */
export function rankByValue(rows){
  return [...rows].sort((a,b)=>(b.value??-1)-(a.value??-1));
}

/** Reference comparison, shared by the home page and separate leaderboard.
 * @param {HTMLElement} root @param {ResultData} data @param {{onSelectModel?:(model:string,scope:string)=>void,metrics?:number[],sortDescending?:boolean}} options */
export function setupModelComparison(root,data,{onSelectModel,metrics=[0,1,2,3,4,5,6],sortDescending=false}={}){
  let scope='shared',metric=0;const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const tasks=data.families.flatMap(f=>f.tasks);
  // One title that names the metric, controls beside it, bars, then a single line of method notes.
  root.innerHTML=`<div class="overview-heading"><div><h3 class="overview-title">Total success rate</h3><p class="overview-scope">Overall · 15 evaluated tasks${sortDescending?'':' · select a policy to inspect it'}</p></div><div class="overview-controls"><label><span class="sr-only">Comparison set</span><select class="comparison-scope"><option value="shared">Overall (15 evaluated tasks)</option>${data.families.map(f=>`<optgroup label="${escape(f.title)}">${f.tasks.map(t=>`<option value="${t.id}">${escape(t.name)}</option>`).join('')}</optgroup>`).join('')}</select></label><div class="overview-metrics" role="group" aria-label="Model comparison metric">${metrics.map(i=>{const name=i===1?'StageScore':METRICS[i];return `<button data-overview-metric="${i}" aria-pressed="${i===0}">${name}</button>`;}).join('')}</div></div></div><div class="overview-bars" role="group" aria-label="Model comparison"></div><p class="comparison-evidence">Core tasks use Core-trained checkpoints; Gen tasks use Core + Gen 1:1 joint training. Training budgets differ by model. <a href="https://huggingface.co/Travor278/Evo-DexBench-QwenOFT-v1/blob/977e0365693cca7ef73129289a45f0340ced8154/results.json" target="_blank" rel="noopener">StarVLA-OFT checkpoints</a> use a Qwen3-VL-4B backbone.</p>`;
  const bars=root.querySelector('.overview-bars');
  for(const model of MODELS){
    const row=document.createElement('button');row.type='button';row.className='overview-row';row.dataset.model=model;
    row.innerHTML=`<span class="overview-model">${escape(modelLabel(model))}</span><span class="overview-track"><i style="width:0%"></i></span><strong>—</strong>`;
    row.addEventListener('click',()=>onSelectModel?.(model,scope));bars.append(row);
  }
  function render(){
    const records=comparisonRows(data,scope,metric),rows=sortDescending?rankByValue(records):records;const name=scope==='shared'?'Overall (15 evaluated tasks)':tasks.find(t=>t.id===scope).name;
    root.dataset.metric=String(metric);root.dataset.scope=scope;
    root.querySelector('.overview-title').textContent=metric===0?'Total success rate':metric===1?'Stage score':`${METRICS[metric]} success rate`;
    root.querySelector('.overview-scope').textContent=`${scope==='shared'?'Overall · 15 evaluated tasks':name}${sortDescending?'':' · select a policy to inspect it'}`;
    root.querySelectorAll('[data-overview-metric]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.overviewMetric)===metric)));
    for(const row of rows){
      const element=[...bars.children].find(e=>e.dataset.model===row.model),bar=element.querySelector('i');
      if(sortDescending)bars.append(element);
      element.classList.toggle('is-pending',row.value==null);element.classList.toggle('is-zero',row.value===0);
      bar.style.transition=reduced?'none':'width 650ms cubic-bezier(.22,1,.36,1)';bar.style.width=`${(row.value??0)*100}%`;
      element.querySelector('strong').textContent=row.value==null?'':metric===1?row.value.toFixed(3):`${(row.value*100).toFixed(1)}%`;
      element.setAttribute('aria-label',`${modelLabel(row.model)}: ${METRICS[metric]}, ${row.value==null?'No data':element.querySelector('strong').textContent}, ${name}`);
    }

  }
  root.querySelector('select').addEventListener('change',event=>{scope=event.target.value;metric=0;render();});
  root.querySelector('.overview-metrics').addEventListener('click',event=>{const button=event.target.closest('button');if(button){metric=Number(button.dataset.overviewMetric);render();}});
  render();
}
