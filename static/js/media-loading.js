/** Start images and poster requests only as their own boxes approach the viewport. */
const images=new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(!entry.isIntersecting)continue;
    const element=entry.target;
    if(element.dataset.src){element.src=element.dataset.src;delete element.dataset.src;}
    if(element.dataset.poster){element.poster=element.dataset.poster;delete element.dataset.poster;}
    images.unobserve(element);
  }
},{rootMargin:'200px 0px'});
export function observeMedia(root=document){
  root.querySelectorAll('img[data-src],video[data-poster]').forEach(element=>{
    if(element.dataset.observed)return;
    element.dataset.observed='true';if(element.tagName==='IMG')element.decoding='async';images.observe(element);
  });
}
/** Reserve section geometry in HTML/CSS, then initialize its media near the reader. */
export function whenNear(element,start){
  const observer=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    observer.disconnect();Promise.resolve().then(start).catch(console.error);
  },{rootMargin:'300px 0px'});
  observer.observe(element);
}
/** Resolve once every clip has buffered enough to play to its end at the download speed seen so far.
 * A slow first visit keeps the poster up a moment longer instead of showing a stuttering clip.
 * While `wanted()` is false (scrolled past, another slide) loading is held back, so clips the reader
 * has left stop taking bandwidth from the ones on screen. Browsers that hold back preloading
 * (data saver, some phones) resolve after a short wait and stream on play.
 * @param {HTMLVideoElement[]} videos Clips whose src is already set.
 * @param {()=>boolean} [wanted] Whether the clips are wanted now. @returns {Promise<void>} */
export function whenPlayable(videos,wanted=()=>true){
  const end=video=>video.buffered.length?video.buffered.end(0):0;
  return new Promise((resolve,reject)=>{
    let done=false,start=0,base=[];
    const finish=error=>{if(!done){done=true;error?reject(error):resolve();}};
    videos.forEach(video=>video.addEventListener('error',()=>finish(new Error('Video unavailable')),{once:true}));
    (function check(){
      if(done)return;
      if(videos.some(video=>video.error)){finish(new Error('Video unavailable'));return;}
      if(!wanted()){
        if(start!==0){start=0;videos.forEach(video=>{video.preload='metadata';});}
        setTimeout(check,250);return;
      }
      if(start===0){start=performance.now();base=videos.map(end);videos.forEach(video=>{video.preload='auto';});}
      const elapsed=(performance.now()-start)/1000;
      const ready=videos.every((video,i)=>{
        const buffered=end(video);
        if(!(video.duration>0)||video.readyState<2)return false;
        if(buffered>=video.duration-.1)return true;
        // Download the rest before playback (from the current time) would reach it, with 20% headroom.
        const rate=(buffered-base[i])/Math.max(elapsed,.25);
        return video.readyState>=3&&video.duration-buffered<=.8*rate*(video.duration-video.currentTime);
      });
      const notPreloading=elapsed>3&&videos.some(video=>video.readyState<3&&video.networkState!==HTMLMediaElement.NETWORK_LOADING);
      if(ready||notPreloading||elapsed>20)finish();else setTimeout(check,200);
    })();
  });
}
