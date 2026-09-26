# The environments

Campfire runs in three environments on a developer's machine – local, dev, and prod – and they differ in one thing: what sits behind the back-end paths. All three serve the same origin, `http://localhost:8000`, with Caddy as the front door, so the web application and the shells never know which one is running ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). Neither does sign-in, whose cookies live on the app's own origin and whose round trip only completes on the host name ScoutID sends the browser back to ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). One origin everywhere keeps that from being three separate problems.

| Environment | Start with         | The web application  | `/api/auth` and `/api/project`   | Sign-in                         |
| ----------- | ------------------ | -------------------- | -------------------------------- | ------------------------------- |
| local       | `pnpm start:local` | Vite, on the host    | The mock, on the host            | A persona picker                |
| dev         | `pnpm start:dev`   | Vite, in a container | The real back-end, in containers | Real ScoutID, or a faked member |
| prod        | `pnpm start:prod`  | The built image      | The real back-end, in containers | Real ScoutID                    |

The environment is a property of the running stack, not of the build. Nothing in the web application reads which one it is, and a start script frees port 8000 first, naming what held it, and reports the stack ready only once it answers through the front door.

## The front door

Each environment's front door routes the same paths to different places. Every back-end has its own prefix under `/api/`, named for the service, and everything else is the web application's.

| Path            | local                                           | dev                 | prod                  |
| --------------- | ----------------------------------------------- | ------------------- | --------------------- |
| `/api/auth`     | The mock                                        | The auth service    | The auth service      |
| `/api/project`  | The mock                                        | The project API     | The project API       |
| `/__mock__`     | The mock's ScoutID stand-in and control surface | –                   | –                     |
| Everything else | Vite on the host                                | Vite in a container | The image's own Caddy |

Dev and prod strip the prefix before a request reaches a service, because the real services serve their endpoints at their own root, as they do behind the deployed ingress. The mock serves both services at the full paths, so local passes them through unchanged.

Everything about running Campfire lives in `config/environments/`, one folder per environment – a `Caddyfile` in each, and a `compose.yaml` besides for dev and prod. The folders duplicate rather than share, so each environment reads top to bottom on its own.

## Local

Local is the everyday environment. It needs nothing beyond the machine and starts in seconds: Caddy on 8000, [the mock](../testing/mock) on 8003, and Vite on 3000. The mock answers as the auth service and the participants service do, and serves a ScoutID stand-in whose sign-in page is a persona picker, so signing in is tapping a name – no password, and no network ([ADR 021](/decisions/021-develop-against-a-mock-back-end)).

![Deployment diagram of the local environment. On a developer's machine, Caddy on port 8000 is the one origin, proxying /api/auth and /api/project to the mock back-end and every other path to the web app on Vite. The Apple shell in the iOS Simulator and the Android shell in the emulator load the application from Caddy.](../../architecture/diagrams/deploymentLocal.svg)

## Dev

Dev exists for the one thing the mock cannot do: the real sign-in flow. The auth service and the project API are built from their repositories' `main` on every start, beside a container running the same Vite dev server over the repository, so hot reload still works through the front door. The first start is slow while that container installs the workspace.

Credentials never enter the repository. The Keycloak client and the Scoutnet keys go in a gitignored `.env` beside the compose file, which you write and nothing overwrites, and the first run on a machine without one prints what to write. The values are the ones the deployed services run with. The contingent management team's roster, which the project API reads to tell the management's functions apart, is a gitignored `cmt-roles.csv` beside it for the same reason – it names real people. Without it the service runs on, and the management's roles carry no function.

Dev can skip ScoutID. `pnpm start:dev --user-id <memberNo>` signs every sign-in straight in as that member, with the roles still taken from the list of participants, so the session behaves as that person's would – only the identity screens are skipped. Adding `--roles` grants the named roles to a member the list of participants does not know, which is how to test a role nobody at hand holds. The faked member lasts only for the run that asked for it.

On a cold start, a session made before the auth service has loaded the roles from the project API carries none, and the project API refuses it. Signing out and in heals it, and so does the next token refresh, which looks the roles up again.

## Prod

Prod is dev with the web served by the image `pnpm build:image` produced, so the production build, the image's own Caddy, and its single-page fallback all run before a deploy ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)). `start:prod` never builds the image, because a stale image would run and mislead – a missing one is an error telling you to build it. It refuses `--user-id`, because prod is there to prove the real flow.

The image is `linux/amd64`, the cluster's platform, so an Apple-silicon machine runs it under emulation. Prod runs the same back-end containers as dev, so it proves the image rather than the deployment.

## Running a shell against it

`pnpm start:android` and `pnpm start:apple` boot an emulator or a simulator, build the shell, and launch it against `http://localhost:8000`. They take no environment – whichever stack is running is the environment – and refuse to start when nothing answers there. The Android emulator reaches the host's port 8000 through `adb reverse`, so `localhost` means the same machine on both sides and sign-in keeps its one host name.

The shells' dev and prod builds – `pnpm build:android:dev` and its siblings – bake in the deployed sites' origin instead, for a build meant to leave the machine.

## The deployed sites

The web image runs on Scouterna's Kubernetes cluster in Azure, behind the same ingress as the back-end services – dev at `campfire.wsj27.scouterna.net` and prod at `campfire.wsj27.se`. The ingress is the deployed form of the local front door, routing the same prefixes the same way ([ADR 027](/decisions/027-run-the-web-beside-the-back-end-on-scouternas-cluster)). Which image each site runs is decided by moving a tag ([Release](../maintenance/release)).

![Deployment diagram of the deployed dev environment. In Azure, a Kubernetes cluster runs an ingress as the one origin over HTTPS, routing /api/auth to the auth service, /api/project to the participants service, and every other path to the web app. The auth service runs the OpenID round trip with ScoutID, and the participants service reads member data from Scoutnet. The Apple and Android shells on a member's phone load the application from the ingress.](../../architecture/diagrams/deploymentDev.svg)

![Deployment diagram of the deployed prod environment, the same shape as dev: an ingress in the Kubernetes cluster in Azure routes /api/auth to the auth service, /api/project to the participants service, and every other path to the web app. The auth service signs in through ScoutID, the participants service reads Scoutnet, and the shells on a member's phone load the application from the ingress.](../../architecture/diagrams/deploymentProd.svg)
