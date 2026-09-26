# 011. Write every word a user reads in Swedish

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Everyone Campfire is for is a leader or a member of the management team of the Swedish contingent, and they read Swedish. Its vocabulary is the contingent's own – avdelning, kontingentledning, IST. A second language would serve nobody, and it is not free: every string becomes a key in a catalog, every screen a lookup, and the catalog something to keep complete.

## Decision

We write every word a user reads in Swedish, with no translation layer and no locale switch.

- The document declares `lang="sv"`, so the browser, the screen reader, and the spell checker treat it as Swedish.
- A string lives where it is shown – no resource file, no message catalog, no key standing in for a sentence.
- The jamboree's own names stay as the jamboree writes them – IST, the subcamp names, Bravely.
- Dates, numbers, and sorting are formatted for `sv-SE` through the platform's `Intl`, never by hand.
- The code, its comments, the documentation, and the commit messages are American English, and neither language leaks into the other.

## Consequences

- A screen is written once, and reads as Swedish prose rather than a template with holes in it.
- Reusing Campfire for a contingent that does not read Swedish means finding every string by hand.
- Much of the code is written by agents in English, so a person who reads Swedish reviews the Swedish in a screen before it is done.

## Alternatives considered

- Internationalize from the start – a message catalog and a locale switch, pure overhead for one audience with one locale.
- English, the jamboree's language – it would ask Swedish adults to read their own contingent's tool in a second language.
