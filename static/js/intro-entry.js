import {setupScrollIntro} from './intro-frames.js?v=20261030-load1';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
fetch('static/videos/hero.json?v=20261018-frames1',{cache:'no-cache'}).then(response=>{
  if(!response.ok)throw new Error('Intro metadata unavailable');return response.json();
}).then(media=>{
  const connection=navigator.connection;
  const compact=matchMedia('(max-width:900px)').matches||connection?.saveData||['slow-2g','2g','3g'].includes(connection?.effectiveType)||(connection?.downlink>0&&connection.downlink<1.5);
  const portrait=matchMedia('(max-width:900px) and (orientation:portrait)').matches;
  document.querySelector('#hero-stage').dataset.quality=portrait?'portrait':compact?'compact':'desktop';
  setupScrollIntro({reducedMotion,media});
}).catch(error=>{
  console.error(error);document.querySelector('#hero-stage').classList.remove('motion-ready');
  document.querySelector('.scroll-cue').textContent='Explore the benchmark below.';
});
