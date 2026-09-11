# Domain layer

What the product is about, in plain TypeScript. No React import, no `fetch`, no TanStack type – so the rules can be read and tested on their own, and a change to how something is shown or fetched cannot reach them.

## Models

A domain model is a plain type, and holding one is proof that a converter in [the data layer](./data) accepted the payload it came from. TypeScript has no private constructor to lean on, so the guarantee is positional rather than enforced: nothing outside `data/` ever builds one, and a value that failed validation is not a half-built model but no model at all.

That inverts where the checking happens. `Participant` does not ask whether its member number is present; it exists because the member number was there.

```ts
/**
 * One person in the contingent's register, as the application knows them.
 */
export interface Participant {
  /** The member number – the register's only stable key, and a string because nothing does arithmetic on it. */
  readonly memberNo: string
  readonly firstName: string
  readonly lastName: string
  readonly role: ParticipantRole
  /** The unit they belong to. Absent for the contingent management and the IST, who have none. */
  readonly unitNumber?: number
}
```

Two habits carry most of the weight.

**A closed union rather than a raw string.** A role is one of a named set, so a screen switches on it exhaustively and the compiler names the case that was forgotten. A member type invented by a later version of the service never reaches the domain as a valid role – it is refused at the boundary instead, which is the difference between a row that is dropped and a screen that renders nonsense.

**Absent means unknown, not empty.** An optional field is left off when the service did not say, rather than filled with an empty string that reads as an answer. A screen shows an absent state for it, and the absent state is designed rather than accidental.

Where a value is worth naming on its own, it becomes its own type: the health answers, the readiness answers, and the contact details are separate shapes, so a screen that may not read health is a screen that never holds it.

## Pure functions over them

The other half of the layer is the functions that decide things, and they take domain values and return domain values.

The journey module is the clearest case, because it has nothing else. The trip's dates are fixed and public, so they are written down rather than fetched, and everything the countdown shows is derived from them: which phase the contingent is in, how many days are left, and how long one person's journey lasts depending on whether they join the pre-trip. There is no request, no cache, and no loading state anywhere in it.

The participants module has the same kind of function over the register: the unit identity table, which maps a unit number to the unit's profile and its color. It is a fact about the contingent, not about a payload, so it lives here and the application reads it through a doorway.

## Errors

The domain throws little. A value that cannot be built is not built, and the layer above decides what that means – a list drops the row it cannot read and shows the rest, a detail screen shows that the person could not be loaded. Failures that come from the outside world are typed where they happen, in [the data layer](./data), and never leak inward as a reason for a domain function to fail.

## Tests

Pure functions over plain types are the cheapest thing in the repository to test, which is why the domain is where unit tests concentrate. They sit beside the code as `*.test.ts` and run under Vitest ([ADR 022](/decisions/022-test-typescript-with-vitest)), with no DOM, no network, and no fixtures beyond the values themselves. The screens are proven separately, by the Playwright walks ([UI tests](../../testing/ui)).
