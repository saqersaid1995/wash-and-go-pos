// PWA registration and install prompt utilities

let deferredPrompt: any = null;
let swRegistration: ServiceWorkerRegistration | null = null;

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

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
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
  // Capture install prompt
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent("pwa-install-available"));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    console.log("PWA installed");
  });

  // Register SW
  registerServiceWorker();
}
