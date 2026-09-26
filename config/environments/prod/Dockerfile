# The web application, packaged for deploy: build the workspace, then serve the built
# SPA from Caddy. Nothing else is in the image – /api/auth, /api/project, and every
# other back-end path belong to the deployment's ingress, exactly as they do in local
# development.
#
# Build from the repository root, where the workspace lives:
#   pnpm build:image
#
# The image is linux/amd64 whatever machine builds it, because the cluster it deploys
# to is x86 – the script passes --platform. Only the final stage is; the build stage
# below runs on the builder's own platform, since the files it produces have none.
#
# The server config it copies in is image.Caddyfile, beside this file: the Caddy that
# runs inside the image, as opposed to Caddyfile, which is the front door in front of it.

# Pinned to the version in .tool-versions, so the image builds on the Node the
# repository develops on. A floating 24-alpine would drift from it silently. On the
# builder's platform rather than the target's, because this stage only produces static
# files, and running pnpm under emulation would make every amd64 build several times
# slower.
FROM --platform=$BUILDPLATFORM node:24.19.0-alpine AS build
WORKDIR /campfire
RUN corepack enable

# The manifests and the lockfile first, on their own layer. A frozen install depends
# on these and nothing else, so editing a source file reuses the installed layer
# instead of paying for the whole install again on every build.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY libraries/host/package.json libraries/host/
COPY libraries/ui/package.json libraries/ui/
COPY libraries/utils/package.json libraries/utils/
COPY modules/authentication/package.json modules/authentication/
COPY modules/home/package.json modules/home/
COPY modules/journey/package.json modules/journey/
COPY modules/participants/package.json modules/participants/
COPY tools/mock/package.json tools/mock/
RUN pnpm install --frozen-lockfile

# Then the sources. .dockerignore keeps the native apps and the build output out of
# the context; a new workspace package needs its manifest added above.
COPY . .

# The version the build writes into the page. Declared after the install, so a new
# version does not invalidate the dependency cache. `pnpm build:image` passes none and
# gets 0.0.0; the release workflow passes the version it is releasing as a build
# argument.
ARG CAMPFIRE_VERSION=0.0.0
RUN pnpm build:web

FROM caddy:2-alpine
COPY config/environments/prod/image.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /campfire/apps/web/.build /srv

# The image serves on 8080 so it never needs root, and this is the other half of that –
# caddy:2-alpine runs as uid 0 unless told otherwise. Caddy writes its storage
# under XDG_DATA_HOME on start, and /data is not writable for an unprivileged user while
# /tmp is.
ENV XDG_CONFIG_HOME=/tmp XDG_DATA_HOME=/tmp
USER 1000:1000

EXPOSE 8080
