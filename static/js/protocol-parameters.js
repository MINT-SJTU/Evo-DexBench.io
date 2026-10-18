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

export const CONDITION_COPY=[
  {name:'Nominal',description:'Use the reference faucet task. Rotate its handle toward the open position; the goal and scoring remain fixed across conditions.',change:'Reference faucet configuration',keep:'Handle-opening goal and scoring',example:'Faucet handle task. Nominal target-joint friction is 0.15 and damping is 1.50. The sink, handle and robot visuals are exported together from the task scene using the recorded approach motion.'},
  {name:'Camera',description:'Apply bounded changes to the interaction-camera viewpoint, look-at target and field of view. The faucet and robot remain in place.',change:'Camera eye, target and FOV',keep:'Faucet, robot pose and scoring',example:'Shown: side +3°, elevation +2°, distance +4%, FOV +2°. Interaction limits: ±5°, ±4°, ±8%, target ±3 cm per axis, FOV ±5°.'},
  {name:'Lighting',description:'Resample ambient and direct-light intensity and a bounded color shift. The camera, faucet and robot stay fixed.',change:'Illumination intensity and color',keep:'Camera pose and task geometry',example:'Shown: ambient ×0.75, direct light ×1.20, color shift +0.04. Ranges: ×0.70–1.30, ×0.75–1.25 and −0.08–0.08.'},
  {name:'Physical',description:'Contact and rotate the passive faucet handle. Hand and handle motion come from the same replay; the inset shows their interaction.',change:'Handle joint friction and damping',keep:'Faucet placement and opening goal',example:'Replay dynamics: friction 0.15, damping 1.50. Evaluation ranges: friction 0.13–0.30, damping 1.41–1.55; stiffness remains zero. This contact demonstration is not a new evaluation result.'},
  {name:'Spatial',description:'Change the robot base pose and the handle’s initial opening. The sink stays fixed, matching the faucet task’s spatial definition.',change:'Robot base pose and initial handle state',keep:'Sink position, task goal and scoring',example:'Shown: robot forward +1 cm, side −1 cm, yaw +1°; handle initially 15% open. Ranges: forward/side ±2 cm, yaw ±2°, initial opening 0–20% of joint range.'}
];
