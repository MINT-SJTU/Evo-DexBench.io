import * as T from './assets/vendor/three.module.js';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';

/** Load actual task visuals in their recorded shared world coordinate system. */
export async function loadRecordedFaucet(){
  const manifest=await fetch('assets/scene/faucet/manifest.json').then(r=>r.json());
  const loader=new GLTFLoader();
  const [robotFile,fixtureFile]=await Promise.all(['robot','fixture'].map(name=>loader.loadAsync(`assets/scene/faucet/${name}.glb`)));
  const origin=new T.Vector3(...manifest.origin),scale=manifest.scale;
  const rotation=new T.Matrix4().makeRotationX(-Math.PI/2);
  const transform=new T.Matrix4().makeScale(scale,scale,scale).multiply(rotation).multiply(new T.Matrix4().makeTranslation(-origin.x,-origin.y,-origin.z));
  const point=value=>new T.Vector3(...value).applyMatrix4(transform);
  const base=point(manifest.robot_base),handlePoint=point(manifest.handle_pose.slice(0,3));
  function bake(source,pivot){
    source.updateMatrixWorld(true);const group=new T.Group();group.position.copy(pivot);
    source.traverse(node=>{if(!node.isMesh)return;
      const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld).applyMatrix4(transform).translate(-pivot.x,-pivot.y,-pivot.z);
      if(geometry.attributes.uv&&node.material.map){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));uv.needsUpdate=true;}
      const item=new T.Mesh(geometry,node.material);item.name=node.name;item.castShadow=true;item.receiveShadow=true;group.add(item);
    });return group;
  }
  const robot=bake(robotFile.scene,base),fixture=bake(fixtureFile.scene,handlePoint);
  const motion=await fetch('assets/scene/faucet/motion.json').then(r=>{if(!r.ok)throw new Error('Recorded motion unavailable');return r.json();});
  const contactMotion=await fetch('assets/scene/faucet/contact-motion.json').then(r=>{if(!r.ok)throw new Error('Contact motion unavailable');return r.json();});
  const animatedLinks=motion.links.map(name=>{
    const group=new T.Group();group.name=name;
    for(const mesh of [...robot.children])if(mesh.name.replace(/^robot_/,'').replace(/_\d+$/,'')===name){robot.remove(mesh);group.add(mesh);}
    robot.add(group);return group;
  });
  const qa=new T.Quaternion(),qb=new T.Quaternion(),offset=new T.Vector3();
  /** @param {number} seconds Source time. @param {'approach'|'contact'} clip */
  function setMotion(seconds,clip='approach'){
    const sequence=clip==='contact'?contactMotion:motion;
    const frame=T.MathUtils.clamp(seconds*sequence.fps,0,sequence.frames.length-1),i=Math.floor(frame),j=Math.min(i+1,sequence.frames.length-1),alpha=frame-i;
    animatedLinks.forEach((group,k)=>{
      const a=sequence.frames[i][k],b=sequence.frames[j][k];
      group.position.set(T.MathUtils.lerp(a[0],b[0],alpha),T.MathUtils.lerp(a[1],b[1],alpha),T.MathUtils.lerp(a[2],b[2],alpha));
      qa.fromArray(a,3);qb.fromArray(b,3);group.quaternion.copy(qa).slerp(qb,alpha);
    });
    fixtureMotion.forEach(({group,origin},k)=>{
      if(clip!=='contact'){group.position.copy(origin);group.quaternion.identity();return;}
      const a=sequence.fixture_frames[i][k],b=sequence.fixture_frames[j][k];
      qa.fromArray(a,3);qb.fromArray(b,3);group.quaternion.copy(qa).slerp(qb,alpha);
      offset.set(T.MathUtils.lerp(a[0],b[0],alpha),T.MathUtils.lerp(a[1],b[1],alpha),T.MathUtils.lerp(a[2],b[2],alpha));
      group.position.copy(origin).applyQuaternion(group.quaternion).add(offset);
    });
    return clip==='contact'?T.MathUtils.lerp(sequence.handle_angles[i],sequence.handle_angles[j],alpha):0;
  }
  const jointPivot=point(manifest.joint.pivot),jointRotation=new T.Quaternion(manifest.joint.rotation_wxyz[1],manifest.joint.rotation_wxyz[2],manifest.joint.rotation_wxyz[3],manifest.joint.rotation_wxyz[0]);
  const jointAxis=new T.Vector3(1,0,0).applyQuaternion(jointRotation).applyMatrix4(rotation).normalize();
  const handle=new T.Group();handle.position.copy(jointPivot).sub(handlePoint);fixture.add(handle);
  for(const mesh of [...fixture.children])if(mesh.isMesh&&mesh.name.includes('fixture_handle_')){fixture.remove(mesh);mesh.geometry.translate(-handle.position.x,-handle.position.y,-handle.position.z);handle.add(mesh);}
  const fixtureMotion=contactMotion.fixture_links.map(name=>{
    if(name==='handle')return {group:handle,origin:handle.position.clone()};
    const group=new T.Group();fixture.add(group);
    for(const mesh of [...fixture.children])if(mesh.isMesh&&mesh.name.startsWith(`fixture_${name}_`)){fixture.remove(mesh);group.add(mesh);}
    return {group,origin:new T.Vector3()};
  });
  setMotion(0);
  const rootQuaternion=new T.Quaternion(manifest.robot_quaternion_wxyz[1],manifest.robot_quaternion_wxyz[2],manifest.robot_quaternion_wxyz[3],manifest.robot_quaternion_wxyz[0]);
  const forward=new T.Vector3(1,0,0).applyQuaternion(rootQuaternion).applyMatrix4(rotation).normalize();
  const side=new T.Vector3(0,1,0).applyQuaternion(rootQuaternion).applyMatrix4(rotation).normalize();
  return {robot,fixture,handle,jointAxis,jointPivot,handlePoint,base,forward,side,manifest,motion,contactMotion,setMotion};
}
