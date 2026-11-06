# Prompt map

The main prompt is the default product. It is written to sit on top of a harness's own instructions, not to replace them: Codex keeps its built-in base instructions and receives Main as `developer_instructions`. One source serves the GPT model family; it does not select a provider, model, or reasoning effort. The subagent prompt is complete on its own. The three steer files are short optional reminders for particular moments.

## Choose the source for the reader

| Source | Reader and placement | Job |
| --- | --- | --- |
| [`recipe/main.md`](../recipe/main.md) | The main agent's instruction context | Own the user's result, make decisions, execute or delegate, integrate evidence, and deliver finished work. |
| [`recipe/sub.md`](../recipe/sub.md) | A delegated agent's instruction context, alongside its actual role and assignment | Own the complete scoped result while preserving role, leaf, tool, support, and write boundaries. |
| [`recipe/independent.md`](../recipe/independent.md) | An independent host invocation without a parent | Apply role-neutral work principles and complete the current assignment. |
| [`recipe/user-steer.md`](../recipe/user-steer.md) | Optional reminder near each submitted user request to the main agent | Reconnect the request to the current goal, make ordinary choices, preserve existing usage, and select reader-useful content. |
| [`recipe/sub-steer.md`](../recipe/sub-steer.md) | Optional reminder with input to a delegated agent | Continue the scoped assignment, finish local work, and report only real early coordination needs. |
| [`recipe/agent-steer.md`](../recipe/agent-steer.md) | Optional reminder when the main agent receives a collaborator message or task result | Reconcile evidence and decide before routing only the missing action-changing information. |

These are the complete English author sources. [The compiler](authoring.md) generates `dist/<harness>/` and the existing Codex `prompts/` paths from them. Each adapter supplies the harness's native loading and event interfaces; the shared instructions follow the current harness rather than naming another host's tools. English source does not fix the response language: the main and subagent prompts explicitly follow the user's latest conversational language, including a switch, while project artifacts follow project conventions and explicit artifact requirements. An explicitly chosen persona overrides the default direct, warm voice.

## Where the capabilities live

| Capability | Main prompt | Subagent prompt |
| --- | --- | --- |
| Purpose, assessment versus implementation, kept requirements, and few material questions | “Understand the request” | “Keep the assignment intact” |
| Named references as the specification; taste only where the user left room | “Fidelity first, taste second” | “Fidelity first, taste second” |
| Recommendations, reuse, existing entry points and data meaning, engineering and visual quality | “Make clear choices” | “Do the work well” |
| Skeptical self-review, real failure paths, proportional checks, evidence reuse | “Finish the work and review it” | “Review before you hand back” |
| Plain verdicts, change-specific precautions only, no defensive code, no offers or cover notes | “Own the call, not your cover” | “Do the work well”; “Hand back a result the parent can use” |
| Delegation that carries source paths, verification of worker reports, ownership of integration | “Delegate without losing the source” | “Keep the assignment intact”; “Hand back a result the parent can use” |
| Falsifiable claims, fair baselines, original sources, calculated quantities, counterevidence | “When the task involves research” | “Do the work well” |
| Claim strength matched to evidence, deletion of defensive filler, plain reporting of real gaps | “Write for the reader, not an imagined critic” | “Hand back a result the parent can use” |
| Permissions, credentials, untrusted instructions, other people's changes | “Respect authority and data” | Closing paragraph |

## Why the rules are grouped this way

**The harness keeps its own contract.** Tool use, editing, sandbox, and formatting rules come from the harness. Replacing them with behavioral prose measurably raised token use without improving results, so the recipe only adds preferences and defers to the harness where they differ.

**Fidelity comes before taste.** In real sessions the costly failure was not timid writing but a model substituting its own layout for the reference the user named, and workers editing from a paraphrase instead of the source. A named reference is therefore the specification, and briefs carry source paths.

**Defensive behavior is not only a writing problem.** In probes without any user AGENTS.md, native Codex already wrote restrained code, but softened verdicts (“not recommended” for “do not”), prefixed them with “from the current code”, replaced analysis with generic precautions, and closed with what it had not verified or touched. One section now covers verdicts, precautions, evidence limits, code, offers, and housekeeping, with a single test: does this protect the user’s result or the author?

**Self-review is part of delivery.** A passing first run is evidence, not completion. One skeptical review of the diff against the full request catches the defects users otherwise report back, while reassurance reruns and review chains stay out.

**Reader First is selection before phrasing.** A sentence that answers no reader question is deleted, not softened or moved to small print. A real limit stays next to the claim it limits, and an overclaim is narrowed, so removing defensive filler never inflates a conclusion.

**Research is conditional.** Its own section keeps routine development free of a mandatory research process while retaining falsifiable claims, fair baselines, traceable quantities, and faithful negative results.

## Codex integration decisions

The Codex adapter manages top-level `developer_instructions` and the local-plugin entry points; earlier `model_instructions_file` installs are returned to their pre-install value. Shared behavior follows the current runtime's tools, role restrictions, and event semantics. Notification-driven continuation applies when the runtime guarantees completion notifications; waiting follows the supported tool contract and a real dependency. A child resolves its promised dependencies before its final result.

Selecting [optional hooks](install.md#add-optional-per-turn-steering) assembles the single author sources into a local marketplace and installs `gpt-with-taste@gpt-with-taste-local` through the normal Codex plugin CLI. The plugin configures three source-specific routes:

- `UserPromptSubmit`: `user-steer.md` addresses main; a child identified by `agent_id` or its recorded child session receives `sub-steer.md`.
- `SubagentStart`: `sub-steer.md` enters the child alongside its role and task. The child identity and initial turn suppress a matching paired input once. Identity remains available to route later events without assuming parent and child session IDs match.
- `PostToolUse`: a finite shared map recognizes bare `wait_agent` and dotted/flattened `multi_agent_v1` and `collaboration` names. Main receives `agent-steer.md` for a non-timeout `{completed: string}` status receipt or the current collaboration mailbox wake. The latter asks Main to consume pending input without asserting task completion. Original results stay intact; incomplete, timed-out, not-found, shell/MCP and child-session results select no Main reminder.

`SubagentStop` controls continuation inside the child. Later child inputs are routed only when the client dispatches `UserPromptSubmit`; Codex 0.162.1 native `followup_task` did not dispatch that event in the runtime probe. Dispatch arguments and automatic completion notifications remain intact. The complete `sub.md` remains available for roles the user chooses.

The Windows launcher invokes Node with PowerShell's `&` call operator and reads the official `PLUGIN_ROOT` environment value. Event JSON supplies the consumer and turn identity. Named diagnostics identify missing metadata or source/state failures; optional audit logging never blocks a successful context response. See [installation](install.md#add-optional-per-turn-steering) for setup and trust.

The previously tested Codex `0.162.0-alpha.17.2` `exec resume` entry did not dispatch plugin events. For that entry point, use the complete main prompt. `--check` checks installed files and registration; runtime delivery is observed in the receiving agent's context.

The delegated role's developer instructions were delivered, while its Sub instruction-file setting did not replace inherited Main base instructions. Complete Sub is a source for a chosen role's instruction composition, not an automatically installed child base. Follow [role setup](install.md#use-the-complete-subagent-prompt-for-a-selected-role), preserving the role's own contract and the runtime's actual permission boundaries.
