import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { QueryProvider } from './providers/QueryProvider'
import { registerServiceWorker, initializeOfflineSupport } from './utils/serviceWorker'
import { errorTrackingService } from './services/ErrorTrackingService'
import { performanceMonitoringService } from './services/PerformanceMonitoringService'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <App />
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>,
)

console.log('Main.tsx loaded successfully');

// Initialize offline support and register service worker
initializeOfflineSupport();

// Initialize error tracking
errorTrackingService.addBreadcrumb('Application started', 'app', 'info');

// Initialize performance monitoring
performanceMonitoringService.recordMetric('APP_START', performance.now());

registerServiceWorker({
  onSuccess: (registration) => {
    console.log('✅ Service Worker: App is ready for offline use');
  },
  onUpdate: (registration) => {
    console.log('🔄 Service Worker: New content available, please refresh');
    // You could show a notification to the user here
  },
  onOffline: () => {
    console.log('📴 App: Offline mode activated');
  },
  onOnline: () => {
    console.log('🌐 App: Online mode restored');
  }
});
