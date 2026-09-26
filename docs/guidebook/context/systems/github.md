# GitHub

GitHub is where Campfire is built – the repository, the issues, and the pull requests, and the workflows that check and publish every change. Nobody in this project runs it, and Campfire itself never talks to it – the developers do.

## What Campfire uses it for

- **The code and the work.** The repository holds the code, the decisions, and this guidebook. Issues and pull requests carry the work, followed on the [WSJ27 project](https://github.com/orgs/Scouterna/projects/8) ([Process](../../process/)).
- **The checks.** GitHub Actions runs the formatters, linters, type checks, and tests on every change, one small workflow per concern ([ADR 009](/decisions/009-check-and-release-with-small-github-actions-workflows), [Continuous integration](../../development/continuous-integration)).
- **What ships.** The web application's container image goes to `ghcr.io` and is promoted to dev and prod by moving a tag ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image), [ADR 035](/decisions/035-promote-the-web-by-moving-environment-tags)). The agent skills are published as releases ([ADR 025](/decisions/025-publish-agent-skills-as-versioned-releases)), and this guidebook as GitHub Pages ([ADR 029](/decisions/029-render-the-guidebook-with-vitepress)).

## Locally

Nothing local stands in for it, and nothing needs to. The checks run the same commands on a developer's machine as in a workflow ([The checks](../../development/checks)), and the git hooks run them before a push.
