const SOURCES=[
  {setting:'Button Core + Gen',name:'Button-driven',target:'m05'},
  {setting:'Rotation Core + Gen',name:'Rotational',target:'m10'},
  {setting:'Access Core + Gen',name:'Access & transfer',target:'m15'},
];
const TARGETS=['m05','m10','m15'];
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Derive gains from the same records as the detailed charts; never fill missing cells with zero.
export function transferCells(data){
  return SOURCES.map(source=>TARGETS.map(task=>{
    const baseline=data.transfer.find(r=>r.task===task&&r.setting==='Gen only'&&r.epochs===data.transferSchedules[task]);
    const mixed=data.transfer.find(r=>r.task===task&&r.setting===source.setting&&r.epochs===data.transferSchedules[task]);
    const sr=mixed?.values[0]??null,reference=baseline?.values[0]??null;
    return {task,source:source.name,setting:source.setting,matched:source.target===task,sr,reference,
      gain:sr==null||reference==null?null:Math.round((sr-reference)*1000)/10};
  }));
}

export function renderTransferHeatmap(root,data,{target,onSelectTarget}){
  const tasks=Object.fromEntries(data.families.flatMap(f=>f.tasks).map(t=>[t.id,t]));
  const cells=transferCells(data);
  root.innerHTML=`<div class="transfer-map-heading"><div><span class="panel-kicker">CORE → GEN</span><h3>Which Core experience transfers?</h3></div><span class="coverage-badge">π0.5</span></div><p>Success-rate gain over Gen-only training, in percentage points.</p><div class="transfer-map-scroll"><table class="transfer-map"><caption class="sr-only">Core source family by Gen target. Each cell reports success-rate gain and joint-training success rate.</caption><thead><tr><th scope="col">Core source ↓<br>Gen target →</th>${TARGETS.map(id=>`<th scope="col" class="${id===target?'is-selected':''}">${escape(tasks[id].name)}</th>`).join('')}</tr></thead><tbody>${cells.map((row,i)=>`<tr><th scope="row">${SOURCES[i].name}</th>${row.map(cell=>{
    const gain=cell.gain,label=gain==null?'':`${gain>0?'+':''}${gain.toFixed(0)}`;
    const strength=gain==null?0:Math.min(Math.abs(gain)/10,1);
    const color=gain==null?'transparent':gain<0?`hsl(211 44% ${96-strength*36}%)`:`hsl(17 58% ${96-strength*45}%)`;
    const description=gain==null?`${cell.source} to ${tasks[cell.task].name}: no data`:`${cell.source} to ${tasks[cell.task].name}: ${label} percentage points, ${(cell.sr*100).toFixed(0)}% success rate${cell.matched?', matched family':''}`;
    return `<td><button type="button" data-transfer-target="${cell.task}" class="transfer-cell${cell.matched?' is-matched':''}" style="--cell-color:${color}" aria-label="${escape(description)}" aria-pressed="${cell.task===target}" ${gain==null?'disabled':''}><strong>${label}</strong><span>${cell.sr==null?'':`${(cell.sr*100).toFixed(0)}% SR`}</span>${cell.matched?'<i aria-hidden="true">●</i>':''}</button></td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div><div class="transfer-map-legend"><span><i class="matched-key"></i> Matched family</span><span class="transfer-scale"><b>−10</b><i></i><b>+10 pp</b></span></div>`;
  root.querySelectorAll('[data-transfer-target]').forEach(button=>button.addEventListener('click',()=>onSelectTarget(button.dataset.transferTarget)));
}
