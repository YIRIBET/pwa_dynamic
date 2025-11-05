const CACHE_NAME = 'app-shell-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

const ASSETS_APP_SHELL = [
    '/pwa_dynamic/',
    '/pwa_dynamic/index.html',
    '/pwa_dynamic/main.js',
    '/pwa_dynamic/manifest.json',
    '/pwa_dynamic/pages/calendar.html',
    '/pwa_dynamic/pages/forms.html',
    '/pwa_dynamic/css/estilos.css',
    '/pwa_dynamic/images/icons/180.png'
];

// Instalación - Solo cachea TUS archivos
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('App Shell cacheado');
                return cache.addAll(ASSETS_APP_SHELL);
            })
            .catch(error => {
                console.error('Error cacheando App Shell:', error);
            })
    );
    self.skipWaiting();
});

// Activación - Limpia cachés antiguos
self.addEventListener('activate', event => {
    console.log('Service Worker: Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
                        console.log('Eliminando caché antiguo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - Network First para CDN, Cache First para archivos locales
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Detectar si es un CDN externo
    const isExternalCDN = url.origin.includes('cdn.jsdelivr.net') || 
                          url.origin.includes('cdnjs.cloudflare.com');
    
    if (isExternalCDN) {
        // NETWORK FIRST para CDN (FullCalendar, Select2, jQuery, etc.)
        console.log('CDN:', url.pathname);
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // Cachea dinámicamente en DYNAMIC_CACHE
                    if (networkResponse.status === 200) {
                        caches.open(DYNAMIC_CACHE).then(cache => {
                            console.log('Cacheando CDN:', url.pathname);
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Si no hay internet, usa caché
                    console.log('Usando caché CDN (offline):', url.pathname);
                    return caches.match(event.request)
                        .then(cacheResponse => {
                            if (cacheResponse) {
                                return cacheResponse;
                            }
                            // Si no está en caché, retorna error
                            return new Response('Recurso no disponible offline', {
                                status: 503,
                                statusText: 'Service Unavailable'
                            });
                        });
                })
        );
    } else {
        // CACHE FIRST para archivos locales (App Shell)
        console.log('Local:', url.pathname);
        event.respondWith(
            caches.match(event.request)
                .then(cacheResponse => {
                    if (cacheResponse) {
                        return cacheResponse;
                    }
                    // Si no está en caché, intenta la red
                    return fetch(event.request)
                        .catch(error => {
                            console.error('Error:', url.pathname, error);
                            // Fallback para navegación HTML
                            if (event.request.destination === 'document') {
                                return caches.match('/index.html');
                            }
                        });
                })
        );
    }
});