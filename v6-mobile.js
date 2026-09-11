(()=>{"use strict";
const C=window.CF;if(!C)return;

const isTouchDevice=()=>('ontouchstart' in window)||(navigator.maxTouchPoints||0)>0||matchMedia('(pointer:coarse)').matches;
const controls=C.$('#touchControls');
if(controls){
  controls.style.touchAction='none';
  controls.style.webkitUserSelect='none';
  controls.style.userSelect='none';
  controls.addEventListener('contextmenu',e=>e.preventDefault());
}

const stop=e=>{if(e.cancelable)e.preventDefault();e.stopPropagation()};
const releaseAll=()=>{['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift'].forEach(k=>C.keys[k]=false)};
window.addEventListener('blur',releaseAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});

// Reliable hold-to-move controls on iOS/Android. Pointer capture prevents a tiny finger drift
// from immediately firing pointerleave and cancelling movement.
const moveMap={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
C.$$('[data-move]').forEach(btn=>{
  const key=moveMap[btn.dataset.move];
  const down=e=>{
    stop(e);C.keys[key]=true;
    if(e.pointerId!=null&&btn.setPointerCapture){try{btn.setPointerCapture(e.pointerId)}catch{}}
  };
  const up=e=>{stop(e);C.keys[key]=false};
  btn.onpointerdown=down;btn.onpointerup=up;btn.onpointercancel=up;btn.onpointerleave=null;
  btn.addEventListener('touchstart',down,{passive:false});
  btn.addEventListener('touchend',up,{passive:false});
  btn.addEventListener('touchcancel',up,{passive:false});
});

const sprint=C.$('#sprintBtn');
if(sprint){
  const down=e=>{stop(e);C.keys.Shift=true;if(e.pointerId!=null&&sprint.setPointerCapture){try{sprint.setPointerCapture(e.pointerId)}catch{}}};
  const up=e=>{stop(e);C.keys.Shift=false};
  sprint.onpointerdown=down;sprint.onpointerup=up;sprint.onpointercancel=up;sprint.onpointerleave=null;
  sprint.addEventListener('touchstart',down,{passive:false});
  sprint.addEventListener('touchend',up,{passive:false});
  sprint.addEventListener('touchcancel',up,{passive:false});
}

// Use one guarded activation path for receiver and skill buttons so mobile Safari does not
// lose the tap, while suppressing the synthetic click that can follow a touch event.
const bindTap=(btn,fn)=>{
  let last=0;
  const fire=e=>{
    const now=performance.now();
    if(now-last<220){stop(e);return}
    last=now;stop(e);fn();
  };
  btn.onpointerdown=fire;
  btn.addEventListener('touchstart',fire,{passive:false});
  btn.onclick=e=>{if(performance.now()-last<450){stop(e);return}fire(e)};
};
C.$$('[data-receiver]').forEach(btn=>bindTap(btn,()=>{
  const g=C.game;if(!g||g.phase!=='live'||g.selected?.type!=='pass')return;
  C.throwTo(Number(btn.dataset.receiver));
}));
C.$$('[data-v2-pass]').forEach(btn=>bindTap(btn,()=>{
  const g=C.game;if(!g||g.phase!=='live'||g.selected?.type!=='pass')return;
  C.throwTo(Number(btn.dataset.v2Pass));
}));
C.$$('[data-skill]').forEach(btn=>bindTap(btn,()=>C.doSkill(btn.dataset.skill)));

// Make mobile play selection and snapping explicit and touch-safe.
const snap=C.$('#snapBtn');if(snap)bindTap(snap,()=>C.snap());

// Prevent swipes on the controls from scrolling/zooming the page instead of controlling the player.
['#touchControls','#receiverPad','#runnerPad','.dpad','#sprintBtn'].forEach(sel=>{
  const el=C.$(sel);if(!el)return;
  el.style.touchAction='none';
  el.addEventListener('touchmove',e=>{if(e.cancelable)e.preventDefault()},{passive:false});
});

// On real touch devices, keep the touch controls visible whenever the game screen is active.
// The setting still controls them on non-touch devices.
const oldUpdateMenu=C.updateMenu;
C.updateMenu=()=>{
  oldUpdateMenu();
  if(isTouchDevice()&&controls)controls.style.display='flex';
};
if(isTouchDevice()&&controls)controls.style.display='flex';

// Slightly larger, safer targets on phones without changing desktop controls.
if(isTouchDevice()){
  const style=document.createElement('style');
  style.textContent=`
    @media (max-width:780px){
      #touchControls{position:relative;z-index:25;display:flex!important;gap:8px;padding:6px 4px calc(6px + env(safe-area-inset-bottom));align-items:stretch}
      #touchControls button{touch-action:none!important;-webkit-user-select:none!important;user-select:none!important;min-height:54px!important}
      .dpad button{min-width:54px!important}
      .receiverPad button{min-width:56px!important;font-size:15px!important}
      .runnerPad button{min-width:54px!important}
      .sprintBtn{min-width:76px!important}
      #field{touch-action:none!important}
    }
    @media (max-width:430px){
      #touchControls{gap:4px}
      #touchControls button{min-height:50px!important}
      .dpad button{min-width:48px!important}
      .receiverPad button{min-width:50px!important}
      .sprintBtn{min-width:66px!important;font-size:11px!important}
    }
  `;
  document.head.appendChild(style);
}
})();
