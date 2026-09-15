# Design

This chapter is how Campfire looks and feels. The foundations are set – the contingent's colors, five unit themes, one display face, and a token layer that keeps raw values out of components – and what is built on them is cataloged in Storybook.

## The foundations that are set

- **The contingent's colors, not an invented palette.** `libraries/ui/assets/styles/tokens.css` holds the paper `#f4f2ec` and the ink `#1a1a1a` every page is printed in, and the five unit colors beside them: blue `#2a778a`, brown `#985b15`, green `#768b33`, red `#cd4b17`, and yellow `#f4c125` – the exact ring colors of the five badge marks, with each theme's ink the badge's inner-disc color. The badge marks are the palette's source of truth: a value that drifts from them is wrong, however slightly.
- **Five themes, one per unit color.** A theme is `blue`, `brown`, `green`, `red`, or `yellow`, blue being the contingent's own and the default. Each is a pair of primitives – `--color-theme-bright`, the unit's stripe color, and `--color-theme-ink`, the darker tone the same identity reads and clicks in – and `[data-theme="<name>"]` swaps the pair rather than every rule that reads it, so a rule names a theme color once and follows whichever unit is in force. Two roles ride along for what sits on a fill: `--color-theme-on-bright` is white except on yellow, whose bright is too light to carry white and gets its ink instead, and `--color-theme-on-ink` is white on all five. The names are typed in `libraries/ui/src/foundations/theme/Theme.ts`, which exports the five, the `Theme` type, and `isTheme` to check an untyped one, because the theme reaches the library from outside – a stored preference, a query parameter, or Storybook's toolbar. The web application stamps the attribute on the document before React boots, so a returning brown-unit leader does not flash blue on the way in.
- **Which theme a unit wears is a table in the `ui` library.** The register knows only a unit's number, so `unitTheme` maps the 53 numbers to their colors – Campfire's own data, edited beside the themes it names – with `cmtTheme`, the management's red, and `istTheme`, red until the IST patrols get identities of their own, beside it.
- **Raw values live in the tokens, and nowhere else.** A component names a role – `--color-theme-bright`, `--typography-display-font_family` – and never a hex code. What the tokens do not cover, a component spells out in its own stylesheet, and a value becomes a token once a second component wants it.
- **Styling lives in a stylesheet.** Every component's rules sit in the `.css` file beside it and travel with it, and the class names are part of the library's public vocabulary – a module can write `className="logo"` as readily as it renders `<Logo>`. Nothing sets a `style` prop; the prop is reserved for values only the runtime knows.
- **The cascade order is declared before any stylesheet loads.** `apps/web/index.html` names the layers `tokens, fonts, reset, base, component, screen` inline in the document, so load order cannot decide which rule wins. Every rule in the design system is written into one of those layers.
- **Sizes are rem against a 17-point base.** Every font size is written `calc(<N>rem / 17)`, never a bare `px`. The root is `calc(100% * 17 / 16)`, and on iOS and iPadOS it becomes `font: -apple-system-body` – Dynamic Type itself – so the text size the reader set in Settings carries through every role in the system. A prose column's measure follows the same logic: it is written in text units – `max-width: 21em`, never a pixel width – so grown text gets a wider column instead of shorter lines.
- **One display face, and the platform's own for everything else.** Bravely Script is the jamboree's display face, shipped as `bravelyscript.woff2` with the UI library and used for the wordmark. Only a regular weight is drawn, so the weight is a token too: asking for bold would have the browser synthesize one, and a synthesized script is a smear. The face is waited for rather than swapped in – `font-display: block` – because a headline that repaints from a fallback face is worse than one that arrives a beat later. Body text is `system-ui` on purpose – it is the face the reader already trusts, it costs nothing to download, and it follows the platform.

## One product across a moving seam

Campfire is one web application inside two native shells ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)). The shells draw the chrome – launch screen, navigation bar, tab bar – and the webview everything under it, and a reader should never notice where one ends and the other begins.

Holding that seam shut has a cost, and the decision behind it is already taken: the bridge carries a theme _name_ and never a color ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)), so each shell keeps its own copy of the palette. The alternative would be shipping colors over the bridge, which would make the shells thin renderers of whatever the web sent and would break the moment an old app met a new web. Duplicating a few hex values by hand is the cheaper mistake, and the comment at the top of `tokens.css` says so: a change to the paper is a change in three places or none.

Each shell maps the name it is sent to a palette of its own – per-theme inks used as tint and title color on Apple, a full Material 3 color scheme per theme on Android – and both launch screens hold the contingent's blue, `#2a778a`, before the first document paints. [Applications](../architecture/applications) lists where else the two shells differ.

## The catalog is Storybook

Storybook is where the design system is read ([ADR 023](/decisions/023-catalog-the-ui-in-storybook)). `pnpm start:storybook` runs it on port 3002, and it indexes every `*.stories.tsx` under `libraries/ui` and `modules/*` – so one instance shows a component and a whole screen.

The sidebar runs Introduction, Foundations, Components, Modules, in that order rather than alphabetically. The Introduction page states the rules the system is written under, Foundations and Components hold the design system itself, and Modules holds each module's screens and widgets.

Three properties are worth naming.

- **Every story renders in a theme.** A decorator wraps each story in the unit color the toolbar picked, and the toolbar offers all five, so the catalog has to hold up in each of them. The mark goes on a wrapper rather than on the document, so a story that themes itself still wins locally.
- **Storybook is themed like the guidebook.** `config/storybook/theme.ts` gives the manager and the Docs pages the guidebook's own look – the contingent's official red where VitePress puts its brand color, VitePress's grays and font stack, and the same app icon its nav bar carries – so the catalog and the guidebook read as one project. Only the guidebook is published; Storybook is built in continuous integration and hosted nowhere.
- **It reports nowhere.** Storybook's telemetry is switched off. Nothing in this repository phones home.

## Accessibility

WCAG 2.2 Level AA is the target ([Quality attributes](../requirements/quality)). Two parts of it are written into the base stylesheet: every size is rem against the 17-point base, so a leader who has turned Dynamic Type up gets a bigger application, not a clipped one, and the focus ring is drawn in the unit color in force rather than removed.

The rest of the target is VoiceOver and TalkBack working through the web content, animation that steps aside for reduced motion, and color contrast that meets AA. It is a target the application is held to, not a measured result.
