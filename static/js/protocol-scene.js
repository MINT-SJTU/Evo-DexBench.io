import { loadRecordedFaucet } from './recorded-faucet.js?v=20261030-load1';
import { PROTOCOL, cameraExample } from './protocol-parameters.js?v=20261027-calm1';
import * as T from './vendor/three.module.js';
import { createCameraHousing } from './camera-model.js?v=20261014-publication1';

const ACCENT=0xb5523f,INK=0x1d1d1f,AMBER=0xd6803c;
/** @param {number} value @param {number} digits */
const signed=(value,digits)=>`${value<-1e-9?'−':'+'}${Math.abs(value).toFixed(digits)}`;

/** Readout rows per condition: [label, nominal, shown sample (null = live angle), min, max, format].
 * Every bound comes from PROTOCOL, so the bars always match the evaluation ranges in the copy.
 * @param {number} limitDeg Handle joint limit in degrees. */
function readoutSpecs(limitDeg){
  const c=PROTOCOL.camera,l=PROTOCOL.lighting,s=PROTOCOL.spatial,p=PROTOCOL.physical;
  const deg=v=>`${signed(v,1)}°`,cm=v=>`${signed(v,1)} cm`,times=v=>`×${v.toFixed(2)}`;
  return [
    {title:'Reference',note:'All axes nominal',chips:['Camera','Lighting','Physics','Layout']},
    {title:'Camera',note:'One bounded sample',rows:[
      ['Side',0,c.example.sideDeg,-c.limits.sideDeg,c.limits.sideDeg,deg],
      ['Elevation',0,c.example.heightDeg,-c.limits.heightDeg,c.limits.heightDeg,deg],
      ['Distance',0,c.example.distanceFraction*100,-c.limits.distanceFraction*100,c.limits.distanceFraction*100,v=>`${signed(v,1)}%`],
      ['Field of view',0,c.example.fovDeg,-c.limits.fovDeg,c.limits.fovDeg,deg]]},
    {title:'Lighting',note:'One bounded sample',rows:[
      ['Ambient',1,l.example.ambient,...l.limits.ambient,times],
      ['Direct',1,l.example.direct,...l.limits.direct,times],
      ['Colour shift',0,l.example.colorShift,...l.limits.colorShift,v=>signed(v,2)]]},
    {title:'Physical',note:'Replay · nominal dynamics',rows:[
      ['Friction',.15,.15,...p.limits.friction,v=>v.toFixed(2)],
      ['Damping',1.5,1.5,...p.limits.damping,v=>v.toFixed(2)],
      ['Handle angle',0,null,0,limitDeg,v=>`${v.toFixed(1)}°`]]},
    {title:'Spatial',note:'One bounded sample',rows:[
      ['Forward',0,s.example.forwardM*100,s.limits.forwardM[0]*100,s.limits.forwardM[1]*100,cm],
      ['Side',0,s.example.sideM*100,s.limits.sideM[0]*100,s.limits.sideM[1]*100,cm],
      ['Yaw',0,s.example.yawDeg,...s.limits.yawDeg,deg],
      ['Initial opening',0,s.example.initialOpenFraction*100,s.limits.initialOpenFraction[0]*100,s.limits.initialOpenFraction[1]*100,v=>`${v.toFixed(0)}%`]]}
  ];
}

/** Soft sun disc with rays, drawn once into a texture for the lighting gizmo. */
function sunTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const g=canvas.getContext('2d');
  const glow=g.createRadialGradient(64,64,8,64,64,64);glow.addColorStop(0,'rgba(255,214,150,.95)');glow.addColorStop(.38,'rgba(255,190,110,.32)');glow.addColorStop(1,'rgba(255,190,110,0)');
  g.fillStyle=glow;g.fillRect(0,0,128,128);g.strokeStyle='rgba(214,128,60,.9)';g.lineWidth=3;g.lineCap='round';
  for(let i=0;i<12;i++){const a=i*Math.PI/6;g.beginPath();g.moveTo(64+Math.cos(a)*22,64+Math.sin(a)*22);g.lineTo(64+Math.cos(a)*33,64+Math.sin(a)*33);g.stroke();}
  g.fillStyle='#fff7e8';g.beginPath();g.arc(64,64,13,0,Math.PI*2);g.fill();g.lineWidth=2.5;g.stroke();
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}

// Repository robot geometry and kinematics; environment changes are illustrative.
/** @param {HTMLElement} root @returns {Promise<void>} */
export async function mountProtocolScene(root){
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motionPreference.matches;
  const stage=root.closest('.protocol-stage');
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
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
  // Gizmo materials remember their full opacity so a whole group can fade with its condition.
  /** @param {T.ColorRepresentation} color @param {number} opacity */
  const overlay=(color,opacity)=>{const m=new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthWrite:false});m.userData.opacity=opacity;return m;};
  /** @param {T.ColorRepresentation} color @param {number} opacity @param {boolean} dashed */
  const lineMaterial=(color,opacity,dashed=false)=>{const m=dashed?new T.LineDashedMaterial({color,transparent:true,opacity,dashSize:.035,gapSize:.022}):new T.LineBasicMaterial({color,transparent:true,opacity});m.userData.opacity=opacity;return m;};
  /** @param {T.Object3D} group @param {number} amount */
  const fade=(group,amount)=>{group.visible=amount>.01;if(group.visible)group.traverse(o=>{const m=o.material;if(m&&m.userData.opacity!==undefined)m.opacity=m.userData.opacity*Math.min(1,amount);});};
  const ground=mesh(new T.PlaneGeometry(200,200),material(0xd5d7d4,.05,.78));ground.rotation.x=-Math.PI/2;ground.position.y=-.045;ground.receiveShadow=true;ground.castShadow=false;
  const [actual,housing]=await Promise.all([loadRecordedFaucet(),createCameraHousing()]);
  const robot={group:actual.robot};scene.add(robot.group);scene.add(actual.fixture);
  const faucet={group:actual.fixture,handle:actual.handle};
  const target=new T.Object3D();target.position.copy(actual.jointPivot);scene.add(target);
  const basePosition=actual.base.clone(),baseRotation=robot.group.quaternion.clone();
  const detailCamera=new T.PerspectiveCamera(34,16/9,.001,10);
  const pedestalHalf={x:.31,z:.28},pedestalY=basePosition.y/2-.04;
  const pedestal=box(pedestalHalf.x*2,basePosition.y,pedestalHalf.z*2,ivory);pedestal.position.set(basePosition.x,pedestalY,basePosition.z);
  const nominalEye=target.position.clone().add(V(1.0,1.25,1.3)),nominalTarget=target.position.clone();
  const {rig:cameraRig}=housing;cameraRig.scale.multiplyScalar(.6);scene.add(cameraRig);
  const coneGeometry=new T.BufferGeometry();coneGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(48),3));
  const sightLines=new T.LineSegments(coneGeometry,new T.LineBasicMaterial({color:0x7a948d,transparent:true,opacity:.42}));scene.add(sightLines);
  const nominalSight=sightLines.clone();nominalSight.geometry=coneGeometry.clone();nominalSight.material=new T.LineDashedMaterial({color:0xb58975,transparent:true,opacity:.55,dashSize:.045,gapSize:.025});nominalSight.visible=false;scene.add(nominalSight);
  const baselineCamera=new T.PerspectiveCamera(40,16/9,.1,30),baseline=cameraExample(nominalEye.toArray(),nominalTarget.toArray(),0);
  baselineCamera.position.fromArray(baseline.eye);baselineCamera.lookAt(new T.Vector3(...baseline.target));baselineCamera.updateMatrixWorld(true);
  const baselineForward=baselineCamera.getWorldDirection(new T.Vector3()),baselineDepth=baselineCamera.position.distanceTo(new T.Vector3(...baseline.target));
  const baselineCorners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{const ray=new T.Vector3(x,y,.5).unproject(baselineCamera).sub(baselineCamera.position).normalize();return ray.multiplyScalar(baselineDepth/ray.dot(baselineForward)).add(baselineCamera.position);});
  const baselineLines=[];for(let i=0;i<4;i++)baselineLines.push(...baselineCamera.position.toArray(),...baselineCorners[i].toArray(),...baselineCorners[i].toArray(),...baselineCorners[(i+1)%4].toArray());
  nominalSight.geometry.attributes.position.array.set(baselineLines);nominalSight.geometry.attributes.position.needsUpdate=true;nominalSight.computeLineDistances();nominalSight.geometry.computeBoundingSphere();
  const frustumGeometry=new T.BufferGeometry();frustumGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(36),3));
  const frustum=new T.Mesh(frustumGeometry,new T.MeshBasicMaterial({color:0x789c92,side:T.DoubleSide,transparent:true,opacity:.025,depthWrite:false}));scene.add(frustum);

  // ---------- Camera: the bounded patch of viewpoints the interaction camera may take ----------
  const limits=PROTOCOL.camera.limits,rad=Math.PI/180;
  const eyeOffset=nominalEye.clone().sub(nominalTarget),eyeDistance=eyeOffset.length();
  const yaw0=Math.atan2(-eyeOffset.z,eyeOffset.x),pitch0=Math.asin(eyeOffset.y/eyeDistance);
  /** Same spherical construction as cameraExample, without target shift. @param {number} sideDeg @param {number} heightDeg */
  const eyeAt=(sideDeg,heightDeg)=>{const pitch=pitch0+heightDeg*rad,yaw=yaw0+sideDeg*rad;return nominalTarget.clone().add(V(Math.cos(pitch)*Math.cos(yaw),Math.sin(pitch),-Math.cos(pitch)*Math.sin(yaw)).multiplyScalar(eyeDistance));};
  const cameraGizmo=new T.Group();scene.add(cameraGizmo);
  {
    const columns=12,rows=8,points=[],index=[],lines=[];
    for(let r=0;r<=rows;r++)for(let c=0;c<=columns;c++)points.push(...eyeAt(-limits.sideDeg+2*limits.sideDeg*c/columns,-limits.heightDeg+2*limits.heightDeg*r/rows).toArray());
    for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){const a=r*(columns+1)+c;index.push(a,a+1,a+columns+1,a+1,a+columns+2,a+columns+1);}
    const patch=new T.BufferGeometry();patch.setAttribute('position',new T.Float32BufferAttribute(points,3));patch.setIndex(index);
    cameraGizmo.add(new T.Mesh(patch,overlay(ACCENT,.09)));
    const at=(r,c)=>points.slice(3*(r*(columns+1)+c),3*(r*(columns+1)+c)+3);
    for(let r=0;r<=rows;r+=2)for(let c=0;c<columns;c++)lines.push(...at(r,c),...at(r,c+1));
    for(let c=0;c<=columns;c+=3)for(let r=0;r<rows;r++)lines.push(...at(r,c),...at(r+1,c));
    const grid=new T.BufferGeometry();grid.setAttribute('position',new T.Float32BufferAttribute(lines,3));
    cameraGizmo.add(new T.LineSegments(grid,lineMaterial(ACCENT,.42)));
  }
  const homeMarker=new T.Mesh(new T.SphereGeometry(.022,16,12),overlay(INK,.55));homeMarker.position.copy(nominalEye);cameraGizmo.add(homeMarker);
  const trail=new T.Line(new T.BufferGeometry().setFromPoints([nominalEye,nominalEye.clone()]),lineMaterial(ACCENT,.9,true));cameraGizmo.add(trail);

  // ---------- Lighting: a sun gizmo that brightens and warms with the sampled light ----------
  const lightGizmo=new T.Group();scene.add(lightGizmo);
  const sunMaterial=new T.SpriteMaterial({map:sunTexture(),transparent:true,depthWrite:false});sunMaterial.userData.opacity=1;
  const sun=new T.Sprite(sunMaterial);sun.position.copy(V(.35,1.05,.6).add(warm.position.clone().normalize().multiplyScalar(2.9)));lightGizmo.add(sun);
  const beam=new T.Line(new T.BufferGeometry().setFromPoints([sun.position,V(.05,1.0,1.05)]),lineMaterial(AMBER,.6,true));beam.computeLineDistances();lightGizmo.add(beam);

  // ---------- Physical and spatial: the handle glows while it is acted on ----------
  const jointLimit=actual.manifest.joint.limits[0][1],handleMaterials=[];let glow=0;
  faucet.handle.traverse(node=>{if(!node.isMesh||!node.material.emissive)return;node.material=node.material.clone();node.material.emissive.setHex(ACCENT);node.material.emissiveIntensity=0;handleMaterials.push(node.material);});

  // ---------- Spatial: footprint on the floor, its allowed envelope and a 1 cm grid for the inset ----------
  const floorY=-.036,spatialReach=PROTOCOL.spatial.limits.forwardM[1]*PROTOCOL.sceneScale;
  /** @param {number} hx @param {number} hz */
  const rectangle=(hx,hz)=>new T.BufferGeometry().setFromPoints([V(-hx,0,-hz),V(hx,0,-hz),V(hx,0,hz),V(-hx,0,hz)]);
  const layout=new T.Group();scene.add(layout);
  const envelope=new T.Mesh(new T.PlaneGeometry(2*(pedestalHalf.x+spatialReach),2*(pedestalHalf.z+spatialReach)),overlay(ACCENT,.12));envelope.rotation.x=-Math.PI/2;
  const envelopeEdge=new T.LineLoop(rectangle(pedestalHalf.x+spatialReach,pedestalHalf.z+spatialReach),lineMaterial(ACCENT,.5,true));envelopeEdge.computeLineDistances();
  const homeEdge=new T.LineLoop(rectangle(pedestalHalf.x,pedestalHalf.z),lineMaterial(INK,.7,true));homeEdge.computeLineDistances();
  for(const part of [envelope,envelopeEdge,homeEdge]){part.position.set(basePosition.x,floorY,basePosition.z);layout.add(part);}
  const footprint=new T.LineLoop(rectangle(pedestalHalf.x,pedestalHalf.z),lineMaterial(ACCENT,1));footprint.position.y=floorY+.002;layout.add(footprint);
  const floorGrid=new T.GridHelper(1.2,40,0xb4b4ba,0xc9c9ce);floorGrid.position.set(basePosition.x,floorY-.004,basePosition.z);floorGrid.layers.set(1);scene.add(floorGrid);
  const topY=pedestalY+basePosition.y/2+.004,homeTop=new T.LineLoop(rectangle(pedestalHalf.x,pedestalHalf.z),lineMaterial(INK,.85,true));
  homeTop.material.depthTest=false;homeTop.renderOrder=11;homeTop.position.set(basePosition.x,topY,basePosition.z);homeTop.computeLineDistances();homeTop.layers.set(1);scene.add(homeTop);
  const cornerLocal=V(-pedestalHalf.x,0,pedestalHalf.z),homeCorner=basePosition.clone().add(cornerLocal).setY(topY);
  const nudge=new T.ArrowHelper(V(1,0,0),homeCorner,.04,ACCENT,.014,.01);nudge.traverse(o=>{o.layers.set(1);o.renderOrder=12;if(o.material)o.material.depthTest=false;});scene.add(nudge);
  const zoom=.1,magnifier=new T.OrthographicCamera(-zoom*16/9,zoom*16/9,zoom,-zoom,.001,2);
  magnifier.position.set(homeCorner.x+.025,topY+.02,homeCorner.z-.02);magnifier.up.set(0,0,-1);magnifier.lookAt(homeCorner.x+.025,0,homeCorner.z-.02);magnifier.layers.enable(1);

  // Each condition frames what it changes; the view glides there instead of cutting.
  const views=[
    {eye:V(-4.6,3.4,5.8),look:V(.35,1.02,0)},
    {eye:V(-3.1,3.5,5.7),look:V(.55,1.55,1.1)},
    {eye:V(-4.4,3.0,5.9),look:V(-.05,1.5,.5)},
    {eye:target.position.clone().add(V(-1.75,1.0,2.05)),look:target.position.clone().add(V(.25,.2,-.35))},
    {eye:V(-3.1,5.3,4.6),look:V(.25,.8,-.4)}
  ];
  const viewEye=views[0].eye.clone(),viewLook=views[0].look.clone();

  const canvasWrap=document.createElement('div');canvasWrap.className='protocol-webgl';canvasWrap.append(renderer.domElement);
  canvasWrap.insertAdjacentHTML('beforeend','<div class="scene-observation"><span>CAMERA VIEW</span></div><div class="scene-hud" aria-hidden="true"></div><button class="scene-replay" type="button" aria-label="Replay this condition" title="Replay">↻</button>');
  // Compile shaders in the background so the first frame does not freeze scrolling.
  await renderer.compileAsync(scene,camera).catch(()=>{});
  root.replaceChildren(canvasWrap);
  // Keep the visual panel clear; the parameter readout belongs with its explanation.
  stage.querySelector('.protocol-copy').insertAdjacentHTML('beforeend','<div class="scene-info"><span class="scene-state"></span><span class="scene-annotation"></span></div>');
  const annotation=stage.querySelector('.scene-annotation');
  const pause=canvasWrap.querySelector('.scene-replay'),state=stage.querySelector('.scene-state'),hud=canvasWrap.querySelector('.scene-hud');
  let visible=false,raf=0,last=0,width=1,height=1,condition=0,transition=1,motionTime=0,values={camera:0,light:0,space:0,physical:0};
  const shown={camera:0,light:0,space:0,physical:0,nominal:1};
  const labels=['Reference faucet task','Interaction-camera viewpoint','Illumination · geometry fixed','Passive handle joint','Robot base + initial handle state'];
  const insetLabels=['CAMERA VIEW','CAMERA VIEW','CAMERA VIEW','HANDLE JOINT DETAIL','BASE CORNER · 1 CM GRID'];
  const specs=readoutSpecs(jointLimit*180/Math.PI);
  /** @type {{bar:HTMLElement,out:HTMLOutputElement,spec:any[],text:string}[]} */
  let readouts=[];let hudNote=null;
  function buildHud(){
    const spec=specs[condition];
    hud.innerHTML=`<p class="hud-title"><i></i><span>${spec.title}</span><small>${spec.note}</small></p>`+(spec.chips
      ?`<ul class="hud-chips">${spec.chips.map(name=>`<li><span>${name}</span><b>Nominal</b></li>`).join('')}</ul>`
      :spec.rows.map(([label,nominal,,min,max])=>`<div class="hud-row"><span>${label}</span><span class="hud-bar" style="--n:${((nominal-min)/(max-min)).toFixed(4)}"><i class="hud-fill"></i><i class="hud-nominal"></i><b class="hud-dot"></b></span><output></output></div>`).join(''));
    hudNote=hud.querySelector('small');
    readouts=spec.rows?[...hud.querySelectorAll('.hud-row')].map((row,i)=>({bar:row.querySelector('.hud-bar'),out:row.querySelector('output'),spec:spec.rows[i],text:''})):[];
    hud.animate([{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'none'}],{duration:reduced?0:320,easing:'ease-out'});
  }
  /** @param {number} amount Sample progress from nominal. @param {number} angleDeg Live handle angle. @param {string|null} status */
  function updateHud(amount,angleDeg,status){
    for(const row of readouts){
      const [,nominal,sample,min,max,format]=row.spec,value=sample===null?angleDeg:nominal+(sample-nominal)*amount;
      const x=T.MathUtils.clamp((value-min)/(max-min),0,1),n=(nominal-min)/(max-min);
      row.bar.style.setProperty('--x',x.toFixed(4));row.bar.style.setProperty('--a',Math.min(x,n).toFixed(4));row.bar.style.setProperty('--w',Math.abs(x-n).toFixed(4));
      const text=format(value);if(text!==row.text){row.out.textContent=text;row.text=text;}
    }
    if(status&&hudNote&&hudNote.textContent!==status)hudNote.textContent=status;
  }
  function setCondition(){condition=Number(stage.dataset.condition||0);transition=reduced?1:0;motionTime=0;canvasWrap.animate([{opacity:.72},{opacity:1}],{duration:reduced?0:320,easing:'ease-out'});state.textContent=labels[condition];canvasWrap.dataset.condition=condition;canvasWrap.querySelector('.scene-observation>span').textContent=insetLabels[condition];canvasWrap.dataset.settled='false';pause.disabled=false;buildHud();request();}
  /** @param {DOMHighResTimeStamp} now @returns {void} */
  function frame(now){
    raf=0;if(!visible||document.hidden)return;
    const delta=Math.min(.05,(now-last)/1000||0);last=now;
    if(!reduced)motionTime+=delta;
    // Loop quietly: the sample eases back to nominal and is drawn again.
    if(motionTime>=5)motionTime%=5;
    const t=reduced?0:motionTime;
    const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
    const sourceTime=condition===3?Math.min(t,actual.contactMotion.duration):condition===0?actual.motion.duration*smooth(t/3):condition===4?actual.motion.duration*smooth((t-2.5)/2):actual.motion.duration;
    const recordedHandle=actual.setMotion(reduced?0:sourceTime,condition===3?'contact':'approach');
    const contactForce=condition===3?actual.contactMotion.contact_force_max[Math.min(actual.contactMotion.frames.length-1,Math.round(sourceTime*actual.contactMotion.fps))]:0;
    canvasWrap.dataset.motionTime=sourceTime.toFixed(4);canvasWrap.dataset.motionClip=condition===3?'contact':condition===0?'approach':condition===4?'spatial-approach':'fixed-pose';
    const progress=reduced?1:smooth(t/2.4);
    const goal={camera:condition===1?progress:0,light:condition===2?progress:0,space:condition===4?progress:0,physical:condition===3?1:0,nominal:condition===0?1:0};
    const ease=reduced?1:1-Math.exp(-delta*6);
    for(const key of Object.keys(goal))shown[key]+=(goal[key]-shown[key])*ease;
    values={camera:shown.camera,light:shown.light,space:shown.space,physical:shown.physical};transition=progress;
    const glide=reduced?1:1-Math.exp(-delta*2.8);
    viewEye.lerp(views[condition].eye,glide);viewLook.lerp(views[condition].look,glide);camera.position.copy(viewEye);camera.lookAt(viewLook);
    const e=PROTOCOL.spatial.example;
    const shift=actual.forward.clone().multiplyScalar(e.forwardM*values.space*3).addScaledVector(actual.side,e.sideM*values.space*3);
    const yaw=e.yawDeg*rad*values.space;
    robot.group.position.copy(basePosition).add(shift);
    robot.group.quaternion.copy(baseRotation).premultiply(new T.Quaternion().setFromAxisAngle(V(0,1,0),yaw));
    pedestal.position.set(basePosition.x+shift.x,pedestalY,basePosition.z+shift.z);pedestal.rotation.y=yaw;
    footprint.position.x=pedestal.position.x;footprint.position.z=pedestal.position.z;footprint.rotation.y=yaw;
    const corner=cornerLocal.clone().applyAxisAngle(V(0,1,0),yaw).add(pedestal.position).setY(homeCorner.y),move=corner.clone().sub(homeCorner);
    nudge.visible=condition===4&&move.length()>.002;if(nudge.visible){nudge.setDirection(move.clone().normalize());nudge.setLength(move.length(),Math.min(.014,move.length()*.5),.01);}
    const handleAngle=condition===3?recordedHandle:e.initialOpenFraction*jointLimit*values.space;
    if(condition!==3)faucet.handle.quaternion.setFromAxisAngle(actual.jointAxis,handleAngle);canvasWrap.dataset.handleAngle=handleAngle.toFixed(5);
    glow+=((condition===3?(contactForce>.4?.85:.2):.45*shown.space)-glow)*ease;handleMaterials.forEach(m=>{m.emissiveIntensity=glow;});
    fade(layout,shown.space);fade(lightGizmo,shown.light);fade(cameraGizmo,shown.camera);
    const sample=cameraExample(nominalEye.toArray(),nominalTarget.toArray(),values.camera);
    cameraRig.position.fromArray(sample.eye);cameraRig.lookAt(new T.Vector3(...sample.target));cameraRig.rotateY(Math.PI);cameraRig.updateMatrixWorld(true);
    trail.geometry.attributes.position.setXYZ(1,...sample.eye);trail.geometry.attributes.position.needsUpdate=true;trail.computeLineDistances();
    observation.fov=40+sample.fovDelta;observation.updateProjectionMatrix();
    // This frame's optical transform drives BOTH the inset and the drawn frustum.
    observation.position.copy(cameraRig.position);observation.quaternion.copy(cameraRig.quaternion);observation.updateMatrixWorld(true);
    const forward=observation.getWorldDirection(new T.Vector3()),depthToTarget=observation.position.distanceTo(new T.Vector3(...sample.target));
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>{
      const ray=new T.Vector3(x,y,.5).unproject(observation).sub(observation.position).normalize();
      return ray.multiplyScalar(depthToTarget/ray.dot(forward)).add(observation.position);
    });
    const coordinates=[],faces=[];
    for(let i=0;i<4;i++){
      coordinates.push(...observation.position.toArray(),...corners[i].toArray(),...corners[i].toArray(),...corners[(i+1)%4].toArray());
      faces.push(...observation.position.toArray(),...corners[i].toArray(),...corners[(i+1)%4].toArray());
    }
    sightLines.geometry.attributes.position.array.set(coordinates);sightLines.geometry.attributes.position.needsUpdate=true;sightLines.geometry.computeBoundingSphere();
    const showCamera=shown.camera>.02;
    nominalSight.visible=showCamera;sightLines.visible=showCamera;frustum.visible=showCamera;cameraRig.visible=showCamera;
    sightLines.material.opacity=.5*Math.min(1,shown.camera);nominalSight.material.opacity=.55*Math.min(1,shown.camera);frustum.material.opacity=.035*Math.min(1,shown.camera);
    frustum.geometry.attributes.position.array.set(faces);frustum.geometry.attributes.position.needsUpdate=true;frustum.geometry.computeBoundingSphere();
    ambient.intensity=2.7*(1-.25*values.light);warm.intensity=4*(1+.2*values.light);rim.intensity=2*(1+.2*values.light);
    for(const [color,base] of [[ambient.color,0xf4f5ef],[ambient.groundColor,0x777465],[warm.color,0xfff1d6],[rim.color,0xc9d9e5]]){color.set(base);color.r*=Math.exp(.04*values.light);color.b*=Math.exp(-.04*values.light);}
    const warmth=PROTOCOL.lighting.example.colorShift*values.light;
    sun.scale.setScalar(.6*(1+(PROTOCOL.lighting.example.direct-1)*1.5*values.light));sunMaterial.color.setRGB(1,1-1.5*warmth,1-3*warmth);
    // One shadow pass per frame; the inset redraws it only when hiding the camera rig changes the casters.
    renderer.shadowMap.needsUpdate=true;renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.render(scene,camera);
    const w=Math.round(width*.28),h=Math.round(w*9/16),x=width-w-16,y=18;
    renderer.setScissorTest(true);renderer.setScissor(x,y,w,h);renderer.setViewport(x,y,w,h);
    const hidden=[cameraRig,nominalSight,frustum,sightLines,cameraGizmo,lightGizmo].map(o=>[o,o.visible]);renderer.shadowMap.needsUpdate=cameraRig.visible;hidden.forEach(([o])=>{o.visible=false;});
    if(condition===3){
      detailCamera.position.copy(target.position).add(V(-.8,.45,.8));detailCamera.lookAt(target.position);detailCamera.aspect=w/h;detailCamera.updateProjectionMatrix();
      renderer.render(scene,detailCamera);
    }else if(condition===4)renderer.render(scene,magnifier);
    else renderer.render(scene,observation);
    hidden.forEach(([o,was])=>{o.visible=was;});renderer.setScissorTest(false);
    const phys=PROTOCOL.physical,sampleFriction=T.MathUtils.lerp(phys.sweepStart.friction,phys.example.friction,values.physical),sampleDamping=T.MathUtils.lerp(phys.sweepStart.damping,phys.example.damping,values.physical);
    const readoutText=['Rotate the handle toward its open position',`Viewpoint +${(3*values.camera).toFixed(1)}° · FOV +${(2*values.camera).toFixed(1)}°`,`Ambient ×${(1-.25*values.light).toFixed(2)} · Direct ×${(1+.2*values.light).toFixed(2)}`,`Contact replay · Handle ${(handleAngle*180/Math.PI).toFixed(1)}° · Nominal friction 0.15`,`Base +${(10*values.space).toFixed(0)} / ${(-10*values.space).toFixed(0)} mm · Yaw ${(values.space).toFixed(1)}° · Handle ${(15*values.space).toFixed(0)}%`];
    const contactState=contactForce>.4?'Hand contact':'Approaching handle';
    annotation.textContent=condition===3?`${contactState} · Handle ${(handleAngle*180/Math.PI).toFixed(1)}° · Nominal dynamics`:readoutText[condition];canvasWrap.dataset.contactForce=contactForce.toFixed(3);
    updateHud([0,values.camera,values.light,1,values.space][condition],handleAngle*180/Math.PI,condition===3?contactState:null);
    canvasWrap.dataset.task='faucet-handle';canvasWrap.dataset.robotShift=JSON.stringify(shift.toArray());canvasWrap.dataset.fixturePosition=JSON.stringify(faucet.group.position.toArray());canvasWrap.dataset.friction=(condition===3?.15:sampleFriction).toFixed(3);canvasWrap.dataset.damping=(condition===3?1.5:sampleDamping).toFixed(3);
    canvasWrap.dataset.cameraSupport='none';
    canvasWrap.dataset.cameraExample=values.camera.toFixed(4);canvasWrap.dataset.camera='d435-housing';canvasWrap.dataset.robot='recorded-panda-shadow';canvasWrap.dataset.activeJoints='31';canvasWrap.dataset.rendered='true';canvasWrap.dataset.frame=String(Number(canvasWrap.dataset.frame||0)+1);canvasWrap.dataset.settled=String(transition===1);canvasWrap.dataset.lightingAmbient=(1-.25*values.light).toFixed(3);
    if(transition<1||!reduced)raf=requestAnimationFrame(frame);
  }
  function request(){if(visible&&!document.hidden&&!raf){last=performance.now();raf=requestAnimationFrame(frame);}}
  function resize(){width=canvasWrap.clientWidth;height=canvasWrap.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.setViewOffset(width,height,width*.16,0,width,height);request();}
  pause.addEventListener('click',setCondition);
  new ResizeObserver(resize).observe(canvasWrap);
  new MutationObserver(setCondition).observe(stage,{attributes:true,attributeFilter:['data-condition']});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request();else{cancelAnimationFrame(raf);raf=0;}},{threshold:.1}).observe(root);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else request();});
  motionPreference.addEventListener('change',event=>{reduced=event.matches;request();});
  renderer.domElement.addEventListener('webglcontextlost',()=>{cancelAnimationFrame(raf);raf=0;state.textContent='3D view paused — reload to restore';});
  resize();setCondition();
}
