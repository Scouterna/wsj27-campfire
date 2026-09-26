import type { ReactElement } from "react"

import { PageHeading } from "../components/pageheading/PageHeading"
import { usePageTitle } from "../components/pagetitle/PageTitle"

/**
 * Wraps a screen's story in the page column the application puts a screen in: the page
 * heading, reading the title the screen declares through `PageTitle`, over the content
 * – without it a screen story is title-less body text, because the heading owns the
 * page's `h1`. The condensed bar is left out, because it belongs to phone width and has
 * stories of its own.
 *
 * Applied per story file rather than globally, because only whole screens render in a
 * page column.
 *
 * @param Story The story being rendered.
 * @returns The story, in the column it would sit in.
 */
export function ScreenDecorator(Story: () => ReactElement): ReactElement {
  const title = usePageTitle() ?? ""

  return (
    <div className="story-screen">
      <PageHeading title={title} />
      <div className="story-screen-content">
        <Story />
      </div>
    </div>
  )
}
