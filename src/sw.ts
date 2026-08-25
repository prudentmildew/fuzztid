// Custom service worker built via vite-plugin-pwa's injectManifest strategy.
// Typechecked separately against the WebWorker lib (tsconfig.worker.json) since
// this runs in a ServiceWorkerGlobalScope, not the DOM.
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

// vite-plugin-pwa injects the precache manifest here at build time.
const precacheManifest = (
  self as unknown as {
    __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
  }
).__WB_MANIFEST;

// Precache the whole first-party app shell — hashed JS/CSS/fonts/icons AND
// index.html — so a phone with no signal in Kulturkirken Jakob always has a
// complete app to launch. Hashed assets are CacheFirst-equivalent: an entry
// is only refetched when its content hash changes.
//
// directoryIndex: "" stops the precache route from answering "/" navigations
// from index.html cache-first; navigations go through the race route below
// instead. index.html stays in the precache cache, reachable via
// matchPrecache as the offline fallback.
precacheAndRoute(precacheManifest, { directoryIndex: "" });
cleanupOutdatedCaches();

// The navigation route is a plain race, not a strategy (ADR-0027): the
// runtime document cache is gone, so with an empty runtime cache
// NetworkFirst's timeout would be silently inert. The chain is
// network → precached shell — no middle hop that can go sticky-harmful on a
// newer deploy by naming exactly the bundle hash the active worker hasn't
// precached yet.
//
// Two seconds, not three: the document is ~750 bytes gzipped, so this is
// time-to-first-byte. One second loses the foreground refresh on most church
// connections; three holds a blank screen on every bad-signal launch.
registerRoute(
  ({ request }) => request.mode === "navigate",
  async ({ request }) => {
    const networked = await Promise.race([
      fetch(request).catch(() => undefined),
      new Promise<undefined>((resolve) => setTimeout(resolve, 2_000)),
    ]);
    if (networked?.ok) return networked;
    return (await matchPrecache("index.html")) ?? networked ?? Response.error();
  },
);

// No skipWaiting / clientsClaim: the updated worker waits and takes over on
// the next cold launch, never mid-session. With registerType "prompt" and no
// refresh UI in main.ts, that update stays silent.
