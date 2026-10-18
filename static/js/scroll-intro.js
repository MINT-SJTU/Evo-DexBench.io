/** One full-screen lamp demonstration follows a short scroll. */
export function setupScrollIntro({reducedMotion,media}){
  const stage=document.querySelector('#hero-stage'),video=document.querySelector('#hero-video');
  const cue=document.querySelector('.scroll-cue'),completion=media.completion_seconds,lightOn=media.light_on_seconds,clipEnd=media.duration||media.completion_seconds;
  let progress=0,target=0,desired=0,raf=0,velocity=0,lastTick=0,waitingForFrame=false,frameTimer=0,videoFrame=0;
  const frameStep=1/(media.fps||30);
  const pin=stage.querySelector('.intro-pin');
  let armed=!location.hash||['#hero-stage','#demonstrations'].includes(location.hash),holding=false,holdTimer=0,released=false;
  let bypass=!armed,started=false,downloadController=null,objectURL='',loadToken=0;
  const litPoster=new Image();
  const boundary=()=>stage.offsetTop+stage.offsetHeight-pin.offsetHeight;
  const release=()=>{holding=false;released=true;clearTimeout(holdTimer);stage.dataset.holding='false';};
  function holdUntilLit(){
    if(holding||released)return;
    holding=true;stage.dataset.holding='true';
    // Never trap navigation on a slow/failed decoder. Show the real final lit frame.
    holdTimer=setTimeout(()=>{stage.classList.add('intro-lit-fallback');stage.dataset.completed='true';release();},5000);
  }
  const skip=document.createElement('a');skip.className='intro-skip';skip.href='#research';skip.textContent='Skip intro ';stage.querySelector('.hero-bottom').append(skip);
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    if(link){bypass=!['#','#hero-stage','#demonstrations'].includes(link.getAttribute('href'));if(bypass){armed=false;release();if(!objectURL){downloadController?.abort();started=false;stage.dataset.mediaState='idle';}}else{armed=true;if(!reducedMotion)load();}}
  });
  addEventListener('wheel',event=>{if(scrollY<=stage.offsetTop+2){bypass=false;armed=true;released=false;}if(holding&&event.deltaY>0&&event.cancelable)event.preventDefault();},{passive:false});
  addEventListener('touchstart',()=>{if(scrollY<=stage.offsetTop+2){bypass=false;armed=true;released=false;}},{passive:true});
  video.autoplay=false;video.loop=false;video.pause();
  video.addEventListener('play',()=>video.pause());
  const presented=()=>{
    clearTimeout(frameTimer);if(videoFrame)video.cancelVideoFrameCallback?.(videoFrame);videoFrame=0;
    waitingForFrame=false;
    if(video.currentTime>=clipEnd-.08&&holding)requestAnimationFrame(()=>requestAnimationFrame(release));
    schedule();
  };
  const seek=()=>{
    // A fast wheel flick must still show the intervening approach/contact frames.
    const bounded=video.currentTime+Math.max(-.16,Math.min(.16,desired-video.currentTime));
    const time=Math.round(Math.min(bounded,video.duration-frameStep)/frameStep)*frameStep;
    if(video.readyState<2||video.seeking||waitingForFrame||Math.abs(video.currentTime-time)<frameStep*.6)return;
    waitingForFrame=true;
    // Let the compositor present each decoded frame before requesting another.
    if(video.requestVideoFrameCallback)videoFrame=video.requestVideoFrameCallback(presented);
    video.currentTime=Math.max(0,time);
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(tick);};
  /** @param {number} now Animation timestamp in milliseconds. */
  function tick(now){
    raf=0;
    const dt=Math.min(.05,lastTick?(now-lastTick)/1000:1/60);lastTick=now;
    // Critically damped, time-based motion: consistent at 60/120Hz, no bounce.
    const omega=16,offset=progress-target,decay=Math.exp(-omega*dt),step=(velocity+omega*offset)*dt;
    progress=target+(offset+step)*decay;velocity=(velocity-omega*step)*decay;
    if(Math.abs(progress-target)<.0005&&Math.abs(velocity)<.001){progress=target;velocity=0;}
    desired=Math.max(0,Math.min(1,progress))*clipEnd;seek();stage.dataset.scrollProgress=progress.toFixed(3);
    if(progress!==target)schedule();else lastTick=0;
  }
  const onScroll=()=>{
    const rect=stage.getBoundingClientRect();if(rect.bottom < -200 || rect.top > innerHeight+200)return;
    const top=parseFloat(getComputedStyle(pin).top)||0,distance=Math.max(1,stage.offsetHeight-pin.offsetHeight);
    if(scrollY<=stage.offsetTop+2&&!bypass){armed=true;released=false;clearTimeout(holdTimer);holding=false;stage.dataset.holding='false';stage.classList.remove('intro-lit-fallback');}
    if(armed&&!released&&scrollY>=boundary()&&video.currentTime<clipEnd-.08){holdUntilLit();if(scrollY>boundary())scrollTo({top:boundary(),behavior:'instant'});}
    if(holding&&scrollY<boundary()-2){holding=false;clearTimeout(holdTimer);stage.dataset.holding='false';}
    target=Math.max(0,Math.min(1,(top-stage.getBoundingClientRect().top)/distance));schedule();
  };
  video.addEventListener('seeked',()=>{
    video.dataset.presentedTime=video.currentTime.toFixed(3);stage.dataset.completed=String(video.currentTime>=clipEnd-.08);
    stage.style.setProperty('--lamp-light',String(Math.max(0,Math.min(1,(video.currentTime-lightOn)/(completion-lightOn)))));
    if(video.currentTime>=clipEnd-.08)cue.textContent='Explore the benchmark ↓';else if(stage.dataset.mediaState==='ready')cue.textContent='A short scroll turns on the light ↓';
    // Some browsers omit a presentation callback for visually identical frames.
    if(waitingForFrame){
      if(video.requestVideoFrameCallback){clearTimeout(frameTimer);frameTimer=setTimeout(presented,40);}
      else requestAnimationFrame(()=>requestAnimationFrame(presented));
    }
    schedule();
  });
  function loadError(){stage.dataset.mediaState='error';cue.innerHTML='<button class="retry-intro">Load the lamp demonstration ↻</button>';cue.querySelector('button').addEventListener('click',load,{once:true});}
  async function load(){
    if(started&&stage.dataset.mediaState!=='error')return;started=true;
    litPoster.src='static/videos/hero-selected.webp';
    stage.dataset.mediaState='loading';
    cue.textContent='Preparing the lamp demonstration…';
    const token=++loadToken;downloadController?.abort();downloadController=new AbortController();
    // The small scroll-specific clip is buffered once. Paused-video range requests
    // otherwise stall repeatedly while a fast scroll seeks through distant frames.
    try{
      const response=await fetch(media.intro_video||media.video,{signal:downloadController.signal});
      if(!response.ok)throw new Error('Intro video unavailable');
      const blob=await response.blob();if(token!==loadToken)return;
      if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(blob);
      waitingForFrame=false;video.src=objectURL;video.load();
    }catch(error){if(error.name!=='AbortError'&&token===loadToken)loadError();}
  }
  video.addEventListener('error',loadError);
  video.addEventListener('loadeddata',()=>{stage.dataset.mediaState='ready';cue.textContent='A short scroll turns on the light ↓';seek();});
  if(!reducedMotion){stage.classList.add('motion-ready');addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true});onScroll();new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&(armed||scrollY>0))load();},{rootMargin:'200px'}).observe(stage);}else{stage.classList.remove('motion-ready');cue.textContent='Explore the benchmark below ↓';}
  addEventListener('pagehide',event=>{release();cancelAnimationFrame(raf);clearTimeout(frameTimer);if(videoFrame)video.cancelVideoFrameCallback?.(videoFrame);videoFrame=0;waitingForFrame=false;raf=0;lastTick=0;if(!event.persisted){downloadController?.abort();if(objectURL)URL.revokeObjectURL(objectURL);}});
  addEventListener('pageshow',()=>{if(!reducedMotion)onScroll();});
}
