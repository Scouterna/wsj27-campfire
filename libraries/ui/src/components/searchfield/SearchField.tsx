import type { ChangeEventHandler, ReactElement, ReactNode } from "react"

import { SearchIcon } from "../../foundations/icons/set/SearchIcon"

import "./SearchField.css"

export interface SearchFieldProps {
  /**
   * The field's accessible name – "Sök deltagare". Rendered as a real label, hidden
   * from sight but read aloud, so the field is named even when the placeholder is not
   * shown or is left out.
   */
  readonly label: string
  /**
   * Fires on every keystroke, with the field's new value.
   */
  readonly onChange: ChangeEventHandler<HTMLInputElement>
  /**
   * The visible hint inside the empty field. A hint only – the name is `label`.
   */
  readonly placeholder?: string
  /**
   * What sits at the end of the field – a count of what the search left, a quiet
   * hint. Text or a passive mark, never a control, because the whole field is a label
   * and a button inside a label presses the input too.
   */
  readonly trailing?: ReactNode
  /**
   * The text in the field. The caller owns it.
   */
  readonly value: string
}

/**
 * The search field: a round sheet with the magnifier at its head, the input filling the
 * rest of it, and an optional trailing slot. The whole field is the label, so a press
 * anywhere on it puts the caret in the input.
 *
 * @param props The value, what a keystroke does, the accessible name, and the hint and
 * trailing slot to draw.
 * @returns The field.
 */
export function SearchField(props: SearchFieldProps): ReactElement {
  return (
    <label className="searchfield">
      <span className="searchfield-label">{props.label}</span>
      <span className="searchfield-mark" aria-hidden="true">
        <SearchIcon size={17} strokeWidth={2.2} />
      </span>
      {/* Names and numbers, which a keyboard's corrections only get wrong. The Search
          key puts the keyboard away, as a native search bar's does, since the results
          already follow every keystroke. */}
      <input
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="searchfield-input"
        enterKeyHint="search"
        onChange={props.onChange}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur()
          }
        }}
        placeholder={props.placeholder}
        spellCheck={false}
        type="search"
        value={props.value}
      />
      {props.trailing}
    </label>
  )
}
