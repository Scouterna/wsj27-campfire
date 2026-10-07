import type { Theme } from "@scouterna/wsj27-campfire-ui"
import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react"

import type { TextColor } from "../../../model/social/placement"
import { themeNames } from "./theme-names"

export interface TextColorToolProps {
  /**
   * The selected text's color, or undefined while no text is selected – which leaves the
   * tool unavailable.
   */
  readonly current: TextColor | undefined
  /**
   * Takes the color picked.
   */
  readonly onColor: (color: TextColor) => void
  /**
   * The color the picture is themed in, the third color a text can be set in.
   */
  readonly theme: Theme
}

/**
 * The colors a text can be set in. White and black because one of them reads over any
 * photo, and the theme's color because it is the picture's own.
 */
const colors: readonly TextColor[] = ["white", "black", "theme"]

/**
 * The selected text's color as one button, which fans the colors out under itself to
 * pick from, so the toolbar holds one dot rather than three.
 *
 * The fan folds back on a pick, on Escape, and on a press anywhere else.
 * @param props The selected text's color, the theme, and what picking does.
 * @returns The tool.
 */
export function TextColorTool(props: TextColorToolProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const tool = useRef<HTMLSpanElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const isShown = isOpen && props.current !== undefined

  // A press anywhere outside the tool folds the fan, the way a menu closes.
  useEffect(() => {
    if (!isShown) {
      return
    }
    const fold = (event: PointerEvent): void => {
      if (event.target instanceof Node && tool.current?.contains(event.target) !== true) {
        setIsOpen(false)
      }
    }
    document.addEventListener("pointerdown", fold)
    return () => {
      document.removeEventListener("pointerdown", fold)
    }
  }, [isShown])

  return (
    <span
      className="color-tool"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !isShown) {
          return
        }
        event.preventDefault()
        setIsOpen(false)
        toggle.current?.focus()
      }}
      ref={tool}
    >
      <button
        aria-expanded={isShown}
        aria-label="Textfärg"
        className={`text-tool text-tool-color text-tool-color-${props.current ?? "white"}`}
        disabled={props.current === undefined}
        onClick={() => {
          setIsOpen((was) => !was)
        }}
        ref={toggle}
        type="button"
      >
        <span aria-hidden="true" className="text-tool-swatch" />
      </button>
      <span
        aria-label="Textfärg"
        className={isShown ? "color-tool-fan color-tool-fan-open" : "color-tool-fan"}
        inert={!isShown}
        role="group"
      >
        {colors.map((color, index) => (
          <button
            aria-label={colorName(color, props.theme)}
            aria-pressed={props.current === color}
            className={`text-tool text-tool-color text-tool-color-${color}`}
            key={color}
            onClick={() => {
              props.onColor(color)
              setIsOpen(false)
              toggle.current?.focus()
            }}
            // Where it lands in the fan, by its place in it.
            style={{ "--fan-index": index } as CSSProperties}
            type="button"
          >
            <span aria-hidden="true" className="text-tool-swatch" />
          </button>
        ))}
      </span>
    </span>
  )
}

/**
 * What a text color is called, for the button that sets it.
 * @param color the color
 * @param theme the theme the picture wears, which names its color
 * @returns The name.
 */
function colorName(color: TextColor, theme: Theme): string {
  if (color === "theme") {
    // eslint-disable-next-line security/detect-object-injection -- the key is one of the five theme names the design system itself lists
    return `${themeNames[theme]} text`
  }
  return color === "black" ? "Svart text" : "Vit text"
}
