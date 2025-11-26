const CACHE_NAME = 'app-shell-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

const ASSETS_APP_SHELL = [
    '/pwa_dynamic/',
    '/pwa_dynamic/index.html',
    '/pwa_dynamic/main.js',
    '/pwa_dynamic/manifest.json',
    '/pwa_dynamic/pages/calendar.html',
    '/pwa_dynamic/pages/forms.html',
    '/pwa_dynamic/estilos.css',
    '/pwa_dynamic/images/icons/180.png'
];

// Instalación - Cachea archivos locales
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
        // NETWORK FIRST para CDN
        console.log('🌐 CDN detectado:', url.href);
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // Verifica que sea una respuesta válida
                    if (networkResponse && networkResponse.status === 200) {
                        // Clona la respuesta antes de cachear
                        const responseToCache = networkResponse.clone();
                        
                        caches.open(DYNAMIC_CACHE).then(cache => {
                            console.log(' Cacheando CDN:', url.href);
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(error => {
                    // Si falla la red, busca en caché
                    console.log(' Usando caché CDN (offline):', url.href);
                    return caches.match(event.request)
                        .then(cacheResponse => {
                            if (cacheResponse) {
                                console.log(' CDN encontrado en caché');
                                return cacheResponse;
                            }
                            // Si no está en caché, retorna error
                            console.log(' CDN no disponible offline');
                            return new Response('Recurso no disponible offline', {
                                status: 503,
                                statusText: 'Service Unavailable',
                                headers: { 'Content-Type': 'text/plain' }
                            });
                        });
                })
        );
    } else {
        // CACHE FIRST para archivos locales
        event.respondWith(
            caches.match(event.request)
                .then(cacheResponse => {
                    if (cacheResponse) {
                        return cacheResponse;
                    }
                    // Si no está en caché, intenta la red
                    return fetch(event.request)
                        .then(networkResponse => {
                            // Cachea dinámicamente recursos locales nuevos
                            if (networkResponse && networkResponse.status === 200) {
                                const responseToCache = networkResponse.clone();
                                caches.open(DYNAMIC_CACHE).then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            }
                            return networkResponse;
                        })
                        .catch(error => {
                            console.error('Error:', url.pathname, error);
                            // Fallback para navegación HTML
                            if (event.request.destination === 'document') {
                                return caches.match('/pwa_dynamic/index.html');
                            }
                        });
                })
        );
    }
});