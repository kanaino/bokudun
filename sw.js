/* オフライン用：通信できるときは常に最新を取りにいき、できないときだけ保存済みを使う */
const CACHE='bokudun-v1';
const CORE=['./','./index.html','./manifest.webmanifest','./firebase-config.js','./fb-adapter.js','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();})());});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
 e.respondWith((async()=>{try{const res=await fetch(r,{cache:'no-store'});if(res&&res.ok){const c=await caches.open(CACHE);c.put(r,res.clone());}return res;}
  catch(err){const hit=await caches.match(r,{ignoreSearch:true});if(hit)return hit;if(r.mode==='navigate'){const idx=await caches.match('./index.html');if(idx)return idx;}throw err;}})());
});
