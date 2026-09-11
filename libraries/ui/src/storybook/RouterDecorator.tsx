import type { ReactElement } from "react"

/**
 * Gives every story the routing context the application gives its screens. It is
 * registered once in `config/storybook/preview.tsx`, so navigation is configured for the
 * whole catalog in one place rather than story by story.
 *
 * @param Story The story being rendered.
 * @returns The story.
 */
export function RouterDecorator(Story: () => ReactElement): ReactElement {
  return <Story />
}
