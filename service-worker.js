// service-worker.js
const CACHE_NAME = 'nola-venues-v1';
const TILE_CACHE = 'map-tiles-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/venues.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle map tile requests separately
  if (url.href.includes('tile.openstreetmap.org') || 
      url.href.includes('cartodb.basemaps.com') ||
      url.href.includes('server.arcgisonline.com')) {
    event.respondWith(handleTileRequest(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => {
        // If both cache and network fail, try to return a cached version of the index
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return null;
      })
  );
});

async function handleTileRequest(request) {
  // Try to get from cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // If not in cache, fetch and store
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(TILE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Error fetching tile:', error);
    return new Response(null, { status: 404 });
  }
}

// Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== TILE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});