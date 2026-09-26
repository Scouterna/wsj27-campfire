# OpenFreeMap

OpenFreeMap is a free public service that serves vector map tiles drawn from OpenStreetMap, with no account and no key. Nobody in this project runs it, and it is the one system Campfire reaches past its own origin ([ADR 037](/decisions/037-draw-maps-on-the-device-over-openfreemaps-tiles)).

## What Campfire uses it for

- **The background of a unit's map.** The land, water, woods, roads, and borders behind the dots are OpenFreeMap's tiles, recolored on the device in the unit's own theme.
- **The names on an open map.** The towns and cities around the dots are named from the tiles, in fonts OpenFreeMap serves.

Nothing else on the map comes from it. The [participants service](./participants-service) sends each person's home town, and the participants module places the towns on the device against a table of Swedish postorter it carries, so no home town, name, or unit is sent anywhere to draw the map. The tile service sees only which part of Sweden a map shows, and the address of whoever opened it.

A map that cannot reach it – offline, on the island's network, or if the service goes away – still shows its dots and their counts over a plain background, with no names. An open map credits OpenFreeMap, OpenStreetMap, and GeoNames, whose postal codes the postort table is built from.

## Locally

The [mock](../../testing/mock) does not stand in for it, so the local environment and the Playwright walk-throughs fetch the real tiles. Storybook refuses them, and its maps draw their dots with no background.
