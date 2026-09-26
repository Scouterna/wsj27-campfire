# Domain layer

The domain is what the product is about, in plain TypeScript: the models, and the functions that decide things about them. It imports nothing from React, the network, or TanStack, so the rules can be read and tested on their own, and a change to how something is shown or fetched cannot reach them.

## Models

A model is a plain type with `readonly` fields. A model that comes from a service is built only by a converter in [the data layer](./data), so holding one means the payload it came from was valid. TypeScript has no private constructor to enforce that, so the guarantee is positional: nothing outside `data/` builds one, and a payload that fails validation becomes no model at all rather than a half-built one.

That moves the checking to one place. A `Participant` never asks whether its member number is present – it exists because the member number was there.

```ts
/** One person in the list of participants, as a row needs them (abridged). */
export interface Participant {
  /** The list's only stable key, and a string because nothing does arithmetic on it. */
  readonly memberNo: string
  readonly firstName: string
  readonly lastName: string
  readonly role: ParticipantRole
  /** The unit a deltagare or a ledare belongs to – absent for the IST and the management. */
  readonly unitNumber?: number
}
```

Three rules hold across the models:

- **A closed union rather than a raw string.** A role is one of a named set, so a screen switches on it exhaustively and the compiler names the case that was forgotten. A member type a later version of the service invents is refused at the boundary – the row is dropped rather than rendered as nonsense.
- **Absent means unknown.** An optional field is left off when the service said nothing or the viewer may not read it, never filled with an empty string that reads as an answer. A screen shows nothing for it, or a designed empty state.
- **One model per thing, filled whole.** The signed-in person is one `User`, never a session shape beside a profile shape, and the authentication module fills it with its derivations – the display name, the role line, the unit, how they travel – where it is created ([ADR 032](/decisions/032-hold-the-signed-in-person-in-utils)). A fact settled once at the boundary is one no two screens can disagree about.

Where a part of a record is worth naming on its own, it becomes its own type. The health answers, the readiness answers, and the contact details are separate shapes, so a screen that may not read health is a screen that never holds it.

## Functions

The rest of the layer is pure functions that take domain values and return domain values.

Journey is the clearest case, because it has nothing else. The trip's dates are fixed and public, so they are written in the model rather than fetched, and everything the countdown shows is derived from them: which phase the contingent is in, how many days are left, and how long one person's journey lasts given how they travel. There is no request, no cache, and no loading state anywhere in it.

The participants module has the same kind of function over the list of participants – matching a search, narrowing by role, grouping people into units, gathering addresses to write to, and building a contact sheet to download. A function that depends on the time takes the moment as a parameter rather than reading the clock, so a test can place it anywhere in the trip.

## Errors

The domain throws little. A value that cannot be built is not built, and the layer above decides what that means: a list drops the row it cannot read and shows the rest, and a detail screen says the person could not be shown. Failures from the outside world belong to [the data layer](./data) and never reach a domain function as a reason to fail.

## Tests

Pure functions over plain values are the cheapest code in the repository to test, so unit tests concentrate here. They sit beside the code as `*.test.ts` and run under Vitest ([ADR 022](/decisions/022-test-typescript-with-vitest)), with no DOM, no network, and no fixtures beyond the values themselves ([Unit tests](../../testing/unit)). The screens are proven by the Playwright walks instead ([UI tests](../../testing/ui)).
