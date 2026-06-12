const CACHE = 'bolao-fc-v10';
const STATIC = [
  './', './index.html', './manifest.json', './icon.svg', './icon-maskable.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
      .then(() => self.clients.matchAll({type: 'window', includeUncontrolled: true}))
      .then(clientList => {
        return Promise.all(clientList.map(client => {
          // Force all open windows to reload so they pick up new JS
          if (typeof client.navigate === 'function') {
            return client.navigate(client.url).catch(() => {
              client.postMessage({type: 'SW_ACTIVATED'});
            });
          }
          client.postMessage({type: 'SW_ACTIVATED'});
        }));
      })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  if (url.hostname.includes('espn.com') ||
      url.hostname.includes('supabase.co') ||
      url.pathname.includes('/functions/') ||
      url.pathname.includes('/rest/v1/') ||
      url.pathname.includes('/auth/')) {
    return;
  }

  // HTML (navegação): sempre busca da rede — cache só como fallback offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, {cache: 'no-cache'})
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Assets estáticos: cache-first com atualização em background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res.ok && res.type !== 'error') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
