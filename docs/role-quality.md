# Give an existing Codex role a short quality contract

If a child agent finishes as soon as a command runs, add a short quality instruction to that role's existing `developer_instructions`. The goal is a usable result within the brief, with enough review to catch concrete mistakes. Checks stay proportional to the task; valid evidence is reused and work ends when the requirements are met.

Keep the role's existing instructions, model, effort, permissions, delegation limits, and reporting format. Add only the paragraph suited to its job. The examples below are instruction text to append inside the existing TOML multiline string, not replacement role configurations.

## Implementation and debugging roles

```text
Judge the approach and the actual result against the intended use, not merely whether a command runs. Before handing back, compare the diff and affected use with the full brief; correct concrete defects within scope. Keep checks proportional to the change, reuse valid evidence, and deliver once the requirements are met.
```

For visible work, inspect the actual rendered result and affected interactions. For a bug fix, establish that the original failure is resolved and the existing usage contract is preserved. These checks follow the assignment, rather than becoming a fixed checklist for unrelated changes.

## Read-only analysis, exploration, and review roles

```text
Before returning, compare the findings with the full brief and verify that decisive facts, comparisons, and reasoning support the conclusion. Correct concrete mistakes or omissions. Reuse valid evidence and return when the assigned question is answered; keep unrelated possibilities out of the investigation. Preserve this role's read-only boundary.
```

An explorer supplies verified facts for the parent's decision. An analyst or architect gives a scoped recommendation. A reviewer checks concrete findings and their impact. Keep those jobs distinct when adapting the paragraph.

## Mechanical editing roles

```text
Completion means the requested substitutions are accurate, complete, and limited to the allowed files and patterns. Before returning, compare the actual diff with the specified rules and correct missed or unintended edits. Use checks proportional to this change and deliver once the requirements are met.
```

## Apply to selected roles

Back up the selected role files before editing. Append the chosen paragraph inside their existing `developer_instructions` value and open a new Codex session. Existing child sessions keep their earlier instructions.

The installer does not edit roles, and its recovery receipt does not cover these additions. The `SubagentStart` Hook supplies the short Sub Steer reminder; it does not load `prompts/sub.md`. Full Sub instructions remain available for a role that explicitly needs them: see [complete Sub setup](install.md#use-the-complete-subagent-prompt-for-a-selected-role).
