import { createRootRoute, Outlet } from "@tanstack/react-router"

/**
 * The route every other route in the application hangs under.
 *
 * Created here so a module can name it directly instead of staying generic over a parent
 * it is handed. It renders only an `Outlet`: the chrome around the pages belongs to the
 * application, which supplies it as the router's `InnerWrap` rather than by reaching in
 * and mutating this route.
 */
export const rootRoute = createRootRoute({ component: Outlet })
