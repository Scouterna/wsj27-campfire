# Example flows

Two walkthroughs of the [layers](../layers/) working together, because the shape of a module is easier to see moving than at rest.

| Flow                                     | What it shows                                                        |
| ---------------------------------------- | -------------------------------------------------------------------- |
| [Sign in](./sign-in)                     | One tap, through the auth service and ScoutID, and back to a session |
| [Show participants](./show-participants) | A leader's unit, from the register to the list on the screen         |

Sign in is the flow every other one stands on: nothing in Campfire is useful without a session, and who is signed in decides what the register answers. Show participants is the first feature, and the one every module that fetches anything is built to look like.
