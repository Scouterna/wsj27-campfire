import { buildOf } from "./deployed-build"

/**
 * The update half of the PWA. vite-plugin-pwa generates the worker and registers it,
 * which is what makes an offline start work at all; this wiring decides when a new
 * deploy reaches a page that is already open. The generated worker skips waiting and
 * claims its clients, so "a new worker took control" and "a new deploy is live" are the
 * same event, and the page answers it by reloading itself onto the new version.
 *
 * That is the worker's own way, and it depends on the browser fetching, installing, and
 * activating the new worker. A copy where that never happens would run its old build
 * for good, with nothing its reader could do about it. So the page also asks the server
 * itself which build is deployed, and when the worker is not bringing that build, the
 * page drops the worker and its cache and reloads from the network.
 *
 * The recovery gives up the copy's offline cache, so it is held back wherever the cache
 * is worth more: while a new worker is still installing, which on a poor connection is
 * slow rather than stuck, unless the newer build's own script answers, and while the
 * reader is writing.
 */

// How long the worker is given to start bringing a newer build before the page looks at
// what it is doing, and how long between each look after that.
const graceMs = 60_000

// How many looks a worker that is still installing is given before the page stops
// waiting for it – a quarter of an hour, past which an install is not coming.
const mostLooks = 15

// How often the server is asked at most, so a reader switching between applications does
// not ask on every return.
const askEveryMs = 60_000

// Where the build a page was last recovered onto is noted, for the life of the tab, so
// one deployed build is recovered onto once and a recovery can never loop.
const recoveredKey = "campfire:recovered-build"

/**
 * Starts the update behaviors once, at boot – one reload when a new deploy takes control
 * of an already-controlled page, and a check for a newer build once the page has loaded,
 * whenever the application returns to the foreground, and when a connection returns. A
 * browser without service workers gets a no-op.
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
  // foreground is a moment to ask, and so is a connection coming back.
  addEventListener("load", () => {
    void checkForUpdate()
  })
  addEventListener("online", () => {
    void checkForUpdate()
  })
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkForUpdate()
    }
  })
}

// When the server was last asked, and whether a recovery is already waiting out its
// grace, so one newer build starts one wait.
const asking = { at: 0, isWaiting: false, looks: 0 }

/**
 * One opportunistic update check: ask the server which build is deployed, and when it is
 * not the one running, ask the worker to fetch itself afresh and give it a grace to take
 * over. Every failure is no update. Offline is the expected failure, and quietly staying
 * on the current version is exactly what an offline start promises.
 */
async function checkForUpdate(): Promise<void> {
  if (asking.isWaiting || Date.now() - asking.at < askEveryMs) {
    return
  }
  asking.at = Date.now()
  const deployed = await deployedBuild()
  if (deployed === undefined || deployed === runningBuild()) {
    return
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration?.update()
  } catch {
    // No worker to ask – the grace below still ends in the newer build.
  }
  asking.isWaiting = true
  asking.looks = 0
  lookAgain()
}

/**
 * Looks at the recovery again after a grace.
 */
function lookAgain(): void {
  setTimeout(() => {
    void recover()
  }, graceMs)
}

/**
 * Whether the recovery should wait: a new worker is on its way, or the reader is in the
 * middle of writing something a reload would take from them.
 * @returns True while it is too early.
 */
async function isTooEarly(): Promise<boolean> {
  const registration = await navigator.serviceWorker.getRegistration()
  if (registration?.installing || registration?.waiting) {
    return true
  }
  const focused = document.activeElement
  return (
    focused instanceof HTMLInputElement ||
    focused instanceof HTMLTextAreaElement ||
    (focused instanceof HTMLElement && focused.isContentEditable)
  )
}

/**
 * Whether the newer build's own script answers as a script – asked before the cache is
 * given up, so the copy never trades a build that works offline for one it cannot fetch.
 * @param build The build's entry script's address.
 * @returns True when the script is there.
 */
async function isReachable(build: string): Promise<boolean> {
  try {
    const response = await fetch(build, { cache: "no-store" })
    return response.ok && (response.headers.get("content-type") ?? "").includes("javascript")
  } catch {
    return false
  }
}

/**
 * The build the page is running.
 * @returns Its entry script's address, or undefined where the page has none.
 */
function runningBuild(): string | undefined {
  // Read off the element rather than by the way a served page is read, since the page
  // is already parsed here.
  const entry = document.querySelector('script[type="module"][src]')
  return entry?.getAttribute("src") ?? undefined
}

/**
 * The build the server serves right now.
 * @returns Its entry script's address, or undefined when the server could not be asked.
 */
async function deployedBuild(): Promise<string | undefined> {
  try {
    // Past the browser's cache, and with a query the worker's precache holds no answer
    // for, so the page that comes back is the server's own.
    const response = await fetch(`/index.html?deployed=${String(Date.now())}`, {
      cache: "no-store",
    })
    return response.ok ? buildOf(await response.text()) : undefined
  } catch {
    return undefined
  }
}

/**
 * Brings the page onto the deployed build without the worker, once the worker has had
 * its grace and the page is still on another build: the worker and everything it cached
 * are dropped, and the page reloads from the network, where it registers a fresh worker.
 * Once per deployed build per tab, so a server that answers with two builds in turn,
 * mid-rollout, cannot keep a page reloading.
 */
async function recover(): Promise<void> {
  const deployed = await deployedBuild()
  if (deployed === undefined || deployed === runningBuild()) {
    asking.isWaiting = false
    return
  }
  asking.looks += 1
  if (asking.looks < mostLooks && (await isTooEarly())) {
    lookAgain()
    return
  }
  asking.isWaiting = false
  if (!(await isReachable(deployed))) {
    return
  }
  try {
    if (sessionStorage.getItem(recoveredKey) === deployed) {
      return
    }
    sessionStorage.setItem(recoveredKey, deployed)
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(async (registration) => registration.unregister()))
    const stores = await caches.keys()
    await Promise.all(stores.map(async (store) => caches.delete(store)))
  } catch {
    // A browser that refuses any of it still gets the reload, which is the part that
    // fetches the newer build wherever the browser's own cache allows.
  }
  location.reload()
}
