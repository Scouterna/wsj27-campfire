# 031. Adopt the agent-driven working process

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire is built largely by AI agents, and the human has to stay in control of what it becomes. Without a process explicit about who does what, where the human decides, and what each step produces, agents blur into one another, approve their own work, and drift from the human's intent until it is expensive to unwind. The reasoning that outlives a branch needs durable homes, and the scratch of one piece of work in flight has to stay out of the permanent record.

Some work is wider than one agent – sources to read, approaches to compare, review lenses, changes to disjoint files. Running it in parallel raises a question of its own: what may an agent do to the working tree the human is sitting in?

## Decision

We adopt an agent-driven working process built on these rules:

- **The human drives every decision, and the agents only propose.**
- **Each agent owns one job**, and no agent both produces a piece of work and approves it.
- **Every handoff is a human approval gate.**
- **Work is specified before it is built**, in steps that each produce one named output, so a line of code traces back to its need.

The reasoning that outlives a branch goes in the issue, the decisions, the guidebook, and the code; the working documents stay per branch and uncommitted. Agents never create branches and never commit, and the tree the work started in is the tree it ends in.

An agent may fan independent work out to parallel subagents, inside those rules:

- **It spawns only its own type, or a subtype of it**, because an agent that spawns another role is arranging its own approval.
- **Results return as content, never as a git operation.** The orchestrating agent writes them into the working tree.
- **An ephemeral worktree is allowed where isolation needs one**, invisible to the human, removed when the work ends, and never the working context.
- **The gates do not move.**

Which agents exist and the steps they move through live in `AGENTS.md` and the agent files, and change as the work teaches us.

## Consequences

- The human stays in control, and drift is caught at the next gate while it is still small.
- Every gate costs the human a review, so a small task or a clear bug skips the steps it does not need.
- Only the issue, the decisions, the guidebook, and the code outlive a branch; the specification behind past work is gone.
- A subagent starts with none of the uncommitted work, so everything it needs is written into its prompt, and fanning out costs tokens that only wide work repays.
- An agent file that breaks one of these rules contradicts this record, so the agent file changes, or a new record does.

## Alternatives considered

- One general-purpose agent – it proposes and approves its own work.
