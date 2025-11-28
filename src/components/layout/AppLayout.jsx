import React, { useEffect } from 'react';
import PrimarySidebar from './PrimarySidebar';
import TopHeader from './TopHeader';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import DebugInfo from '../DebugInfo';

export default function AppLayout({ children }) {
  // Debug logging to identify render blockers
  useEffect(() => {
    console.log('[AppLayout] Component mounted - checking render status');

    const root = document.getElementById('root');
    console.log('[AppLayout] Root element exists:', !!root);

    if (root) {
      console.log('[AppLayout] Root has children:', root.childNodes.length);
    }

    const checkTimeout = setTimeout(() => {
      console.log('[AppLayout] Post-mount check - verifying render completion');
      console.log('[AppLayout] Document ready state:', document.readyState);
      console.log('[AppLayout] Body children count:', document.body.childNodes.length);
    }, 1000);

    return () => clearTimeout(checkTimeout);
  }, []);

  // Global error handling - UPDATED: Removed unload handler
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('[Global] Unhandled promise rejection:', event.reason);
      event.preventDefault();

      if (window.reportError) {
        window.reportError('UnhandledRejection', event.reason);
      }
    };

    const handleError = (event) => {
      console.error('[Global] Global error:', event.error);

      if (window.reportError) {
        window.reportError('GlobalError', event.error);
      }
    };

    // REPLACED: unload with pagehide for better bfcache support
    const handlePageHide = (event) => {
      console.log('[AppLayout] Page hidden - cleaning up resources');
      // Cleanup any active connections, timers, etc.
      if (event.persisted) {
        console.log('[AppLayout] Page is being stored in bfcache');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // Emergency Dashboard Access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('force-dashboard')) {
      console.log('[AppLayout] Emergency dashboard access enabled');
      sessionStorage.setItem('forceDashboard', 'true');
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <DebugInfo />
      {/* Header spans full width at the top - Hidden on mobile */}
      <div className="hidden md:block">
        <TopHeader />
      </div>
      
      {/* Sidebar and main content below header */}
      <div className="flex flex-1 overflow-hidden pb-[60px] md:pb-0">
        <div className="hidden md:flex h-full">
            <PrimarySidebar />
        </div>
        <main className="bg-[#ffffff] flex-1 overflow-y-auto" role="main" aria-label="Main content">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}