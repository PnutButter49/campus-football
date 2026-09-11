(()=>{"use strict";
const C=window.CF;if(!C)return;

// Keep the line of scrimmage at the end of the previous play.
const previousSetDeadball=C.setDeadball;
C.setDeadball=()=>{
  const g=C.game;
  if(g&&Number.isFinite(g.ballY)){
    g.los=C.clamp(g.ballY,1,100);
    g.playStartY=g.los;
  }
  previousSetDeadball();
};

// Slow the kicking meter slightly without changing normal gameplay speed.
const previousUpdate=C.update;
C.update=(dt,now)=>{
  const g=C.game;
  if(g?.phase==='kick'&&g.kick){
    previousUpdate(dt*0.72,now);
  }else{
    previousUpdate(dt,now);
  }
};
})();
