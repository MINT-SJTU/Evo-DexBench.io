import {setupScrollIntro} from './scroll-intro.js?v=20261018-perf1';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
fetch('static/videos/hero.json?v=20261018-perf1',{cache:'no-cache'}).then(response=>{
  if(!response.ok)throw new Error('Intro metadata unavailable');return response.json();
}).then(media=>{
  const connection=navigator.connection;
  const compact=matchMedia('(max-width:900px)').matches||connection?.saveData||['slow-2g','2g','3g'].includes(connection?.effectiveType)||(connection?.downlink>0&&connection.downlink<=5);
  if(compact&&media.compact_video)media.intro_video=media.compact_video;
  document.querySelector('#hero-stage').dataset.quality=compact?'720p':'1080p';
  setupScrollIntro({reducedMotion,media});
}).catch(error=>{
  console.error(error);document.querySelector('#hero-stage').classList.remove('motion-ready');
  document.querySelector('.scroll-cue').textContent='Explore the benchmark below ↓';
});
