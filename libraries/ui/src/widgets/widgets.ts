import type { ComponentType } from "react"

/**
 * Every widget a screen can place by id.
 *
 * Empty here on purpose, and filled by each module from its own source:
 *
 * ```ts
 * declare module "@scouterna/wsj27-campfire-ui" {
 *   interface WidgetRegistry {
 *     "journey:countdown": WidgetFrom<"journey">
 *   }
 * }
 * ```
 *
 * A widget is how one module's work appears on another module's screen without either
 * importing the other: the providing module declares the id and exports the table that
 * fills it, the application merges the tables, and the placing screen names the id.
 * The library never learns which modules exist, while two modules claiming one id
 * still collide at compile time.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- filled by module augmentation; see above
export interface WidgetRegistry {}

/**
 * Marks an entry in the registry, naming the module that owns the widget – the brand
 * that makes a second module claiming the same id a compile error rather than a race
 * the later import wins.
 */
export type WidgetFrom<TOwner extends string> = TOwner

/**
 * Any widget id some module has declared.
 */
export type WidgetId = keyof WidgetRegistry

/**
 * The table one module may export: only the ids it declared itself. This is where the
 * brand is read – an entry under another module's id is a compile error, so spreading
 * the tables together can never let one module silently replace another's widget.
 */
export type WidgetsFrom<TOwner extends string> = Readonly<{
  [TId in WidgetId as WidgetRegistry[TId] extends TOwner ? TId : never]?: ComponentType
}>

/**
 * A table of widgets by id – what the application hands `WidgetsProvider` once the
 * modules' tables are merged. A widget takes no props, because it reads what it needs
 * where it is used, from the ambient session or its own queries, so the placing screen
 * has nothing to thread.
 */
export type Widgets = Readonly<Partial<Record<WidgetId, ComponentType>>>
