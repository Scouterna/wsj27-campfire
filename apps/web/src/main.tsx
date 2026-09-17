import { applyInitialTheme } from "@scouterna/wsj27-campfire-ui"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { wireNavigation } from "./navigation"
import { router } from "./routes"

// The theme goes on before the first paint: the sign-in screen must greet a returning
// brown-unit leader in brown, not flash blue until React catches up. `?theme=brown`
// seeds it for a visitor who has never been here, and is remembered from that point
// like any other stored preference.
applyInitialTheme()

// The direction listeners go on before the router mounts, so the very first click is
// already decided by its source.
wireNavigation()

// A back-forward cache restore is not a load: Safari brings the whole document back
// with screens drawn for a session whose sign-out may have happened in another
// document. The gate only asks on a load, so a restore reloads – and the gate asks
// again against the cookies as they are now.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    location.reload()
  }
})

const container = document.querySelector("#root")
if (!container) {
  throw new Error("index.html has no #root element to mount into")
}

// The router owns the tree from here: the composition root is routes.tsx, the one
// place that knows every module, and its AppChrome is the session gate in front of
// every address.
createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
