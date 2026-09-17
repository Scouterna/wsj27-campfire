import { createRoute, type AnyRoute, type RouteComponent } from "@tanstack/react-router"

import { rootRoute } from "./root-route"

/**
 * Every address the application answers at.
 *
 * Empty here on purpose, and filled by each module from its own source:
 *
 * ```ts
 * declare module "@scouterna/wsj27-campfire-ui" {
 *   interface RouteRegistry {
 *     "/participants": Address<"participants">
 *   }
 * }
 * ```
 *
 * A URL space is one flat namespace, so it has to be described in one type – but that is
 * not the same as one module owning it. Declaring addresses this way means the library
 * never learns which modules exist, while two modules claiming one address still collide
 * at compile time.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- filled by module augmentation; see above
export interface RouteRegistry {}

/**
 * Marks an entry in the registry, naming the module that owns the address.
 *
 * The owner is what makes a clash visible. Interface merging accepts a property declared
 * twice with the *same* type, so a bare marker would let two modules quietly claim one
 * address and the later one would win at runtime. Branding the entry with its owner makes
 * the second declaration a different type, which is a compile error.
 */
export type Address<TOwner extends string> = TOwner

/**
 * Any address some module has declared.
 */
export type AppPath = keyof RouteRegistry

/**
 * One screen: the component that answers at an address, and what the chrome needs to
 * place it – which section lights up, and where back leads. What the screen is called
 * is the screen's own to say: it declares its name with `PageTitle`, because the page
 * is what knows its name – and, in time, the actions its bar carries.
 */
export interface ScreenSpec {
  readonly Component: RouteComponent
  /**
   * The section the screen belongs to, by the id the menus use. The application's
   * section guard reads it and fails closed, so a screen naming no section – or naming
   * one that does not exist – is reachable by nobody and answers as not found.
   */
  readonly tab?: string
  /**
   * The address back leads to from here. A screen without one is a section root and
   * offers no back control.
   */
  readonly parent?: AppPath
}

/**
 * A module's routing, as data: which screen answers at which address.
 */
export type Routes = Partial<Record<AppPath, ScreenSpec>>

/**
 * The screen a pathname names, matching `$param` segments the way the router does.
 *
 * A literal segment beats a parameter, as it does in the router: `/participants/new`
 * answers at its own screen even when `/participants/$id` would also match. Resolving it
 * by specificity rather than by the table's key order is what keeps this answer and the
 * router's the same screen – otherwise the chrome could name one page while another is
 * mounted.
 * @param pathname The address to look up, as `location.pathname` spells it.
 * @param screens The merged route table to look in.
 * @returns The matched path and its spec, or undefined when no screen answers there.
 */
export function matchScreen(
  pathname: string,
  screens: Routes,
): { readonly path: AppPath; readonly spec: ScreenSpec } | undefined {
  const actual = pathname.split("/")
  let parameterized: { readonly path: AppPath; readonly spec: ScreenSpec } | undefined

  for (const [path, spec] of Object.entries(screens)) {
    const pattern = path.split("/")
    if (pattern.length !== actual.length) {
      continue
    }

    const isMatch = pattern.every(
      // The index walks two arrays of equal, checked length – nothing user-typed
      // reaches a property lookup here.
      // eslint-disable-next-line security/detect-object-injection -- bounded array index
      (segment, index) => isParameter(segment) || segment === actual[index],
    )
    if (!isMatch) {
      continue
    }

    // A literal match is the answer outright; a parameterized one is held in case no
    // literal follows it in the table.
    if (pattern.every((segment) => !isParameter(segment))) {
      return { path: path as AppPath, spec }
    }
    parameterized ??= { path: path as AppPath, spec }
  }

  return parameterized
}

/**
 * Whether one path segment stands for a parameter rather than a literal.
 * @param segment One segment of a route's path.
 * @returns True for a `$param` segment.
 */
function isParameter(segment: string): boolean {
  return segment.startsWith("$")
}

/**
 * One address, as a route under the application's root.
 *
 * Its return type is deliberately left to inference and then read back by `RouteFor`,
 * because `createRoute` produces a type with eighteen parameters that change between
 * router versions. Inferring it from a real call is both shorter and more durable than
 * spelling it out.
 * @param path The address the route answers at.
 * @param component The screen that renders there.
 * @returns The route, typed by its own path.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inferred on purpose; see above
function make<TPath extends AppPath>(path: TPath, component: RouteComponent) {
  return createRoute({ getParentRoute: () => rootRoute, path, component })
}

/**
 * The route built for one address.
 */
export type RouteFor<TPath extends AppPath> = ReturnType<typeof make<TPath>>

/**
 * Turn a module's routing table into routes hung under the application's root.
 *
 * Returns a record rather than an array, and that is the whole trick: an array collapses
 * the routes into a single union type, and the router can then no longer tell which
 * address takes parameters – it demands a `params` object for every link. Keyed by path,
 * each route keeps its own type, and `Link` stays checked down to that detail.
 * @param routes The table to mount.
 * @returns The routes, keyed by path so each keeps its own type.
 */
export function mountRoutes<const TRoutes extends Routes>(
  routes: TRoutes,
): { [TPath in keyof TRoutes]: RouteFor<TPath & AppPath> } {
  const mounted: [string, AnyRoute][] = Object.entries(routes).map(([path, spec]) => [
    path,
    make(path as AppPath, spec.Component),
  ])

  // Through `unknown`: at runtime this is one uniform record, while the declared type
  // gives each key its own route. That per-key information is exactly what
  // `Object.fromEntries` cannot carry, which is why the cast exists rather than being
  // something a better signature would avoid.
  return Object.fromEntries(mounted) as unknown as {
    [TPath in keyof TRoutes]: RouteFor<TPath & AppPath>
  }
}
