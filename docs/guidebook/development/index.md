# Development

This chapter is how work gets done in the repository: what a machine needs, how the code is arranged, how to run the whole system, and what a change has to pass before it leaves the machine. It describes the repository as it is now – the shared toolchain, both native toolchains, the three environments, and eleven continuous integration workflows are all wired up, even while most of the feature set is still open.

The chapter is in seven parts, each its own page:

| Part                                               | What it covers                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Setting up](./setup)                              | Everything a machine needs – the runtimes, Caddy, Docker, and the two native toolchains.    |
| [Repository layout](./layout)                      | How the repository is arranged, and the four pnpm workspace roots inside it.                |
| [The environments](./environments)                 | Local, dev, and prod – three stacks behind one origin, and what is missing from them.       |
| [The scripts](./scripts)                           | Every named root script, the grammar behind their names, and the ports each one holds.      |
| [The checks](./checks)                             | The shared checks, the native ones, and the two git hooks that run them.                    |
| [Continuous integration](./continuous-integration) | The eleven GitHub Actions workflows, how a pull request is gated, and what a release ships. |
| [Conventions](./conventions)                       | The house conventions, and how AI-assisted development fits into the work.                  |
