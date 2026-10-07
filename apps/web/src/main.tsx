import { host } from "@scouterna/wsj27-campfire-host"
import { applyInitialTheme, setNavDirection } from "@scouterna/wsj27-campfire-ui"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { wireNavigation } from "./navigation"
import { router } from "./routes"
import { wireServiceWorkerUpdates } from "./service-worker"
import { loadDisplayFace } from "./shell"

// The theme goes on before the first paint, so the sign-in screen greets a returning
// brown-unit leader in brown rather than flashing blue until React catches up.
applyInitialTheme()

// In a shell the page is an app screen rather than a document, so a pinch, a double tap,
// or a focused field never zooms it. Text still follows the system's text size, which is
// how an app is enlarged; a browser keeps zooming. The attribute is what the stylesheet
// keys the rest of the app-screen behavior on, sign-in included, and its value names the
// platform for what only one shell draws over the page.
if (host.tier === "shell") {
  document.documentElement.dataset["shell"] = host.platform ?? ""
  void loadDisplayFace()
  const viewport = document.querySelector('meta[name="viewport"]')
  viewport?.setAttribute(
    "content",
    `${viewport.getAttribute("content") ?? ""}, maximum-scale=1, user-scalable=no`,
  )
}

// The direction listeners go on before the router mounts, so the very first click is
// already decided by its source.
wireNavigation()

// The router runs its first render as a view transition too, from the empty document,
// and the first screen should simply be there rather than fade in from blank paper.
setNavDirection("none")

// The update listeners go on before anything renders, so a deploy that takes over
// during boot still reaches the page as one reload rather than staying invisible.
wireServiceWorkerUpdates()

// Safari's back-forward cache brings the whole document back, with screens drawn for a
// session whose sign-out may have happened in another document. The gate asks only on
// a load, so a restore reloads, and the gate asks against the cookies as they are now.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    location.reload()
  }
})

const container = document.querySelector("#root")
if (!container) {
  throw new Error("index.html has no #root element to mount into")
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
