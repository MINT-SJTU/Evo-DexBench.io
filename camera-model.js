import * as T from './assets/vendor/three.module.js';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';

/** Detailed RGB-D housing for the virtual observation camera, looking along -Z.
 * The optical origin, model and mount all share this coordinate frame.
 * @returns {Promise<{rig:T.Group,mount:T.Object3D}>} */
export async function createCameraHousing(){
  const rig=new T.Group();rig.name='RGB-D camera housing';rig.scale.setScalar(1.25);
  const source=(await new GLTFLoader().loadAsync('assets/camera/d435.glb')).scene;
  const metal=new T.MeshStandardMaterial({color:0xaab4b4,metalness:.18,roughness:.42});
  const black=new T.MeshStandardMaterial({color:0x1c2425,metalness:.3,roughness:.33});
  const glass=new T.MeshPhysicalMaterial({color:0x28424a,metalness:.48,roughness:.15,clearcoat:1});
  source.traverse(node=>{if(node.isMesh){node.geometry.computeVertexNormals();node.material=metal;node.castShadow=true;node.receiveShadow=true;}});
  // Source CAD is 90mm wide, with the optical face toward its +Z direction.
  // The display is enlarged uniformly; Three's camera looks toward -Z.
  const shell=new T.Group();shell.add(source);source.scale.setScalar(6);source.rotation.y=Math.PI;
  shell.position.set(.195,0,.021);rig.add(shell);
  /** @param {number} width @param {number} height @param {number} depth @param {T.Material} mat @returns {T.Mesh} */
  function block(width,height,depth,mat){const m=new T.Mesh(new T.BoxGeometry(width,height,depth),mat);m.castShadow=true;shell.add(m);return m;}
  const outline=new T.Shape(),w=.446,h=.092,r=.018;
  outline.moveTo(-w/2+r,-h/2);outline.lineTo(w/2-r,-h/2);outline.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);outline.lineTo(w/2,h/2-r);outline.quadraticCurveTo(w/2,h/2,w/2-r,h/2);outline.lineTo(-w/2+r,h/2);outline.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);outline.lineTo(-w/2,-h/2+r);outline.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const face=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:.008,bevelEnabled:false,curveSegments:6}),black);face.position.z=-.016;shell.add(face);
  // Stereo apertures + central projector + RGB aperture. Cosmetic materials
  // clarify the CAD at page scale; these are not benchmark sensor channels.
  for(const [x,r] of [[-.195,.022],[-.1035,.020],[.1965,.020]]){
    const bezel=new T.Mesh(new T.TorusGeometry(r+.007,.004,8,40),metal);bezel.position.set(x,0,-.020);shell.add(bezel);
    const lens=new T.Mesh(new T.CircleGeometry(r,40),glass);lens.rotation.y=Math.PI;lens.position.set(x,0,-.021);shell.add(lens);
    const highlight=new T.Mesh(new T.CircleGeometry(r*.24,16),new T.MeshBasicMaterial({color:0x98b9c2,transparent:true,opacity:.6}));highlight.rotation.y=Math.PI;highlight.position.set(x-r*.27,r*.29,-.022);shell.add(highlight);
  }
  const projector=block(.057,.016,.004,glass);projector.position.set(-.016,-.014,-.019);
  const indicator=new T.Mesh(new T.SphereGeometry(.005,10,6),new T.MeshBasicMaterial({color:0x91b29b}));indicator.position.set(.07,.026,-.019);shell.add(indicator);
  // U bracket and pan/tilt pivot keep the camera from floating in the scene.
  for(const x of [-.245,.245]){const arm=block(.018,.14,.06,black);arm.position.set(x,-.064,.07);}
  const bridge=block(.51,.018,.065,black);bridge.position.set(0,-.132,.07);
  for(const x of [-.257,.257]){const screw=new T.Mesh(new T.CylinderGeometry(.014,.014,.007,20),metal);screw.rotation.z=Math.PI/2;screw.position.set(x,-.025,.07);shell.add(screw);}
  const mount=new T.Object3D();mount.position.set(.195,-.168,.091);rig.add(mount);
  return {rig,mount};
}
