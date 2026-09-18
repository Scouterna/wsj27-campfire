import { html, raw } from "hono/html"
import type { HtmlEscapedString } from "hono/utils/html"

import type { Persona, PersonaGroup } from "../types.ts"

type Page = HtmlEscapedString | Promise<HtmlEscapedString>

/**
 * How the roster's Funktion and Roll segments read to a person. The roster writes the
 * labels; these are the same words, keyed by the segment `roles.py` slugifies them to.
 */
const roleLabels = new Map<string, string>([
  ["admin", "Administration"],
  ["avdelningssupport", "Avdelningssupport"],
  ["halsa", "Hälsa"],
  ["ist-support", "IST-support"],
  ["kommunikation", "Kommunikation"],
  ["hoc", "HoC"],
  ["program", "Program"],
  ["support", "Support"],
])

/**
 * What a persona is, read from the very roles the auth service will mint into their
 * token – so the picker promises exactly what the session then carries, rather than a
 * description written beside it. A Roll names the audience where the roster has one
 * (Support's do), and the Funktion names it otherwise; a personal Accesstyp follows
 * with a plus, because a grant is something held on top of a function rather than a
 * function of its own.
 *
 * The real ScoutID would say none of this – it is a developer's aid on the one page of
 * the stand-in that is nobody's copy.
 * @param roles The member's minted roles, as the role map holds them.
 * @returns The line under the persona's name.
 */
function roleLine(roles: readonly string[]): string {
  const held = roles.map((role) => belongingOf(role)).filter((part) => part !== undefined)
  if (held.length === 0) {
    return "Inte med i kontingenten"
  }
  const grant = roles.map((role) => grantOf(role)).find((part) => part !== undefined)
  return grant === undefined ? held.join(" · ") : `${held.join(" · ")} + ${grant}`
}

/**
 * Where one role places somebody – a unit, or a management function – or undefined for
 * a role that places them nowhere.
 * @param role One minted role.
 * @returns The belonging it names, or undefined.
 */
function belongingOf(role: string): string | undefined {
  const segments = role.split(":")
  // The namespace first, and segment by segment, as the client's own converter reads a
  // role – so the row promises exactly what the session will carry.
  if (segments[0] !== "wsj27") {
    return undefined
  }
  if (segments[1] === "al") {
    return `Ledare · Avdelning ${segments[2] ?? ""}`
  }
  if (segments[1] === "cmt") {
    // Roll first, Funktion second – and the fallback works only because no Roll in the
    // roster shares a slug with a Funktion. A Roll that did would be read as the
    // Funktion of the same name and describe the person wrongly.
    const label = roleLabels.get(segments[3] ?? "") ?? roleLabels.get(segments[2] ?? "")
    return label === undefined ? "CMT" : `CMT · ${label}`
  }
  return undefined
}

/**
 * The personal Accesstyp one role carries, by its option text, or undefined when the
 * role is not a grant.
 * @param role One minted role.
 * @returns The grant's name, or undefined.
 */
function grantOf(role: string): string | undefined {
  const segments = role.split(":")
  return segments[0] === "wsj27" && segments[1] === "access"
    ? segments.slice(2).join(":")
    : undefined
}

function personaLink(
  persona: Persona,
  request: Readonly<Record<string, string>>,
  roles: readonly string[],
): Page {
  const query = new URLSearchParams({ ...request, email: persona.email })
  const initials = `${persona.givenName.charAt(0)}${persona.familyName.charAt(0)}`.toUpperCase()
  // Prettier's embedded-HTML formatting is not idempotent on nested html`` templates,
  // so this one is formatted by hand.
  // prettier-ignore
  return html`<a class="row" href="/__mock__/scoutid/choose?${query.toString()}">
    <span class="tile" aria-hidden="true">${initials}</span>
    <span class="text">
      <strong>${persona.givenName} ${persona.familyName}</strong>
      <span>${roleLine(roles)}</span>
    </span>
    <span class="chevron" aria-hidden="true">›</span>
  </a>`
}

function section(
  group: PersonaGroup,
  request: Readonly<Record<string, string>>,
  rolesFor: (memberNo: string) => readonly string[],
): Page {
  const links = group.personas.map((persona) =>
    personaLink(persona, request, rolesFor(persona.memberNo)),
  )
  // The heading above the sheet, as the design system's Card draws it.
  // See personaLink.
  // prettier-ignore
  return html`<section>
    <h2>${group.label}</h2>
    <div class="card">${links}</div>
  </section>`
}

// The theme the application last resolved. The stand-in shares its origin, so it reads
// the same remembered preference from the same key and wears the same unit color –
// stamped before the first paint, the way the application's own boot does it.
const themeScript = `
  try {
    var theme = localStorage.getItem("campfire.theme")
    if (theme && /^(blue|brown|green|red|yellow)$/.test(theme)) {
      document.documentElement.dataset.theme = theme
    }
  } catch (error) {
    // A browser that refuses storage gets the contingent's blue, as the app does.
  }
`

// The page's stylesheet, out of the page function so the function stays readable – and
// inside the lint budget. Every value mirrors a design token by hand: the mock depends
// on nothing in the workspace, so it copies the system rather than importing it.
const styles = `
          /* The arrival from the sign-in screen and the departure back into the
             application cross-fade: the whole round trip is same-origin, so both
             documents opting in is all a cross-document view transition needs. */
          @view-transition {
            navigation: auto;
          }
          @media (prefers-reduced-motion: reduce) {
            ::view-transition-group(*),
            ::view-transition-image-pair(*),
            ::view-transition-old(*),
            ::view-transition-new(*) {
              animation: none;
            }
          }

          /* The contingent's display face, copied into the stand-in's static/ so the
             picker wears the same type as the application. */
          @font-face {
            font-family: "Bravely Script";
            src: url("/__mock__/scoutid/bravelyscript.woff2") format("woff2");
            font-display: block;
          }

          /* The five unit inks, and the one in force – the same pair the application
             swaps on [data-theme]. */
          :root {
            --ink: #215262;
          }
          [data-theme="brown"] {
            --ink: #643d14;
          }
          [data-theme="green"] {
            --ink: #526125;
          }
          [data-theme="red"] {
            --ink: #9b3716;
          }
          [data-theme="yellow"] {
            --ink: #c3900b;
          }

          /* Dynamic Type's base, as the design system sets it, so every rem below is
             the number the application's own tokens carry. */
          html {
            font-size: calc(100% * 17 / 16);
          }
          body {
            background: #f4f2ec;
            color: #1a1a1a;
            font-family: system-ui, sans-serif;
            margin: 0 auto;
            max-width: 560px;
            padding: 48px 16px calc(48px + env(safe-area-inset-bottom));
          }
          h1 {
            color: var(--ink);
            font-family: "Bravely Script", cursive;
            font-size: calc(30rem / 17);
            font-weight: 400;
            line-height: 1;
            margin: 0 0 8px;
            text-transform: uppercase;
          }
          @media (min-width: 768px) {
            h1 {
              font-size: calc(44rem / 17);
            }
          }
          h2 {
            font-size: 1rem;
            font-weight: 700;
            margin: 0 0 12px;
          }
          section {
            margin-top: 28px;
          }
          p {
            color: rgb(80 80 78);
            font-size: calc(14rem / 17);
            margin: 0;
          }
          .card {
            background: #fff;
            border-radius: 18px;
            padding: 0 24px;
          }
          .row {
            align-items: center;
            border-top: 1px solid rgb(26 26 26 / 10%);
            color: inherit;
            display: grid;
            gap: 16px;
            grid-template-columns: 44px minmax(0, 1fr) auto;
            margin: 0 -24px;
            padding: 12px 16px;
            text-decoration: none;
            transition: background 120ms ease;
          }
          .card > .row:first-of-type {
            border-radius: 18px 18px 0 0;
            border-top: none;
          }
          .card > .row:last-of-type {
            border-radius: 0 0 18px 18px;
          }
          .row:hover {
            background: color-mix(in srgb, var(--ink) 5%, transparent);
          }
          .row:active {
            background: color-mix(in srgb, var(--ink) 11%, transparent);
          }
          .tile {
            align-items: center;
            background: var(--ink);
            border-radius: 999px;
            color: #fff;
            display: flex;
            font-size: calc(14rem / 17);
            font-weight: 700;
            height: 44px;
            justify-content: center;
            width: 44px;
          }
          .text {
            min-width: 0;
          }
          .text strong {
            display: block;
          }
          .text span {
            color: rgb(80 80 78);
            display: block;
            font-size: calc(14rem / 17);
            margin-top: 2px;
          }
          .chevron {
            color: rgb(139 138 135);
            font-size: calc(20rem / 17);
          }
`

/**
 * The ScoutID stand-in's sign-in page, where the real one asks for a password. One link per
 * persona, grouped by unit, then the contingent management, then an outsider – and every tap a
 * completed sign-in. Dressed in the design system's own language by hand – the display face, the
 * unit theme in force, and the card and row patterns – because the mock imports nothing from the
 * workspace and mirrors the tokens rather than reading them.
 * @param groups The personas, in the sections the picker shows them in.
 * @param request The authorization request the page answers, carried on to the chosen link.
 * @param rolesFor One member's minted roles, which each row reads itself by.
 * @returns The picker page.
 */
export function pickerPage(
  groups: readonly PersonaGroup[],
  request: Readonly<Record<string, string>>,
  rolesFor: (memberNo: string) => readonly string[],
): Page {
  const sections = groups.map((group) => section(group, request, rolesFor))
  // See personaLink.
  // prettier-ignore
  return html`<!doctype html>
    <html lang="sv">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Vem loggar in?</title>
        <script>
          ${raw(themeScript)}
        </script>
        <style>
          ${raw(styles)}
        </style>
      </head>
      <body>
        <h1>Vem loggar in?</h1>
        <p>Mockad inloggning – välj en person i stället för att ange lösenord.</p>
        ${sections}
      </body>
    </html>`
}
