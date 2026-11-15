# 042. Recover a copy its service worker left on an old build

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-11-15" /></p>
:::

## Context

A deploy reaches an installed copy through its service worker: the browser fetches the new worker, the worker installs the new build and takes over, and the page reloads onto it ([ADR 014](014-build-the-web-application-on-react-with-vite.md)). Every step is the browser's. A copy where one of them never happens keeps running its old build, served from the worker's cache, and nothing its reader can do in the application changes that. It has happened on dev, on a browser where the cause could not be found, and the people Campfire is for cannot be asked to clear a service worker.

## Decision

We let the page check for itself, beside the worker.

- **The page asks the server which build is deployed** – once it has loaded, when it returns to the foreground, and when a connection returns – past the browser's cache and the worker's.
- **A build is named by its entry script's address**, which the bundler hashes, so the page and the server answer the same question with nothing added to the build. Only a page that says it is Campfire's names one, so an error page answering in its place starts nothing.
- **A newer build gives the worker a minute** to start bringing it the usual way.
- **After that the page drops the worker and its cache and reloads from the network**, once per deployed build per tab.
- **The recovery waits where the cache is worth more**: while a new worker is still installing, which on a poor connection is slow rather than stuck, and while the reader is writing – for a quarter of an hour at most – and it never starts unless the newer build's script answers.

## Consequences

- A copy whose worker is not updating reaches the new build about a minute after it is next opened with a connection.
- Each start costs one more small request.
- A recovery reloads the page under the reader, as an ordinary update already does, and the copy has no offline cache until its fresh worker has installed.
- A copy still stuck on a build from before this decision does not have the check, and reaches it only through one ordinary update.

## Alternatives considered

- Asking the reader to update – a prompt most people dismiss, and one more thing to explain.
- A version file written by the build – a second thing to keep true, for what the entry script's address already says.
- No service worker – nothing to get stuck, and nothing that opens with no network.
