(()=>{"use strict";
const C=window.CF;if(!C)return;
const touch=('ontouchstart'in window)||(navigator.maxTouchPoints||0)>0||matchMedia('(pointer:coarse)').matches;
if(!touch)return;

const controls=C.$('#touchControls'),dpad=C.$('.dpad'),receiverPad=C.$('#receiverPad');
if(receiverPad)receiverPad.style.display='none';
C.$$('.passHotfix').forEach(el=>{if(el.id==='passHotfix')el.style.display='none'});

// Analog joystick for movement.
C.mobileStick={x:0,y:0,active:false};
if(dpad){
  dpad.innerHTML='<div class="mobileJoy" id="mobileJoy"><div class="mobileJoyKnob" id="mobileJoyKnob"></div></div>';
  const joy=C.$('#mobileJoy'),knob=C.$('#mobileJoyKnob');
  let pid=null;
  const reset=()=>{C.mobileStick.x=0;C.mobileStick.y=0;C.mobileStick.active=false;pid=null;if(knob)knob.style.transform='translate(-50%,-50%)'};
  const move=e=>{
    if(pid!=null&&e.pointerId!==pid)return;
    if(e.cancelable)e.preventDefault();
    const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,rad=r.width*.34;
    let dx=e.clientX-cx,dy=e.clientY-cy,d=Math.hypot(dx,dy);
    if(d>rad){dx=dx/d*rad;dy=dy/d*rad;d=rad}
    C.mobileStick.x=dx/rad;C.mobileStick.y=-dy/rad;C.mobileStick.active=d>rad*.12;
    knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  };
  joy.onpointerdown=e=>{pid=e.pointerId;try{joy.setPointerCapture(pid)}catch{};move(e)};
  joy.onpointermove=e=>{if(pid!=null)move(e)};
  joy.onpointerup=joy.onpointercancel=reset;
  window.addEventListener('blur',reset);
}

const oldMove=C.handleMovement;
C.handleMovement=dt=>{
  const g=C.game,s=C.mobileStick;
  if(!touch||!g||g.phase!=='live'||!g.carrier?.hasBall||!s?.active)return oldMove(dt);
  const p=g.carrier,mag=Math.min(1,Math.hypot(s.x,s.y));
  if(mag<.08)return;
  const nx=s.x/mag,ny=s.y/mag,base=p.role==='QB'?6.4:7.5,sp=base*(C.keys.Shift?1.23:1)*mag*dt;
  p.x=C.clamp(p.x+nx*sp,.5,52.8);p.y=C.clamp(p.y+ny*sp,-2,104);
  if(p.role==='QB'&&p.y>g.los+.7)C.$('#passHotfix')?.classList.add('hidden');
};

// Tap an eligible receiver directly on the field to throw to them.
const canvas=C.canvas;
if(canvas){
  canvas.addEventListener('pointerdown',e=>{
    const g=C.game;if(!g||g.phase!=='live'||g.selected?.type!=='pass'||g.carrier?.role!=='QB'||!g.carrier.hasBall)return;
    const rect=canvas.getBoundingClientRect(),sx=C.W/rect.width,sy=C.H/rect.height,tx=(e.clientX-rect.left)*sx,ty=(e.clientY-rect.top)*sy;
    let best=-1,bestD=Infinity;
    for(let slot=0;slot<4;slot++){
      const p=C.targetPlayer?.(slot);if(!p)continue;
      const q=C.worldToScreen(p.x,p.y),d=Math.hypot(q.x-tx,q.y-ty);
      if(d<bestD){bestD=d;best=slot}
    }
    if(best>=0&&bestD<62){if(e.cancelable)e.preventDefault();e.stopPropagation();C.throwTo(best)}
  },{passive:false,capture:true});
}

if(controls){
  const hint=document.createElement('div');hint.className='mobilePassHint';hint.textContent='Tap a receiver on the field to pass';
  controls.parentNode.insertBefore(hint,controls);
}
const style=document.createElement('style');style.textContent=`
@media (pointer:coarse){
  .dpad{width:118px!important;height:118px!important;display:flex!important;align-items:center;justify-content:center}
  .mobileJoy{width:108px;height:108px;border-radius:50%;position:relative;background:#14223cdd;border:2px solid #51698f;box-shadow:inset 0 0 0 12px #0b1426aa;touch-action:none}
  .mobileJoy:after{content:'';position:absolute;left:50%;top:50%;width:46px;height:46px;border-radius:50%;transform:translate(-50%,-50%);border:1px solid #7890b8aa}
  .mobileJoyKnob{position:absolute;left:50%;top:50%;width:48px;height:48px;border-radius:50%;transform:translate(-50%,-50%);background:#c8ff4f;border:3px solid #ecffb9;box-shadow:0 4px 14px #0008;z-index:2;pointer-events:none}
  #receiverPad{display:none!important}
  #passHotfix{display:none!important}
  .mobilePassHint{max-width:1000px;margin:4px auto 0;text-align:center;font-size:12px;font-weight:900;color:#c8ff4f;letter-spacing:.03em}
  #touchControls{justify-content:space-between!important;align-items:center!important}
  #runnerPad{margin-left:auto}
}
@media (max-width:430px){.dpad{width:104px!important;height:104px!important}.mobileJoy{width:96px;height:96px}.mobilePassHint{font-size:11px}}
`;
document.head.appendChild(style);

const how=C.$$('#how .howGrid article');
if(how[4])how[4].innerHTML='<h3>📱 MOBILE</h3><p>Use the <b>joystick</b> to move. On passing plays, <b>tap the receiver directly on the field</b> to throw to them. Use SPRINT and the runner skill buttons after the catch.</p>';
})();