// 俄罗斯方块 - Service Worker (离线缓存)
var CACHE_NAME = 'tetris-app-v2';
var urlsToCache = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] 缓存应用资源');
      return cache.addAll(urlsToCache);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_NAME) {
          console.log('[SW] 清除旧缓存:', key);
          return caches.delete(key);
        }
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // 只处理同源请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // 缓存命中, 同时后台更新
        fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, response);
            });
          }
        }).catch(function() {});
        return cached;
      }
      // 未命中, 网络请求并缓存
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200) return response;
        var cloned = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, cloned);
        });
        return response;
      }).catch(function() {
        // 离线且无缓存, 返回空
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
