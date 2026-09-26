# Monitoring

Campfire has no error reporting, no uptime check, and no analytics. Each is an open decision. Until one is made, the first sign of trouble is a leader saying so – and at camp, the people who notice and the people who can fix it are on the same island in Gdansk ([Quality attributes](../requirements/quality)).

Three things need watching, and each is a decision of its own:

| What to watch                     | Why it matters                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Errors                            | A failure in a webview on a leader's phone is invisible without a reporter – no stack trace, no affected version, and no way to tell a one-off from a pattern |
| Whether the back-end is answering | Campfire holds no data of its own, so "the web is up" says little when the list of participants is not answering ([Context](../context/))                     |
| Usage                             | Which parts people use is the evidence for what to build after version 1, and what to drop ([Scope](../requirements/scope))                                   |

Two things shape the choice:

- **Privacy.** Anything collected from a phone carries privacy and consent obligations, and the list of participants is largely about minors, so this is not only a technical decision.
- **The cluster.** The web runs on Scouterna's cluster beside the back-end services, operated by others, so the answer has to fit what they already run rather than what would suit the web on its own ([ADR 027](/decisions/027-run-the-web-beside-the-back-end-on-scouternas-cluster)).

Whatever is chosen is recorded as an ADR and described here.
