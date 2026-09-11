# 003. Publish the repository as open source under MIT

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire is built by volunteers for Scouterna's contingent, and it is meant to be picked up again – for the next jamboree, by another contingent, by whoever inherits it. That reader may not be a member of this organization, and the code is more useful to the movement read than hidden.

How the project is published already assumes the repository is public. The guidebook is served by GitHub Pages, which serves public repositories, and the web image on the GitHub Container Registry is public once the repository is. Nothing in the tree needs to be secret: the register is never in it, the mock's people are invented, and credentials live in a gitignored `.env`.

## Decision

We publish the repository as open source under the MIT license, copyright The Guides and Scouts of Sweden.

- `LICENSE.md` at the root is the license, and `package.json` declares `"license": "MIT"`.
- Nothing that is not for the public is committed – member data, credentials, the contingent's internal documents – so the repository being public is never a leak.
- The license covers the code and the writing. An asset someone else owns – the jamboree's display face, the contingent's marks – sits in the tree only with its owner's permission, which the license does not replace.

## Consequences

- Anyone can read, learn from, and reuse the code, including a contingent from another country, without asking.
- What goes into the repository is a publication decision as well as an engineering one. A seed file, a screenshot, and a skill's reference material are all public the moment they land.
- The mock's people stay invented and a recording of real responses can never be committed, because the tree is public and not only because it would be poor taste.
- A fork may ship a Campfire of its own. The name and the marks stay the contingent's; the license gives away the code, not the identity.

## Alternatives considered

- **A private repository.** Hides the reasoning from the movement it was built for, and closes Pages and public images, so both would need a paid tier or another host.
- **A copyleft license, such as the GPL.** Guarantees a derivative stays open. Nobody is going to sell a contingent tool, and the freer license is the one another scout association adopts without asking a lawyer.
- **Apache 2.0.** MIT with a patent grant and a longer text. Nothing here is patented, and the shorter license is the one people already know.
