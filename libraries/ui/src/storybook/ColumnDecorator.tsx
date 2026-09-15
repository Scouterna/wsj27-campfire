import type { ReactElement } from "react"

/**
 * Wraps a story in the phone-width content column `stories.css` draws, for a component
 * that fills whatever width it is given and would otherwise stretch across the whole
 * canvas. Applied per story file rather than globally, because most stories want the
 * bare canvas.
 *
 * @param Story The story being rendered.
 * @returns The story, inside the column.
 */
export function ColumnDecorator(Story: () => ReactElement): ReactElement {
  return (
    <div className="story-column">
      <Story />
    </div>
  )
}
