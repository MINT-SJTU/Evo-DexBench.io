/** Values transcribed from generalization/camera.py, generalization/specs.py,
 * and tasks/knob_like/m06.py. Physical/spatial examples describe the faucet task.
 * The project-page/media identifier for Faucet Handle is m06. */
export const PROTOCOL={
  sceneScale:3,
  camera:{kind:'interaction_camera',limits:{sideDeg:5,heightDeg:4,distanceFraction:.08,targetShiftM:.03,fovDeg:5},example:{sideDeg:3,heightDeg:2,distanceFraction:.04,targetShiftM:[.01,-.005,.005],fovDeg:2}},
  lighting:{limits:{ambient:[.70,1.30],direct:[.75,1.25],colorShift:[-.08,.08]},example:{ambient:.75,direct:1.20,colorShift:.04}},
  spatial:{task:'Faucet handle',limits:{forwardM:[-.02,.02],sideM:[-.02,.02],yawDeg:[-2,2],initialOpenFraction:[0,.2]},example:{forwardM:.01,sideM:-.01,yawDeg:1,initialOpenFraction:.15}},
  physical:{task:'Faucet handle',sweepStart:{friction:.13,damping:1.41},limits:{friction:[.13,.30],damping:[1.41,1.55]},example:{friction:.25,damping:1.52}}

};

/** Same spherical eye/target construction as camera_view_values; arrays use
 * the viewer's Y-up coordinates. Native site frame is Z-up and metres.
 * @param {number[]} eye @param {number[]} target @param {number} amount
 * @returns {{eye:number[],target:number[],fovDelta:number}} */
export function cameraExample(eye,target,amount){
  const s=PROTOCOL.sceneScale,e=PROTOCOL.camera.example,rad=Math.PI/180;
  const dx=(eye[0]-target[0])/s,dy=-(eye[2]-target[2])/s,dz=(eye[1]-target[1])/s;
  const distance=Math.hypot(dx,dy,dz),side=Math.atan2(dy,dx)+amount*e.sideDeg*rad,height=Math.asin(dz/distance)+amount*e.heightDeg*rad;
  const nextDistance=distance*(1+amount*e.distanceFraction),horizontal=nextDistance*Math.cos(height);
  const shifted=[target[0]+e.targetShiftM[0]*amount*s,target[1]+e.targetShiftM[2]*amount*s,target[2]-e.targetShiftM[1]*amount*s];
  return{target:shifted,eye:[shifted[0]+horizontal*Math.cos(side)*s,shifted[1]+nextDistance*Math.sin(height)*s,shifted[2]-horizontal*Math.sin(side)*s],fovDelta:amount*e.fovDeg};
}

/** Short copy for the condition pills: a bold lead and one line of bounds. */
export const CONDITION_COPY=[
  {name:'Nominal',lead:'The reference setup.',detail:'Rotate the faucet handle open. Goal and scoring never change.'},
  {name:'Camera',lead:'The viewpoint shifts.',detail:'Side ±5°, elevation ±4°, distance ±8%, field of view ±5°.'},
  {name:'Lighting',lead:'The light changes.',detail:'Ambient ×0.70–1.30, direct ×0.75–1.25, with a slight colour shift.'},
  {name:'Physical',lead:'The handle feels different.',detail:'Joint friction 0.13–0.30 and damping 1.41–1.55.'},
  {name:'Spatial',lead:'The layout moves.',detail:'Robot base ±2 cm and ±2° yaw; the handle starts up to 20% open.'}
];
