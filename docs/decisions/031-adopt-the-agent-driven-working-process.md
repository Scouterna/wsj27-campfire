# 031. Adopt the agent-driven working process

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire is built largely by AI agents, and the human has to stay in control of what it becomes. That needs a process explicit about who does what, where the human decides, and what each step produces – otherwise the agents blur into one another, propose and judge their own work, and drift from the human's intent until it is expensive to unwind. The reasoning that outlives a branch has to land in durable homes, and the scratch that carries one piece of work in flight has to stay out of the permanent record.

Some work is wider than one agent – sources to read, approaches to compare, review lenses to run, plan tasks that touch disjoint files. Running those in parallel means one agent directing several, which raises a question the rest of the process does not: what may an agent do to the working tree the human is sitting in?

## Decision

We adopt an agent-driven working process built on four rules:

- **The human drives every decision, and the agents only ever propose.** Nothing lands because an agent judged it ready.
- **Each agent owns one job.** No agent both produces a piece of work and approves it.
- **Every handoff is a human approval gate.** The agent presents what it produced and waits.
- **Work is specified before it is built**, in steps that each produce one named output, so a line of code traces back to the need it serves.

The reasoning that outlives a branch goes in the issue, the decisions, the guidebook, and the code. The working documents that carry one piece of work stay per branch and out of the committed history. The agents never create branches and never commit; the human owns the git history and the working context, and the tree the work started in is the tree it ends in.

An agent may fan genuinely independent work out to parallel subagents, inside the four rules above:

- **An agent spawns only its own type, or a subtype of it.** An agent that spawns another role is arranging its own approval.
- **Results return as content, never as a git operation.** The orchestrating agent writes them into the human's working tree – no merge, no cherry-pick, no commit.
- **An ephemeral worktree is an implementation detail**, allowed where isolation needs a separate checkout, provided it is invisible to the human, removed when the work finishes, and never becomes the working context.
- **The gates do not move.** Parallelism changes how work is done, never who decides.

Which agents exist, what each is called, and the steps they move through are operational detail. They live in `AGENTS.md` and the agent files beside it, and they are expected to change as the work teaches us what the roles should be.

## Consequences

- Authority stays with the human by construction, and a gate at every handoff catches drift while it is still small.
- Requirement numbers thread through every step, so a design choice or a build task can be traced to the need it serves.
- The specification behind past work is not preserved. The issue, the decisions, the guidebook, and the code are what endure.
- The orchestrating agent is the single writer for everything shared, so parallel writers cannot clobber each other – a constraint on how a fan-out is designed, not a detail to settle later.
- Context does not survive into an isolated checkout: the spec scratch is gitignored and uncommitted work does not exist in a fresh worktree, so whatever a subagent needs is inlined into its prompt. A subagent pointed at a path gets an empty folder and guesses confidently.
- More agents means more tokens for the same work. Parallelism is for work that is wide, not for making a small task feel faster.
- The process adds ceremony, and it serves the work rather than the reverse: a small task or a contained bug goes straight from an issue to a small change.
- The roles change without touching this record, since it fixes the rules and not the cast. An agent file that quietly breaks one of these rules contradicts a decision, and the fix belongs here.

## Alternatives considered

- **One general-purpose agent doing everything.** Simpler to set up, and it collapses the separation that keeps an agent from proposing and approving its own work.
- **Agents that decide and commit autonomously.** Faster in the moment, and it takes control away from the human – the one thing this process exists to protect.
- **A single sign-off at the end instead of a gate per step.** Fewer checkpoints, and drift discovered only at the end is expensive to unwind.
- **Committing the working documents as durable history.** Every specification preserved, and the permanent record cluttered with in-flight scratch.
- **Forbidding parallel work outright.** It protects the working context absolutely, and rules out the wide, independent work parallelism helps, against a risk an ephemeral checkout does not carry.
- **Subagents committing their own work for the orchestrator to merge.** The natural git answer, and it hands the history to the agents.
