const CACHE = 'weight-tracker-v4';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('firebase') || url.hostname.includes('google') ||
      url.hostname.includes('gstatic') || url.hostname.includes('jsdelivr') ||
      url.hostname.includes('fonts')) return;

  // HTML: network-first，確保每次都拿最新版，離線才 fallback 快取
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 其他靜態資源：cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
