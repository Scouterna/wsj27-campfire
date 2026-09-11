# 011. Write every word a user reads in Swedish

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Everyone Campfire is for is a leader or a member of the management team of the Swedish contingent. Its vocabulary is the contingent's own – avdelning, kontingentledning, IST – and the people who use it read Swedish. The official jamboree material is English, so a leader already switches languages at the jamboree's edge; the contingent's own tool is the side of that edge that speaks their language.

A second language would exist for nobody, and it is not free. Every string becomes a key in a catalog, every screen a lookup, and the catalog a thing to keep complete in a language no one reads.

## Decision

We write every word a user reads in Swedish, with no translation layer, no locale switch, and no plan for one.

- The document declares `lang="sv"`, so the browser, the screen reader, and the spell checker treat it as Swedish.
- A string lives where it is shown. There is no resource file, no message catalog, and no key that stands in for a sentence.
- The jamboree's own names stay as the jamboree writes them – IST, the subcamp names, Bravely – because that is what the reader sees on the ground.
- Dates, numbers, and sorting are formatted for `sv-SE` through the platform's own `Intl`, never by hand.
- The code, its comments, the documentation, and the commit messages are American English. One language for the people who build Campfire, another for the people who use it, and neither leaks into the other.

## Consequences

- A screen is written once, and reads as one piece of Swedish prose rather than as a template with holes in it.
- Reusing Campfire for a contingent that does not read Swedish means finding every string by hand – the cost a catalog would have charged every screen up front to avoid.
- Much of the code is written by agents in English, so the Swedish in a screen is reviewed by a person who reads it, and a screen is not done until it has been.

## Alternatives considered

- **Internationalize from the start**, with a message catalog and a locale switch. The right answer for a product with two audiences, and pure overhead for one: every string keyed, every screen indirected, one locale ever filled in.
- **English, the jamboree's language.** It would match the official material. It would also ask a few hundred Swedish adults to read their own contingent's tool in a second language, for the benefit of nobody in the contingent.
