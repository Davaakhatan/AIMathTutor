"use client";

import { useEffect } from "react";

/**
 * Service Worker Registration Component
 * Registers the service worker and handles updates
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      console.log("[PWA] Service workers are not supported");
      return;
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("[PWA] Service Worker registered:", registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Handle updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New service worker available
              console.log("[PWA] New service worker available");
              // Optionally show update notification to user
              if (confirm("A new version is available. Reload to update?")) {
                window.location.reload();
              }
            }
          });
        });

        // Handle controller change (service worker activated)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[PWA] Service worker controller changed");
          // Optionally reload to use new service worker
          // window.location.reload();
        });
      } catch (error) {
        console.error("[PWA] Service Worker registration failed:", error);
      }
    };

    // Wait for page to load before registering
    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker);
    }
  }, []);

  return null; // This component doesn't render anything
}

