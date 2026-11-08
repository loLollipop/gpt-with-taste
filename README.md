<p align="right">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/hero-banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/hero-banner-light.svg">
  <img alt="GPT with Taste — Better judgment. Better taste. Less ceremony." src="assets/hero-banner-light.svg" width="100%">
</picture>

<p align="center">
  A drop-in behavioral recipe for OpenAI Codex: make ordinary decisions, digest complexity, and deliver work with engineering and visual craft.<br>
  Built for the GPT reasoning family, especially GPT-6.1 Sol and GPT-6 Astra. Replies follow the language you write in.
</p>

<p align="center">
  <a href="#install">Install Codex</a> ·
  <a href="#what-changes">What changes</a> ·
  <a href="#featured-case">Comparison</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#research">Research</a>
</p>

---

This fork of [NB-Corp/gpt-with-taste](https://github.com/NB-Corp/gpt-with-taste) appends a lean Main to Codex instead of replacing its base instructions, puts reference fidelity before stylistic taste, and keeps Steer to a few sentences. Self-review is part of delivery, with checks proportional to the actual change. For custom Codex agents, use the [short role quality instructions](docs/role-quality.md); the installer leaves existing roles intact. The comparison cases below come from upstream. A single English source in `recipe/` compiles into the Codex prompts and plugin: edit there and rebuild with [docs/authoring.md](docs/authoring.md).

---

<a id="install"></a>

## Install · Codex

With Node.js 22 or newer installed:

```sh
git clone https://github.com/loLollipop/gpt-with-taste.git
cd gpt-with-taste
node scripts/install.mjs --hooks
```

We recommend Hooks for multi-turn work in Codex Desktop: user submissions, child startup and supported wait results receive scoped reminders. Later child-input coverage depends on the [client entry point](docs/install.md#runtime-coverage). For a prompt-only installation, run `node scripts/install.mjs` instead. Neither route needs npm packages.

Both routes install into the active `CODEX_HOME` (otherwise `~/.codex`), write the two managed prompt files, and add Main as top-level `developer_instructions`. Codex keeps its built-in base instructions. Your model, provider, effort, authentication, permissions, MCP servers, roles, and `AGENTS.md` remain unchanged. To target another home, add `--home` with a quoted absolute path, for example `--home "C:/Users/you/.codex"`.

With `--hooks`, review and trust the three installed definitions in Codex Desktop under **Settings → Hooks**, or in the interactive terminal with `/hooks`. Enable only the events you want. Open a **new Codex session** after installation.

Check updates with `node scripts/check-updates.mjs`. Installation also checks official metadata before writing; add `--skip-update-check` for offline installation. [Update instructions](docs/install.md#update-or-resolve-a-conflict) cover the installed components and customized checkouts.

Prefer to delegate? Give your coding assistant this repository and [docs/install-for-ai.md](docs/install-for-ai.md). To recover the managed state, use [docs/recovery.md](docs/recovery.md). The complete installation contract is in [docs/install.md](docs/install.md).

---

<a id="what-changes"></a>

## What changes

GPT with Taste puts judgment into the outcome: choose sensible defaults, preserve supported claims, synthesize useful collaborator results, and finish work with care.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/comparison-diagram-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/comparison-diagram-light.svg">
  <img alt="Default behavior vs. GPT with Taste — five everyday contrasts" src="assets/comparison-diagram-light.svg" width="100%">
</picture>

The recipe combines judgment, continuous execution, collaboration, and engineering and visual craft. Explore the principles in [Research](docs/research.md), or inspect complete runs, task inputs, and side-by-side outputs in the [Case Archive](docs/cases.md) and [Web Comparison](https://nb-corp.github.io/gpt-with-taste/).

---

<a id="featured-case"></a>

## Comparison · From installation logs to a first task

> **Task request**: Use `notes.md` to write a Chinese getting-started guide for a colleague who has just finished installing. Save it as `START_HERE.md`.

The visible improvement is straightforward: get the reader started first, while installation audits and process disclaimers step out of the way.

[![Codex default vs. GPT with Taste: representative excerpts, with unnecessary self-justification highlighted](assets/case-first-use-en.png)](https://nb-corp.github.io/gpt-with-taste/)

Inspect full inputs, generated documents, and run conditions: [Task & run conditions](docs/cases/codex-first-use/input.md) · [Web comparison page](https://nb-corp.github.io/gpt-with-taste/) · [Case index](docs/cases.md).

---

<a id="how-it-works"></a>

## How it works

1. **The system prompt sets standing priorities.** It covers judgment, execution, collaboration, and craft. The instructions are English; replies follow your latest language.
2. **Steer refreshes priorities at supported events.** Local hooks route user context to main, scoped reminders to delegated agents, and input-consumption guidance to main upon receiving collaborator results.

Standalone prompt definitions provide the complete behavior for each agent role; the optional hooks connect the matching reminder paths.

---

<a id="research"></a>

## Research

[docs/research.md](docs/research.md) details the findings, prompt architecture, and iteration loop behind the recipe: how defensive writing affects the reader's experience, why models need room for ordinary judgment, and how collaborator findings are turned into direct action.

---

<p align="center">
  <a href="LICENSE">MIT License</a> · Credits: <a href="https://github.com/SpadeLushen/pi-gpt-with-taste">SpadeLushen/pi-gpt-with-taste</a> · Community friend link: <a href="https://linux.do/">Linux DO</a>
</p>
