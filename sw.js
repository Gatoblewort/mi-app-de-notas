// Service Worker para Mis Notas App - Versión 2.0
const CACHE_NAME = 'mis-notas-app-v3';
const APP_VERSION = '3.0.0';

// Archivos para cachear (todos los esenciales)
const urlsToCache = [
  './',
  './index.html',
  './style.css', 
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-144.png',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js'
];

// Instalación del Service Worker
self.addEventListener('install', function(event) {
  console.log('🟢 Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Cache abierto, agregando archivos...');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('✅ Todos los archivos cacheados correctamente');
        // Activar inmediatamente el nuevo Service Worker
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('❌ Error durante la instalación:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', function(event) {
  console.log('🟡 Service Worker activando...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Eliminar caches viejos
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('✅ Service Worker activado correctamente');
      // Tomar control de todas las pestañas
      return self.clients.claim();
    })
  );
});

// Interceptar solicitudes de red
self.addEventListener('fetch', function(event) {
  // Solo manejar solicitudes GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Si está en cache, devolver la versión cacheada
        if (response) {
          console.log('📂 Sirviendo desde cache:', event.request.url);
          return response;
        }

        // Si no está en cache, hacer la solicitud a red
        console.log('🌐 Haciendo solicitud a red:', event.request.url);
        return fetch(event.request)
          .then(function(networkResponse) {
            // Verificar que la respuesta sea válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clonar la respuesta para guardarla en cache
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                // Guardar en cache para próximas solicitudes
                cache.put(event.request, responseToCache);
                console.log('💾 Guardado en cache:', event.request.url);
              })
              .catch(function(error) {
                console.error('Error guardando en cache:', error);
              });

            return networkResponse;
          })
          .catch(function(error) {
            console.error('❌ Error de red:', error);
            
            // Si es una página y falla, devolver la página offline
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            // Para otros recursos, puedes devolver una respuesta de fallback
            return new Response('🔌 Estás sin conexión', {
              status: 408,
              statusText: 'Sin conexión a internet'
            });
          });
      })
  );
});

// Manejar mensajes desde la app
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Manejar sincronización en segundo plano (para futuras funcionalidades)
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    console.log('🔄 Sincronización en segundo plano');
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Aquí puedes agregar sincronización de datos cuando haya conexión
  return Promise.resolve();
}

console.log('🚀 Service Worker cargado - Versión:', APP_VERSION);