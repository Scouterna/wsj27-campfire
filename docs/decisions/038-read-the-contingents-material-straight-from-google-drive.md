# 038. Read the contingent's material straight from Google Drive

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-10-02" /></p>
:::

## Context

The contingent keeps its material – unit symbols, logotypes, templates, and presentations – in shared Google Drive folders that the management edits by hand. Leaders need it on a phone, and a file added on Drive should reach them without a release. The folders are shared with anyone who has the link and hold nothing personal. The project's back-end has no service for them, and every other Campfire read is origin-relative ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)), the map tiles excepted ([ADR 037](037-draw-maps-on-the-device-over-openfreemaps-tiles.md)).

## Decision

We read the material from the Drive API in the browser, with an API key restricted to the Drive API and to Campfire's origins.

- **The key lives in the source.** A browser key ships in the bundle whatever is done with it, so its restriction is what protects it, not its secrecy.
- **The listing goes through the query client** like any other read, cached and persisted, so a phone shows the material it saw last.
- **The pictures and downloads are links to Drive**, never bytes Campfire holds.

## Consequences

- A file added to the shared folders shows on the next visit, with no service to run and nothing to deploy.
- Drive learns the reader's address and which files they open.
- The key is in a public repository. It can be lifted and spent against its quota from outside a browser, which can break the section but exposes nothing that is not already public.
- `local` reaches Google for this section, so the mock cannot stand in for it, and the walk-through stubs Drive in the browser instead.
- Offline, the material browses from the cache but its pictures and downloads do not load.

## Alternatives considered

- Proxying the listing at `/services/drive` with the key added by the image's server – keeps the key out of the repository and lets the mock answer, for a secret in every deployment and a route in every environment's front door.
- A service in the project's back-end – a repository Campfire does not own, for a read that needs no access rules.
- Copying the material into the build – every change on Drive would wait for a release.
