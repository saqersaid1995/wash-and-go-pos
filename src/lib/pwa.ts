// PWA registration and install prompt utilities

let deferredPrompt: any = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let isRefreshing = false;

export function isPWAInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === "accepted";
}

function attachServiceWorkerUpdateHandling(registration: ServiceWorkerRegistration) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isRefreshing) return;
    isRefreshing = true;
    window.location.reload();
  });

  if (registration.waiting) {
    registration.waiting.postMessage("SKIP_WAITING");
  }

  registration.addEventListener("updatefound", () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
        newWorker.postMessage("SKIP_WAITING");
      }
    });
  });
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    attachServiceWorkerUpdateHandling(swRegistration);
    swRegistration.update().catch(() => undefined);
    console.log("SW registered:", swRegistration.scope);
    return swRegistration;
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

export function getServiceWorkerRegistration() {
  return swRegistration;
}

export async function cacheAppShell(): Promise<void> {
  const reg = swRegistration || (await navigator.serviceWorker?.ready);
  if (reg?.active) {
    reg.active.postMessage("CACHE_ALL");
  }
}

export function initPWA() {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent("pwa-install-available"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    console.log("PWA installed");
  });

  registerServiceWorker();
}
