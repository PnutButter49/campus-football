(()=>{
  "use strict";
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const playOverlay=$("#playOverlay");
  const playCards=$("#playCards");
  const fieldWrap=$("#fieldWrap");
  const receiverButtons=$$("[data-receiver]");
  const runPlays=new Set(["HB DIVE","QUAD SWEEP","OPTION"]);

  // Make the throw controls match what the player sees on the field: 1->A, 2->B, etc.
  receiverButtons.forEach((b,i)=>{ b.textContent=`${i+1}→${String.fromCharCode(65+i)}`; });

  const passPad=document.createElement("div");
  passPad.id="passHotfix";
  passPad.className="passHotfix hidden";
  passPad.innerHTML='<span>THROW</span>'+receiverButtons.map((_,i)=>`<button type="button" data-hotfix-pass="${i}">${i+1}→${String.fromCharCode(65+i)}</button>`).join("");
  fieldWrap.append(passPad);

  passPad.addEventListener("pointerdown",e=>{
    const b=e.target.closest("[data-hotfix-pass]");
    if(!b)return;
    e.preventDefault();
    const i=Number(b.dataset.hotfixPass);
    receiverButtons[i]?.onpointerdown?.(e);
  });

  const selectedBar=document.createElement("div");
  selectedBar.className="hotfixSelectedBar";
  selectedBar.innerHTML='<div><small>SELECTED PLAY</small><strong id="hotfixPlayName">—</strong></div><div class="spaceSnap"><kbd>SPACE</kbd><span>SNAP</span></div><button type="button" id="hotfixChangePlay">CHANGE PLAY</button>';
  playOverlay.append(selectedBar);

  $("#hotfixChangePlay").addEventListener("click",()=>{
    playOverlay.classList.remove("play-selected");
    const first=playCards.querySelector(".playCard");
    first?.focus({preventScroll:true});
  });

  function selectedPlayName(){ return $("#playName")?.textContent?.trim()||""; }
  function syncPassPad(){
    const gameActive=$("#game")?.classList.contains("active");
    const snapped=playOverlay?.classList.contains("hidden");
    const name=selectedPlayName();
    const isPass=name && !runPlays.has(name);
    passPad.classList.toggle("hidden",!(gameActive&&snapped&&isPass));
  }

  // Selecting a play only selects it; SPACE performs the snap.
  playCards.addEventListener("click",e=>{
    const card=e.target.closest(".playCard");
    if(!card)return;
    requestAnimationFrame(()=>{
      const name=card.querySelector("b")?.textContent?.replace(/^\d+\.\s*/,"")||selectedPlayName()||"PLAY SELECTED";
      $("#hotfixPlayName").textContent=name;
      playOverlay.classList.add("play-selected");
      syncPassPad();
    });
  });

  // Every new down rebuilds the cards, so reopen the chooser.
  new MutationObserver(()=>{
    if(playCards.children.length){
      playOverlay.classList.remove("play-selected");
      passPad.classList.add("hidden");
    }
  }).observe(playCards,{childList:true});

  new MutationObserver(syncPassPad).observe(playOverlay,{attributes:true,attributeFilter:["class"]});
  new MutationObserver(syncPassPad).observe($("#receiverPad"),{attributes:true,attributeFilter:["class"]});

  // Redundant number-key bridge in case browser focus swallows the original key listener.
  document.addEventListener("keydown",e=>{
    if(!["1","2","3","4"].includes(e.key))return;
    if(!$("#game")?.classList.contains("active")||!playOverlay?.classList.contains("hidden"))return;
    const name=selectedPlayName();
    if(!name||runPlays.has(name))return;
    receiverButtons[Number(e.key)-1]?.onpointerdown?.(e);
  },true);

  const bottom=$(".gameBottom span");
  if(bottom) bottom.textContent="Pick a play • SPACE to snap • 1→A / 2→B / 3→C / 4→D to throw • WASD/Arrows move • Shift sprint • P pause";
  const howArticles=$$("#how .howGrid article");
  if(howArticles[0]) howArticles[0].innerHTML='<h3>🏈 QB</h3><p><b>WASD / Arrows</b> move</p><p><b>SPACE</b> snap after selecting a play</p><p><b>1–4</b> throw to receivers A–D</p><p><b>Shift</b> scramble</p><p><b>Q</b> throw away before crossing the line</p>';
  if(howArticles[3]) howArticles[3].innerHTML='<h3>🎯 PASSING</h3><p>After you press <b>SPACE</b> to snap, throw with <b>1→A, 2→B, 3→C, 4→D</b>. You can also click/tap the throw buttons shown on the field.</p>';

  syncPassPad();
})();