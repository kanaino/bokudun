/* ぼくらのダンジョン：Firebase 接続アダプタ
   claude.ai の外で動かすとき、セーブ・引き継ぎ・みんなの記録・フレンド・マルチを Firebase（匿名ログイン＋Firestore）で動かします。
   claude.ai 上（window.claude がある環境）では何もしません。 */
(function(){
 if(window.claude&&window.claude.use)return;
 const CFG=window.FIREBASE_CONFIG;
 if(!CFG||!CFG.apiKey||/ここに/.test(CFG.apiKey)){console.warn('[fb] firebase-config.js が未設定のため、端末保存だけで動きます');return;}
 window.__FB_ADAPTER=true;
 const VER='12.15.0',MODS=['app','auth','firestore'];
 const SRCS=[m=>`https://www.gstatic.com/firebasejs/${VER}/firebase-${m}-compat.js`,m=>`https://cdnjs.cloudflare.com/ajax/libs/firebase/${VER}/firebase-${m}-compat.min.js`];
 const loadJs=src=>new Promise((ok,ng)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ng;document.head.appendChild(s);});
 async function loadSdk(){for(const mk of SRCS){try{for(const m of MODS)await loadJs(mk(m));return true;}catch(e){}}return false;}
 let ready=null;
 const boot=()=>ready||(ready=(async()=>{
  if(!window.firebase&&!await loadSdk())throw new Error('sdk');
  if(!firebase.apps.length)firebase.initializeApp(CFG);
  const auth=firebase.auth();
  const user=await new Promise((ok,ng)=>{const off=auth.onAuthStateChanged(u=>{if(u){off();ok(u);}});auth.signInAnonymously().catch(ng);});
  return {uid:user.uid,fs:firebase.firestore()};
 })().catch(e=>{ready=null;throw e;}));
 const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,ng)=>setTimeout(()=>ng(new Error('timeout')),ms))]);
 /* 保存の形：j にJSON全体、並べ替え用に上の階層の数値・文字はそのまま横に置く */
 const pack=v=>{const o={j:JSON.stringify(v),t:Date.now()};for(const[k,x] of Object.entries(v||{}))if(k!=='j'&&k!=='t'&&(typeof x==='number'||typeof x==='boolean'||(typeof x==='string'&&x.length<200)))o[k]=x;return o;};
 const unpack=raw=>{if(!raw||typeof raw.j!=='string')return undefined;try{return JSON.parse(raw.j);}catch(e){return undefined;}};
 const snapOf=s=>{const v=s.exists?unpack(s.data()):undefined;return {id:s.id,exists:v!==undefined,data:()=>v};};
 const mkDb=F=>{
  const docRef=ref=>({id:ref.id,path:ref.path,get:async()=>snapOf(await ref.get()),set:async v=>{await ref.set(pack(v));},delete:async()=>{await ref.delete();}});
  const query=q=>({orderBy:(f,d)=>query(q.orderBy(f,d||'asc')),limit:n=>query(q.limit(n)),where:(f,op,v)=>query(q.where(f,op,v)),
   get:async()=>{const r=await q.get();const docs=r.docs.map(snapOf);return {docs,size:docs.length,empty:!docs.length};}});
  const coll=path=>{const c=F.fs.collection(path);return {...query(c),path,doc:id=>docRef(c.doc(id))};};
  return {doc:p=>docRef(F.fs.doc(p)),collection:coll};
 };

 /* --- room：Firestore だけでマルチ用の部屋を作る（参加者＝peers、メッセージ＝msgs） --- */
 const mkRoomApi=F=>{
  const me='p'+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
  const join=async name=>{
   const base='rooms/'+name,peersCol=F.fs.collection(base+'/peers'),msgsCol=F.fs.collection(base+'/msgs'),myDoc=peersCol.doc(me);
   const L={},PH=[],joinT=Date.now(),seen=new Set(),mine=[],raw={},lastSeen={},hbVal={};let myP={},alive=true,peers=[],seq=0,first=true;
   const STALE=25000;
   const build=()=>Object.entries(raw).filter(([pid])=>pid===me||Date.now()-(lastSeen[pid]||0)<STALE).map(([peer,x])=>{let p={};try{p=JSON.parse(x.p||'{}');}catch(e){}
    return Object.freeze({peer,by:null,isMe:peer===me,sameTab:peer===me,kind:'viewer',guest:false,presence:p,updatedAt:+x.j||0});});
   const fire=()=>{const nx=build(),sig=JSON.stringify(nx.map(x=>[x.peer,x.presence]));if(sig===fire.last)return;fire.last=sig;peers=nx;PH.forEach(f=>{try{f({peers,joined:[],left:[],updated:[]});}catch(e){console.error(e);}});};
   await myDoc.set({p:'{}',j:joinT,hb:Date.now()});
   const offP=peersCol.onSnapshot(s=>{s.docChanges().forEach(c=>{const id=c.doc.id;if(c.type==='removed'){delete raw[id];return;}const d=c.doc.data();
     if(hbVal[id]!==d.hb){hbVal[id]=d.hb;lastSeen[id]=Date.now();}raw[id]=d;});fire();},e=>console.warn('[fb] peers',e));
   const deliver=m=>{let d;try{d=JSON.parse(m.d);}catch(e){return;}(L[m.topic]||[]).forEach(f=>{try{f({topic:m.topic,data:d,peer:m.peer,by:null,isMe:m.peer===me,sameTab:m.peer===me,kind:'viewer',guest:false});}catch(e){console.error(e);}});};
   const offM=msgsCol.onSnapshot(s=>{const add=[];s.docChanges().forEach(c=>{if(c.type!=='added'||seen.has(c.doc.id))return;seen.add(c.doc.id);const m=c.doc.data();
     if(first&&!(m.peer===me||(+m.t||0)>=joinT-3000))return;add.push(m);});first=false;
     add.sort((a,b)=>(a.t-b.t)||(a.peer<b.peer?-1:a.peer>b.peer?1:0)||(a.s-b.s));if(alive)add.forEach(deliver);},e=>console.warn('[fb] msgs',e));
   const hb=setInterval(()=>{if(alive)myDoc.update({hb:Date.now()}).catch(()=>{});},8000);
   const prune=setInterval(()=>{if(alive)fire();},4000);
   const bye=()=>{try{myDoc.delete();}catch(e){}};addEventListener('pagehide',bye);
   const R={name,
    emit:async(topic,data)=>{if(!alive)return;const ref=msgsCol.doc();mine.push(ref);await ref.set({topic,d:JSON.stringify(data),peer:me,t:Date.now(),s:seq++});
     setTimeout(()=>{ref.delete().catch(()=>{});},120000);},
    on:(t,f)=>{(L[t]=L[t]||[]).push(f);return()=>{L[t]=(L[t]||[]).filter(x=>x!==f);};},
    presence:async p=>{myP={...myP,...p};for(const k in myP)if(myP[k]===null||myP[k]===undefined)delete myP[k];raw[me]={...(raw[me]||{}),p:JSON.stringify(myP),j:joinT};fire();await myDoc.update({p:JSON.stringify(myP),hb:Date.now()});},
    peers:()=>peers,
    onPeers:f=>{PH.push(f);setTimeout(()=>f({peers,joined:[],left:[],updated:[]}),0);return()=>{const i=PH.indexOf(f);if(i>=0)PH.splice(i,1);};},
    connected:()=>true,onConnection:f=>{setTimeout(()=>f(true),0);return()=>{};},
    leave:async()=>{alive=false;clearInterval(hb);clearInterval(prune);removeEventListener('pagehide',bye);try{offP();offM();}catch(e){}
     try{await myDoc.delete();}catch(e){}mine.forEach(r=>r.delete().catch(()=>{}));}};
   return R;};
  return {join,emit:async()=>{},on:()=>()=>{},presence:async()=>{},peers:()=>[],onPeers:()=>()=>{},connected:()=>true,onConnection:()=>()=>{}};
 };
 let dbApi=null,roomApi=null;
 window.claude={use:async n=>{
  let F;try{F=await withTimeout(boot(),15000);}catch(e){console.warn('[fb] 接続できませんでした',e);return null;}
  if(n==='user')return {id:async()=>F.uid,name:async()=>null};
  if(n==='db')return dbApi||(dbApi=mkDb(F));
  if(n==='room')return roomApi||(roomApi=mkRoomApi(F));
  return null;}};
})();
