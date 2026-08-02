const C='ft-darts-v5-5';
const ASSETS=['./','./index.html','./styles.css?v=55','./app.js?v=55','./firebase-config.js','./manifest.webmanifest','./icon.svg','./dartboard.svg'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(C).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==C).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  if(request.mode==='navigate'||url.pathname.endsWith('.js')||url.pathname.endsWith('.css')){
    event.respondWith(
      fetch(request).then(response=>{
        const copy=response.clone();
        caches.open(C).then(cache=>cache.put(request,copy));
        return response;
      }).catch(()=>caches.match(request))
    );
    return;
  }

  event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
