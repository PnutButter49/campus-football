(()=>{"use strict";
const C=window.CF;if(!C)return;

// Touchdowns are always exactly six points before any PAT / two-point try.
const previousTouchdown=C.touchdown;
C.touchdown=gain=>{
  const g=C.game;if(!g)return;
  const before=g.userScore;
  const wasTwoPoint=!!g.twoPoint;
  previousTouchdown(gain);
  if(!wasTwoPoint&&g.userScore!==before+6){
    g.userScore=before+6;
    const score=C.$('#userScore');if(score)score.textContent=g.userScore;
    const conversion=C.$('#conversionScore');if(conversion)conversion.textContent=`${g.userScore}–${g.cpuScore}`;
  }
};

// On plays where the RB releases into a route, use R for him instead of F.
C.displayPassKey=slot=>{
  const map=C.targetMap?.()||[2,3,4,5];
  return map[slot]===1?'R':C.PASS_KEYS[slot];
};
C.refreshPassLabels=()=>{
  const g=C.game;if(!g)return;
  C.$$('[data-receiver]').forEach((b,i)=>b.textContent=C.displayPassKey(i));
  C.$$('[data-v2-pass]').forEach((b,i)=>b.textContent=C.displayPassKey(i));
};

const previousSelectPlay=C.selectPlay;
C.selectPlay=i=>{previousSelectPlay(i);C.refreshPassLabels()};
const previousRenderPlaybook=C.renderPlaybook;
C.renderPlaybook=()=>{previousRenderPlaybook();C.refreshPassLabels()};
const previousSnap=C.snap;
C.snap=()=>{previousSnap();C.refreshPassLabels()};

// R throws to the RB when he is an eligible receiver. F no longer secretly throws to him.
document.addEventListener('keydown',e=>{
  const g=C.game;if(!g||!C.$('#game')?.classList.contains('active')||g.phase!=='live'||g.selected?.type!=='pass')return;
  const map=C.targetMap?.()||[];
  const rbSlot=map.indexOf(1);
  if(rbSlot<0)return;
  const low=e.key.toLowerCase();
  if(low==='r'){
    e.preventDefault();e.stopImmediatePropagation();C.throwTo(rbSlot);
  }else if(low==='f'&&rbSlot===3){
    e.preventDefault();e.stopImmediatePropagation();
  }
},true);

// Preserve the existing labels for the normal receivers; only the RB changes to R.
C.formationPreview=()=>{
  const g=C.game;if(g.players.length)return;
  const offense=[C.makePlayer(26.65,g.los-4,'QB'),C.makePlayer(26.65,g.los-8,'RB'),C.makePlayer(6,g.los,'WR',0),C.makePlayer(18,g.los,'WR',1),C.makePlayer(35,g.los,'WR',2),C.makePlayer(47,g.los,'TE',3)];
  offense.forEach(p=>{p.routeStartX=p.x;p.routeStartY=p.y});
  const map=C.targetMap?.()||[2,3,4,5];
  offense.forEach((p,i)=>{
    let label=p.role==='QB'?'Q':p.role==='RB'?'RB':p.role;
    const slot=map.indexOf(i);
    if(g.selected?.type==='pass'&&slot>=0)label=i===1?'R':C.PASS_KEYS[slot];
    C.drawPlayer(p,'#2d63c8',label,false);
  });
  if(!g.previewDefenders?.length)C.prepareDefensePreview?.();
  (g.previewDefenders||[]).forEach(d=>C.drawPlayer(d,g.opp.color,d.role==='BLITZ'?'B':d.role==='RUSH'?'R':d.role==='S'?'S':d.role==='MAN'?'M':d.role==='CB'?'C':'L',false));
};

C.draw=()=>{
  const g=C.game;if(!g)return;
  C.drawField();C.drawRoutes();if(g.phase==='presnap')C.formationPreview();
  const map=C.targetMap?.()||[2,3,4,5];
  g.players.forEach((p,i)=>{
    let label=p.role==='QB'?'Q':p.role==='RB'?'RB':p.role;
    const slot=map.indexOf(i);
    if(g.selected?.type==='pass'&&slot>=0)label=i===1?'R':C.PASS_KEYS[slot];
    C.drawPlayer(p,'#2d63c8',label,p.controlled);
  });
  g.defenders.forEach(d=>C.drawPlayer(d,g.opp.color,d.role==='BLITZ'?'B':d.role==='RUSH'?'R':d.role==='S'?'S':d.role==='MAN'?'M':d.role==='CB'?'C':'L',false));
  C.drawBall();
};

const bottom=C.$('.gameBottom span');
if(bottom)bottom.textContent='Arrows move • A/S/D/F throw • R throws to RB when he releases • Space snap • Shift sprint • E juke • Q spin/throw away • P pause';
})();