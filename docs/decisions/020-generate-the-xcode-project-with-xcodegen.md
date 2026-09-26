# 020. Generate the Xcode project with XcodeGen

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The Apple shell ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)) needs an Xcode project, and a `project.pbxproj` is a graph of objects addressed by generated UUIDs, rewritten by the IDE on every change. Its diff is unreadable, and a conflict in it is resolved by taking one side and redoing the other by hand.

The shell also carries more configurations than an app its size usually does: the three environments of [ADR 012](012-run-campfire-in-three-environments-on-one-origin.md), each crossed with debug and release, differing in the origin the shell loads. Kept in Xcode's settings editor, that is easy to get subtly wrong and impossible to review.

## Decision

We describe the Apple project in `apps/apple/project.yml` and generate `Campfire.xcodeproj` from it with [XcodeGen](https://github.com/yonaskolb/XcodeGen), through `pnpm generate:apple`.

- **The YAML is the source, and the generated project is committed**, so a clone opens and builds in Xcode without XcodeGen.
- **Sources are declared as directories**, not file lists.
- **What varies per environment lives in xcconfig files.** `Shared.xcconfig` holds what all share – the bundle identifier, the app name, the signing team – and `Local`, `Dev`, and `Prod` each hold the line that differs.
- **Info.plists are generated too**, from properties beside their target.
- **The spec declares a minimum XcodeGen version**, so an older tool refuses rather than generating a different project.

## Consequences

- XcodeGen is a prerequisite `pnpm install` does not provide and [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md) does not age, needed only by whoever changes the project.
- A change made in Xcode's UI is silently lost on the next generate, so the project is edited in `project.yml`.
- The build is reviewable – every configuration, scheme, and test target on one screen of commented YAML.

## Alternatives considered

- A hand-maintained `.xcodeproj` – an unreviewable diff and conflicts resolved by guessing.
- [Tuist](https://tuist.dev) – more tool than one app target and its tests need.
