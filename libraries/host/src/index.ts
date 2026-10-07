/**
 * Where the web application is running, and the bridge it talks to a shell over.
 *
 * Importing this module computes the host, once and synchronously, and in a shell
 * installs the receiver the shell delivers to. In a browser every sender is a no-op and
 * no handler is ever called, so a caller never asks which tier it is in.
 */

export { onShellMessage, sendToShell } from "./bridge"
export { host, type Host, type ShellPlatform, type Tier } from "./host"
export {
  bridgeVersion,
  type ActionMessage,
  type BackMessage,
  type ForwardMessage,
  type OpenMessage,
  type PopToRootMessage,
  type ScreenItem,
  type ScreenMessage,
  type SectionSpec,
  type SessionMessage,
  type SessionProfile,
  type ThemeMessage,
  type ToShell,
  type ToWeb,
} from "./messages"
