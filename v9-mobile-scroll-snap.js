(()=>{"use strict";
const C=window.CF;if(!C)return;
const touch=('ontouchstart'in window)||(navigator.maxTouchPoints||0)>0||matchMedia('(pointer:coarse)').matches;
if(!touch)return;

const style=document.createElement('style');
style.textContent=`
/* Let phone users scroll the page naturally in landscape. The field still accepts taps to pass. */
@media (pointer:coarse) and (orientation:landscape){
  html,body,#app,main,#game{
    overflow-y:auto!important;
    overscroll-behavior-y:auto!important;
    -webkit-overflow-scrolling:touch;
  }
  body,#app,main,#game,#fieldWrap,#field{
    touch-action:pan-y!important;
  }
  /* Keep the actual game controls from turning into page-scroll gestures. */
  #touchControls .dpad,#runnerPad,#touchControls button{
    touch-action:none!important;
  }
}

/* Put SNAP on the right side of the mobile play-call overlay, away from the joystick. */
@media (pointer:coarse){
  .playOverlay.play-selected{
    padding-right:92px!important;
  }
  .playOverlay.play-selected .snapBtn{
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    position:absolute!important;
    right:10px!important;
    left:auto!important;
    bottom:9px!important;
    float:none!important;
    margin:0!important;
    min-width:72px!important;
    min-height:40px!important;
    z-index:15!important;
  }
  .playOverlay.play-selected .hotfixSelectedBar{
    padding-right:4px!important;
  }
}
@media (pointer:coarse) and (max-width:430px){
  .playOverlay.play-selected{padding-right:82px!important}
  .playOverlay.play-selected .snapBtn{right:7px!important;bottom:7px!important;min-width:66px!important;min-height:38px!important}
}
`;
document.head.appendChild(style);
})();
