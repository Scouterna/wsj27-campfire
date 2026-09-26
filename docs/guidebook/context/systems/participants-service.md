# Participants service

The participants service holds the contingent's list of participants: who is in the contingent, which unit they belong to, and what they answered in the registration forms, all read from [Scoutnet](./scoutnet). It is part of the WSJ27 project's back-end, `wsj27-project-api`, which lives in a repository of its own and is released on its own ([ADR 013](/decisions/013-keep-the-back-end-services-in-their-own-repositories)). Campfire reaches it under `/api/project` on its one origin ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)).

## What Campfire uses it for

- **Listing people** – the members of one unit, or of a group such as the leaders, the IST, or the contingent management team.
- **Showing one person** – their contact details and, for those allowed, their health and dietary answers.
- **Knowing the signed-in person** – their own unit and how they travel.
- **Deciding the roles** – every WSJ27 role is minted here, and the [auth service](./auth-service) puts them in each session.

The service has no "everyone I may see" listing, so Campfire builds the list of participants from the unit and group listings: a leader asks for their own unit, and the management team walks every unit. The participants module is the only part of Campfire that calls it.

## Who may see what

The service decides what each caller gets, so the front-end never filters what it should not have received.

| Caller                         | Sees                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| A unit leader                  | Their own unit                                                                                      |
| The contingent management team | Everyone's contact details, and health answers only with the health team's role or a personal grant |
| Anyone else                    | Nobody                                                                                              |

A person the caller may not see answers exactly as someone who does not exist, so nobody can learn who is in the contingent by asking. A caller who may see a person but not at the level asked for is refused outright rather than handed less.

The contingent management team's functions are not in Scoutnet, so the service reads them from the contingent's own roster. What leaves the service is decided by a template in its repository – a form question the template does not carry never reaches Campfire.

## Locally

In the [local environment](../../development/environments), the [mock](../../testing/mock) answers in its place with an invented, seeded contingent and the same access rules ([ADR 021](/decisions/021-develop-against-a-mock-back-end)).
