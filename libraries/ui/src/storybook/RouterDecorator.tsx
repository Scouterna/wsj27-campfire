import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { createContext, use, useState, type ReactElement } from "react"

/**
 * The story being shown, handed to the route below through a context rather than baked
 * into the route tree. Storybook re-renders the decorator with a fresh story whenever a
 * control changes, and a context is what carries that change through the router, whose
 * route components would otherwise keep rendering the story they were built with.
 */
const StoryContext = createContext<ReactElement>(<></>)

function StoryRoot(): ReactElement {
  return use(StoryContext)
}

/**
 * A router of its own for every story: memory history, so the address bar is never
 * touched, and one screen that is the story at every address. Any address the story
 * links to lands back on the story, so a component whose whole point is to navigate –
 * a tab bar, a menu – can be pressed without the canvas turning into a not-found page.
 * @returns The story's own router.
 */
function makeRouter(): ReturnType<typeof createRouter> {
  const rootRoute = createRootRoute({ component: Outlet })
  const routeTree = rootRoute.addChildren([
    createRoute({ getParentRoute: () => rootRoute, path: "/", component: StoryRoot }),
    createRoute({ getParentRoute: () => rootRoute, path: "$", component: StoryRoot }),
  ])
  return createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ["/"] }) })
}

/**
 * Wraps every story in a router, so components that navigate with `Link` or read the
 * location render outside the application. It is registered once in
 * `config/storybook/preview.tsx`, so navigation is configured for the whole catalog in
 * one place rather than story by story.
 *
 * @param Story The story being rendered.
 * @returns The story, inside its own memory-history router.
 */
export function RouterDecorator(Story: () => ReactElement): ReactElement {
  const [router] = useState(makeRouter)

  return (
    <StoryContext value={<Story />}>
      <RouterProvider router={router} />
    </StoryContext>
  )
}
