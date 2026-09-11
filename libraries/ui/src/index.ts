/**
 * The design system's public surface. The stylesheet is a separate export condition –
 * `@scouterna/wsj27-campfire-ui/styles.css` – because what it carries is global: the
 * tokens, the faces, the reset, and the base. A component's own CSS is not global, so it
 * travels with the component and arrives when the component is imported.
 */

export { Logo } from "./components/logo/Logo"
export type { LogoProps } from "./components/logo/Logo"
export { isTheme, themes } from "./foundations/theme/Theme"
export type { Theme } from "./foundations/theme/Theme"
