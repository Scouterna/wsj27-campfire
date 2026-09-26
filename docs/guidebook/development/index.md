# Development

This chapter is how work gets done in the repository: what a machine needs, where the code sits, how to run the whole system, and what a change has to pass before it leaves the machine.

The repository has two kinds of toolchain. The shared one is pnpm and Node – the web application, the modules and libraries, the mock back-end, the checks, the tests, and this guidebook – and `pnpm install` is all it asks for. The native ones are Gradle for the Android shell and Xcode for the Apple shell, driven through the same root scripts so nobody has to learn a second way in. Someone working only on the web application never needs the native toolchains, and the checks skip a platform whose toolchain is missing rather than failing.

| Part                                               | What it covers                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Setting up](./setup)                              | What a machine needs for the web application and for each shell.                     |
| [Repository layout](./layout)                      | The directories, the pnpm workspace inside them, and where configuration lives.      |
| [The environments](./environments)                 | Local, dev, and prod – three stacks behind one origin.                               |
| [The scripts](./scripts)                           | Every root script, the grammar behind their names, and the ports the servers hold.   |
| [The checks](./checks)                             | The shared and native checks, and the git hooks that run them.                       |
| [Continuous integration](./continuous-integration) | The GitHub Actions workflows, how a pull request is gated, and what a release ships. |
| [Conventions](./conventions)                       | The house rules a change is held to, and how AI-assisted work fits in.               |
