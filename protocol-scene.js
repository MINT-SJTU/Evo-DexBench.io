import { loadRecordedFaucet } from './recorded-faucet.js?v=20261016-studio1';
import { PROTOCOL, cameraExample } from './protocol-parameters.js?v=20261016-studio1';
import * as T from './assets/vendor/three.module.js';
import { createCameraHousing } from './camera-model.js?v=20261014-publication1';

// Repository robot geometry and kinematics; environment changes are illustrative.
/** @param {HTMLElement} root @returns {Promise<void>} */
export async function mountProtocolScene(root){
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motionPreference.matches;
  const stage=root.closest('.protocol-stage');
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Interactive 3D schematic of dexterous manipulation under five evaluation conditions');
  const scene=new T.Scene();scene.background=new T.Color(0xe1e2e0);scene.fog=new T.Fog(0xe1e2e0,18,38);
  const camera=new T.PerspectiveCamera(38,1,.1,100);camera.position.set(-4.6,3.4,5.8);camera.lookAt(.35,1.02,0);
  const observation=new T.PerspectiveCamera(40,16/9,.1,30);
  const warm=new T.DirectionalLight(0xfff1d6,4);warm.position.set(-3,6,4);warm.castShadow=true;warm.shadow.mapSize.set(2048,2048);warm.shadow.radius=4;warm.shadow.bias=-.00015;warm.shadow.camera.left=-4;warm.shadow.camera.right=4;warm.shadow.camera.top=4;warm.shadow.camera.bottom=-4;warm.shadow.normalBias=.04;scene.add(warm);
  const ambient=new T.HemisphereLight(0xf4f5ef,0x777465,2.7);scene.add(ambient);
  const rim=new T.DirectionalLight(0xc9d9e5,2);rim.position.set(4,3,-4);scene.add(rim);
  /** @param {T.ColorRepresentation} color @param {number} metalness @param {number} roughness */
  const material=(color,metalness=0,roughness=.55)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const ivory=material(0xe2e1d7,.35,.32);
  /** @param {T.BufferGeometry} geometry @param {T.Material} mat @param {T.Object3D} parent */
  const mesh=(geometry,mat,parent=scene)=>{const m=new T.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  /** @param {number} x @param {number} y @param {number} z @param {T.Material} mat @param {T.Object3D} parent */
  const box=(x,y,z,mat,parent=scene)=>mesh(new T.BoxGeometry(x,y,z),mat,parent);
  /** @param {number} x @param {number} y @param {number} z @returns {T.Vector3} */
  const V=(x,y,z)=>new T.Vector3(x,y,z);
  const ground=mesh(new T.PlaneGeometry(200,200),material(0xd5d7d4,.05,.78));ground.rotation.x=-Math.PI/2;ground.position.y=-.045;ground.receiveShadow=true;ground.castShadow=false;
  const actual=await loadRecordedFaucet();
  const robot={group:actual.robot};scene.add(robot.group);scene.add(actual.fixture);
  const faucet={group:actual.fixture,handle:actual.handle};
  const target=new T.Object3D();target.position.copy(actual.jointPivot);scene.add(target);
  const basePosition=actual.base.clone(),baseRotation=robot.group.quaternion.clone();
  const detailCamera=new T.PerspectiveCamera(34,16/9,.001,10);
  const pedestal=box(.62,basePosition.y,.56,ivory);pedestal.position.set(basePosition.x,basePosition.y/2-.04,basePosition.z);
  const targetRing=mesh(new T.RingGeometry(.29,.30,64),new T.MeshBasicMaterial({color:0xb65737,transparent:true,opacity:.6,side:T.DoubleSide}));targetRing.rotation.x=-Math.PI/2;targetRing.position.copy(basePosition).y=-.039;
  const ghostRing=targetRing.clone();ghostRing.material=targetRing.material.clone();ghostRing.material.opacity=.35;scene.add(ghostRing);
  const displacement=new T.ArrowHelper(V(1,0,0),basePosition.clone().add(V(0,.05,0)),.04,0xb36b4d,.014,.008);scene.add(displacement);displacement.visible=false;
  const nominalEye=target.position.clone().add(V(1.0,1.25,1.3)),nominalTarget=target.position.clone();
  const {rig:cameraRig}=await createCameraHousing();cameraRig.scale.multiplyScalar(.6);scene.add(cameraRig);
  const coneGeometry=new T.BufferGeometry();coneGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(48),3));
  const sightLines=new T.LineSegments(coneGeometry,new T.LineBasicMaterial({color:0x7a948d,transparent:true,opacity:.42}));scene.add(sightLines);
  const nominalSight=sightLines.clone();nominalSight.geometry=coneGeometry.clone();nominalSight.material=new T.LineDashedMaterial({color:0xb58975,transparent:true,opacity:.55,dashSize:.045,gapSize:.025});nominalSight.visible=false;scene.add(nominalSight);
  const baselineCamera=new T.PerspectiveCamera(40,16/9,.1,30),baseline=cameraExample(nominalEye.toArray(),nominalTarget.toArray(),0);
  baselineCamera.position.fromArray(baseline.eye);baselineCamera.lookAt(new T.Vector3(...baseline.target));baselineCamera.updateMatrixWorld(true);
  const baselineForward=baselineCamera.getWorldDirection(new T.Vector3()),baselineDepth=baselineCamera.position.distanceTo(new T.Vector3(...baseline.target));
  const baselineCorners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{const ray=new T.Vector3(x,y,.5).unproject(baselineCamera).sub(baselineCamera.position).normalize();return ray.multiplyScalar(baselineDepth/ray.dot(baselineForward)).add(baselineCamera.position);});
  const baselineLines=[];for(let i=0;i<4;i++)baselineLines.push(...baselineCamera.position.toArray(),...baselineCorners[i].toArray(),...baselineCorners[i].toArray(),...baselineCorners[(i+1)%4].toArray());
  nominalSight.geometry.attributes.position.array.set(baselineLines);nominalSight.geometry.attributes.position.needsUpdate=true;nominalSight.computeLineDistances();nominalSight.geometry.computeBoundingSphere();
  const baselineCaptured=true;
  const frustumGeometry=new T.BufferGeometry();frustumGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(36),3));
  const frustum=new T.Mesh(frustumGeometry,new T.MeshBasicMaterial({color:0x789c92,side:T.DoubleSide,transparent:true,opacity:.025,depthWrite:false}));scene.add(frustum);
  const canvasWrap=document.createElement('div');canvasWrap.className='protocol-webgl';canvasWrap.append(renderer.domElement);
  canvasWrap.insertAdjacentHTML('beforeend','<div class="scene-observation"><span>CAMERA VIEW</span></div>');
  root.replaceChildren();
  root.insertAdjacentHTML('beforeend','<div class="scene-heading"><span>M06 · CONDITION DEMONSTRATIONS</span><button class="scene-replay" aria-label="Replay selected parameter change">↻</button></div>');
  root.append(canvasWrap);
  // Keep the visual panel clear; the parameter readout belongs with its explanation.
  stage.querySelector('.protocol-copy').insertAdjacentHTML('beforeend','<div class="scene-info"><span class="scene-state"></span><span class="scene-annotation"></span></div>');
  const annotation=stage.querySelector('.scene-annotation');
  const pause=root.querySelector('button'),state=stage.querySelector('.scene-state');
  let visible=false,raf=0,last=0,width=1,height=1,condition=0,transition=1,motionTime=0,values={camera:0,light:0,space:0,physical:0};
  const labels=['Reference faucet task','Interaction-camera viewpoint','Illumination · geometry fixed','Passive handle joint','Robot base + initial handle state'];
  function setCondition(){condition=Number(stage.dataset.condition||0);transition=reduced?1:0;motionTime=0;canvasWrap.animate([{opacity:.2},{opacity:1}],{duration:reduced?0:450,easing:'ease-out'});state.textContent=labels[condition];canvasWrap.dataset.condition=condition;canvasWrap.querySelector('.scene-observation>span').textContent=condition===3?'HANDLE JOINT DETAIL':'CAMERA VIEW';canvasWrap.dataset.settled='false';pause.disabled=false;request();}
  /** @param {DOMHighResTimeStamp} now @returns {void} */
  function frame(now){
    raf=0;if(!visible||document.hidden)return;
    const delta=Math.min(.05,(now-last)/1000||0);last=now;
    if(!reduced)motionTime+=delta;
    if(motionTime>=5){motionTime%=5;canvasWrap.animate([{opacity:.15},{opacity:1}],{duration:400});}
    const t=reduced?0:motionTime;
    const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
    const sourceTime=condition===3?Math.min(t,actual.contactMotion.duration):condition===0?actual.motion.duration*smooth(t/3):condition===4?actual.motion.duration*smooth((t-2.5)/2):actual.motion.duration;
    const recordedHandle=actual.setMotion(reduced?0:sourceTime,condition===3?'contact':'approach');
    canvasWrap.dataset.motionTime=sourceTime.toFixed(4);canvasWrap.dataset.motionClip=condition===3?'contact':condition===0?'approach':condition===4?'spatial-approach':'fixed-pose';
    const progress=reduced?1:smooth(t/2.4);
    values={camera:condition===1?progress:0,light:condition===2?progress:0,space:condition===4?progress:0,physical:condition===3?progress:0};transition=progress;
    const e=PROTOCOL.spatial.example;
    const shift=actual.forward.clone().multiplyScalar(e.forwardM*values.space*3).addScaledVector(actual.side,e.sideM*values.space*3);
    robot.group.position.copy(basePosition).add(shift);
    robot.group.quaternion.copy(baseRotation).premultiply(new T.Quaternion().setFromAxisAngle(V(0,1,0),e.yawDeg*Math.PI/180*values.space));
    const handleAngle=condition===3?recordedHandle:e.initialOpenFraction*actual.manifest.joint.limits[0][1]*values.space;
    if(condition!==3)faucet.handle.quaternion.setFromAxisAngle(actual.jointAxis,handleAngle);canvasWrap.dataset.handleAngle=handleAngle.toFixed(5);
    targetRing.position.x=robot.group.position.x;targetRing.position.z=robot.group.position.z;
    const sample=cameraExample(nominalEye.toArray(),nominalTarget.toArray(),values.camera);
    cameraRig.position.fromArray(sample.eye);cameraRig.lookAt(new T.Vector3(...sample.target));cameraRig.rotateY(Math.PI);cameraRig.updateMatrixWorld(true);
    observation.fov=40+sample.fovDelta;observation.updateProjectionMatrix();
    // This frame's optical transform drives BOTH the inset and the drawn frustum.
    observation.position.copy(cameraRig.position);observation.quaternion.copy(cameraRig.quaternion);observation.updateMatrixWorld(true);
    const forward=observation.getWorldDirection(new T.Vector3()),depth=observation.position.distanceTo(new T.Vector3(...sample.target));
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{
      const ray=new T.Vector3(x,y,.5).unproject(observation).sub(observation.position).normalize();
      return ray.multiplyScalar(depth/ray.dot(forward)).add(observation.position);
    });
    const coordinates=[],faces=[];
    for(let i=0;i<4;i++){
      coordinates.push(...observation.position.toArray(),...corners[i].toArray(),...corners[i].toArray(),...corners[(i+1)%4].toArray());
      faces.push(...observation.position.toArray(),...corners[i].toArray(),...corners[(i+1)%4].toArray());
    }
    sightLines.geometry.attributes.position.array.set(coordinates);sightLines.geometry.attributes.position.needsUpdate=true;sightLines.geometry.computeBoundingSphere();

    nominalSight.visible=condition===1&&baselineCaptured;
    sightLines.visible=condition===1;frustum.visible=condition===1;cameraRig.visible=condition===1;sightLines.material.opacity=.5;frustum.material.opacity=.035;
    displacement.visible=condition===4&&shift.length()>.001;
    if(displacement.visible){displacement.position.copy(basePosition).add(V(0,.08,0));displacement.setDirection(shift.clone().normalize());displacement.setLength(shift.length(),.014,.008);}

    ghostRing.visible=condition===4;targetRing.visible=condition===4;
    frustum.geometry.attributes.position.array.set(faces);frustum.geometry.attributes.position.needsUpdate=true;frustum.geometry.computeBoundingSphere();
    ambient.intensity=2.7*(1-.25*values.light);warm.intensity=4*(1+.2*values.light);rim.intensity=2*(1+.2*values.light);
    for(const [color,base] of [[ambient.color,0xf4f5ef],[ambient.groundColor,0x777465],[warm.color,0xfff1d6],[rim.color,0xc9d9e5]]){color.set(base);color.r*=Math.exp(.04*values.light);color.b*=Math.exp(-.04*values.light);}
    renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.render(scene,camera);
    const w=Math.round(width*.28),h=Math.round(w*9/16),x=width-w-16,y=18;
    renderer.setScissorTest(true);renderer.setScissor(x,y,w,h);renderer.setViewport(x,y,w,h);cameraRig.visible=false;nominalSight.visible=false;frustum.visible=false;sightLines.visible=false;displacement.visible=false;
    if(condition===3){
      detailCamera.position.copy(target.position).add(V(-.8,.45,.8));detailCamera.lookAt(target.position);detailCamera.aspect=w/h;detailCamera.updateProjectionMatrix();
      renderer.render(scene,detailCamera);
    }else renderer.render(scene,observation);
    cameraRig.visible=condition===1;nominalSight.visible=condition===1&&baselineCaptured;frustum.visible=condition===1;sightLines.visible=condition===1;displacement.visible=condition===4&&shift.length()>.001;renderer.setScissorTest(false);
    const phys=PROTOCOL.physical,sampleFriction=T.MathUtils.lerp(phys.sweepStart.friction,phys.example.friction,values.physical),sampleDamping=T.MathUtils.lerp(phys.sweepStart.damping,phys.example.damping,values.physical);
    const readouts=['Rotate the handle toward its open position',`Viewpoint +${(3*values.camera).toFixed(1)}° · FOV +${(2*values.camera).toFixed(1)}°`,`Ambient ×${(1-.25*values.light).toFixed(2)} · Direct ×${(1+.2*values.light).toFixed(2)}`,`Contact replay · Handle ${(handleAngle*180/Math.PI).toFixed(1)}° · Nominal friction 0.15`,`Base +${(10*values.space).toFixed(0)} / ${(-10*values.space).toFixed(0)} mm · Yaw ${(values.space).toFixed(1)}° · Handle ${(15*values.space).toFixed(0)}%`];
    const contactForce=condition===3?actual.contactMotion.contact_force_max[Math.min(actual.contactMotion.frames.length-1,Math.round(sourceTime*actual.contactMotion.fps))]:0;
    annotation.textContent=condition===3?`${contactForce>.4?'Hand contact':'Approaching handle'} · Handle ${(handleAngle*180/Math.PI).toFixed(1)}° · Nominal dynamics`:readouts[condition];canvasWrap.dataset.contactForce=contactForce.toFixed(3);
    canvasWrap.dataset.task='faucet-handle';canvasWrap.dataset.robotShift=JSON.stringify(shift.toArray());canvasWrap.dataset.fixturePosition=JSON.stringify(faucet.group.position.toArray());canvasWrap.dataset.friction=(condition===3?.15:sampleFriction).toFixed(3);canvasWrap.dataset.damping=(condition===3?1.5:sampleDamping).toFixed(3);
    canvasWrap.dataset.cameraSupport='none';
    canvasWrap.dataset.cameraExample=values.camera.toFixed(4);canvasWrap.dataset.camera='d435-housing';canvasWrap.dataset.robot='recorded-panda-shadow';canvasWrap.dataset.activeJoints='31';canvasWrap.dataset.rendered='true';canvasWrap.dataset.frame=String(Number(canvasWrap.dataset.frame||0)+1);canvasWrap.dataset.settled=String(transition===1);canvasWrap.dataset.lightingAmbient=(1-.25*values.light).toFixed(3);
    if(transition<1||!reduced)raf=requestAnimationFrame(frame);
  }
  function request(){if(visible&&!document.hidden&&!raf){last=performance.now();raf=requestAnimationFrame(frame);}}
  function resize(){width=canvasWrap.clientWidth;height=canvasWrap.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.setViewOffset(width,height,width*.16,0,width,height);request();}
  pause.addEventListener('click',()=>{values={camera:0,light:0,space:0,physical:0};setCondition();});
  new ResizeObserver(resize).observe(canvasWrap);
  new MutationObserver(setCondition).observe(stage,{attributes:true,attributeFilter:['data-condition']});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request();else{cancelAnimationFrame(raf);raf=0;}},{threshold:.1}).observe(root);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else request();});
  motionPreference.addEventListener('change',event=>{reduced=event.matches;request();});
  renderer.domElement.addEventListener('webglcontextlost',()=>{cancelAnimationFrame(raf);raf=0;state.textContent='3D view paused — reload to restore';});
  resize();setCondition();
}
