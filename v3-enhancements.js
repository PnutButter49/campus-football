(()=>{"use strict";
const C=window.CF;if(!C)return;

// ----- Playbook fixes / additions -----
const byId=id=>C.PLAYS.find(p=>p.id===id);
const slants=byId('slants');
if(slants){
  // True inward slants: outside receivers break toward the hashes instead of toward the sideline.
  slants.routes=[[10,15],[8,17],[-8,17],[-10,15]];
  slants.desc='Quick inside-breaking routes';
}
const screen=byId('screen');
if(screen){
  // F becomes the RB on the screen so the back is a real receiving option.
  screen.targetMap=[2,3,4,1];
  screen.routes=[[3,22],[2,24],[-3,26],[13,8]];
  screen.desc='RB flare screen • F = RB';
}
if(!byId('rbangle'))C.PLAYS.push({
  id:'rbangle',name:'RB ANGLE',type:'pass',targetMap:[2,3,5,1],
  routes:[[7,22],[-7,24],[-5,18],[9,15]],
  desc:'F = RB on an angle route'
});
if(!byId('rbwheel'))C.PLAYS.push({
  id:'rbwheel',name:'RB WHEEL',type:'pass',targetMap:[2,3,5,1],
  routes:[[0,34],[-4,28],[-8,22],[18,32]],
  desc:'F = RB up the sideline'
});

C.targetMap=()=>C.game?.selected?.targetMap||[2,3,4,5];
C.targetPlayerIndex=slot=>C.targetMap()[slot]??(2+slot);
C.targetPlayer=slot=>C.game?.players?.[C.targetPlayerIndex(slot)]||null;
C.playerSlot=playerIndex=>C.targetMap().indexOf(playerIndex);

// ----- Defensive structure -----
const originalCoverage=C.coverageFormation;
C.coverageFormation=name=>{
  const d=originalCoverage(name);
  // Add an occasional LB pressure while keeping the shell recognizable.
  const lbs=d.filter(x=>x.role==='LB');
  if(lbs.length&&Math.random()<0.34){
    const b=lbs[Math.floor(Math.random()*lbs.length)];
    b.role='BLITZ';b.blitz=true;b.zone=null;b.man=null;
    b.y=C.game.los+4;
  }
  return d;
};
C.cloneDefense=list=>list.map(d=>({...d,zone:d.zone?{...d.zone}:undefined}));
C.prepareDefensePreview=()=>{
  const g=C.game;if(!g)return;
  g.previewCoverage=C.pick(C.COVERAGES);
  g.previewDefenders=C.coverageFormation(g.previewCoverage);
  g.coverage=g.previewCoverage;
};

const originalRenderPlaybook=C.renderPlaybook;
C.renderPlaybook=()=>{
  originalRenderPlaybook();
  C.prepareDefensePreview();
};

C.formation=()=>{
  const g=C.game;
  g.players=[
    C.makePlayer(26.65,g.los-4,'QB'),
    C.makePlayer(26.65,g.los-8,'RB'),
    C.makePlayer(6,g.los,'WR',0),
    C.makePlayer(18,g.los,'WR',1),
    C.makePlayer(35,g.los,'WR',2),
    C.makePlayer(47,g.los,'TE',3)
  ];
  g.players.forEach(p=>{p.routeStartX=p.x;p.routeStartY=p.y;p.blocking=false});
  if(!g.previewDefenders?.length)C.prepareDefensePreview();
  g.coverage=g.previewCoverage||C.pick(C.COVERAGES);
  g.defenders=C.cloneDefense(g.previewDefenders?.length?g.previewDefenders:C.coverageFormation(g.coverage));
  g.carrier=g.players[0];g.carrier.hasBall=true;g.carrier.controlled=true;
  const badge=C.$('#coverageBadge');if(badge){badge.querySelector('b').textContent=g.coverage;badge.classList.remove('hidden')}
};

// ----- Route running and RB protection -----
C.routeGoal=slot=>{
  const g=C.game,p=g.selected,r=C.targetPlayer(slot);if(!g||!p||!r||!p.routes?.[slot])return null;
  const route=p.routes[slot],sx=r.routeStartX??r.x;
  let gx=C.clamp(sx+route[0],1.5,51.8),gy=C.clamp(g.los+route[1],g.los+2,104);
  if(p.id==='out'&&r.y>g.los+route[1]*.55)gx=sx<26.6?1.5:51.8;
  if(p.curl&&r.y>=gy-1){gx=r.x;gy=r.y}
  return{x:gx,y:gy};
};
C.updateRBProtection=(dt,now)=>{
  const g=C.game,rb=g.players?.[1],qb=g.players?.[0];if(!rb||!qb||g.selected?.type!=='pass')return;
  const rbIsRoute=C.targetMap().includes(1);
  if(rbIsRoute){rb.blocking=false;return}
  const threats=g.defenders.filter(d=>d.role==='RUSH'||d.role==='BLITZ');
  if(!threats.length)return;
  const blitzers=threats.filter(d=>d.role==='BLITZ');
  const pool=blitzers.length?blitzers:threats;
  let threat=pool[0],best=Infinity;
  for(const d of pool){const dist=Math.hypot(d.x-qb.x,d.y-qb.y);if(dist<best){best=dist;threat=d}}
  const meetX=C.clamp(threat.x,17,36),meetY=C.clamp(threat.y-1.2,g.los-5,g.los-.2);
  const dist=Math.hypot(rb.x-threat.x,rb.y-threat.y);
  if(dist<2.05){
    rb.blocking=true;threat.blockedUntil=now+150;
    // Let the defender fight the block without instantly walking through the RB.
    threat.y=Math.min(threat.y,g.los-.15);
    C.moveToward(rb,threat.x,threat.y-.45,5.2*dt);
  }else{
    rb.blocking=false;C.moveToward(rb,meetX,meetY,7.3*dt);
  }
};
C.updateRoutes=dt=>{
  const g=C.game;if(g.phase!=='live'||g.selected?.type!=='pass')return;
  const moved=new Set();
  for(let slot=0;slot<4;slot++){
    const idx=C.targetPlayerIndex(slot),r=g.players[idx];if(!r||moved.has(idx)||r.controlled||r.hasBall)continue;
    moved.add(idx);const q=C.routeGoal(slot);if(q)C.moveToward(r,q.x,q.y,r.speed*dt);
  }
  C.updateRBProtection(dt,performance.now());
};
C.receiverTarget=slot=>{
  const g=C.game,r=C.targetPlayer(slot),q=C.routeGoal(slot);if(!r||!q||g.selected?.type!=='pass')return null;
  const dx=q.x-r.x,dy=q.y-r.y,d=Math.hypot(dx,dy)||1,lead=C.clamp(d*.13+3,3,8.5);
  return{x:C.clamp(r.x+dx/d*lead,1,52.3),y:C.clamp(r.y+dy/d*lead,g.los+1,104)};
};
C.throwTo=slot=>{
  const g=C.game;if(!g||g.phase!=='live'||g.selected?.type!=='pass'||g.carrier?.role!=='QB'||!g.carrier.hasBall)return;
  if(g.carrier.y>g.los+.5){C.callout('PAST THE LINE');return}
  const t=C.receiverTarget(slot),target=C.targetPlayer(slot),qb=g.carrier;if(!t||!target)return;
  const dist=Math.hypot(t.x-qb.x,t.y-qb.y),travel=C.clamp(.31+dist*.0135,.37,1.03);
  g.ball={x:qb.x,y:qb.y,z:1.8,startX:qb.x,startY:qb.y,targetX:t.x,targetY:t.y,t:0,dur:travel,receiver:slot,targetIndex:C.targetPlayerIndex(slot)};
  qb.hasBall=false;qb.controlled=false;g.attempts++;C.$('#passHotfix')?.classList.add('hidden');C.beep('snap');
};
C.resolvePass=()=>{
  const g=C.game,b=g.ball,r=g.players[b?.targetIndex??C.targetPlayerIndex(b?.receiver??0)];
  if(!b||!r){g.ball=null;return C.endPlay('incomplete',0)}
  let nd=99,nearest=null;for(const d of g.defenders){const q=Math.hypot(d.x-b.x,d.y-b.y);if(q<nd){nd=q;nearest=d}}
  const rd=Math.hypot(r.x-b.x,r.y-b.y),slot=b.receiver,tight=nd<2.65;
  const baseSkill=r.role==='RB'?.86:[.90,.94,.90,.92][slot]||.90;
  const chance=C.clamp(baseSkill*C.difficulty().catch-rd*.044-(tight?.17:0),.27,.97);
  if(nearest&&nd<1.22&&nd<rd*.9&&Math.random()<.64*C.difficulty().def){g.ball=null;C.callout('PICKED OFF!',950);C.beep('bad');C.shake();return C.endGame(false,'PICKED OFF','The coverage read that one.')}
  if(rd<6.7&&Math.random()<chance){
    g.ball=null;r.hasBall=true;r.controlled=true;g.carrier=r;g.completions++;g.consecutive++;
    const air=Math.max(0,r.y-g.playStartY);if(air>30){C.callout('BOMB!',600);g.driveScore+=450}else if(tight){C.callout('THREAD THE NEEDLE!',600);g.driveScore+=350}else{C.callout('DIME!',450);g.driveScore+=120}
    if(g.consecutive>=10)C.unlock('perfect');C.beep('catch');
  }else{g.ball=null;g.consecutive=0;C.callout('INCOMPLETE',550);C.endPlay('incomplete',0)}
};

// ----- Faster, assignment-aware coverage and pursuit -----
C.receiverThreatInZone=z=>{let best=null,score=1e9;for(let slot=0;slot<4;slot++){const r=C.targetPlayer(slot);if(!r)continue;if(r.x>=z.x1-2&&r.x<=z.x2+2&&r.y>=z.y1-3&&r.y<=z.y2+4){const s=Math.abs(r.x-z.ax)*.45+Math.abs(r.y-z.ay);if(s<score){score=s;best=r}}}return best};
C.updateDefense=(dt,now)=>{
  const g=C.game;if(g.phase!=='live')return;const mod=C.difficulty().def,carrier=g.carrier?.hasBall?g.carrier:null,qb=g.players[0];
  const afterCatch=carrier&&carrier.role!=='QB',qbRun=carrier&&carrier.role==='QB'&&carrier.y>g.los+.75,runPlay=g.selected?.type==='run';
  for(const d of g.defenders){
    if(d.stunned>now)continue;
    if(d.blockedUntil>now){
      // Engaged with the RB: keep fighting forward slowly.
      const t=carrier||qb;if(t)C.moveToward(d,t.x,t.y,1.55*mod*dt);continue;
    }
    let tx=d.x,ty=d.y,sp=6.15*mod*dt;
    if(d.role==='RUSH'||d.role==='BLITZ')sp=6.35*C.difficulty().rush*dt;
    if(afterCatch||qbRun||runPlay){
      tx=carrier.x;ty=carrier.y;
      // Strong pursuit boost once the ball is caught so DBs close instead of jogging behind the play.
      sp=(afterCatch?8.15:7.55)*mod*dt;
    }else if(d.role==='RUSH'||d.role==='BLITZ'){
      tx=qb.x;ty=qb.y;
    }else if(g.ball){
      const zone=d.zone&&g.ball.targetX>=d.zone.x1-3&&g.ball.targetX<=d.zone.x2+3&&g.ball.targetY>=d.zone.y1-4&&g.ball.targetY<=d.zone.y2+5;
      const man=d.man===g.ball.receiver;
      if(zone||man||Math.hypot(d.x-g.ball.x,d.y-g.ball.y)<18){tx=g.ball.targetX;ty=g.ball.targetY;sp=7.35*mod*dt}
      else if(d.man!=null){const r=C.targetPlayer(d.man);if(r){tx=r.x;ty=r.y+1.0}}
      else if(d.zone){tx=d.zone.ax;ty=d.zone.ay}
    }else if(d.man!=null){
      const r=C.targetPlayer(d.man);if(r){tx=C.clamp(r.x,1,52.3);ty=C.clamp(r.y+(r.y>g.los+12?1.0:1.8),g.los+3,104);sp=6.45*mod*dt}
    }else if(d.zone){
      const r=C.receiverThreatInZone(d.zone);if(r){tx=C.clamp(r.x,d.zone.x1,d.zone.x2);ty=C.clamp(r.y+1.0,d.zone.y1,d.zone.y2)}else{tx=d.zone.ax;ty=d.zone.ay}
    }
    C.moveToward(d,tx,ty,sp);
  }
  if(carrier){for(const d of g.defenders){if(Math.hypot(d.x-carrier.x,d.y-carrier.y)<1.4){if(now<g.jukeUntil||now<g.spinUntil){d.stunned=now+620;g.driveScore+=120;C.callout('ANKLES!',450);continue}if(now<g.diveUntil)continue;C.tackle(carrier);break}}}
};

// ----- Pre-snap visualization -----
C.formationPreview=()=>{
  const g=C.game;if(g.players.length)return;
  const offense=[C.makePlayer(26.65,g.los-4,'QB'),C.makePlayer(26.65,g.los-8,'RB'),C.makePlayer(6,g.los,'WR',0),C.makePlayer(18,g.los,'WR',1),C.makePlayer(35,g.los,'WR',2),C.makePlayer(47,g.los,'TE',3)];
  offense.forEach(p=>{p.routeStartX=p.x;p.routeStartY=p.y});
  const map=g.selected?.targetMap||[2,3,4,5];
  offense.forEach((p,i)=>{let label=p.role==='QB'?'Q':p.role==='RB'?'RB':p.role;const slot=map.indexOf(i);if(g.selected?.type==='pass'&&slot>=0)label=C.PASS_KEYS[slot];C.drawPlayer(p,'#2d63c8',label,false)});
  if(!g.previewDefenders?.length)C.prepareDefensePreview();
  (g.previewDefenders||[]).forEach(d=>C.drawPlayer(d,g.opp.color,d.role==='BLITZ'?'B':d.role==='RUSH'?'R':d.role==='S'?'S':d.role==='MAN'?'M':d.role==='CB'?'C':'L',false));
};

C.drawRoutes=()=>{
  const g=C.game;if(g.phase!=='presnap'||!g.selected||g.selected.type!=='pass')return;const ctx=C.ctx,map=g.selected.targetMap||[2,3,4,5];
  const positions={1:{x:26.65,y:g.los-8},2:{x:6,y:g.los},3:{x:18,y:g.los},4:{x:35,y:g.los},5:{x:47,y:g.los}};
  ctx.save();ctx.setLineDash([7,6]);ctx.lineWidth=3;ctx.strokeStyle='#c8ff4fcc';
  for(let slot=0;slot<4;slot++){
    const pi=map[slot],st=positions[pi],r=g.selected.routes[slot];if(!st||!r)continue;
    const a=C.worldToScreen(st.x,st.y),b=C.worldToScreen(C.clamp(st.x+r[0],1.5,51.8),g.los+r[1]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#c8ff4f';ctx.font='900 15px system-ui';ctx.fillText(C.PASS_KEYS[slot],a.x-5,a.y-17);
  }
  ctx.restore();
};

// ----- Character-style sprites instead of dots -----
C.drawPlayer=(p,color,label,isUser=false)=>{
  const q=C.worldToScreen(p.x,p.y),ctx=C.ctx;if(q.y<-75||q.y>730)return;
  const big=p.role==='TE'||p.role==='RB'||p.role==='RUSH'||p.role==='BLITZ',scale=big?1.08:1;
  const moving=C.game?.phase==='live',phase=(performance.now()/95+p.x*2+p.y)%6.28,leg=moving?Math.sin(phase)*4:0;
  ctx.save();ctx.translate(q.x,q.y);ctx.scale(scale,scale);
  ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(0,17,14,5,0,0,Math.PI*2);ctx.fill();
  // legs / pants
  ctx.strokeStyle='#e7ecf6';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-4,8);ctx.lineTo(-6-leg*.35,18);ctx.moveTo(4,8);ctx.lineTo(6+leg*.35,18);ctx.stroke();
  ctx.strokeStyle='#131b2b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-7-leg*.35,19);ctx.lineTo(-11-leg*.35,20);ctx.moveTo(7+leg*.35,19);ctx.lineTo(11+leg*.35,20);ctx.stroke();
  // torso / shoulder pads
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-12,-6);ctx.lineTo(-8,9);ctx.lineTo(8,9);ctx.lineTo(12,-6);ctx.quadraticCurveTo(0,-12,-12,-6);ctx.fill();
  ctx.fillStyle='#f7f8fb';ctx.fillRect(-10,-5,20,5);ctx.fillStyle=color;ctx.fillRect(-7,-4,14,4);
  // arms
  ctx.strokeStyle='#c98963';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-10,-3);ctx.lineTo(-14,7+leg*.15);ctx.moveTo(10,-3);ctx.lineTo(14,7-leg*.15);ctx.stroke();
  // head + helmet
  ctx.fillStyle='#c98963';ctx.beginPath();ctx.arc(0,-14,7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,-16,8.5,Math.PI,Math.PI*2);ctx.lineTo(8,-13);ctx.lineTo(-8,-13);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#e8edf8';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(5,-14);ctx.lineTo(10,-11);ctx.lineTo(6,-9);ctx.stroke();
  // key / role badge over the character
  ctx.fillStyle=isUser?'#c8ff4f':'#08101dcc';ctx.beginPath();ctx.roundRect(-11,-33,22,14,6);ctx.fill();
  ctx.fillStyle=isUser?'#142005':'#fff';ctx.font='900 9px system-ui';ctx.textAlign='center';ctx.fillText(label,0,-23);
  if(isUser){ctx.strokeStyle='#c8ff4f';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,1,18,27,0,0,Math.PI*2);ctx.stroke()}
  ctx.restore();
};

C.draw=()=>{
  const g=C.game;if(!g)return;C.drawField();C.drawRoutes();if(g.phase==='presnap')C.formationPreview();
  const map=C.targetMap();
  g.players.forEach((p,i)=>{let label=p.role==='QB'?'Q':p.role==='RB'?'RB':p.role;const slot=map.indexOf(i);if(g.selected?.type==='pass'&&slot>=0)label=C.PASS_KEYS[slot];C.drawPlayer(p,'#2d63c8',label,p.controlled)});
  g.defenders.forEach(d=>C.drawPlayer(d,g.opp.color,d.role==='BLITZ'?'B':d.role==='RUSH'?'R':d.role==='S'?'S':d.role==='MAN'?'M':d.role==='CB'?'C':'L',false));
  C.drawBall();
};

// Quicker camera catch-up keeps the runner and end zone visible after a completion.
C.cameraTarget=()=>{const g=C.game;if(!g)return 0;let focus=g.ballY;if(g.phase==='live'){if(g.ball)focus=g.ball.y;else if(g.carrier?.hasBall)focus=g.carrier.y+(g.carrier.role==='QB'?10:4);else if(g.players.length)focus=Math.max(g.los,Math.max(...g.players.map(p=>p.y))-6)}return C.clamp(focus-22,0,38)};
C.updateCamera=dt=>{const g=C.game;if(!g)return;const t=C.cameraTarget(),fast=g.carrier?.hasBall&&g.carrier.role!=='QB',r=C.settings.motion?1:Math.min(1,dt*(fast?10:7));g.cameraMin+=(t-g.cameraMin)*r};

// Update the play-card route diagrams so RB routes start in the backfield.
C.drawPlayDiagram=(cv,p)=>{const x=cv.getContext('2d');cv.width=180;cv.height=55;x.clearRect(0,0,180,55);x.strokeStyle='#6d82a7';x.lineWidth=2;x.beginPath();x.moveTo(12,46);x.lineTo(168,46);x.stroke();if(p.type==='run'){x.strokeStyle='#ffc84a';x.lineWidth=4;x.beginPath();x.moveTo(90,46);x.quadraticCurveTo(p.run==='outside'?145:90,30,p.run==='outside'?155:90,7);x.stroke();return}const map=p.targetMap||[2,3,4,5],starts={1:[90,53],2:[30,46],3:[70,46],4:[110,46],5:[150,46]};x.strokeStyle='#c8ff4f';x.lineWidth=2;p.routes.forEach((r,i)=>{const s=starts[map[i]]||[30+i*40,46],ex=C.clamp(s[0]+r[0]*2.0,8,172),ey=C.clamp(46-r[1]*.72,4,48);x.beginPath();x.moveTo(s[0],s[1]);x.lineTo(ex,ey);x.stroke();x.fillStyle='#c8ff4f';x.font='900 8px system-ui';x.fillText(C.PASS_KEYS[i],s[0]-3,s[1]-3)})};

})();
