# 003. Publish the repository as open source under MIT

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Scouterna's policy is to publish its software as open source. Campfire is also built by volunteers for Scouterna's contingent and is meant to be picked up again – for the next jamboree, by another contingent, by whoever inherits it – and that reader may not be a member of this organization. Publishing already assumes a public repository: GitHub Pages serves the guidebook, and the web image on the GitHub Container Registry is public with it. Nothing in the tree needs to be secret, because the list of participants is never in it, the mock's people are invented, and credentials live in a gitignored `.env`.

## Decision

We publish the repository as open source under the MIT license, copyright The Guides and Scouts of Sweden.

- `LICENSE.md` holds the license, and `package.json` declares `"license": "MIT"`.
- Nothing that is not for the public is committed – member data, credentials, the contingent's internal documents.
- The license covers the code and the writing. An asset someone else owns, such as the jamboree's display face or the contingent's marks, is in the tree only with its owner's permission.

## Consequences

- Anyone can read and reuse the code, including a contingent from another country, without asking.
- What goes into the repository is a publication decision as well as an engineering one. A seed file, a screenshot, or a skill's reference material is public the moment it lands.
- The mock's people stay invented, and real responses are never committed.
- A fork may ship a Campfire of its own. The license gives away the code, not the name or the marks.

## Alternatives considered

- A copyleft license, such as the GPL – it keeps a derivative open, but nobody will sell a contingent tool, and a freer license is the one another association adopts without asking a lawyer.
- Apache 2.0 – MIT with a patent grant, where nothing is patented, and a longer text fewer people know.
