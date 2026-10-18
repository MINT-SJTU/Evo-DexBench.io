const $=selector=>document.querySelector(selector);
const names=['Total','Stage score','Nominal','Camera','Lighting','Physical','Spatial'];
const nodes=new Map();
let current,sort='source',condition=0,bound=false,entered=false;
const format=(v,stage)=>v==null?'':stage?v.toFixed(3):`${(v*100).toFixed(1)}%`;

// Keep each record's DOM node across changes: values grow in place and rows
// retain their identity while moving to a different sort position.
export function renderEvidenceChart(options){
  // A view change resets once; local condition clicks must not replay that reset.
  current={...options,resetCondition:false};if(options.resetCondition)condition=0;
  const {rows,mode,metric,reducedMotion}=options;
  if(mode==='transfer')condition=0;
  const root=$('#result-plot');
  if(!bound){
    bound=true;
    $('.plot-heading').insertAdjacentHTML('afterend',`<div class="chart-toolbar"><div class="chart-conditions" role="group" aria-label="Result condition">${[0,2,3,4,5,6].map(i=>`<button data-result-condition="${i}" aria-pressed="${i===0}">${names[i]}</button>`).join('')}</div><label class="chart-order">Order <select id="chart-sort"><option value="source">Task / setting</option><option value="value">Value ↓</option></select></label></div><div class="chart-legend"><span><i></i> <b id="chart-series-label">Reported success rate</b></span><span id="nominal-legend" hidden><i class="ghost-key"></i> Nominal reference</span></div>`);
    root.insertAdjacentHTML('afterend','<p id="chart-inspect" class="chart-inspect" aria-live="polite">Select a bar to inspect its value.</p><a id="chart-run" class="text-link" hidden target="_blank" rel="noopener">View paper v1 </a>');
    root.setAttribute('role','group');
    document.querySelectorAll('[data-plot-metric]').forEach(b=>b.addEventListener('click',()=>current.onMetric(Number(b.dataset.plotMetric))));
    document.querySelectorAll('[data-result-condition]').forEach(b=>b.addEventListener('click',()=>{condition=Number(b.dataset.resultCondition);renderEvidenceChart(current);}));
    $('#chart-sort').addEventListener('change',e=>{sort=e.target.value;renderEvidenceChart(current);});
    new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!entered){entered=true;renderEvidenceChart(current);}},{threshold:.25}).observe(root);
  }
  const stage=metric===1;
  if(options.resetCondition){$('#chart-inspect').textContent='Select a bar to inspect its value.';$('#chart-run').hidden=true;for(const node of nodes.values()){node.classList.remove('is-inspected');node.setAttribute('aria-pressed','false');}}
  const index=stage?1:condition;
  const comparison=index>=3;
  $('.chart-conditions').hidden=stage||mode==='transfer';
  $('#nominal-legend').hidden=!comparison;
  $('#chart-series-label').textContent=stage?'Reported stage score':index>1?`${names[index]} success rate`:'Reported success rate';
  $('#result-plot-title').textContent=stage?'Stage score':index>1?`Success under ${names[index].toLowerCase()} conditions`:'Total success rate';
  $('#result-coverage').textContent=`${rows.filter(r=>r.values[index]!=null).length} / ${rows.length} reported · ${stage?'partial-credit score, 0–1':names[index].toLowerCase()}`;
  document.querySelectorAll('[data-plot-metric]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.plotMetric)===metric)));
  document.querySelectorAll('[data-result-condition]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.resultCondition)===condition)));
  const previous=new Map([...nodes].map(([key,node])=>[key,node.getBoundingClientRect().top]));
  const ordered=rows.map((r,i)=>({...r,key:`${r.label}|${r.detail}`,order:i}));
  if(sort==='value')ordered.sort((a,b)=>(b.values[index]??-1)-(a.values[index]??-1)||a.order-b.order);
  const keys=new Set(ordered.map(r=>r.key));
  for(const [key,node] of nodes)if(!keys.has(key)){node._animation?.cancel();cancelAnimationFrame(node._counter);node.remove();nodes.delete(key);}
  root.querySelector('.plot-axis')?.remove();
  ordered.forEach((row,position)=>{
    let node=nodes.get(row.key),fresh=!node;
    if(fresh){
      node=document.createElement('button');node.type='button';node.className='plot-row';node.dataset.key=row.key;
      node.innerHTML='<span class="plot-label"><strong></strong><small></small></span><span class="plot-track"><span class="nominal-ghost"></span><i style="width:0%"></i><span class="pending-measurement"></span></span><span class="plot-value"></span>';
      node.addEventListener('click',()=>{
        for(const n of nodes.values()){n.classList.toggle('is-inspected',n===node);n.setAttribute('aria-pressed',String(n===node));}
        $('#chart-inspect').textContent=node._description;const run=$('#chart-run');run.hidden=!node._source;if(node._source)run.href=node._source;run.textContent=node._sourceLabel;
      });
      nodes.set(row.key,node);
    }
    const value=row.values[index],pending=value==null,bar=node.querySelector('i'),out=node.querySelector('.plot-value');
    node.querySelector('strong').textContent=row.label;
    node.querySelector('small').textContent=row.detail|| (mode==='transfer'?'Same target · independent training setting':'Independent target-data subset');
    node.classList.toggle('is-pending',pending);node.querySelector('.pending-measurement').hidden=!pending;
    bar.hidden=pending;bar.classList.toggle('zero-measurement',value===0);
    const ghost=node.querySelector('.nominal-ghost');ghost.hidden=!comparison||row.values[2]==null;ghost.style.width=`${(row.values[2]||0)*100}%`;
    const delta=comparison&&value!=null&&row.values[2]!=null?` · ${((value-row.values[2])*100).toFixed(1)} percentage points versus nominal`:'';
    node._source=row.source;node._sourceLabel=row.sourceLabel||'View source ';node._description=`${row.label}: ${pending?'No data':format(value,stage)}${delta}. ${row.detail||'Source-reported evaluation record.'}`;
    node.setAttribute('aria-label',node._description);
    if(node.classList.contains('is-inspected'))$('#chart-inspect').textContent=node._description;
    root.append(node);
    const startValue=node._value??0,target=entered?value??0:0;
    node._animation?.cancel();cancelAnimationFrame(node._counter);
    const animate=!reducedMotion&&entered;
    // Flush the zero width of newly inserted bars before setting their target.
    if(fresh&&animate)bar.getBoundingClientRect();
    bar.style.transition=animate?'width 780ms cubic-bezier(.22,1,.36,1)':'none';
    bar.style.width=`${target*100}%`;
    out.textContent=format(value,stage);
    if(animate&&!pending&&Math.abs(target-startValue)>.0001){
      const start=performance.now();
      const count=now=>{const t=Math.min(1,(now-start)/780),v=startValue+(target-startValue)*(1-Math.pow(1-t,3));node._value=v;out.textContent=format(v,stage);if(t<1)node._counter=requestAnimationFrame(count);else out.textContent=format(value,stage);};
      node._counter=requestAnimationFrame(count);
    }else node._value=target;
  });
  // FLIP positions only after the complete new order has been laid out.
  if(!reducedMotion&&entered)for(const [key,node] of nodes){
    const dy=(previous.get(key)??node.getBoundingClientRect().top)-node.getBoundingClientRect().top;
    if(Math.abs(dy)>1)node._animation=node.animate([{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'});
  }
  const axis=document.createElement('div');axis.className='plot-axis';axis.innerHTML=`<span></span><div>${(stage?['0','.25','.50','.75','1.0']:['0%','25%','50%','75%','100%']).map(x=>`<span>${x}</span>`).join('')}</div><span></span>`;root.append(axis);
  root.setAttribute('aria-label',`${names[index]} — ${rows.map(r=>`${r.label}: ${format(r.values[index],stage)}`).join('; ')}`);
}
