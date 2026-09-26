# 037. Draw maps on the device over OpenFreeMap's tiles

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-26" /></p>
:::

## Context

A unit's card shows where its people live, as a dimmed map behind the unit's name that opens into one the reader can pan and zoom, in the unit's own colors. Nothing else in Campfire reaches past its own origin ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)), a home town is personal data the back-end decides who may see, and the jamboree's network is poor.

## Decision

We draw maps on the device with MapLibre GL JS, over OpenFreeMap's public vector tiles, fetched straight from their host.

- **Home towns are placed on the device**, against a table of Swedish postorter bundled with the module, from GeoNames under CC BY 4.0. No home town, name, or unit leaves the device, and the tile host sees only which part of Sweden a map shows.
- **Only the background and its place names come from the tile host.** The dots and their counts are drawn from the bundled data, with no text from the host, so a map without its tiles or its fonts still shows where the unit lives.
- **The map loads only where a unit card is shown**, split from the rest of the application.
- **An open map credits OpenFreeMap, OpenStreetMap, and GeoNames.**

## Consequences

- A map in the unit's palette, from a free service with no key and no account.
- The tile host learns the reader's address and roughly where a unit lives.
- Offline, at the jamboree, or if OpenFreeMap – which promises no uptime – goes away, a map shows only its dots.

## Alternatives considered

- Proxying the tiles through Campfire's origin – needs the cluster's ingress and a rewrite of the tile addresses, for requests that carry nothing personal.
- Self-hosting a Swedish tile extract – a large artifact to build, host, and refresh for a backdrop.
- A bundled outline of Sweden with no tiles – no network at all, but no map worth opening.
- Geocoding home towns on a service – sends them off the device.
- Leaflet with raster tiles – cannot be recolored in the unit's theme.
