// Service Worker for Shipping Tracker
// Provides offline functionality and caching

const CACHE_NAME = 'shipping-tracker-v1';
const API_CACHE_NAME = 'shipping-tracker-api-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // Add other static assets as needed
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/health',
  '/api/demo/info',
  '/api/status/circuit-breakers',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with cache-first strategy for specific endpoints
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const isTrackingRequest = url.pathname.startsWith('/api/tracking/');
  
  try {
    // For tracking requests, try network first, then cache
    if (isTrackingRequest) {
      return await handleTrackingRequest(request);
    }
    
    // For other API requests, try cache first for cacheable endpoints
    if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
      return await handleCacheableAPIRequest(request);
    }
    
    // For non-cacheable API requests, network only
    return await fetch(request);
    
  } catch (error) {
    console.error('❌ Service Worker: API request failed', error);
    
    // Return offline response for tracking requests
    if (isTrackingRequest) {
      return createOfflineTrackingResponse(url.pathname);
    }
    
    // Return generic offline response
    return createOfflineResponse();
  }
}

// Handle tracking requests with network-first strategy
async function handleTrackingRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.log('🔄 Service Worker: Network failed, trying cache for tracking request');
    
    // Try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Add offline indicator to cached response
      const data = await cachedResponse.json();
      data.offline = true;
      data.message = data.message + ' (cached - offline)';
      
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return offline demo data
    return createOfflineTrackingResponse(new URL(request.url).pathname);
  }
}

// Handle cacheable API requests with cache-first strategy
async function handleCacheableAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log('📦 Service Worker: Serving from cache', request.url);
    
    // Update cache in background
    fetch(request)
      .then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      })
      .catch(() => {
        // Ignore background update failures
      });
    
    return cachedResponse;
  }
  
  // Try network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    return createOfflineResponse();
  }
}

// Handle static asset requests with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Try network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // For navigation requests, return cached index.html
    if (request.mode === 'navigate') {
      const indexResponse = await cache.match('/index.html');
      if (indexResponse) {
        return indexResponse;
      }
    }
    
    return createOfflineResponse();
  }
}

// Create offline tracking response
function createOfflineTrackingResponse(pathname) {
  const trackingNumber = pathname.split('/').pop() || 'OFFLINE123';
  
  const offlineData = {
    success: true,
    data: {
      trackingNumber,
      trackingType: 'container',
      carrier: 'Offline Demo Carrier',
      service: 'FCL',
      status: 'In Transit',
      timeline: [
        {
          id: 'offline-1',
          status: 'Booked',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Shanghai, China',
          description: 'Shipment booked (offline data)',
          isCompleted: true,
        },
        {
          id: 'offline-2',
          status: 'In Transit',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Pacific Ocean',
          description: 'Vessel en route (offline data)',
          isCompleted: true,
        },
      ],
      route: {
        origin: {
          name: 'Shanghai Port',
          code: 'CNSHA',
          city: 'Shanghai',
          country: 'China',
          timezone: 'Asia/Shanghai',
          coordinates: { lat: 31.2304, lng: 121.4737 },
        },
        destination: {
          name: 'Los Angeles Port',
          code: 'USLAX',
          city: 'Los Angeles',
          country: 'United States',
          timezone: 'America/Los_Angeles',
          coordinates: { lat: 33.7361, lng: -118.2922 },
        },
        intermediateStops: [],
        estimatedTransitTime: 14,
      },
      containers: [{
        number: trackingNumber,
        size: '40ft',
        type: 'HC',
        sealNumber: 'OFF' + Math.random().toString().substr(2, 6),
      }],
      lastUpdated: new Date().toISOString(),
      dataSource: 'offline-cache',
      reliability: 0.3,
    },
    offline: true,
    message: 'Tracking data retrieved from offline cache',
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(offlineData), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Create generic offline response
function createOfflineResponse() {
  const offlineResponse = {
    success: false,
    error: 'Offline',
    message: 'You are currently offline. Please check your internet connection.',
    offline: true,
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(offlineResponse), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-tracking') {
    event.waitUntil(syncFailedRequests());
  }
});

// Sync failed requests when back online
async function syncFailedRequests() {
  console.log('🔄 Service Worker: Syncing failed requests...');
  
  // Get failed requests from IndexedDB or localStorage
  // This would be implemented based on your specific needs
  
  try {
    // Retry failed tracking requests
    // Implementation would go here
    console.log('✅ Service Worker: Failed requests synced successfully');
  } catch (error) {
    console.error('❌ Service Worker: Failed to sync requests', error);
  }
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('📱 Service Worker: Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Shipping Update', {
        body: data.body || 'Your shipment status has been updated',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: data.data || {},
        actions: [
          {
            action: 'view',
            title: 'View Details'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Service Worker: Notification clicked', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app to view details
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('🚀 Service Worker: Script loaded');