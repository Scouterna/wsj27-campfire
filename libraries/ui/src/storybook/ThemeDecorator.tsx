import type { ReactElement } from "react"

import { isTheme } from "../foundations/theme/Theme"

/**
 * Wraps every story in the theme the toolbar picked, so the whole catalog can be read in
 * any of the five unit colors. The mark goes on a wrapper rather than on the document,
 * so a story that themes itself – a five-up comparison – still wins locally.
 *
 * @param Story The story being rendered.
 * @param context The story's context.
 * @param context.globals The globals the toolbar sets.
 * @param context.globals.theme The unit color the toolbar picked.
 * @returns The story, inside a themed scope.
 */
export function ThemeDecorator(
  Story: () => ReactElement,
  context: { readonly globals: { readonly theme?: unknown } },
): ReactElement {
  const theme = isTheme(context.globals.theme) ? context.globals.theme : "blue"

  return (
    <div data-theme={theme}>
      <Story />
    </div>
  )
}
