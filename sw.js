const C='stand-v2';
const ARQ=['./','index.html','core.js','manifest.webmanifest','icon-180.png','icon-512.png','fonts/Poppins-Regular.ttf','fonts/Poppins-Bold.ttf',
  ...[1,2,3,4,5,6,7,8,9,10,11,101,102,103,104,105].map(n=>`img/m${n}.jpg`)];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(ARQ)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin) return;
  e.respondWith(caches.open(C).then(async c=>{
    const hit=await c.match(e.request,{ignoreSearch:true})||(e.request.mode==='navigate'?await c.match('index.html'):undefined);
    const rede=fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r}).catch(()=>hit);
    return hit||rede;
  }));
});
