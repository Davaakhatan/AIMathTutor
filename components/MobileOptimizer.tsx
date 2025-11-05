"use client";

import { useEffect, useState } from "react";

/**
 * Mobile Optimizer Component
 * Detects mobile devices and applies mobile-specific optimizations
 */
export default function MobileOptimizer() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setIsMobile(isMobileDevice || window.innerWidth < 768);
      setIsTouchDevice(isTouch);
      
      // Add mobile class to document for CSS targeting
      if (isMobileDevice || window.innerWidth < 768) {
        document.documentElement.classList.add('mobile-device');
      } else {
        document.documentElement.classList.remove('mobile-device');
      }
      
      if (isTouch) {
        document.documentElement.classList.add('touch-device');
      } else {
        document.documentElement.classList.remove('touch-device');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Prevent zoom on double tap (iOS)
  useEffect(() => {
    if (isTouchDevice) {
      let lastTouchEnd = 0;
      const preventDoubleTapZoom = (e: TouchEvent) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      };
      
      document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
      
      return () => {
        document.removeEventListener('touchend', preventDoubleTapZoom);
      };
    }
  }, [isTouchDevice]);

  // Add viewport meta tag if not present (for mobile)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes');
        document.getElementsByTagName('head')[0].appendChild(viewport);
      }
    }
  }, []);

  return null; // This component doesn't render anything
}

