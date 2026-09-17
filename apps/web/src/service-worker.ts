/**
 * The update half of the PWA. vite-plugin-pwa generates the worker and registers it,
 * which is what makes an offline start work at all; this wiring decides when a new
 * deploy reaches a page that is already open. The generated worker takes control the
 * moment it installs (`registerType: "autoUpdate"` means `skipWaiting` and
 * `clientsClaim`), so "a new worker took control" and "a new deploy is live" are the
 * same event – and the page answers it by reloading itself onto the new version.
 */

/**
 * Starts the two update behaviors, once, at boot: one reload when a new deploy takes
 * control of an already-controlled page, and an update check whenever the application
 * returns to the foreground. A browser without service workers – the dev server never
 * registers one either – gets a no-op.
 */
export function wireServiceWorkerUpdates(): void {
  if (!("serviceWorker" in navigator)) {
    return
  }

  // Only a page that was already controlled reloads. On the very first visit the new
  // worker claims the page mid-load, and reloading then would restart exactly the
  // visitor who already has the newest version. The flag holds it to one reload, so a
  // misbehaving worker can never loop the page.
  const wasControlled = navigator.serviceWorker.controller !== null
  let hasReloaded = false
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!wasControlled || hasReloaded) {
      return
    }
    hasReloaded = true
    location.reload()
  })

  // The browser checks for a new worker on every navigation by itself; an installed
  // PWA resumed from the background makes no navigation, so returning to the
  // foreground is the moment to ask.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkForUpdate()
    }
  })
}

/**
 * One opportunistic update check: ask the registration to fetch the worker afresh, and
 * treat every failure as no update. Offline is the expected failure, and quietly
 * staying on the current version is exactly what an offline start promises.
 */
async function checkForUpdate(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration?.update()
  } catch {
    // No update reachable – the next foreground moment asks again.
  }
}
