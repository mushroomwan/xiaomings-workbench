// Service Worker - 小明的工作台
const CACHE_NAME = 'xm-workbench-v6';
const CACHE_FILES = [
  'xm.html',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4',
  'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap'
];

// 安装：缓存核心文件
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES).catch(function(err) {
        console.log('部分资源缓存失败，不影响使用:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.map(function(name) {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：导航请求始终走网络（不回退缓存），其他资源缓存优先
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  // 页面导航请求：始终走网络，避免缓存旧版本
  if (event.request.mode === 'navigate' || event.request.url.endsWith('xm.html')) {
    event.respondWith(
      fetch(event.request + '?t=' + Date.now(), { cache: 'no-store' }).then(function(resp) {
        if (resp && resp.status === 200) {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, respClone);
          });
        }
        return resp;
      }).catch(function() {
        return caches.match(event.request).then(function(r) {
          return r || caches.match('xm.html');
        });
      })
    );
    return;
  }

  // 其他资源：缓存优先，网络回退
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;
      return fetch(event.request).then(function(resp) {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, respClone);
          });
        }
        return resp;
      });
    })
  );
});
