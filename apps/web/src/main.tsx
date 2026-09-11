import { HomeScreen } from "@scouterna/wsj27-campfire-home"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

const container = document.querySelector("#root")
if (!container) {
  throw new Error("index.html has no #root element to mount into")
}

// The composition root: the one place that knows every module, which is what lets a
// module stay ignorant of its neighbors. Mounting happens here, never inside a module,
// for the same reason.
createRoot(container).render(
  <StrictMode>
    <HomeScreen />
  </StrictMode>,
)
