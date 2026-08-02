import { firebaseConfig } from "./firebase-config.js";

const $=s=>document.querySelector(s);
const TARGETS=["20","19","18","17","16","15","BULL"];
const WORLD_TARGETS=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25];

const MULT={S:1,D:2,T:3};

const FINISH_DARTS=[
  ...Array.from({length:20},(_,i)=>({label:`T${20-i}`,score:(20-i)*3,type:"T",number:20-i})),
  {label:"DBULL",score:50,type:"D",number:25},
  ...Array.from({length:20},(_,i)=>({label:`D${20-i}`,score:(20-i)*2,type:"D",number:20-i})),
  {label:"BULL",score:25,type:"S",number:25},
  ...Array.from({length:20},(_,i)=>({label:`S${20-i}`,score:20-i,type:"S",number:20-i}))
];

function finishPreference(combo,requireDouble){
  let score=0;
  // Prefer fewer darts.
  score+=(3-combo.length)*1000;
  // Prefer a double finish, even in finish libre.
  if(combo.at(-1)?.type==="D")score+=500;
  // Prefer triples before the final dart.
  score+=combo.slice(0,-1).filter(d=>d.type==="T").length*70;
  // Prefer conventional high-value routes.
  score+=combo.reduce((sum,d)=>sum+d.score,0)/10;
  // Avoid awkward bull routes unless useful.
  score-=combo.filter(d=>d.number===25).length*5;
  if(requireDouble&&combo.at(-1)?.type!=="D")score-=10000;
  return score;
}

function findFinish(score,requireDouble=false){
  if(!Number.isFinite(score)||score<1||score>180)return null;

  const candidates=[];
  const finalDarts=requireDouble
    ? FINISH_DARTS.filter(d=>d.type==="D")
    : FINISH_DARTS;

  // One dart.
  for(const d1 of finalDarts){
    if(d1.score===score)candidates.push([d1]);
  }

  // Two darts.
  for(const d1 of FINISH_DARTS){
    for(const d2 of finalDarts){
      if(d1.score+d2.score===score)candidates.push([d1,d2]);
    }
  }

  // Three darts.
  for(const d1 of FINISH_DARTS){
    for(const d2 of FINISH_DARTS){
      const remaining=score-d1.score-d2.score;
      if(remaining<1||remaining>60)continue;
      for(const d3 of finalDarts){
        if(d3.score===remaining)candidates.push([d1,d2,d3]);
      }
    }
  }

  if(!candidates.length)return null;
  candidates.sort((a,b)=>finishPreference(b,requireDouble)-finishPreference(a,requireDouble));
  return candidates[0].map(d=>d.label).join(" · ");
}

const CHECKOUTS={170:"T20 T20 Bull",167:"T20 T19 Bull",164:"T20 T18 Bull",161:"T20 T17 Bull",160:"T20 T20 D20",156:"T20 T20 D18",152:"T20 T20 D16",148:"T20 T16 D20",144:"T20 T20 D12",140:"T20 T20 D10",136:"T20 T20 D8",132:"T20 T16 D12",128:"T18 T18 D10",124:"T20 T16 D8",120:"T20 S20 D20",116:"T20 S16 D20",112:"T20 S12 D20",108:"T20 S8 D20",104:"T18 S10 D20",100:"T20 D20",98:"T20 D19",97:"T19 D20",96:"T20 D18",95:"T19 D19",94:"T18 D20",93:"T19 D18",92:"T20 D16",91:"T17 D20",90:"T18 D18",89:"T19 D16",88:"T16 D20",87:"T17 D18",86:"T18 D16",85:"T15 D20",84:"T20 D12",83:"T17 D16",82:"T14 D20",81:"T19 D12",80:"T20 D10",79:"T13 D20",78:"T18 D12",77:"T19 D10",76:"T20 D8",75:"T17 D12",74:"T14 D16",73:"T19 D8",72:"T16 D12",71:"T13 D16",70:"T18 D8",69:"T19 D6",68:"T20 D4",67:"T17 D8",66:"T10 D18",65:"T15 D10",64:"T16 D8",63:"T13 D12",62:"T10 D16",61:"T15 D8",60:"S20 D20",59:"S19 D20",58:"S18 D20",57:"S17 D20",56:"S16 D20",55:"S15 D20",54:"S14 D20",53:"S13 D20",52:"S12 D20",51:"S11 D20",50:"S10 D20",49:"S9 D20",48:"S16 D16",47:"S15 D16",46:"S14 D16",45:"S13 D16",44:"S12 D16",43:"S11 D16",42:"S10 D16",41:"S9 D16",40:"D20",38:"D19",36:"D18",34:"D17",32:"D16",30:"D15",28:"D14",26:"D13",24:"D12",22:"D11",20:"D10",18:"D9",16:"D8",14:"D7",12:"D6",10:"D5",8:"D4",6:"D3",4:"D2",2:"D1"};

let profiles=load("ft_profiles",[
  {id:"fabien",name:"Fabien",avatar:"F",elo:1000,wins:0,losses:0,matches:0,totalScore:0,totalTurns:0,bestTurn:0,doublesHit:0,doublesAttempted:0},
  {id:"thibault",name:"Thibault",avatar:"T",elo:1000,wins:0,losses:0,matches:0,totalScore:0,totalTurns:0,bestTurn:0,doublesHit:0,doublesAttempted:0}
]);
let matches=load("ft_matches",[]);
let selectedPlayerIds=["fabien","thibault"];
let mode="501",startRule="free",finishRule="free",starterRule="random",mult="S";
let options={handsFree:true,voiceAnnounce:true,finishAdvice:true};
let game=null,pending=[],online=false,roomCode="",myClientId="",dbApi=null,roomRef=null,unsubscribe=null,recognition=null,voiceLoop=false;
let centerState={index:0,points:[],current:null,zoom:1,onlineIntent:false};

function saveLocal(){localStorage.setItem("ft_profiles",JSON.stringify(profiles));localStorage.setItem("ft_matches",JSON.stringify(matches))}
function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
function profile(id){return profiles.find(p=>p.id===id)}
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function code6(){return Math.random().toString(36).slice(2,8).toUpperCase()}
function configured(){return Object.values(firebaseConfig).every(Boolean)}
if(configured()){$("#onlineStatus").textContent="Firebase connecté — jeu en ligne prêt.";$("#onlineStatus").classList.add("online-ready")}
async function loadFirebase(){
  if(dbApi)return true;
  if(!configured())return false;
  const appMod=await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const dbMod=await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js");
  const app=appMod.initializeApp(firebaseConfig);dbApi={...dbMod,db:dbMod.getDatabase(app)};return true;
}

document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.tab)));
function switchTab(name){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  ["play","profiles","stats","achievements"].forEach(n=>$("#"+n+"Tab").classList.toggle("hidden",n!==name));
  if(name==="profiles")renderProfiles();
  if(name==="stats")renderStats();
  if(name==="achievements")renderAchievements();
}

document.querySelectorAll(".game-mode").forEach(b=>b.addEventListener("click",()=>{
  setChoice(".game-mode",b);
  mode=b.dataset.value;
  $("#rulesPanel").classList.toggle("hidden",mode==="cricket"||mode==="world");
  $("#worldModeHelp").classList.toggle("hidden",mode!=="world");
}));
document.querySelectorAll(".start-rule").forEach(b=>b.addEventListener("click",()=>{setChoice(".start-rule",b);startRule=b.dataset.value}));
document.querySelectorAll(".finish-rule").forEach(b=>b.addEventListener("click",()=>{setChoice(".finish-rule",b);finishRule=b.dataset.value}));
document.querySelectorAll('input[name="starterRule"]').forEach(input=>{
  input.addEventListener("change",()=>{
    starterRule=input.value;
    document.querySelectorAll(".starter-card").forEach(card=>{
      const selected=card.dataset.value===starterRule;
      card.classList.toggle("selected",selected);
      const check=card.querySelector(".starter-check");
      if(check)check.textContent=selected?"✓":"○";
    });
  });
});
document.querySelectorAll(".starter-card").forEach(card=>{
  card.addEventListener("click",()=>{
    const input=card.querySelector('input[name="starterRule"]');
    if(!input)return;
    input.checked=true;
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
});
document.querySelectorAll(".mult").forEach(b=>b.addEventListener("click",()=>{setChoice(".mult",b);mult=b.dataset.value}));
function setChoice(sel,active){document.querySelectorAll(sel).forEach(x=>x.classList.remove("active"));active.classList.add("active")}

$("#handsFree").addEventListener("change",e=>options.handsFree=e.target.checked);
$("#voiceAnnounce").addEventListener("change",e=>options.voiceAnnounce=e.target.checked);
$("#finishAdvice").addEventListener("change",e=>options.finishAdvice=e.target.checked);

function renderPlayerSelector(){
  $("#playerSelector").innerHTML=selectedPlayerIds.map((id,i)=>{
    const p=profile(id)||profiles[0];
    return `<div class="player-select-row"><div class="avatar">${p.avatar||p.name[0]}</div><select data-index="${i}">${profiles.map(x=>`<option value="${x.id}" ${x.id===id?"selected":""}>${x.name}</option>`).join("")}</select><button class="remove" data-index="${i}">✕</button></div>`;
  }).join("");
  document.querySelectorAll("#playerSelector select").forEach(s=>s.addEventListener("change",e=>{selectedPlayerIds[+e.target.dataset.index]=e.target.value;renderPlayerSelector()}));
  document.querySelectorAll("#playerSelector .remove").forEach(b=>b.addEventListener("click",()=>{if(selectedPlayerIds.length<=2)return;selectedPlayerIds.splice(+b.dataset.index,1);renderPlayerSelector()}));
}
$("#addPlayer").addEventListener("click",()=>{if(selectedPlayerIds.length<8){selectedPlayerIds.push(profiles[0].id);renderPlayerSelector()}});
renderPlayerSelector();

$("#newProfile").addEventListener("click",()=>{$("#profileName").value="";$("#profileAvatar").value="";$("#profileDialog").showModal()});
$("#saveProfile").addEventListener("click",e=>{
  e.preventDefault();const name=$("#profileName").value.trim();if(!name)return;
  profiles.push({id:uid(),name,avatar:$("#profileAvatar").value.trim()||name[0].toUpperCase(),elo:1000,wins:0,losses:0,matches:0,totalScore:0,totalTurns:0,bestTurn:0,doublesHit:0,doublesAttempted:0});
  saveLocal();$("#profileDialog").close();renderProfiles();renderPlayerSelector();
});
function renderProfiles(){
  $("#profilesList").innerHTML=profiles.map(p=>`<div class="profile-row"><div class="avatar">${p.avatar}</div><div><strong>${p.name}</strong><p class="hint">Elo ${p.elo} · ${p.wins} V / ${p.losses} D</p></div><button class="secondary delete-profile" data-id="${p.id}">Supprimer</button></div>`).join("");
  document.querySelectorAll(".delete-profile").forEach(b=>b.addEventListener("click",()=>{if(profiles.length<=2)return alert("Garde au moins deux profils.");profiles=profiles.filter(p=>p.id!==b.dataset.id);selectedPlayerIds=selectedPlayerIds.filter(id=>id!==b.dataset.id);saveLocal();renderProfiles();renderPlayerSelector()}));
}

function startScore(){return mode==="cricket"||mode==="world"?0:Number(mode)}
function newPlayer(id,clientId=""){
  const p=profile(id);
  return{
    profileId:id,name:p.name,avatar:p.avatar,clientId,
    score:startScore(),opened:startRule==="free",
    turns:0,total:0,bestTurn:0,doublesHit:0,doublesAttempted:0,
    marks:Object.fromEntries(TARGETS.map(t=>[t,0])),
    worldIndex:0
  }
}
function createGame(ids,clients=[]){
  options={
    handsFree:$("#handsFree").checked,
    voiceAnnounce:$("#voiceAnnounce").checked,
    finishAdvice:$("#finishAdvice").checked
  };
  return{mode,startRule,finishRule,starterRule,options:{...options},current:0,winner:null,players:ids.map((id,i)=>newPlayer(id,clients[i]||"")),history:[],createdAt:Date.now()}
}

$("#startLocal").addEventListener("click",()=>{online=false;beginGameCreation(false)});
$("#createOnline").addEventListener("click",async()=>{
  if(selectedPlayerIds.length!==2)return alert("La partie en ligne fonctionne pour deux joueurs.");
  if(!await loadFirebase()){return $("#onlineStatus").textContent="Configure Firebase dans firebase-config.js pour activer le jeu en ligne."}
  beginGameCreation(true);
});

function shuffledIds(ids){
  const a=[...ids];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function beginGameCreation(asOnline){
  if(starterRule==="center"){
    centerState={index:0,points:[],current:null,zoom:1,onlineIntent:asOnline};
    $("#homeView").classList.add("hidden");
    $("#centerView").classList.remove("hidden");
    $("#targetZoom").value="1";
    $("#targetStage").style.transform="scale(1)";
    renderCenterSelection();
    return;
  }
  const ordered=shuffledIds(selectedPlayerIds);
  finalizeGameCreation(ordered,asOnline);
}

async function finalizeGameCreation(orderedIds,asOnline){
  if(asOnline){
    myClientId=uid();
    roomCode=code6();
    game=createGame(orderedIds,[myClientId,""]);
    online=true;
    roomRef=dbApi.ref(dbApi.db,"rooms/"+roomCode);
    await dbApi.set(roomRef,game);
    watchRoom();
    $("#homeView").classList.add("hidden");
    $("#centerView").classList.add("hidden");
    $("#waitingView").classList.remove("hidden");
    $("#roomCodeDisplay").textContent=roomCode;
    $("#waitingText").textContent=`En attente de ${game.players[1].name}…`;
  }else{
    online=false;
    game=createGame(orderedIds);
    $("#centerView").classList.add("hidden");
    openGame();
  }
}

function renderCenterSelection(){
  const currentId=selectedPlayerIds[centerState.index];
  const currentProfile=profile(currentId);
  $("#centerPrompt").textContent=`${currentProfile.name}, place ta fléchette`;
  const pins=$("#targetPins");
  pins.innerHTML="";
  centerState.points.forEach((p,i)=>{
    const el=document.createElement("div");
    el.className="target-pin";
    el.style.left=(p.x*100)+"%";
    el.style.top=(p.y*100)+"%";
    el.textContent=String(i+1);
    pins.appendChild(el);
  });
  if(centerState.current){
    const el=document.createElement("div");
    el.className="target-pin current";
    el.style.left=(centerState.current.x*100)+"%";
    el.style.top=(centerState.current.y*100)+"%";
    el.textContent="•";
    pins.appendChild(el);
  }
  const ranking=[...centerState.points].sort((a,b)=>a.distance-b.distance);
  $("#centerRanking").innerHTML=ranking.length?ranking.map((p,i)=>`<div class="rank-row"><span>${i+1}. ${profile(p.profileId).name}</span><strong>${p.distance.toFixed(1)} %</strong></div>`).join(""):'<p class="hint">Aucun impact enregistré.</p>';
}

$("#targetStage").addEventListener("pointerdown",e=>{
  const board=document.querySelector(".target-board");
  const rect=board.getBoundingClientRect();
  const x=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
  const y=Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));
  centerState.current={x,y};
  renderCenterSelection();
});

$("#targetZoom").addEventListener("input",e=>{
  centerState.zoom=Number(e.target.value);
  $("#targetStage").style.transform=`scale(${centerState.zoom})`;
});

$("#resetCurrentImpact").addEventListener("click",()=>{
  centerState.current=null;
  renderCenterSelection();
});

$("#cancelCenter").addEventListener("click",()=>{
  $("#centerView").classList.add("hidden");
  $("#homeView").classList.remove("hidden");
});

$("#confirmImpact").addEventListener("click",()=>{
  if(!centerState.current)return alert("Place d’abord l’impact sur la cible.");
  const dx=centerState.current.x-.5;
  const dy=centerState.current.y-.5;
  const distance=Math.sqrt(dx*dx+dy*dy)*200;
  centerState.points.push({
    profileId:selectedPlayerIds[centerState.index],
    x:centerState.current.x,
    y:centerState.current.y,
    distance
  });
  centerState.current=null;
  centerState.index++;
  if(centerState.index>=selectedPlayerIds.length){
    const ordered=centerState.points.sort((a,b)=>a.distance-b.distance).map(p=>p.profileId);
    finalizeGameCreation(ordered,centerState.onlineIntent);
    return;
  }
  renderCenterSelection();
});

$("#joinOnline").addEventListener("click",async()=>{
  if(!await loadFirebase())return $("#onlineStatus").textContent="Configure Firebase dans firebase-config.js.";
  const code=$("#joinCode").value.trim().toUpperCase();if(code.length!==6)return alert("Code invalide.");
  const r=dbApi.ref(dbApi.db,"rooms/"+code),snap=await dbApi.get(r);if(!snap.exists())return alert("Salle introuvable.");
  game=snap.val();if(game.players[1]?.clientId)return alert("Salle complète.");
  myClientId=uid();roomCode=code;online=true;game.players[1].clientId=myClientId;roomRef=r;await dbApi.set(roomRef,game);watchRoom();openGame();announce("Connexion à la partie réussie");
});
$("#cancelRoom").addEventListener("click",async()=>{if(roomRef)await dbApi.remove(roomRef);location.reload()});
function watchRoom(){unsubscribe?.();unsubscribe=dbApi.onValue(roomRef,s=>{if(!s.exists())return;game=s.val();if(game.players[1]?.clientId&&!$("#waitingView").classList.contains("hidden"))openGame();else if(!$("#gameView").classList.contains("hidden"))renderGame()})}
async function saveGame(){if(online)return dbApi.set(roomRef,game);renderGame()}

function openGame(){
  $("#homeView").classList.add("hidden");$("#waitingView").classList.add("hidden");$("#gameView").classList.remove("hidden");renderGame();
  if(options.handsFree)setTimeout(startHandsFree,700);
}
$("#leaveGame").addEventListener("click",()=>location.reload());
function myTurn(){return !online||game.players[game.current]?.clientId===myClientId}
function fmt(d){if(!d)return"—";if(d.zone===0)return"MISS";if(d.zone===25)return d.mult==="D"?"DBULL":"BULL";return d.mult+d.zone}
function dartScore(d){if(d.zone===0)return 0;return d.zone===25?(d.mult==="D"?50:25):d.zone*MULT[d.mult]}
function marks(n){return n<=0?"—":n===1?"／":n===2?"X":"⊗"}
function advice(){
  if(game.mode==="world"){
    const p=game.players[game.current];
    const target=WORLD_TARGETS[p.worldIndex]??25;
    return target===25?"Vise la Bull":`Vise le ${target}`;
  }

  if(!options.finishAdvice||game.mode==="cricket")return"—";

  const score=game.players[game.current].score;
  const requireDouble=game.finishRule==="double";
  const route=findFinish(score,requireDouble);

  if(route)return route;
  if(score>180)return"Pas de finish en 3 flèches";
  return requireDouble
    ?"Pas de finish double-out en 3 flèches"
    :"Pas de finish en 3 flèches";
}
function renderGame(){
  $("#gameTitle").textContent=game.mode==="cricket"?"CRICKET":game.mode==="world"?"TOUR DU MONDE":game.mode;
  $("#gameRules").textContent=
    game.mode==="cricket"?"Règles Cricket":
    game.mode==="world"?"1 à 20 puis Bull · "+(game.starterRule==="center"?"Centre":"Aléatoire"):
    `${game.startRule==="free"?"Début libre":"Double-in"} · ${game.finishRule==="free"?"Finish libre":"Double-out"} · ${game.starterRule==="center"?"Centre":"Aléatoire"}`;
  $("#connectionBadge").textContent=online?roomCode:"LOCAL";
  $("#currentPlayer").textContent=game.winner!==null?`${game.players[game.winner].name} gagne !`:game.players[game.current].name;
  $("#checkoutAdvice").textContent=game.winner!==null?"Terminé":advice();
  $("#entryPanel").classList.toggle("hidden",!myTurn()||game.winner!==null);
  $("#voiceButton").disabled=!myTurn()||game.winner!==null;
  $("#scoreboard").classList.toggle("hidden",game.mode==="cricket"||game.mode==="world");
  $("#cricketBoard").classList.toggle("hidden",game.mode!=="cricket");
  $("#worldBoard").classList.toggle("hidden",game.mode!=="world");

  if(game.mode!=="cricket"&&game.mode!=="world"){
    $("#scoreboard").innerHTML=game.players.map((p,i)=>`<div class="score-card ${game.current===i&&game.winner===null?"active":""}"><strong>${p.name}</strong><div class="score-value">${p.score}</div><div class="player-meta">${p.opened?"Ouvert":"Double requis"} · Moy. ${p.turns?(p.total/p.turns).toFixed(1):"0,0"}</div></div>`).join("");
  }else if(game.mode==="cricket"){
    $("#cricketBoard").innerHTML=`<div class="cricket-row"><strong>${game.players[0].name}</strong><strong>Cible</strong><strong>${game.players[1].name}</strong></div>`+TARGETS.map(t=>`<div class="cricket-row"><span class="mark">${marks(game.players[0].marks[t])}</span><strong>${t}</strong><span class="mark">${marks(game.players[1].marks[t])}</span></div>`).join("")+`<div class="cricket-row"><strong>${game.players[0].score} pts</strong><strong>Score</strong><strong>${game.players[1].score} pts</strong></div>`;
  }else{
    $("#worldBoard").innerHTML=game.players.map((p,i)=>{
      const target=WORLD_TARGETS[p.worldIndex];
      const progress=Math.min(100,(p.worldIndex/WORLD_TARGETS.length)*100);
      const steps=WORLD_TARGETS.map((n,idx)=>{
        const label=n===25?"B":n;
        const cls=idx<p.worldIndex?"done":idx===p.worldIndex?"current":"";
        return `<span class="world-step ${cls}">${label}</span>`;
      }).join("");
      return `<div class="world-player">
        <div class="world-head">
          <div><strong>${p.name}</strong><p class="hint">${i===game.current&&game.winner===null?"À son tour":"Progression"}</p></div>
          <div class="world-target">${target===25?"BULL":target??"✓"}</div>
        </div>
        <div class="world-progress"><div class="world-progress-fill" style="width:${progress}%"></div></div>
        <div class="world-steps">${steps}</div>
      </div>`;
    }).join("");
  }
  $("#dartChips").innerHTML=[0,1,2].map(i=>`<button class="dart-chip ${pending[i]?"filled":""}" data-i="${i}">${fmt(pending[i])}</button>`).join("");
  document.querySelectorAll(".dart-chip").forEach(c=>c.addEventListener("click",()=>{if(!myTurn())return;const i=+c.dataset.i;if(pending[i])pending.splice(i,1);renderGame()}));
  $("#turnTotal").textContent="Total : "+pending.reduce((a,d)=>a+dartScore(d),0);
  $("#turnHistory").innerHTML=game.history.length?[...game.history].reverse().slice(0,15).map(h=>`<div class="history-row"><div><strong>${h.name}</strong><p class="hint">${h.darts.map(fmt).join(" · ")}</p></div><span class="pill">${h.label}</span></div>`).join(""):'<p class="hint">Aucune volée.</p>';
}
function addDart(zone){if(!myTurn())return;pending.push({zone,mult:zone===25&&mult==="T"?"S":mult});if(pending.length===3)setTimeout(commitTurn,180);renderGame()}
const numbers=$("#numbers");
[20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1].forEach(n=>{
  const b=document.createElement("button");
  b.className="number";
  b.textContent=n;
  b.addEventListener("click",()=>addDart(n));
  numbers.appendChild(b);
});
const bull=document.createElement("button");
bull.className="number bull";
bull.textContent="BULL 25";
bull.addEventListener("click",()=>addDart(25));
numbers.appendChild(bull);

const doubleBull=document.createElement("button");
doubleBull.className="number bull";
doubleBull.textContent="BULL 50";
doubleBull.addEventListener("click",()=>{
  if(!myTurn())return;
  pending.push({zone:25,mult:"D"});
  if(pending.length===3)setTimeout(commitTurn,180);
  renderGame();
});
numbers.appendChild(doubleBull);

const miss=document.createElement("button");
miss.className="number bull";
miss.textContent="MISS / 0";
miss.addEventListener("click",()=>{
  if(!myTurn())return;
  pending.push({zone:0,mult:"S"});
  if(pending.length===3)setTimeout(commitTurn,180);
  renderGame();
});
numbers.appendChild(miss);

async function commitTurn(){
  if(pending.length!==3||!myTurn()||game.winner!==null)return;
  const snapshot=JSON.parse(JSON.stringify(game)),pi=game.current,oi=(pi+1)%game.players.length,p=game.players[pi],darts=JSON.parse(JSON.stringify(pending));
  if(game.mode==="world"){
    let advances=0;
    darts.forEach(d=>{
      const target=WORLD_TARGETS[p.worldIndex];
      if(target===undefined)return;
      const hit=target===25?d.zone===25:d.zone===target;
      if(hit){
        p.worldIndex++;
        advances++;
      }
    });
    p.turns++;
    p.total+=advances;
    p.bestTurn=Math.max(p.bestTurn,advances);
    p.score=p.worldIndex;
    const nextTarget=WORLD_TARGETS[p.worldIndex];
    const label=advances===0?"Aucune cible":advances===1?"1 étape":`${advances} étapes`;
    game.history.push({name:p.name,darts,label,snapshot});
    if(p.worldIndex>=WORLD_TARGETS.length)game.winner=pi;
    else game.current=oi;
  }else if(game.mode==="cricket"){
    let gained=0,hits=0;darts.forEach(d=>{let t=null,v=0,c=0;if(d.zone===25){t="BULL";v=25;c=d.mult==="D"?2:1}else if(d.zone>=15&&d.zone<=20){t=String(d.zone);v=d.zone;c=MULT[d.mult]}if(!t)return;hits+=c;const need=Math.max(0,3-p.marks[t]),close=Math.min(need,c);p.marks[t]+=close;const extra=c-close;const anyOpen=game.players.some((op,idx)=>idx!==pi&&op.marks[t]<3);if(extra>0&&anyOpen){p.score+=extra*v;gained+=extra*v}});
    p.turns++;p.total+=hits;p.bestTurn=Math.max(p.bestTurn,hits);game.history.push({name:p.name,darts,label:gained?`+${gained} pts`:`${hits} marque(s)`,snapshot});
    const closed=TARGETS.every(t=>p.marks[t]>=3),top=p.score>=Math.max(...game.players.filter((_,i)=>i!==pi).map(x=>x.score));if(closed&&top)game.winner=pi;else game.current=oi;
  }else{
    let scoring=darts;
    if(!p.opened){const idx=darts.findIndex(d=>d.mult==="D");if(idx===-1)scoring=[];else{p.opened=true;scoring=darts.slice(idx)}}
    let total=0,remain=p.score,last=null,winNow=false,bust=false;
    for(const d of scoring){
      const pts=dartScore(d);
      const testRemain=remain-pts;
      const testLast=d;
      if(game.finishRule==="double"&&testRemain<=40){p.doublesAttempted++;if(testRemain===0&&testLast?.mult==="D")p.doublesHit++}
      const testBust=testRemain<0||(game.finishRule==="double"&&(testRemain===1||(testRemain===0&&testLast?.mult!=="D")));
      if(testBust){bust=true;break;}
      total+=pts;
      remain=testRemain;
      last=testLast;
      if(remain===0){winNow=true;break;}
    }
    if(!bust)p.score=remain;p.turns++;p.total+=bust?0:total;p.bestTurn=Math.max(p.bestTurn,bust?0:total);
    const label=scoring.length===0&&!p.opened?"Pas ouvert":bust?"BUST":String(total);game.history.push({name:p.name,darts:usedDarts,label,snapshot});
    if(!bust&&winNow)game.winner=pi;else game.current=oi;
  }
  pending=[];await saveGame();
  if(game.winner!==null){finishMatch();announce(`${game.players[game.winner].name} gagne la partie`);voiceLoop=false;destroyRecognition();setVoiceState(VoiceState.IDLE,"Partie terminée")}
  else{if(!voiceLoop)announceTurn()}
}
$("#undoTurn").addEventListener("click",async()=>{if(!game.history.length)return;const last=game.history.at(-1);if(online&&last.snapshot.players[last.snapshot.current]?.clientId!==myClientId)return alert("Seul le joueur concerné peut annuler.");pending=last.darts;game=last.snapshot;await saveGame()});

function finishMatch(){
  const winner=game.players[game.winner],losers=game.players.filter((_,i)=>i!==game.winner);
  const match={id:uid(),date:Date.now(),mode:game.mode,winner:winner.profileId,players:game.players.map(p=>p.profileId),scores:game.players.map(p=>p.score)};
  matches.unshift(match);
  game.players.forEach((gp,i)=>{
    const pr=profile(gp.profileId);if(!pr)return;pr.matches++;pr.totalScore+=gp.total;pr.totalTurns+=gp.turns;pr.bestTurn=Math.max(pr.bestTurn,gp.bestTurn);pr.doublesHit+=gp.doublesHit||0;pr.doublesAttempted+=gp.doublesAttempted||0;
    if(i===game.winner){pr.wins++;}else pr.losses++;
  });
  if(game.players.length===2){
    const a=profile(game.players[0].profileId),b=profile(game.players[1].profileId),sa=game.winner===0?1:0,sb=1-sa;
    const ea=1/(1+10**((b.elo-a.elo)/400)),eb=1-ea,K=24;a.elo=Math.round(a.elo+K*(sa-ea));b.elo=Math.round(b.elo+K*(sb-eb));
  }
  saveLocal();
}

function renderStats(){
  const sorted=[...profiles].sort((a,b)=>b.elo-a.elo);
  $("#eloTable").innerHTML=sorted.map((p,i)=>`<div class="elo-row"><strong>#${i+1}</strong><div><strong>${p.name}</strong><p class="hint">${p.wins} victoires · Moy. ${p.totalTurns?(p.totalScore/p.totalTurns).toFixed(1):"0,0"}</p></div><span class="pill">${p.elo}</span></div>`).join("");
  $("#matchesList").innerHTML=matches.length?matches.map(m=>`<div class="match-row"><div><strong>${profile(m.winner)?.name||"Joueur"} gagne</strong><p class="hint">${new Date(m.date).toLocaleDateString("fr-FR")} · ${m.mode}</p></div><span class="pill">${m.players.map(id=>profile(id)?.name).join(" vs ")}</span></div>`).join(""):'<p class="hint">Aucune partie terminée.</p>';
}
const achievementDefs=[
  {id:"first_win",name:"Première victoire",desc:"Gagner une partie",test:p=>p.wins>=1},
  {id:"five_wins",name:"Série gagnante",desc:"Gagner 5 parties",test:p=>p.wins>=5},
  {id:"ton80",name:"180 !",desc:"Réaliser une volée de 180",test:p=>p.bestTurn>=180},
  {id:"century",name:"Centurion",desc:"Réaliser une volée de 100 ou plus",test:p=>p.bestTurn>=100},
  {id:"regular",name:"Habitué",desc:"Jouer 10 parties",test:p=>p.matches>=10},
  {id:"double_master",name:"Maître des doubles",desc:"Atteindre 40 % aux doubles",test:p=>p.doublesAttempted>=5&&p.doublesHit/p.doublesAttempted>=.4}
];
function renderAchievements(){
  $("#achievementsList").innerHTML=profiles.map(p=>`<h3 style="margin-top:12px">${p.name}</h3>`+achievementDefs.map(a=>`<div class="achievement-row ${a.test(p)?"":"locked"}"><div><strong>${a.name}</strong><p class="hint">${a.desc}</p></div><span>${a.test(p)?"🏆":"🔒"}</span></div>`).join("")).join("");
}

const WORDS={
  "zero":0,"zéro":0,"nul":0,"nulle":0,"rate":0,"raté":0,"loupe":0,"loupé":0,
  "miss":0,"rien":0,"aucun":0,"aucune":0,
  "un":1,"une":1,"deux":2,"trois":3,"quatre":4,"cinq":5,"six":6,"sept":7,"huit":8,"neuf":9,
  "dix":10,"onze":11,"douze":12,"treize":13,"quatorze":14,"quinze":15,"seize":16,
  "dix-sept":17,"dix-huit":18,"dix-neuf":19,"vingt":20,
  "vingt-cinq":25,"cinquante":50,
  "bull":25,"bulle":25,"centre":25
};
function normalize(t){
  return t.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[,.!?;:/\\|_-]/g," ")
    .replace(/\bvin\b/g," vingt")
    .replace(/\bving\b/g," vingt")
    .replace(/\btripe\b/g," triple")
    .replace(/\bdoubl\b/g," double")
    .replace(/\bbullseye\b/g," cinquante")
    .replace(/\bbull interieur\b/g," cinquante")
    .replace(/\binterieur bull\b/g," cinquante")
    .replace(/\bdouble bull\b/g," cinquante")
    .replace(/\bbull exterieur\b/g," vingt-cinq")
    .replace(/\bexterieur bull\b/g," vingt-cinq")
    .replace(/\bet\b/g," ")
    .replace(/\s+/g," ").trim()
}
function parseVoice(text){
  const norm=normalize(text)
    .replace(/dix sept/g,"dix-sept")
    .replace(/dix huit/g,"dix-huit")
    .replace(/dix neuf/g,"dix-neuf")
    .replace(/vingt cinq/g,"vingt-cinq");

  if(norm.includes("annule"))return{command:"undo"};
  if(norm.includes("recommence")||norm.includes("efface"))return{command:"clear"};

  const out=[];
  let multiplier="S";
  const tokens=norm.split(" ");

  for(const token of tokens){
    if(["triple","triples","t"].includes(token)){multiplier="T";continue}
    if(["double","doubles","d"].includes(token)){multiplier="D";continue}
    if(["simple","simples","s"].includes(token)){multiplier="S";continue}

    const value=/^\d+$/.test(token)?Number(token):WORDS[token];
    if(value===undefined||value===null)continue;

    if(value===0){
      out.push({zone:0,mult:"S"});
      multiplier="S";
    }else if(value===50){
      out.push({zone:25,mult:"D"});
      multiplier="S";
    }else if(value===25){
      out.push({zone:25,mult:"S"});
      multiplier="S";
    }else if(value>=1&&value<=20){
      out.push({zone:value,mult:multiplier});
      multiplier="S";
    }

    if(out.length===3)break;
  }

  return{darts:out,normalized:norm};
}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const VoiceState={IDLE:"ARRÊT",LISTENING:"ÉCOUTE",PROCESSING:"TRAITEMENT",COMMITTING:"ENREGISTREMENT",ANNOUNCING:"ANNONCE",WAITING:"ATTENTE"};
let voiceState=VoiceState.IDLE;
let voiceToken=0;
let voiceTimer=null;

function setVoiceState(state,message=""){
  voiceState=state;
  $("#voiceEngineState").textContent=`Micro : ${state}${message?" · "+message:""}`;
}

function clearVoiceTimer(){
  if(voiceTimer){clearTimeout(voiceTimer);voiceTimer=null}
}

function destroyRecognition(){
  if(!recognition)return;
  try{recognition.onresult=null;recognition.onerror=null;recognition.onend=null;recognition.abort()}catch{}
  recognition=null;
}

$("#voiceButton").addEventListener("click",()=>{
  if(voiceLoop)stopHandsFree();
  else startHandsFree();
});

function startHandsFree(){
  if(!SR){
    $("#voiceStatus").textContent="Reconnaissance vocale indisponible dans ce navigateur.";
    return;
  }
  voiceLoop=true;
  $("#voiceButton").textContent="⏹ Arrêter le mode mains libres";
  resetVoiceCycle("Activation");
}

function stopHandsFree(){
  voiceLoop=false;
  voiceToken++;
  clearVoiceTimer();
  destroyRecognition();
  setVoiceState(VoiceState.IDLE);
  $("#voiceButton").textContent="🎤 Annoncer la volée";
  $("#voiceStatus").textContent="Mode vocal arrêté.";
}

function resetVoiceCycle(reason=""){
  voiceToken++;
  clearVoiceTimer();
  destroyRecognition();
  setVoiceState(VoiceState.WAITING,reason);
  if(!voiceLoop||game?.winner!==null||!myTurn())return;
  const token=voiceToken;
  voiceTimer=setTimeout(()=>{
    if(token!==voiceToken)return;
    beginVoiceTurn(token);
  },500);
}

function beginVoiceTurn(token){
  if(token!==voiceToken||!voiceLoop||game?.winner!==null||!myTurn())return;
  destroyRecognition();
  recognition=new SR();
  recognition.lang="fr-FR";
  recognition.interimResults=false;
  recognition.maxAlternatives=5;
  recognition.continuous=false;

  let resultHandled=false;
  setVoiceState(VoiceState.LISTENING,game.players[game.current].name);
  $("#voiceStatus").textContent=`J'écoute ${game.players[game.current].name}…`;

  recognition.onresult=e=>{
    if(token!==voiceToken||resultHandled)return;
    resultHandled=true;
    setVoiceState(VoiceState.PROCESSING);

    const alternatives=[];
    for(let i=0;i<e.results[0].length;i++)alternatives.push(e.results[0][i].transcript);

    let best=null;
    for(const text of alternatives){
      const parsed=parseVoice(text);
      if(parsed.command){best={text,parsed};break}
      const count=parsed.darts?.length||0;
      if(!best||count>(best.parsed.darts?.length||0))best={text,parsed};
    }

    const text=best?.text||alternatives[0]||"";
    const parsed=best?.parsed||parseVoice(text);
    $("#voiceStatus").textContent="Compris : "+text;

    if(parsed.command==="undo"){
      destroyRecognition();
      $("#undoTurn").click();
      resetVoiceCycle("Annulation");
      return;
    }
    if(parsed.command==="clear"){
      pending=[];
      renderGame();
      destroyRecognition();
      resetVoiceCycle("Volée effacée");
      return;
    }

    if(parsed.darts?.length===3){
      pending=parsed.darts;
      renderGame();
      setVoiceState(VoiceState.COMMITTING);
      destroyRecognition();
      commitTurnFromVoice(token);
      return;
    }

    pending=parsed.darts||[];
    renderGame();
    $("#voiceStatus").textContent=`Compris : ${text} — ${pending.length}/3. Répète la volée complète.`;
    destroyRecognition();
    resetVoiceCycle("Score incomplet");
  };

  recognition.onerror=e=>{
    if(token!==voiceToken)return;
    destroyRecognition();
    $("#voiceStatus").textContent="Micro interrompu. Nouvelle tentative…";
    resetVoiceCycle(e.error||"Erreur");
  };

  recognition.onend=()=>{
    if(token!==voiceToken||resultHandled)return;
    destroyRecognition();
    resetVoiceCycle("Silence");
  };

  try{
    recognition.start();
  }catch{
    destroyRecognition();
    resetVoiceCycle("Redémarrage");
  }
}

async function commitTurnFromVoice(token){
  if(token!==voiceToken)return;
  await commitTurn();
  if(game?.winner!==null){
    voiceLoop=false;
    setVoiceState(VoiceState.IDLE,"Partie terminée");
    return;
  }
  setVoiceState(VoiceState.ANNOUNCING);
  await announceCurrentTurn();
  if(token!==voiceToken)return;
  resetVoiceCycle("Tour suivant");
}

function announce(text){
  return new Promise(resolve=>{
    if(!options.voiceAnnounce||!("speechSynthesis"in window)){resolve();return}
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang="fr-FR";
    u.rate=.95;
    u.onend=resolve;
    u.onerror=resolve;
    speechSynthesis.speak(u);
  });
}

function announceCurrentTurn(){
  const p=game.players[game.current];
  if(game.mode==="world"){
    const target=WORLD_TARGETS[p.worldIndex];
    return announce(`Au tour de ${p.name}. Vise ${target===25?"la bulle":target}`);
  }

  if(game.mode!=="cricket"){
    const route=findFinish(p.score,game.finishRule==="double");
    if(route){
      const spoken=route
        .replaceAll("T","triple ")
        .replaceAll("D","double ")
        .replaceAll("S","simple ")
        .replaceAll("BULL","bulle");
      return announce(`Au tour de ${p.name}. Il reste ${p.score}. Finish possible : ${spoken}`);
    }
  }

  return announce(`Au tour de ${p.name}. Il reste ${p.score}`);
}

function announceTurn(){
  return announceCurrentTurn();
}

if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js");
