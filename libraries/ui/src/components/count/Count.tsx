import type { ReactElement, ReactNode } from "react"

import "./Count.css"

/**
 * How large a count stands: the default on a line of text, and small inside a control,
 * where the default would outweigh the label beside it.
 */
export type CountSize = "default" | "small"

/**
 * The figures, the words read in their place, and how large the count stands.
 */
export interface CountProps {
  /**
   * The figures drawn on the pill – a number, or one with a sign before it, "+4".
   */
  readonly children: ReactNode
  /**
   * The words assistive technology reads in the figures' place – "3 ärenden", with the
   * joining words the line around it needs, " och 2 ledare". Left out, the figures are
   * read as they are.
   */
  readonly said?: string | undefined
  /**
   * How large it stands, the default unless said.
   */
  readonly size?: CountSize | undefined
}

/**
 * A count: a few figures on a small rounded pill in the theme's wash, beside the label of
 * what they count – how many a list holds, how many more a line leaves unnamed.
 *
 * @param props The figures, the words read in their place, and how large it stands.
 * @returns The count.
 */
export function Count(props: CountProps): ReactElement {
  const className = props.size === "small" ? "count count-small" : "count"
  if (props.said === undefined) {
    return <span className={className}>{props.children}</span>
  }
  return (
    <>
      <span aria-hidden="true" className={className}>
        {props.children}
      </span>
      <span className="count-said">{props.said}</span>
    </>
  )
}
