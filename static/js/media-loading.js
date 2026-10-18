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
