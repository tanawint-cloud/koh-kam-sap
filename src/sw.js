/* เกาะคำศัพท์ service worker — network-first
   เปิดตอนมีเน็ต = ได้ไฟล์ล่าสุดเสมอ (กัน cache ค้างเวอร์ชันเก่า)
   เปิดตอนไม่มีเน็ต = ใช้ของที่เคยโหลดไว้ (เล่นออฟไลน์ได้)
   จัดการเฉพาะคำขอ GET ที่ origin เดียวกันเท่านั้น — ไม่ยุ่งกับ backend (script.google.com) */
var CACHE = 'kks-v1';

self.addEventListener('install', function(e){ self.skipWaiting(); });

self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    var keys = await caches.keys();
    await Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  var url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; /* ปล่อยผ่าน */
  e.respondWith((async function(){
    try {
      var fresh = await fetch(req);
      try { var cache = await caches.open(CACHE); cache.put(req, fresh.clone()); } catch(err){}
      return fresh;
    } catch(err) {
      var cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        var idx = await caches.match('index.html') || await caches.match('./') || await caches.match('./index.html');
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
