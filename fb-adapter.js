/* ぼくらのダンジョン：Firebase 接続アダプタ
   claude.ai の外で動かすとき、セーブ・フレンド・マルチを Firebase で動かします。
   claude.ai 上（window.claude がある環境）では何もしません。 */
(function(){
 if(window.claude&&window.claude.use)return;
 const CFG=window.FIREBASE_CONFIG;
 if(!CFG||!CFG.apiKey||/ここに/.test(CFG.apiKey)){console.warn('[fb] firebase-config.js が未設定のため、1人プレイ（端末保存）のみで動きます');return;}
 const VER='12.15.0',MODS=['app','auth','firestore','database'];
 const SRCS=[m=>`https://www.gstatic.com/firebasejs/${VER}/firebase-${m}-compat.js`,m=>`https://cdnjs.cloudflare.com/ajax/libs/firebase/${VER}/firebase-${m}-compat.min.js`];
 const loadJs=src=>new Promise((ok,ng)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ng;document.head.appendChild(s);});
 async function loadSdk(){for(const mk of SRCS){try{for(const m of MODS)await loadJs(mk(m));return true;}catch(e){}}return false;}
 let ready=null;
 const boot=()=>ready||(ready=(async()=>{
  if(!window.firebase&&!await loadSdk())throw new Error('sdk');
  const app=firebase.apps.length?firebase.app():firebase.initializeApp(CFG);
  const auth=firebase.auth();
  const user=await new Promise((ok,ng)=>{const off=auth.onAuthStateChanged(u=>{if(u){off();ok(u);}});auth.signInAnonymously().catch(ng);});
  return {app,uid:user.uid,fs:firebase.firestore(),rt:firebase.database()};
 })());
 const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,ng)=>setTimeout(()=>ng(new Error('timeout')),ms))]);

 /* --- db：Firestore（中身はJSON文字列で保存） --- */
 const mkDb=F=>{
  const doc=path=>{const ref=F.fs.doc(path);return {
   get:async()=>{const s=await ref.get();const raw=s.exists?s.data():null;let v;try{v=raw&&typeof raw.j==='string'?JSON.parse(raw.j):undefined;}catch(e){v=undefined;}return {exists:v!==undefined,data:()=>v};},
   set:async v=>{await ref.set({j:JSON.stringify(v),t:Date.now()});}};};
  return {doc,collection:c=>({doc:id=>doc(c+'/'+id)})};
 };

 /* --- room：Realtime Database（参加者＝peers、メッセージ＝m） --- */
 const mkRoomApi=F=>{
  const me='p'+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
  const join=async name=>{
   const root=F.rt.ref('rooms/'+name),peersRef=root.child('peers'),myRef=peersRef.child(me),mRef=root.child('m');
   const L={},PH=[];let peers=[],myP={},alive=true;const joinT=Date.now();
   try{const s=await peersRef.once('value');if(!s.exists())await mRef.remove();}catch(e){}
   await myRef.onDisconnect().remove();
   await myRef.set({p:'{}',j:joinT});
   const toList=v=>Object.entries(v||{}).map(([peer,x])=>{let p={};try{p=JSON.parse(x.p||'{}');}catch(e){}return Object.freeze({peer,by:null,isMe:peer===me,sameTab:peer===me,kind:'viewer',guest:false,presence:p,updatedAt:+x.j||0});});
   const onVal=s=>{peers=toList(s.val());PH.forEach(f=>{try{f({peers,joined:[],left:[],updated:[]});}catch(e){console.error(e);}});};
   peersRef.on('value',onVal);
   const start=mRef.push().key;const q=mRef.orderByKey().startAfter(start);
   const onMsg=s=>{const m=s.val();if(!m||!alive)return;let d;try{d=JSON.parse(m.d);}catch(e){return;}
    (L[m.topic]||[]).forEach(f=>{try{f({topic:m.topic,data:d,peer:m.peer,by:null,isMe:m.peer===me,sameTab:m.peer===me,kind:'viewer',guest:false});}catch(e){console.error(e);}});};
   q.on('child_added',onMsg);
   const mine=[];
   const R={name,
    emit:async(topic,data)=>{if(!alive)return;const r=mRef.push();mine.push(r);await r.set({topic,d:JSON.stringify(data),peer:me,t:firebase.database.ServerValue.TIMESTAMP});
     setTimeout(()=>{r.remove().catch(()=>{});},120000);},
    on:(t,f)=>{(L[t]=L[t]||[]).push(f);return()=>{L[t]=(L[t]||[]).filter(x=>x!==f);};},
    presence:async p=>{myP={...myP,...p};for(const k in myP)if(myP[k]===null||myP[k]===undefined)delete myP[k];await myRef.update({p:JSON.stringify(myP)});},
    peers:()=>peers,
    onPeers:f=>{PH.push(f);setTimeout(()=>f({peers,joined:[],left:[],updated:[]}),0);return()=>{const i=PH.indexOf(f);if(i>=0)PH.splice(i,1);};},
    connected:()=>true,onConnection:f=>{const c=F.rt.ref('.info/connected'),h=s=>f(!!s.val());c.on('value',h);return()=>c.off('value',h);},
    leave:async()=>{alive=false;peersRef.off('value',onVal);q.off('child_added',onMsg);
     try{await myRef.onDisconnect().cancel();await myRef.remove();}catch(e){}
     try{const s=await peersRef.once('value');if(!s.exists())await root.remove();else mine.forEach(r=>r.remove().catch(()=>{}));}catch(e){}}};
   return R;};
  return {join,emit:async()=>{},on:()=>()=>{},presence:async()=>{},peers:()=>[],onPeers:()=>()=>{},connected:()=>true,onConnection:()=>()=>{}};
 };

 let roomApi=null,dbApi=null;
 window.claude={use:async n=>{
  let F;try{F=await withTimeout(boot(),15000);}catch(e){console.warn('[fb] 接続できませんでした',e);return null;}
  if(n==='user')return {id:async()=>F.uid,name:async()=>null};
  if(n==='db')return dbApi||(dbApi=mkDb(F));
  if(n==='room')return roomApi||(roomApi=mkRoomApi(F));
  return null;}};
 window.__FB_ADAPTER=true;
})();
