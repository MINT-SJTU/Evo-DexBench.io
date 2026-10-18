/** Load the public UV counter only on the published project host, never previews. */
const value=document.querySelector('#busuanzi_value_site_uv');
if(value&&location.hostname==='mint-sjtu.github.io'){
  const observer=new MutationObserver(()=>{
    const raw=value.textContent.trim();if(!/^\d+$/.test(raw))return;
    observer.disconnect();const count=Number(raw);
    value.textContent=new Intl.NumberFormat('en-US').format(count);
    const label=document.querySelector('.visitor-count-label');if(label)label.textContent=count===1?'visitor':'visitors';
    value.closest('.visitor-stat').dataset.ready='true';
  });
  observer.observe(value,{childList:true,characterData:true,subtree:true});
  const script=document.createElement('script');
  script.src='https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
  script.async=true;
  script.onerror=()=>{value.closest('.visitor-stat').title='Visitor statistics are temporarily unavailable';};
  // Leave unavailable counts as a dash; never synthesize a total or display a false zero.
  document.head.append(script);
}
