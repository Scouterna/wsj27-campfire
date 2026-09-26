# Design

Campfire looks like the contingent: its paper and ink, its unit colors, and the jamboree's script for the wordmark. The design system lives in `libraries/ui` as tokens, components, and a catalog, and every module draws with it. The foundations below are what every screen is built on, and Storybook is where they are read.

## Color

Every page is printed in ink `#1a1a1a` on paper `#f4f2ec`. Beside them sit the contingent's unit colors, taken exactly from the rings of the unit badge marks – blue `#2a778a`, brown `#985b15`, green `#768b33`, red `#cd4b17`, and yellow `#f4c125`. The badge marks are the source of truth: a value that drifts from them is wrong, however slightly.

The application wears one of them as its theme:

| Who is signed in          | Theme                                     |
| ------------------------- | ----------------------------------------- |
| Anyone placed in a unit   | Their unit's color                        |
| The contingent management | Red                                       |
| Anyone else, or nobody    | The theme this browser wore last, or blue |

A theme is two tokens – the unit's bright color, its flag, and a darker ink of the same identity that text and controls use. A `data-theme` attribute swaps the pair rather than every rule that reads it, so a rule names a theme color once and follows whichever unit is in force. What sits on an ink fill is white in every theme, and so is what sits on a bright fill, except on yellow, which is too light to carry white and takes its ink instead.

The theme goes on the document before React starts, so a returning brown-unit leader is greeted in brown rather than a flash of blue. Which unit wears which color is Campfire's own table in the design system, because the list of participants knows a unit only by its number.

Status – an all-clear, an unanswered question, a severity – has tones of its own, apart from the unit colors, because what a fact means must not change with the unit reading it.

## Type

Body text is the platform's own `system-ui` – the face the reader already trusts, with nothing to download, and one that follows the platform. Bravely Script, the jamboree's display face, carries the wordmark and the page titles. It has only a regular weight, so the weight is a token too, and a browser is never asked to synthesize a bold – a synthesized script is a smear. It is waited for rather than swapped in, because a headline repainting from a fallback face looks worse than one arriving a beat later.

Every font size is rem against a 17-point base – iOS's default body size, where the web assumes 16 ([why the base is 17](https://joakimkemeny.com/writing/2024-09-05-dynamic-size/)) – so a size read off a design is written as the same number. On iOS the root size is Dynamic Type itself, so the text size a reader sets in Settings scales every role in the system together. A prose column's width is set in text units rather than pixels, so grown text gets a wider column instead of shorter lines.

## The rules components follow

- **Raw values live in the tokens.** A component names a role – the theme's bright, the display face, a step in the type scale – and never a hex code or a pixel size. What the tokens do not cover, a component spells out in its own stylesheet, and a value becomes a token once a second component wants it.
- **Styling lives in a stylesheet.** Each component's rules sit in the `.css` file beside it and travel with it, and its class names are part of the library's vocabulary. The `style` prop is only for values the runtime alone knows ([ADR 015](/decisions/015-style-the-web-application-with-plain-layered-css)).
- **The cascade order is declared up front.** The document names the layers – tokens, fonts, reset, base, component, screen – before any stylesheet loads, so load order never decides which rule wins.

The components are the chrome – tab bar, navigation bar, side menu, page heading – the surfaces and controls the screens are built from, such as cards, rows, buttons, and search fields, and the icon set.

## Web and native

Campfire is one web application inside two native shells ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)). The shells draw the launch screen, the navigation bar, and the tab bar, and the webview draws everything under them. A reader should not notice where one ends and the other begins.

The bridge carries a theme's name and never a color ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)). Each shell maps the name to a palette of its own – tints and title colors on Apple, a Material 3 color scheme on Android – and an unknown name falls back to blue. Colors sent over the bridge would make the shells renderers of whatever the web sent, and would break the moment an old app met a new web. Keeping a few values in step by hand is the cheaper cost, so a unit color changes in all three places or none. Both launch screens hold the contingent's blue before the first page paints.

## Storybook

Storybook is the catalog ([ADR 023](/decisions/023-catalog-the-ui-in-storybook)). `pnpm start:storybook` serves it on port 3002, and one instance indexes the stories from `libraries/ui` and every module, so it shows a single component and a whole screen side by side. The sidebar reads Introduction, Foundations, Components, and then each module's components, widgets, and screens. The Introduction states the rules the design system is written under.

- **Every story renders in a theme.** A toolbar picks the unit color, so each component can be checked in all of them. The theme goes on a wrapper rather than the document, so a story that themes itself still wins locally.
- **Nothing in a story touches a network.** A story that needs data stubs it.
- **It reads like the guidebook.** Storybook is dressed in the guidebook's colors, type, and icon, so the two read as one project.
- **It stays private.** Storybook is built in continuous integration and published nowhere, and its telemetry is switched off.

## Accessibility

The target is WCAG 2.2 Level AA, with VoiceOver and TalkBack reading the web content ([Quality attributes](../requirements/quality)). A reader who turned the text up gets a bigger application rather than a clipped one, because every size follows Dynamic Type. The focus ring is drawn in the theme's bright color rather than removed, and page transitions stop entirely, fades included, for a reader who asked for reduced motion.
