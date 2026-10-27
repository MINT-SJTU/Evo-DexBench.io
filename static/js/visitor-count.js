/** Unique-visitor count for the published host, via Vercount (busuanzi's API stopped answering).
 * The count stays hidden until Vercount answers. */
const stat=document.querySelector('.visitor-stat'),value=document.querySelector('#visitor-count');
// Busuanzi's total (about 300) when counting moved to Vercount on 2026-10-27.
const BUSUANZI_TOTAL=300;
const API='https://events.vercount.one/api/v2/log',CACHE='evo-dexbench:visitors',COOKIE=`vercount_uv_${location.host.replace(/[^a-zA-Z0-9_-]/g,'_')}`;

function show(count){
  value.textContent=new Intl.NumberFormat('en-US').format(count);
  stat.querySelector('.visitor-count-label').textContent=count===1?'visitor':'visitors';
  stat.hidden=false;
}
async function report(attempt=1){
  // A browser counts as a new unique visitor once a year, matching Vercount's own script.
  const isNewUv=!document.cookie.split('; ').some(entry=>entry===`${COOKIE}=1`);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
    const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({url:location.origin+location.pathname,isNewUv}),signal:controller.signal});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const counted=Number((await response.json())?.data?.site_uv);
    if(isNewUv)document.cookie=`${COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    if(Number.isFinite(counted)&&counted>=0){const count=BUSUANZI_TOTAL+counted;show(count);try{localStorage.setItem(CACHE,String(count));}catch{}}
  }catch(error){
    if(attempt<2)setTimeout(()=>report(attempt+1),2000);
  }finally{clearTimeout(timer);}
}
if(stat&&value&&location.hostname==='mint-sjtu.github.io'){
  // The last confirmed count shows at once; a fresh one replaces it when it arrives.
  try{const cached=Number(localStorage.getItem(CACHE));if(cached>0)show(cached);}catch{}
  report();
}
