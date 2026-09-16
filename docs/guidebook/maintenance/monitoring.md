# Monitoring

Campfire has no monitoring at all – no error reporting, no uptime check, and no analytics. This page is a list of what has to be decided, not a description of something that runs.

Without it, nobody would learn that Campfire was down from anything except a leader saying so. That is not an answer to be giving on an island outside Gdansk in 2027, where the people who would notice and the people who could fix it are the same two people ([Quality attributes](../requirements/quality)).

Three things need watching, and each is a separate decision.

- **Errors.** A failure in a webview on someone else's phone is invisible from here. Without a reporter there is no stack trace, no affected version, and no way to tell a one-off from a pattern – only a message in a chat, from a leader who is busy.
- **Whether the back-end is answering.** The application holds no data of its own, so almost everything a user sees depends on two services in other repositories ([Context](../context/)). An uptime check that knows the difference between "the web is up" and "the list of participants is answering" is the one that would have been worth having.
- **Usage.** Which parts of the product people actually use is the evidence for what to build next and what to drop, and the feature set beyond the first feature is open ([Scope](../requirements/scope)), so that evidence is worth more here than it would be in a finished product.

Two things shape the choice. Anything collected from a device carries privacy and consent obligations, and the list of participants is largely data about minors – so this is not only a technical decision. And the services are deployed on their own, by their own repositories, so the question is how the front-end fits what the back-end already runs rather than what is best for the web application in isolation.

Whatever is chosen is recorded as an ADR and described here once it runs.
