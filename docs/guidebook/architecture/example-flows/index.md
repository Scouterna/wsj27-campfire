# Example flows

Two walkthroughs of the [layers](../layers/) working together, because a module's shape is easier to see moving than at rest.

| Flow                                     | What it shows                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| [Sign in](./sign-in)                     | One tap, through the auth service and ScoutID, and back to a session     |
| [Show participants](./show-participants) | A leader's unit, from the participants service to the list on the screen |

Sign in is the flow every other one stands on: nothing in Campfire is useful without a session, and who is signed in decides what the list of participants answers. Show participants is the shape every module that fetches anything follows.
