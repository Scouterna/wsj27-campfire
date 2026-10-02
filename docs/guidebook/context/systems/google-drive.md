# Google Drive

Google Drive is where the contingent keeps its material – the units' symbols, the logotypes, the templates, and the presentations – in shared folders the contingent management edits by hand. The folders are shared with anyone who has the link, and Campfire reads them straight from the browser ([ADR 038](/decisions/038-read-the-contingents-material-straight-from-google-drive)).

## What Campfire uses it for

- **The listing.** The material module walks the folders through the Drive API with a key restricted to the Drive API and Campfire's origins, so a file added on Drive shows on the next visit.
- **The pictures.** Every file's tile, and the larger preview it opens, is a picture Drive renders, documents and templates included.
- **The viewer and the download.** A document's preview offers Drive's own viewer to read past its first page, and every download goes to Drive directly, so Campfire never holds a file's bytes.

Nothing personal is sent. Drive sees the reader's address and which files they open.

A phone that cannot reach Drive browses the material it read last from the cache, without its pictures, and cannot open or download a file.

## Locally

The [mock](../../testing/mock) does not stand in for it, so the local environment reads the real folders. The Playwright walk-throughs answer the Drive API themselves and refuse every picture, and Storybook draws its own pictures, so neither depends on what the folders hold.
