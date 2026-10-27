import { setupNavigation } from './navigation.js?v=20261015-integrated1';
setupNavigation();
import { setupModelComparison, rankByValue } from './model-comparison.js?v=20261027-calm1';
const $=selector=>document.querySelector(selector);
const safeURL=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}};

/** Full coverage and complete metrics are required for a public overall rank.
 * @param {object} entry @param {string[]} taskIds @returns {boolean} */
export function eligibleEntry(entry,taskIds){
  return Boolean(entry&&entry.verified===true&&typeof entry.protocol==='string'&&entry.protocol.trim().length>0&&typeof entry.model==='string'&&safeURL(entry.evidence_url)&&Array.isArray(entry.tasks)&&entry.tasks.length===taskIds.length&&new Set(entry.tasks.map(t=>t?.id)).size===taskIds.length&&taskIds.every(id=>entry.tasks.some(t=>t?.id===id&&Array.isArray(t.values)&&t.values.length===7&&t.values.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1)&&Math.abs(t.values[0]-t.values.slice(2).reduce((a,b)=>a+b,0)/5)<=.005)));
}
async function init(){
  const [data,board]=await Promise.all(['static/data/data.json','static/data/leaderboard.json'].map(async path=>{const response=await fetch(path,{cache:'no-cache'});if(!response.ok)throw new Error('Results unavailable');return response.json();}));
  setupModelComparison($('#model-overview'),data,{metrics:[0,1],sortDescending:true,onSelectModel:(model,scope)=>{const url=new URL('index.html',location.href);url.searchParams.set('model',model);if(scope!=='shared')url.searchParams.set('task',scope);url.hash='results';location.href=url.href;}});
  const ids=data.families.flatMap(f=>f.tasks.map(t=>t.id));
  const entries=board.entries.filter(entry=>eligibleEntry(entry,ids));
  if(entries.length){
    $('#reference-baselines').before($('.community-board'));
    $('#submission-count').textContent=`${entries.length} verified ${entries.length===1?'entry':'entries'}`;
    const protocols=[...new Set(entries.map(e=>e.protocol))];
    $('.community-protocol-label').hidden=false;
    for(const protocol of protocols){const option=document.createElement('option');option.value=protocol;option.textContent=protocol;$('#community-protocol').append(option);}
    let metric=0;
    $('#community-metrics').hidden=false;
    const render=()=>{
      const selected=rankByValue(entries.filter(e=>e.protocol===$('#community-protocol').value).map(e=>({...e,value:e.tasks.reduce((sum,t)=>sum+t.values[metric],0)/ids.length})));
      $('#community-entries').replaceChildren();
      selected.forEach((entry,index)=>{const row=document.createElement('article');row.className='community-row';const rank=document.createElement('span');rank.textContent=String(index+1).padStart(2,'0');const name=document.createElement('h3');name.textContent=entry.model;const score=document.createElement('strong');score.textContent=metric===1?entry.value.toFixed(3):(entry.value*100).toFixed(1)+'%';const track=document.createElement('div');track.className='overview-track';const fill=document.createElement('i');fill.style.width=entry.value*100+'%';track.append(fill);const link=document.createElement('a');link.href=safeURL(entry.evidence_url);link.textContent='Evidence ';link.target='_blank';link.rel='noopener';row.append(rank,name,track,score,link);$('#community-entries').append(row);});
    };
    $('#community-metrics').addEventListener('click',event=>{const button=event.target.closest('[data-community-metric]');if(!button)return;metric=Number(button.dataset.communityMetric);$('#community-metrics').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();});
    $('#community-protocol').addEventListener('change',render);render();
  }
}
init().catch(error=>{$('#model-overview').textContent='Reference results could not load. Please refresh to retry.';console.error(error);});
