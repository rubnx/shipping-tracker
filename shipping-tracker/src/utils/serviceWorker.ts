// Service Worker Registration and Management

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

export function registerServiceWorker(config?: ServiceWorkerConfig) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('🔧 Service Worker: Running in localhost mode');
        });
      } else {
        registerValidServiceWorker(swUrl, config);
      }
    });
  }

  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('🌐 Network: Back online');
    config?.onOnline?.();
    updateOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    console.log('📴 Network: Gone offline');
    config?.onOffline?.();
    updateOnlineStatus(false);
  });
}

function registerValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('✅ Service Worker: Registered successfully');
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('🔄 Service Worker: New content available, please refresh');
              config?.onUpdate?.(registration);
            } else {
              console.log('✅ Service Worker: Content cached for offline use');
              config?.onSuccess?.(registration);
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('❌ Service Worker: Registration failed', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidServiceWorker(swUrl, config);
      }
    })
    .catch(() => {
      console.log('📴 Service Worker: No internet connection, running in offline mode');
    });
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('🗑️ Service Worker: Unregistered');
      })
      .catch((error) => {
        console.error('❌ Service Worker: Unregistration failed', error);
      });
  }
}

// Update online status in the UI
function updateOnlineStatus(isOnline: boolean) {
  // Dispatch custom event for components to listen to
  window.dispatchEvent(new CustomEvent('networkStatusChange', {
    detail: { isOnline }
  }));
  
  // Update document class for CSS styling
  document.documentElement.classList.toggle('offline', !isOnline);
  document.documentElement.classList.toggle('online', isOnline);
}

// Check if the app is running in standalone mode (PWA)
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const persistent = await navigator.storage.persist();
      console.log(`💾 Persistent storage: ${persistent ? 'granted' : 'denied'}`);
      return persistent;
    } catch (error) {
      console.error('❌ Persistent storage request failed', error);
      return false;
    }
  }
  return false;
}

// Get storage usage estimate
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      console.log('💾 Storage estimate:', estimate);
      return estimate;
    } catch (error) {
      console.error('❌ Storage estimate failed', error);
      return null;
    }
  }
  return null;
}

// Clear all caches
export async function clearAllCaches(): Promise<void> {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('🗑️ All caches cleared');
    } catch (error) {
      console.error('❌ Failed to clear caches', error);
    }
  }
}

// Initialize offline functionality
export function initializeOfflineSupport() {
  // Set initial online status
  updateOnlineStatus(navigator.onLine);
  
  // Request persistent storage for better offline experience
  requestPersistentStorage();
  
  // Log storage estimate
  getStorageEstimate();
}