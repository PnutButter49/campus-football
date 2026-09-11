(()=>{"use strict";
const C=window.CF;if(!C)return;
const touch=('ontouchstart'in window)||(navigator.maxTouchPoints||0)>0||matchMedia('(pointer:coarse)').matches;
if(!touch)return;

// Keep the joystick on top of the field in the bottom-left corner so the player can
// see the action while moving. Remove sprint on mobile to simplify the layout.
const sprint=C.$('#sprintBtn');
if(sprint)sprint.style.display='none';

const style=document.createElement('style');
style.textContent=`
@media (pointer:coarse){
  #touchControls{
    height:0!important;
    min-height:0!important;
    margin:0!important;
    padding:0!important;
    pointer-events:none!important;
    position:relative!important;
    z-index:45!important;
  }
  #touchControls .dpad{
    position:fixed!important;
    left:calc(12px + env(safe-area-inset-left))!important;
    bottom:calc(12px + env(safe-area-inset-bottom))!important;
    width:118px!important;
    height:118px!important;
    margin:0!important;
    z-index:60!important;
    pointer-events:auto!important;
    opacity:.92;
  }
  #sprintBtn{display:none!important}
  #runnerPad{
    position:fixed!important;
    right:calc(12px + env(safe-area-inset-right))!important;
    bottom:calc(16px + env(safe-area-inset-bottom))!important;
    margin:0!important;
    z-index:60!important;
    pointer-events:auto!important;
  }
  #runnerPad.hidden{display:none!important}
  .mobilePassHint{display:none!important}
}
@media (pointer:coarse) and (max-width:430px){
  #touchControls .dpad{width:104px!important;height:104px!important;left:calc(8px + env(safe-area-inset-left))!important;bottom:calc(8px + env(safe-area-inset-bottom))!important}
  #runnerPad{right:calc(8px + env(safe-area-inset-right))!important;bottom:calc(10px + env(safe-area-inset-bottom))!important}
}
`;
document.head.appendChild(style);

// Update the mobile help copy to match the simplified controls.
const how=C.$$('#how .howGrid article');
if(how[4])how[4].innerHTML='<h3>📱 MOBILE</h3><p>Use the <b>joystick in the bottom-left corner</b> to move while keeping the field visible. On passing plays, <b>tap the receiver directly on the field</b> to throw. After the catch, use the runner skill buttons.</p>';
})();
