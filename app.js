import { firebaseConfig } from "./firebase-config.js";

const $=s=>document.querySelector(s);
const TARGETS=["20","19","18","17","16","15","BULL"];
const MULT={S:1,D:2,T:3};
const CHECKOUTS={170:"T20 T20 Bull",167:"T20 T19 Bull",164:"T20 T18 Bull",161:"T20 T17 Bull",160:"T20 T20 D20",156:"T20 T20 D18",152:"T20 T20 D16",148:"T20 T16 D20",144:"T20 T20 D12",140:"T20 T20 D10",136:"T20 T20 D8",132:"T20 T16 D12",128:"T18 T18 D10",124:"T20 T16 D8",120:"T20 S20 D20",116:"T20 S16 D20",112:"T20 S12 D20",108:"T20 S8 D20",104:"T18 S10 D20",100:"T20 D20",98:"T20 D19",97:"T19 D20",96:"T20 D18",95:"T19 D19",94:"T18 D20",93:"T19 D18",92:"T20 D16",91:"T17 D20",90:"T18 D18",89:"T19 D16",88:"T16 D20",87:"T17 D18",86:"T18 D16",85:"T15 D20",84:"T20 D12",83:"T17 D16",82:"T14 D20",81:"T19 D12",80:"T20 D10",79:"T13 D20",78:"T18 D12",77:"T19 D10",76:"T20 D8",75:"T17 D12",74:"T14 D16",73:"T19 D8",72:"T16 D12",71:"T13 D16",70:"T18 D8",69:"T19 D6",68:"T20 D4",67:"T17 D8",66:"T10 D18",65:"T15 D10",64:"T16 D8",63:"T13 D12",62:"T10 D16",61:"T15 D8",60:"S20 D20",59:"S19 D20",58:"S18 D20",57:"S17 D20",56:"S16 D20",55:"S15 D20",54:"S14 D20",53:"S13 D20",52:"S12 D20",51:"S11 D20",50:"S10 D20",49:"S9 D20",48:"S16 D16",47:"S15 D16",46:"S14 D16",45:"S13 D16",44:"S12 D16",43:"S11 D16",42:"S10 D16",41:"S9 D16",40:"D20",38:"D19",36:"D18",34:"D17",32:"D16",30:"D15",28:"D14",26:"D13",24:"D12",22:"D11",20:"D10",18:"D9",16:"D8",14:"D7",12:"D6",10:"D5",8:"D4",6:"D3",4:"D2",2:"D1"};

let profiles=load("ft_profiles",[
  {id:"fabien",name:"Fabien",avatar:"F",elo:1000,wins:0,losses:0,matches:0,totalScore:0,totalTurns:0,bestTurn:0,doublesHit:0,doublesAttempted:0},
  {id:"thibault",name:"Thibault",avatar:"T",elo:1000,wins:0,losses:0,matches:0,totalScore:0,totalTurns:0,bestTurn:0,doublesHit:0,doublesAttempted:0}
]);
let matches=load("ft_matches",[]);
let selectedPlayerIds=["fabien","thibault"];
let mode="501",startRule="free",finishRule="free",mult="S";
let options={handsFree:false,voiceAnnounce:true,finishAdvice:true};
let game=null,pending=[],online=false,roomCode="",myClientId="",dbApi=null,roomRef=null,unsubscribe=null,recognition=null,voiceLoop=false;

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

document.querySelectorAll(".game-mode").forEach(b=>b.addEventListener("click",()=>{setChoice(".game-mode",b);mode=b.dataset.value;$("#rulesPanel").classList.toggle("hidden",mode==="cricket")}));
document.querySelectorAll(".start-rule").forEach(b=>b.addEventListener("click",()=>{setChoice(".start-rule",b);startRule=b.dataset.value}));
document.querySelectorAll(".finish-rule").forEach(b=>b.addEventListener("click",()=>{setChoice(".finish-rule",b);finishRule=b.dataset.value}));
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

function startScore(){return mode==="cricket"?0:Number(mode)}
function newPlayer(id,clientId=""){const p=profile(id);return{profileId:id,name:p.name,avatar:p.avatar,clientId,score:startScore(),opened:startRule==="free",turns:0,total:0,bestTurn:0,doublesHit:0,doublesAttempted:0,marks:Object.fromEntries(TARGETS.map(t=>[t,0]))}}
function createGame(ids,clients=[]){return{mode,startRule,finishRule,options,current:0,winner:null,players:ids.map((id,i)=>newPlayer(id,clients[i]||"")),history:[],createdAt:Date.now()}}

$("#startLocal").addEventListener("click",()=>{online=false;game=createGame(selectedPlayerIds);openGame()});
$("#createOnline").addEventListener("click",async()=>{
  if(selectedPlayerIds.length!==2)return alert("La partie en ligne V4 fonctionne pour deux joueurs.");
  if(!await loadFirebase()){return $("#onlineStatus").textContent="Configure Firebase dans firebase-config.js pour activer le jeu en ligne."}
  myClientId=uid();roomCode=code6();game=createGame(selectedPlayerIds,[myClientId,""]);online=true;roomRef=dbApi.ref(dbApi.db,"rooms/"+roomCode);await dbApi.set(roomRef,game);watchRoom();$("#waitingText").textContent=`En attente de ${game.players[1].name}…`;
  $("#homeView").classList.add("hidden");$("#waitingView").classList.remove("hidden");$("#roomCodeDisplay").textContent=roomCode;
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
function fmt(d){if(!d)return"—";if(d.zone===25)return d.mult==="D"?"DBULL":"BULL";return d.mult+d.zone}
function dartScore(d){return d.zone===25?(d.mult==="D"?50:25):d.zone*MULT[d.mult]}
function marks(n){return n<=0?"—":n===1?"／":n===2?"X":"⊗"}
function advice(){
  if(!options.finishAdvice||game.mode==="cricket")return"—";
  const s=game.players[game.current].score;
  if(game.finishRule==="free")return s<=60?`Sortie libre : ${s}`:CHECKOUTS[s]||"Cherche un gros score";
  return CHECKOUTS[s]||"Pas de finish en 3 flèches";
}
function renderGame(){
  $("#gameTitle").textContent=game.mode==="cricket"?"CRICKET":game.mode;
  $("#gameRules").textContent=game.mode==="cricket"?"Règles Cricket":`${game.startRule==="free"?"Début libre":"Double-in"} · ${game.finishRule==="free"?"Finish libre":"Double-out"}`;
  $("#connectionBadge").textContent=online?roomCode:"LOCAL";
  $("#currentPlayer").textContent=game.winner!==null?`${game.players[game.winner].name} gagne !`:game.players[game.current].name;
  $("#checkoutAdvice").textContent=game.winner!==null?"Terminé":advice();
  $("#entryPanel").classList.toggle("hidden",!myTurn()||game.winner!==null);
  $("#voiceButton").disabled=!myTurn()||game.winner!==null;
  $("#scoreboard").classList.toggle("hidden",game.mode==="cricket");
  $("#cricketBoard").classList.toggle("hidden",game.mode!=="cricket");
  if(game.mode!=="cricket")$("#scoreboard").innerHTML=game.players.map((p,i)=>`<div class="score-card ${game.current===i&&game.winner===null?"active":""}"><strong>${p.name}</strong><div class="score-value">${p.score}</div><div class="player-meta">${p.opened?"Ouvert":"Double requis"} · Moy. ${p.turns?(p.total/p.turns).toFixed(1):"0,0"}</div></div>`).join("");
  else $("#cricketBoard").innerHTML=`<div class="cricket-row"><strong>${game.players[0].name}</strong><strong>Cible</strong><strong>${game.players[1].name}</strong></div>`+TARGETS.map(t=>`<div class="cricket-row"><span class="mark">${marks(game.players[0].marks[t])}</span><strong>${t}</strong><span class="mark">${marks(game.players[1].marks[t])}</span></div>`).join("")+`<div class="cricket-row"><strong>${game.players[0].score} pts</strong><strong>Score</strong><strong>${game.players[1].score} pts</strong></div>`;
  $("#dartChips").innerHTML=[0,1,2].map(i=>`<button class="dart-chip ${pending[i]?"filled":""}" data-i="${i}">${fmt(pending[i])}</button>`).join("");
  document.querySelectorAll(".dart-chip").forEach(c=>c.addEventListener("click",()=>{if(!myTurn())return;const i=+c.dataset.i;if(pending[i])pending.splice(i,1);renderGame()}));
  $("#turnTotal").textContent="Total : "+pending.reduce((a,d)=>a+dartScore(d),0);
  $("#turnHistory").innerHTML=game.history.length?[...game.history].reverse().slice(0,15).map(h=>`<div class="history-row"><div><strong>${h.name}</strong><p class="hint">${h.darts.map(fmt).join(" · ")}</p></div><span class="pill">${h.label}</span></div>`).join(""):'<p class="hint">Aucune volée.</p>';
}
function addDart(zone){if(!myTurn())return;pending.push({zone,mult:zone===25&&mult==="T"?"S":mult});if(pending.length===3)setTimeout(commitTurn,180);renderGame()}
const numbers=$("#numbers");[20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1].forEach(n=>{const b=document.createElement("button");b.className="number";b.textContent=n;b.addEventListener("click",()=>addDart(n));numbers.appendChild(b)});const bull=document.createElement("button");bull.className="number bull";bull.textContent="BULL";bull.addEventListener("click",()=>addDart(25));numbers.appendChild(bull);

async function commitTurn(){
  if(pending.length!==3||!myTurn()||game.winner!==null)return;
  const snapshot=JSON.parse(JSON.stringify(game)),pi=game.current,oi=(pi+1)%game.players.length,p=game.players[pi],darts=JSON.parse(JSON.stringify(pending));
  if(game.mode==="cricket"){
    let gained=0,hits=0;darts.forEach(d=>{let t=null,v=0,c=0;if(d.zone===25){t="BULL";v=25;c=d.mult==="D"?2:1}else if(d.zone>=15&&d.zone<=20){t=String(d.zone);v=d.zone;c=MULT[d.mult]}if(!t)return;hits+=c;const need=Math.max(0,3-p.marks[t]),close=Math.min(need,c);p.marks[t]+=close;const extra=c-close;const anyOpen=game.players.some((op,idx)=>idx!==pi&&op.marks[t]<3);if(extra>0&&anyOpen){p.score+=extra*v;gained+=extra*v}});
    p.turns++;p.total+=hits;p.bestTurn=Math.max(p.bestTurn,hits);game.history.push({name:p.name,darts,label:gained?`+${gained} pts`:`${hits} marque(s)`,snapshot});
    const closed=TARGETS.every(t=>p.marks[t]>=3),top=p.score>=Math.max(...game.players.filter((_,i)=>i!==pi).map(x=>x.score));if(closed&&top)game.winner=pi;else game.current=oi;
  }else{
    let scoring=darts;
    if(!p.opened){const idx=darts.findIndex(d=>d.mult==="D");if(idx===-1)scoring=[];else{p.opened=true;scoring=darts.slice(idx)}}
    const total=scoring.reduce((a,d)=>a+dartScore(d),0),remain=p.score-total,last=scoring.at(-1);
    if(game.finishRule==="double"&&remain<=40){p.doublesAttempted++;if(remain===0&&last?.mult==="D")p.doublesHit++}
    const bust=remain<0||(game.finishRule==="double"&&(remain===1||(remain===0&&last?.mult!=="D")));
    if(!bust)p.score=remain;p.turns++;p.total+=bust?0:total;p.bestTurn=Math.max(p.bestTurn,bust?0:total);
    const label=scoring.length===0&&!p.opened?"Pas ouvert":bust?"BUST":String(total);game.history.push({name:p.name,darts,label,snapshot});
    if(!bust&&remain===0)game.winner=pi;else game.current=oi;
  }
  pending=[];await saveGame();
  if(game.winner!==null){finishMatch();announce(`${game.players[game.winner].name} gagne la partie`);voiceLoop=false;recognition?.stop()}
  else{announceTurn();if(voiceLoop)setTimeout(startRecognition,1100)}
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

const WORDS={"un":1,"une":1,"deux":2,"trois":3,"quatre":4,"cinq":5,"six":6,"sept":7,"huit":8,"neuf":9,"dix":10,"onze":11,"douze":12,"treize":13,"quatorze":14,"quinze":15,"seize":16,"dix-sept":17,"dix-huit":18,"dix-neuf":19,"vingt":20,"bull":25,"bulle":25,"centre":25};
function normalize(t){return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[,.!?;:]/g," ").replace(/\bet\b/g," ").replace(/\s+/g," ").trim()}
function parseVoice(text){
  const norm=normalize(text).replace(/dix sept/g,"dix-sept").replace(/dix huit/g,"dix-huit").replace(/dix neuf/g,"dix-neuf");
  if(norm.includes("annule"))return{command:"undo"};if(norm.includes("recommence"))return{command:"clear"};
  const out=[];let m="S";for(const x of norm.split(" ")){if(x==="triple"){m="T";continue}if(x==="double"){m="D";continue}if(x==="simple"){m="S";continue}const z=/^\d+$/.test(x)?+x:WORDS[x];if(z&&((z>=1&&z<=20)||z===25)){out.push({zone:z,mult:z===25&&m==="T"?"S":m});m="S";if(out.length===3)break}}return{darts:out}
}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
$("#voiceButton").addEventListener("click",()=>voiceLoop?stopHandsFree():startHandsFree());
function startHandsFree(){if(!SR)return $("#voiceStatus").textContent="Reconnaissance vocale indisponible dans ce navigateur.";voiceLoop=true;$("#voiceButton").textContent="⏹ Arrêter le mode mains libres";startRecognition()}
function stopHandsFree(){voiceLoop=false;recognition?.stop();$("#voiceButton").textContent="🎤 Annoncer la volée";$("#voiceStatus").textContent="Mode vocal arrêté."}
function startRecognition(){
  if(!voiceLoop&&!options.handsFree)return;
  if(!SR||game?.winner!==null||!myTurn())return;
  recognition=new SR();recognition.lang="fr-FR";recognition.interimResults=false;recognition.maxAlternatives=3;
  $("#voiceStatus").textContent=`J'écoute ${game.players[game.current].name}…`;
  recognition.onresult=e=>{const text=e.results[0][0].transcript;$("#voiceStatus").textContent="Compris : "+text;const parsed=parseVoice(text);if(parsed.command==="undo"){$("#undoTurn").click();return}if(parsed.command==="clear"){pending=[];renderGame();return}if(parsed.darts?.length){pending=parsed.darts;renderGame();if(pending.length===3)setTimeout(commitTurn,500);else if(voiceLoop||options.handsFree)setTimeout(startRecognition,800)}};
  recognition.onerror=()=>{if(voiceLoop||options.handsFree)setTimeout(startRecognition,900)};
  recognition.onend=()=>{};
  recognition.start();
}
function announce(text){if(options.voiceAnnounce&&"speechSynthesis"in window){const u=new SpeechSynthesisUtterance(text);u.lang="fr-FR";speechSynthesis.speak(u)}}
function announceTurn(){const p=game.players[game.current];announce(`Au tour de ${p.name}. Il reste ${p.score}`)}

if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js");
