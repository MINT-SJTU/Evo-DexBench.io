import * as T from './assets/vendor/three.module.js';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';

/** @typedef {{xyz:number[],rpy:number[]}} Origin */
/** URDF fixed-axis RPY: Rz(yaw) Ry(pitch) Rx(roll).
 * @param {T.Object3D} object @param {Origin} pose @returns {void} */
function applyOrigin(object,pose){
  object.position.fromArray(pose.xyz);
  object.quaternion.setFromEuler(new T.Euler(...pose.rpy,'ZYX'));
}

/** Load unchanged repository visual meshes and assemble the actual URDF tree.
 * @returns {Promise<{group:T.Group,links:Map<string,T.Group>,rest:Record<string,number>,setPose:(pose:Record<string,number>)=>void,manifest:object}>} */
export async function loadPandaShadow(){
  const response=await fetch('assets/robot/panda-shadow/manifest.json',{cache:'no-cache'});
  if(!response.ok)throw new Error('Robot description unavailable');
  const manifest=await response.json(),loader=new GLTFLoader();
  const paths=[...new Set(manifest.links.flatMap(link=>link.visuals.filter(v=>v.file).map(v=>v.file)))];
  const assets=new Map(await Promise.all(paths.map(async path=>{
    const hash=manifest.assets[path.split('/').pop()].sha256.slice(0,12);
    return[path,(await loader.loadAsync(`${path}?sha=${hash}`)).scene];
  })));
  const links=new Map(),motions=new Map();
  for(const link of manifest.links){
    const frame=new T.Group();frame.name=link.name;links.set(link.name,frame);
    for(const visual of link.visuals){
      const origin=new T.Group();applyOrigin(origin,visual.origin);frame.add(origin);
      let model;
      if(visual.type==='mesh'){
        model=assets.get(visual.file).clone(true);model.scale.multiply(new T.Vector3(...visual.scale));
      }else{
        const geometry=visual.type==='box'?new T.BoxGeometry(...visual.size):visual.type==='sphere'?new T.SphereGeometry(visual.radius,20,12):new T.CylinderGeometry(visual.radius,visual.radius,visual.length,32);
        model=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x777777,roughness:.6}));
        // URDF cylinders are Z-aligned; Three.js cylinders are Y-aligned.
        if(visual.type==='cylinder')model.rotation.x=Math.PI/2;
      }
      model.traverse(node=>{
        if(!node.isMesh)return;
        node.castShadow=true;node.receiveShadow=true;
        if(visual.color){
          const [r,g,b,a]=visual.color;
          node.material=new T.MeshStandardMaterial({color:new T.Color(r,g,b),opacity:a,transparent:a<1,roughness:.62,metalness:.08});
        }
      });
      origin.add(model);
    }
  }
  for(const joint of manifest.joints){
    const origin=new T.Group();origin.name=joint.name;applyOrigin(origin,joint.origin);
    const motion=new T.Group();origin.add(motion);motion.add(links.get(joint.child));links.get(joint.parent).add(origin);
    if(joint.type!=='fixed')motions.set(joint.name,{motion,axis:new T.Vector3(...joint.axis).normalize(),limit:joint.limit});
  }
  const group=new T.Group();group.name=manifest.name;group.add(links.get(manifest.root));
  /** @param {Record<string,number>} pose @returns {void} */
  function setPose(pose){
    for(const [name,{motion,axis,limit}] of motions){
      const value=pose[name]??manifest.rest[name]??0;
      if(!Number.isFinite(value))throw new Error(`Invalid joint value: ${name}`);
      motion.quaternion.setFromAxisAngle(axis,T.MathUtils.clamp(value,limit.lower,limit.upper));
    }
    group.updateMatrixWorld(true);
  }
  setPose(manifest.rest);
  return{group,links,rest:manifest.rest,setPose,manifest};
}
