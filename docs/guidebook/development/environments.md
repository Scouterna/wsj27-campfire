# The environments

Campfire runs in three environments – local, dev, and prod – and they differ in one thing: what sits behind the back-end paths. All three serve the same origin, `http://localhost:8000`, with Caddy as the front door, so the web application and the native shells never know which one is running. Neither does the sign-in flow, which only completes on the host name the identity provider sends the browser back to. [ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin) records why that is one axis rather than two.

| Environment | Command            | The web application  | Behind `/api/*`                  | Sign-in                         |
| ----------- | ------------------ | -------------------- | -------------------------------- | ------------------------------- |
| local       | `pnpm start:local` | Vite, on the host    | The mock, on the host            | A persona picker                |
| dev         | `pnpm start:dev`   | Vite, in a container | The real back-end, in containers | Real ScoutID, or a faked member |
| prod        | `pnpm start:prod`  | The built image      | The real back-end, in containers | Real ScoutID                    |

The environment is a property of the running stack, not of the build. Nothing in the web application reads which one it is, and all three start scripts put their stack on port 8000.

## What answers on which path

The front door is the whole difference. Each environment's `Caddyfile` routes the same four path groups to different places:

| Path             | local                                               | dev                                   | prod                        |
| ---------------- | --------------------------------------------------- | ------------------------------------- | --------------------------- |
| `/api/auth/*`    | The mock, on 8003                                   | The `auth` container                  | The same container          |
| `/api/project/*` | The mock, on 8003                                   | The `project` container               | The same container          |
| `/__mock__/*`    | The mock's control surface and its ScoutID stand-in | –                                     | –                           |
| Everything else  | Vite, on 3000 on the host                           | Vite, in a `node:24-alpine` container | The built image's own Caddy |

Each service takes its own prefix under `/api/`, named for the service ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)), and keeping them on the app's own origin is what makes the session cookies work in a webview at all ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)); keeping every environment on one origin is what stops that from being three separate problems. Local uses `handle` rather than `handle_path`, because the mock mounts both services at the full paths the deployed ingress serves; dev and prod strip the prefix, because the real services serve their endpoints at their own root.

## Local

Local is the everyday one. It needs nothing but this machine and starts in seconds: host-installed Caddy on 8000, [the mock](../testing/mock) on 8003, and the Vite dev server on 3000. The mock serves the auth service and the participants service as their code behaves, and a stand-in for ScoutID and its own control surface under `/__mock__/`, seeded with the personas in `tools/mock/seed/` ([ADR 021](/decisions/021-stand-in-for-the-back-end-with-a-seeded-mock)). Signing in means tapping a name – no password, and no network beyond this machine.

`start:local` frees all three ports before it takes them, naming whatever held each one, then reports the stack up only once every server answers on its own port and the whole stack answers through the front door.

![Deployment diagram, rendered from the model. On a developer's machine, Caddy answers on port 8000 as the one origin, proxying every other path to the web application on Vite and the paths under /api/auth and /api/project to the mock, which stands in for the auth service and the participants service. The Apple shell in the iOS Simulator and the Android shell in the emulator both load the application from Caddy.](../../architecture/diagrams/deploymentLocal.svg)

## Dev

Dev exists for the one thing the mock cannot do: the real sign-in flow. `config/environments/dev/compose.yaml` runs four containers – the `ingress` Caddy that publishes 8000, the `auth` service built from the `wsj27-auth-api` repository's `main`, the `project` service built the same way from `wsj27-project-api`, and a `web` container running the same Vite dev server local runs on the host, over a bind mount of the repository. Hot reload works through the ingress, websocket and all, so dev is a working environment rather than a demo.

The first dev run is slow: the `web` container installs the whole workspace inside itself, which is why the start script waits up to ten minutes for it and says so.

Dev can also run without ScoutID. `pnpm start:dev --user-id <memberNo>` hands the auth service a `FAKE_USER_ID`, and every visit to `/api/auth/login` then signs straight in as that member – no identity provider round trip, not even discovery at startup, and the service logs a warning on each fake sign-in. The roles are still minted from the list of participants by the member number, so the session behaves exactly as that person's would; only the identity screens are skipped. The flag writes `fake-user.env` beside the compose file and the next plain run removes it, so a faked user never outlives the run that asked for it. Its identity is a placeholder – the greeting reads "Testperson" – so when the name matters, put a full `FAKE_USER_ID` in your `.env` instead, in the same JSON shape the identity provider answers with. Prod refuses the flag: it exists to prove the artifact with the real flow.

The roles come from the list of participants either way, minted by the member number – so a faked member who is in the list of participants wears their real hats, and one who is not wears none and is refused by the participants service. That second case is what `--roles` is for: `pnpm start:dev --user-id 9999999 --roles wsj27:cmt:support:halsa` sets the auth service's `DEFAULT_ROLES`, granted to any member the list of participants does not know, so the session wears exactly the hats the flag names. Fake a number outside the list of participants to choose roles freely; fake a real number to be that person.

One startup quirk to know, fake or real alike: the auth service mints roles from a map it polls from the project API, and on a cold cache that map arrives after the stack reports ready. A session minted before then carries no roles, and the project API answers every call with a 403 saying "No suitable roles". It heals itself – every refresh looks the roles up again, so the keep-alive fixes it within one token lifetime – or immediately, by signing out and in.

Secrets never enter the repository. Each container environment has its own gitignored `.env` holding the Keycloak client (`OIDC_SERVER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`) and the Scoutnet project keys (`SCOUTNET_PROJECTS`, and optionally `SCOUTNET_BODYLIST_KEY`) – you write that file, and nothing overwrites it. On a machine that has none, the first run prints exactly what to write; the values are the same ones the deployed services run with. Everything that is identical on every machine is in `compose.yaml` where it can be read, and the throwaway RSA signing key is generated on first run and passed to the container through the environment rather than written into your file. The key is readable only by its owner, and every run re-applies that rather than trusting the run that created it.

![Deployment diagram, rendered from the model. In Azure, a Kubernetes cluster runs an ingress at campfire.wsj27.scouterna.net as the one origin, routing every other path to the published web image, /api/auth to the auth service, and /api/project to the participants service. The auth service runs the OpenID round trip with ScoutID's dev realm, and the participants service reads member data from Scoutnet. A member's phone runs the Apple or the Android shell, which loads the application from the ingress.](../../architecture/diagrams/deploymentDev.svg)

## Prod

Prod is the same ingress and the same two services, with one substitution: `web` is the image `pnpm build:image` produced ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)). So a production build, the image's own Caddy on 8080, and its single-page fallback are all exercised before a deploy. The image is `linux/amd64`, the platform a server runs ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)) – so on an Apple-silicon machine prod runs it under emulation, which the compose file asks for explicitly rather than tripping on the mismatch.

`start:prod` never builds that image. A missing one is an error telling you to run `pnpm build:image` first, because a stale image is worse than a missing one – it runs, and it lies about what the code does.

The two compose files are near-copies, differing only in what serves the web. That duplication is deliberate: an environment you can read top to bottom in one folder is worth more than a shared file with a switch in it.

![Deployment diagram, rendered from the model. In Azure, a Kubernetes cluster runs an ingress at campfire.wsj27.se as the one origin, routing every other path to the published web image, /api/auth to the auth service, and /api/project to the participants service. The auth service runs the OpenID round trip with ScoutID's production realm, and the participants service reads member data from Scoutnet. A member's phone runs the Apple or the Android shell, which loads the application from the ingress.](../../architecture/diagrams/deploymentProd.svg)

## Running a shell against it

`pnpm start:android` and `pnpm start:apple` boot an emulator or simulator, build the shell, and launch it against `http://localhost:8000`. They take no environment: the shell always points at this machine, so whichever stack is running is the environment. Both refuse to start when nothing answers on 8000, and name the commands that would fix that. Android additionally runs `adb reverse tcp:8000 tcp:8000`, so `localhost` means the same machine on both sides of the emulator boundary – which matters because the sign-in cookies only work on the one host name ScoutID redirects back to.

The shells' dev and prod flavors are a build concern instead. `pnpm build:android:dev` and its siblings bake a remote origin – `campfire.wsj27.scouterna.net` or `campfire.wsj27.se` – into an artifact meant to leave this machine.

## Where the files are

Everything about how Campfire runs is in `config/environments/`, one folder per environment. Each holds a `Caddyfile` – its front door – and whatever else it needs: `dev/` and `prod/` add a `compose.yaml`, and `prod/` also holds the `Dockerfile` that builds the deployable image and the `image.Caddyfile` that ships inside it. That last one is the only Caddy config that leaves this machine, and the only one that is not a front door, because there is nothing behind it. It serves the built site on 8080 rather than 80, so the container never needs root.

The scripts that drive all of this live in `scripts/` and share one library, `scripts/start/helpers.sh` – see [The scripts](./scripts) for what that library guarantees.

## The known gaps

- **The project API's token check needs a shared network namespace.** `wsj27-project-api` verifies a token by fetching the JWKS at the auth service's public URL, `http://localhost:8000/api/auth/certs` – an address that reaches the front door only from inside the ingress's own network namespace, which is why that container shares it instead of getting its own. A quirk worth knowing before it surprises someone reading the compose file.
- **There is no prod back-end anywhere.** `start:prod` tests the production artifact against a dev back-end. It proves the image, not the deployment.
- **The cluster takes a moved tag by hand.** `campfire.wsj27.scouterna.net` and `campfire.wsj27.se` run both services and the web image on Kubernetes in Azure ([ADR 027](/decisions/027-run-the-back-end-on-kubernetes-in-azure)). The release moves `:dev` and a promotion moves `:prod`, and the pipeline stops there: deploying what a tag points at is a step on the cluster, by the people who run it ([Release](../maintenance/release)).
