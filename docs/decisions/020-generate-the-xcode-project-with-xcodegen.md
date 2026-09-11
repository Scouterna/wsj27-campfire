# 020. Generate the Xcode project with XcodeGen

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The Apple shell ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)) needs an Xcode project, and an Xcode project is a `project.pbxproj`: a graph of objects addressed by generated UUIDs, rewritten by the IDE whenever a file is added, a group is renamed, or a setting is toggled. Its diff is unreadable, so a change to the build is invisible in review, and a conflict in it is effectively unresolvable – two branches that each added a file produce colliding UUID blocks, and the fix is to take one side and redo the other by hand.

The shell also carries more configurations than an app of its size usually does. [ADR 012](012-run-campfire-in-three-environments-on-one-origin.md) names three environments, each crossed with debug and release – six configurations and three schemes, differing in one setting, the origin the shell loads the web application from. Maintained by hand in Xcode's settings editor, that is tedious, easy to get subtly wrong, and impossible to review.

## Decision

We describe the Apple project in `apps/apple/project.yml` and generate `Campfire.xcodeproj` from it with [XcodeGen](https://github.com/yonaskolb/XcodeGen), through `pnpm generate:apple`.

- **The YAML is the source, and the generated project is committed.** A fresh clone opens in Xcode and builds without installing anything; XcodeGen is a prerequisite for changing the project, not for using it.
- **Sources are declared as directories**, not file lists. Adding a Swift file is adding a Swift file.
- **Everything that varies per environment lives in xcconfig files.** `Shared.xcconfig` holds what all three share – the version, the bundle identifier, the app name, the signing team – and `Local`, `Dev`, and `Prod` each hold the one line that differs. XcodeGen crosses those three with debug and release into the six configurations and three schemes.
- **Info.plists are generated too**, from properties written beside the target they belong to.
- **The spec declares a minimum XcodeGen version**, so an older tool refuses rather than quietly generating a different project.

## Consequences

- XcodeGen is a prerequisite `pnpm install` does not provide, outside [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md)'s aging policy because it is not an npm package. Whoever changes the Apple project installs it; nobody else hears of it.
- A generated artifact is committed in a repository that otherwise commits none, so a clone opens in Xcode before any Homebrew install finishes.
- A change made in Xcode's UI is lost on the next generate. Xcode writes file references and settings into the project without complaint, and `pnpm generate:apple` overwrites them. The discipline is to edit `project.yml`, and the failure is silent until someone regenerates.
- The build is reviewable: six configurations, three schemes, and two test targets on one screen of commented YAML.
- The release version is written in three places – `package.json`, `Shared.xcconfig`, and the Android `versionName` – and a release moves all three by hand. XcodeGen removes the duplication inside the Apple project, not across the repository.

## Alternatives considered

- **A hand-maintained `.xcodeproj`.** No extra tool, and the editor everyone already has. Nobody can review its diff, and a merge conflict in it is resolved by guessing – both worse the moment a second person touches the shell.
- **xcconfig files alone, with the project kept by hand.** It fixes the settings half, which is why the xcconfigs are part of the decision, and does nothing about file references, targets, or schemes, which is where the conflicts happen.
- **[Tuist](https://tuist.dev).** A module graph, caching, and manifests in Swift – more tool than one app target and two test targets need.
- **Swift Package Manager alone.** Apple's own, and it cannot express an iOS application target with an Info.plist, an app icon, per-environment schemes, and a UI-test bundle, so a project would exist anyway and there would be two build descriptions instead of one.
- **Generate at build time and never commit the project.** No generated file in git, and a generation step between a developer and the IDE they are already in, for a project regenerated a handful of times a year.
