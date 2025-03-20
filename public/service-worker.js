/* eslint-disable no-restricted-globals */

// Custom service worker with advanced caching for Uncrypt game
const APP_VERSION = "1.0.0";
const CACHE_NAME = `uncrypt-cache-v${APP_VERSION}`;

// App shell assets to be cached during the install phase
const APP_SHELL_ASSETS = [
  "/",
  "/index.html",
  "/static/js/main.chunk.js",
  "/static/js/0.chunk.js",
  "/static/js/bundle.js",
  "/manifest.json",
];

// API cache configuration - separate settings for different endpoints
const API_CACHE_CONFIG = {
  // Game start data is cached with network-first strategy
  start: {
    name: `uncrypt-api-start-v${APP_VERSION}`,
    maxEntries: 5,
    strategy: "network-first",
    expiration: 24 * 60 * 60 * 1000, // 24 hours
  },
  // Leaderboard data cached with stale-while-revalidate
  leaderboard: {
    name: `uncrypt-api-leaderboard-v${APP_VERSION}`,
    maxEntries: 20,
    strategy: "stale-while-revalidate",
    expiration: 15 * 60 * 1000, // 15 minutes
  },
  // General API cache
  default: {
    name: `uncrypt-api-v${APP_VERSION}`,
    maxEntries: 50,
    strategy: "network-first",
    expiration: 60 * 60 * 1000, // 1 hour
  },
};

// ======= Service Worker Lifecycle Events =======

// Install event - cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching app shell assets");
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => self.skipWaiting()), // Activate worker immediately
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  const cacheAllowlist = [
    CACHE_NAME,
    API_CACHE_CONFIG.start.name,
    API_CACHE_CONFIG.leaderboard.name,
    API_CACHE_CONFIG.default.name,
  ];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheAllowlist.includes(cacheName)) {
              console.log("Deleting outdated cache:", cacheName);
              return caches.delete(cacheName);
            }
            return null;
          }),
        );
      })
      .then(() => self.clients.claim()), // Take control of clients immediately
  );
});

// Fetch event - handle requests with different strategies
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and browser extensions
  if (event.request.method !== "GET" || url.protocol === "chrome-extension:") {
    return;
  }

  // Handle API requests (backend endpoints)
  if (
    url.href.includes("uncryptbe.replit.app") ||
    url.pathname.startsWith("/start") ||
    url.pathname.startsWith("/guess") ||
    url.pathname.startsWith("/hint")
  ) {
    // Determine cache config based on the endpoint
    let cacheConfig = API_CACHE_CONFIG.default;

    if (url.pathname.startsWith("/start")) {
      cacheConfig = API_CACHE_CONFIG.start;
    } else if (url.pathname.includes("leaderboard")) {
      cacheConfig = API_CACHE_CONFIG.leaderboard;
    }

    // Handle based on caching strategy
    if (cacheConfig.strategy === "network-first") {
      return event.respondWith(
        networkFirstStrategy(event.request, cacheConfig),
      );
    } else if (cacheConfig.strategy === "stale-while-revalidate") {
      return event.respondWith(
        staleWhileRevalidateStrategy(event.request, cacheConfig),
      );
    }
  }

  // For non-API requests (static assets), use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache non-success responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response before caching it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // For navigation requests, return the cached homepage as fallback
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          return null;
        });
    }),
  );
});

// ======= Caching Strategies =======

// Network First strategy - try network, fall back to cache
function networkFirstStrategy(request, cacheConfig) {
  return caches.open(cacheConfig.name).then((cache) => {
    return fetch(request)
      .then((response) => {
        // Cache valid responses
        if (response.ok) {
          // Clone the response before caching
          const clonedResponse = response.clone();
          cache.put(request, clonedResponse);

          // Clean cache if too many entries
          cleanCache(cache, cacheConfig.maxEntries);
        }
        return response;
      })
      .catch(() => {
        // Return from cache if network fails
        return cache.match(request);
      });
  });
}

// Stale While Revalidate - return cached version immediately, then update cache
function staleWhileRevalidateStrategy(request, cacheConfig) {
  return caches.open(cacheConfig.name).then((cache) => {
    return cache.match(request).then((cachedResponse) => {
      // Start network fetch regardless of cached response
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // Cache the updated response if valid
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
            cleanCache(cache, cacheConfig.maxEntries);
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails, we already returned the cached response if available
          console.log("Network request failed, already served from cache");
        });

      // Return the cached response immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    });
  });
}

// ======= Utility Functions =======

// Clean cache if it has too many entries
function cleanCache(cache, maxEntries) {
  if (!maxEntries) return;

  cache.keys().then((keys) => {
    if (keys.length > maxEntries) {
      // Delete oldest entries first (LRU)
      return cache.delete(keys[0]).then(() => cleanCache(cache, maxEntries));
    }
  });
}

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
