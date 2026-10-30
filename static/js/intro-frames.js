/** Scroll-controlled frames; never seek a paused MP4 or fight native touch inertia. */
export function setupScrollIntro({reducedMotion,media}){
  const stage=document.querySelector('#hero-stage'),pin=stage.querySelector('.intro-pin');
  const canvas=document.querySelector('#hero-canvas'),ctx=canvas.getContext('2d',{alpha:false});
  const cue=document.querySelector('.scroll-cue'),count=media.frames.count,last=count-1;
  const variant=stage.dataset.quality,compact=variant!=='desktop',folder=media.frames[variant];
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const distance=360,blobs=new Map(),bitmaps=new Map(),decoding=new Set();
  let active=!location.hash||['#hero-stage','#demonstrations'].includes(location.hash);
  let input=0,current=0,shown=-1,raf=0,lastTick=0,started=false,engaged=false,failed=false;
  let touchY=null,touchOwned=false,loadTimer=0,controller=null,epoch=0,returningHome=false;
  const boundary=()=>stage.offsetTop+stage.offsetHeight-pin.offsetHeight;
  const film=canvas.parentElement,skip=document.createElement('a');
  skip.className='intro-skip';skip.href='#research';skip.title='Skip intro';skip.setAttribute('aria-label','Skip intro');
  skip.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v10M3.5 8.5 8 13l4.5-4.5"/></svg>';
  stage.querySelector('.hero-bottom').append(skip);
  const cueText={idle:'Scroll to switch on the lamp.',loading:'Preparing the demonstration…',done:'Explore the benchmark below.'};

  function setActive(value){active=value;stage.classList.toggle('intro-scrubbing',value&&!reducedMotion);stage.dataset.holding=String(value&&engaged);}
  function release(handoff){
    setActive(false);
    // Consume the existing intro track without moving the visible sticky panel.
    // The current touch stays owned until touchend, so inertia cannot skip the reveal.
    if(handoff&&engaged)scrollTo({top:boundary(),behavior:'instant'});
  }
  function resize(){
    // The canvas matches the framed card, so frames are drawn near their native size.
    const dpr=Math.min(devicePixelRatio||1,2),limit=compact?960:1440,box=film.getBoundingClientRect();
    if(!box.width||!box.height)return;
    canvas.width=Math.min(limit,Math.round(box.width*dpr));
    canvas.height=Math.round(canvas.width*box.height/box.width);
    shown=-1;draw(Math.round(current));
  }
  function draw(index){
    const bitmap=bitmaps.get(index);if(!bitmap||shown===index)return false;
    const scale=Math.max(canvas.width/bitmap.width,canvas.height/bitmap.height);
    const w=bitmap.width*scale,h=bitmap.height*scale;
    ctx.drawImage(bitmap,(canvas.width-w)*(compact ? .36 : .43),(canvas.height-h)/2,w,h);
    shown=index;canvas.classList.add('is-ready');stage.dataset.frame=String(index);
    stage.dataset.completed=String(index===last);
    stage.dataset.scrollProgress=(index/last).toFixed(3);
    stage.style.setProperty('--lamp-light',String(clamp((index/last*media.duration-media.light_on_seconds)/(media.completion_seconds-media.light_on_seconds),0,1)));
    if(index===last){
      cue.textContent=cueText.done;
      if(active&&input>=distance)requestAnimationFrame(()=>{if(shown===last&&input>=distance)release(true);});
    }
    return true;
  }
  function warm(index){
    if(index<0||index>last||!blobs.has(index)||bitmaps.has(index)||decoding.has(index))return;
    decoding.add(index);const token=epoch;
    createImageBitmap(blobs.get(index)).then(bitmap=>{
      if(token!==epoch){bitmap.close();return;}
      bitmaps.set(index,bitmap);decoding.delete(index);schedule();
    }).catch(()=>{decoding.delete(index);fail();});
  }
  function trim(){
    // Keep a short decoded window, not 96 full-resolution bitmaps in mobile RAM.
    for(const [index,bitmap] of bitmaps)if(Math.abs(index-current)>9){bitmap.close();bitmaps.delete(index);}
  }
  function schedule(){if(started&&!failed&&!reducedMotion&&!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
  function tick(now){
    raf=0;const dt=Math.min(.033,lastTick?(now-lastTick)/1000:1/60);lastTick=now;
    const target=input/distance*last,delta=target-current;
    const step=Math.sign(delta)*Math.min(Math.abs(delta),Math.max(.4,Math.abs(delta)*.18),110*dt);
    const next=Math.abs(delta)<.45?target:current+step,index=Math.round(next),direction=delta<0?-1:1;
    warm(index);warm(Math.floor(index/4)*4);
    for(let k=0;k<8;k++)warm(clamp(index+k*direction,0,last));
    // A lightweight first pass spans the whole action. On slow networks it can
    // render immediately; intervening frames refine the same motion as they arrive.
    const drawable=bitmaps.has(index)?index:(index===last?last:Math.floor(index/4)*4);
    if(bitmaps.has(drawable)){current=next;draw(drawable);trim();}
    if(Math.abs(current-target)>.01||shown!==Math.round(target))schedule();else lastTick=0;
  }
  function advance(delta){
    engaged=true;stage.dataset.holding='true';input=clamp(input+delta,0,distance);load();schedule();
  }
  function reset(){
    if(reducedMotion||failed)return;
    input=0;current=0;engaged=false;returningHome=scrollY>stage.offsetTop+2;
    setActive(true);cue.textContent=cueText.idle;load();schedule();
  }
  addEventListener('wheel',event=>{
    if(!active||event.ctrlKey||event.target.closest('input,select,textarea,dialog'))return;
    if(event.cancelable)event.preventDefault();
    advance(event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1));
  },{passive:false});
  addEventListener('touchstart',event=>{
    touchOwned=active&&event.touches.length===1&&!event.target.closest('input,select,textarea,dialog');
    touchY=touchOwned?event.touches[0].clientY:null;
  },{passive:true});
  addEventListener('touchmove',event=>{
    if(!touchOwned||event.touches.length!==1)return;
    if(event.cancelable)event.preventDefault();
    const y=event.touches[0].clientY;if(active)advance(touchY-y);touchY=y;
  },{passive:false});
  const endTouch=()=>{touchY=null;touchOwned=false;};
  addEventListener('touchend',endTouch,{passive:true});addEventListener('touchcancel',endTouch,{passive:true});
  addEventListener('keydown',event=>{
    if(!active||event.target.closest('a,button,input,select,textarea')||event.ctrlKey||event.metaKey||event.altKey)return;
    const amount={ArrowDown:60,ArrowUp:-60,PageDown:360,PageUp:-360,' ':event.shiftKey?-360:360,End:360};
    if(event.key in amount){event.preventDefault();advance(amount[event.key]);}
  });
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');if(!link)return;
    if(['#','#hero-stage','#demonstrations'].includes(link.getAttribute('href')))reset();else release(false);
  });
  // Scrollbars, restored positions and assistive technology keep native navigation.
  addEventListener('scroll',()=>{
    if(returningHome){if(scrollY<=stage.offsetTop+2)returningHome=false;return;}
    if(active&&!engaged&&scrollY>2){input=clamp(scrollY-stage.offsetTop,0,distance);schedule();}
    if(!active&&scrollY<=stage.offsetTop+1&&!location.hash)reset();
  },{passive:true});
  function fail(){
    if(failed)return;failed=true;clearTimeout(loadTimer);controller?.abort();
    stage.dataset.mediaState='error';release(false);cue.textContent=cueText.done;
  }
  async function load(){
    if(started||reducedMotion)return;started=true;controller=new AbortController();
    stage.dataset.mediaState='loading';cue.textContent=cueText.loading;
    loadTimer=setTimeout(fail,15000);let cursor=0;
    const preview=Array.from({length:Math.ceil(count/4)},(_,i)=>i*4);
    if(preview.at(-1)!==last)preview.push(last);
    const order=[...preview,...Array.from({length:count},(_,i)=>i).filter(i=>!preview.includes(i))];
    try{
      // Eight downloads at a time: each frame is small, so request latency, not bandwidth, sets the pace.
      await Promise.all(Array.from({length:8},async()=>{
        while(cursor<count){
          const index=order[cursor++],response=await fetch(`${folder}/${String(index).padStart(3,'0')}.webp`,{signal:controller.signal});
          if(!response.ok)throw new Error('Intro frame unavailable');
          blobs.set(index,await response.blob());if(index<8||Math.abs(index-current)<8)warm(index);
        }
      }));
      clearTimeout(loadTimer);stage.dataset.mediaState='ready';
      if(shown!==last)cue.textContent=cueText.idle;schedule();
    }catch(error){if(error.name!=='AbortError')console.warn('Intro sequence unavailable',error);fail();}
  }
  setActive(active);resize();
  if(reducedMotion){setActive(false);stage.classList.remove('motion-ready');cue.textContent=cueText.done;}
  else if(active)load();
  new ResizeObserver(resize).observe(film);
  document.addEventListener('visibilitychange',()=>{lastTick=0;if(!document.hidden)schedule();});
  addEventListener('pagehide',event=>{
    cancelAnimationFrame(raf);raf=0;lastTick=0;
    if(!event.persisted){epoch++;clearTimeout(loadTimer);controller?.abort();for(const bitmap of bitmaps.values())bitmap.close();bitmaps.clear();}
  });
  addEventListener('pageshow',()=>schedule());
}
