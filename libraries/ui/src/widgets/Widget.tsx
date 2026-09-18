import { createContext, useContext, type ReactElement, type ReactNode } from "react"

import type { WidgetId, Widgets } from "./widgets"

const WidgetsContext = createContext<Widgets>({})

export interface WidgetsProviderProps {
  /**
   * The subtree whose screens may place widgets – in practice the whole signed-in
   * application.
   */
  readonly children: ReactNode
  /**
   * Every module's widget table, merged. The application mounts this once, because it
   * is the only place that knows every module.
   */
  readonly widgets: Widgets
}

/**
 * Makes the application's widgets placeable by id anywhere below.
 * @param props The merged widget tables, and the subtree that may place from them.
 * @returns The provider.
 */
export function WidgetsProvider(props: WidgetsProviderProps): ReactElement {
  return <WidgetsContext.Provider value={props.widgets}>{props.children}</WidgetsContext.Provider>
}

export interface WidgetProps {
  /**
   * The widget to place, by the id its module declared.
   */
  readonly id: WidgetId
}

/**
 * Another module's widget, placed by id. An id nobody registered renders nothing –
 * the honest behavior for a build, a story, or a test assembled without that module.
 * @param props The id of the widget to place.
 * @returns The widget, or nothing when the id is not registered.
 */
export function Widget(props: WidgetProps): ReactElement | null {
  const Registered = useContext(WidgetsContext)[props.id]
  return Registered === undefined ? null : <Registered />
}
