import { html } from "hono/html"
import type { HtmlEscapedString } from "hono/utils/html"

import type { Persona, PersonaGroup } from "../types.ts"

type Page = HtmlEscapedString | Promise<HtmlEscapedString>

function personaLink(persona: Persona, request: Readonly<Record<string, string>>): Page {
  const query = new URLSearchParams({ ...request, email: persona.email })
  // Prettier's embedded-HTML formatting is not idempotent on nested html`` templates,
  // so this one is formatted by hand.
  // prettier-ignore
  return html`<a href="/__mock__/scoutid/choose?${query.toString()}">
    ${persona.givenName} ${persona.familyName}
    <span>${persona.description}</span>
    <small>${persona.email}</small>
  </a>`
}

function section(group: PersonaGroup, request: Readonly<Record<string, string>>): Page {
  const links = group.personas.map((persona) => personaLink(persona, request))
  // See personaLink.
  // prettier-ignore
  return html`<h2>${group.label}</h2>
    ${links}`
}

/**
 * The ScoutID stand-in's sign-in page, where the real one asks for a password. One link per
 * persona, grouped by unit, then the contingent management, then an outsider – and every tap a
 * completed sign-in. Styled to sit beside the app without pretending to be it.
 * @param groups The personas, in the sections the picker shows them in.
 * @param request The authorization request the page answers, carried on to the chosen link.
 * @returns The picker page.
 */
export function pickerPage(
  groups: readonly PersonaGroup[],
  request: Readonly<Record<string, string>>,
): Page {
  const sections = groups.map((group) => section(group, request))
  // See personaLink.
  // prettier-ignore
  return html`<!doctype html>
    <html lang="sv">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Vem loggar in?</title>
        <style>
          body {
            background: #f4f2ec;
            color: #1a1a1a;
            font-family: system-ui, sans-serif;
            margin: 0 auto;
            max-width: 420px;
            padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
          }
          h1 {
            color: #215161;
            font-size: 1.5rem;
          }
          h2 {
            color: #4a5459;
            font-size: 0.85rem;
            letter-spacing: 0.04em;
            margin: 20px 0 8px;
            text-transform: uppercase;
          }
          a {
            background: #fff;
            border-radius: 10px;
            color: inherit;
            display: block;
            margin-block: 6px;
            padding: 10px 14px;
            text-decoration: none;
          }
          a span {
            display: block;
            font-size: 0.9rem;
            margin-block: 2px;
          }
          a small {
            color: #4a5459;
            display: block;
          }
          p {
            color: #4a5459;
            font-size: 0.85rem;
          }
        </style>
      </head>
      <body>
        <h1>Vem loggar in?</h1>
        <p>Mockad inloggning – välj en person i stället för att ange lösenord.</p>
        ${sections}
      </body>
    </html>`
}
