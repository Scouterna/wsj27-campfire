/**
 * The bridge contract: every message that crosses between the web application and a
 * shell, declared once here and mirrored by hand in Swift and Kotlin.
 *
 * A message carries text and state only – never a color, a font, a size, or a layout
 * value, because the native bars are styled natively, which is the reason for having
 * them. A theme crosses as a name and an icon as a semantic name.
 */

/**
 * The protocol version every message carries. A receiver drops a message carrying any
 * other, so a newer web inside an older shell degrades instead of misbehaving.
 */
export const bridgeVersion = 1

/**
 * One item a screen offers in the native bar – the primary action or an overflow menu
 * entry. The shell renders the label and sends the id back when it is tapped; what the
 * item does stays on the web side.
 */
export interface ScreenItem {
  /**
   * A semantic icon name the shell maps to its own set. A name it does not know draws
   * a neutral shape.
   */
  readonly icon?: string | undefined
  /**
   * The id the tap comes back with, unique within the screen.
   */
  readonly id: string
  /**
   * What the item says.
   */
  readonly label: string
  /**
   * Why the item cannot be chosen right now. A shell draws it disabled, with the reason
   * as its subtitle where the platform has one.
   */
  readonly unavailable?: string | undefined
}

/**
 * Web to shell: the screen showing now, sent whenever any part of it changes.
 */
export interface ScreenMessage {
  /**
   * The primary actions, drawn as bar buttons in this order. Usually none or one.
   */
  readonly actions: readonly ScreenItem[]
  /**
   * Whether the screen has a layer above it to go back to.
   */
  readonly canGoBack: boolean
  /**
   * Whether something on the screen fills it, so the shell hides its bars and lets the
   * page reach the screen's edges.
   */
  readonly fullScreen: boolean
  /**
   * The overflow menu as groups, drawn with a separator between them. Empty draws no
   * overflow control.
   */
  readonly menu: readonly (readonly ScreenItem[])[]
  /**
   * What the native navigation bar says.
   */
  readonly title: string
  readonly type: "screen"
  readonly v: typeof bridgeVersion
}

/**
 * One section the signed-in person may open, which a shell turns into a tab.
 */
export interface SectionSpec {
  /**
   * A semantic icon name, mapped by each shell to its own set.
   */
  readonly icon: string
  readonly id: string
  /**
   * The tab's label.
   */
  readonly label: string
  /**
   * The section's start screen, origin-relative – the address the tab's webview loads.
   */
  readonly path: string
}

/**
 * Who is signed in, as far as a native bar needs: the avatar's initials, and the
 * address the avatar opens, on which it is not drawn.
 */
export interface SessionProfile {
  /**
   * The picture drawn in place of the initials, as an image URL, or absent where the
   * initials stand. A shell draws only the schemes it can load and keeps the initials
   * for any other.
   */
  readonly avatar?: string
  readonly initials: string
  readonly path: string
}

/**
 * Web to shell: who is signed in. Signed in carries the sections and the profile, and
 * moves the shell from its one sign-in webview to its tabs; signed out moves it back.
 */
export type SessionMessage =
  | {
      readonly profile: SessionProfile
      readonly sections: readonly SectionSpec[]
      readonly signedIn: true
      readonly type: "session"
      readonly v: typeof bridgeVersion
    }
  | {
      readonly signedIn: false
      readonly type: "session"
      readonly v: typeof bridgeVersion
    }

/**
 * Web to shell: the name of the theme the person wears, which each shell maps to its
 * own palette. An unknown name falls back to blue.
 */
export interface ThemeMessage {
  readonly name: string
  readonly type: "theme"
  readonly v: typeof bridgeVersion
}

/**
 * Every message the web application sends a shell.
 */
export type ToShell = ScreenMessage | SessionMessage | ThemeMessage

/**
 * Shell to web: go back one layer.
 */
export interface BackMessage {
  /**
   * False when the shell's own swipe already animated the move, so the web pops
   * without a second animation. Absent means true.
   */
  readonly animated?: boolean
  readonly type: "back"
  readonly v: typeof bridgeVersion
}

/**
 * Shell to web: a back swipe was released without committing, after its back had
 * already been sent, so the screen it popped comes back, instantly.
 */
export interface ForwardMessage {
  readonly type: "forward"
  readonly v: typeof bridgeVersion
}

/**
 * Shell to web: the active tab was tapped again, at the top of its page.
 */
export interface PopToRootMessage {
  readonly type: "popToRoot"
  readonly v: typeof bridgeVersion
}

/**
 * Shell to web: an item the screen reported was tapped.
 */
export interface ActionMessage {
  readonly id: string
  readonly type: "action"
  readonly v: typeof bridgeVersion
}

/**
 * Shell to web: a native control wants an address shown – the avatar asking for the
 * profile – opened like any tapped link.
 */
export interface OpenMessage {
  /**
   * Origin-relative, as the web reported it.
   */
  readonly path: string
  readonly type: "open"
  readonly v: typeof bridgeVersion
}

/**
 * Every message a shell sends the web application.
 */
export type ToWeb = ActionMessage | BackMessage | ForwardMessage | OpenMessage | PopToRootMessage
