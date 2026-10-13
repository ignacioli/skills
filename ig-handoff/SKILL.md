---
name: ig-handoff
description: >-
  User-invoked session-end note writer. Saves one markdown file under
  workspace .handoff/. Does not resume work and does not run from an
  existing .handoff file.
argument-hint: "What will the next session focus on?"
disable-model-invocation: true
---

# ig-handoff

## Gate — read this first

This skill **writes one session-end note**. It does not resume work.

Continue only when **this turn** names or @-mentions **ig-handoff**.

**Stop. Do the requested work. Do not create or rewrite any `.handoff/*.md`.** if any of these are true:

- The user is reading, attaching, or executing an existing `.handoff/*.md`.
- The prompt is 阅读交接文档, 根据提示开始干活, 接手, 接续, 继续未完成的工作, resume, or continue.
- A subtask, measurement, commit, or one row of 「下一任」just finished.
- This skill was not named in this turn.

Completing work is not a handoff. One named invocation → at most **one** file, written once at the **end** of that invocation, covering the **whole session**. Do not emit a new file after each small task.

Bare 交接 / handoff / 接手 is not enough (community `handoff` may also be installed).

## Writing prompt (only after the gate)

本轮会话很长很久了，我们做一下交接吧，忽略debug, 追问，闲聊，术语澄清等偏离主线话题的内容，总结一下本轮会话核心工作内容：本轮从哪里开始，主要解决了什么问题、遇到什么问题以及问题如何解决，哪些事项由 AI 提议或推断、哪些事项由人类批准或拒绝，是否存在真实的 Block / Failed 及其当前状态，待解决问题是什么，下次（人类+AI Agent）从哪里接手，优先做什么。

## Defaults

- Output directory: workspace `.handoff/` (create if missing). Do not write into `docs/` unless the user asks.
- These files are usually gitignored. Do not commit them unless the user asks.
- If the user stated what the next session will focus on, tailor 「下一任」to that. Do not dump every residual risk.

## Language

Default: 中文.

If **this invoking prompt is 100% English** (no CJK characters), write the handoff in English, including headings. Mixed Chinese+English stays 中文. An explicit "in English" / 「用英文」overrides the heuristic.

## One file, not a chain per task

Inspect live git **and workspace topology** before writing. Do not invent commits, SHAs, remotes, or test results.

**Default: update the current entry in place** (or append a short 补记) when this session is still the same unfinished thread and the previous file's 「下一任」agenda is still the right list — even if item 1 is now done.

Create a **new** dated file only when the user invoked this skill **and** the previous file's whole agenda is obsolete (policy landed, the next human should not follow that list at all). Finishing one measurement, one commit, or one table row is not that.

New filename: `.handoff/YYYY-MM-DD-<short-slug>.md` using today's date. After writing it, add a one-line banner at the top of the previous current handoff: **下一任不要从这里接着做**（English: **Do not resume from this file.**），当前入口是新文件。Leave the old body as historical evidence; mark stale 「未提交 / 下一任」sections so they are not treated as todos.

Every written file must tell the next agent **not** to spawn another handoff while executing it.

## 工作区快照 — next agent must not rediscover this

下一任读交接时，必须能直接知道：仓库在哪、公有还是私有、当前 checkout 是主工作区 / worktree / submodule / 软链接、HEAD 是哪次提交。缺这一段，每个新会话都会重新 `find` / `readlink` / 猜链接目录的路径。

**先复用、再核实、不发明。** 上一份 handoff 的「工作区快照」就是拓扑图：核对其路径、链接目标和 HEAD 仍成立，然后更新 SHA / 分支 / 干净与否。只有快照缺失、核实失败、或本轮改了链接/worktree/submodule 时，才重新探查。

核实（按需，不要无目的扫盘）:

```sh
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --short
git worktree list
git submodule status
# in-tree 目录若可能指向别处：
ls -ld <path> && readlink <path>
git -C <sibling-or-link-target> rev-parse --abbrev-ref HEAD
git -C <sibling-or-link-target> rev-parse HEAD
git -C <sibling-or-link-target> status --short
```

公有 / 私有：用已有 handoff、remote、或 `gh repo view --json isPrivate` 等已核实来源。不知道就省略，不要猜。

文首 banner 之后立刻写 **工作区快照**。每个相关 checkout 写清：

- 绝对路径
- 公有 / 私有（已知才写）
- 挂接方式：本工作区 | git worktree（写出主 checkout） | git submodule | 软链接 → 真实目标
- 分支、`HEAD` SHA、干净 / 不干净
- 若 in-tree 目录是软链接：写明仓库内该怎么读（`<link>/roadmap.md`），以及不要拼的错误路径（`<link>/<sub>/...`）

**最低限度**（拓扑相对上一份未变、或工作区极简）：关键 `HEAD` SHA + 一句挂接（软链接 / worktree / submodule）。有 SHA 也不能省略挂接——下一任最常浪费的就是确认「是不是软链接」。

Worktree / submodule 不存在就不要写空行。`.handoff/` 默认 gitignore、不提交；只在与 Defaults 不符时另写一句。

## What to include

Do not duplicate specs, plans, ADRs, issues, commits, or diffs. Point to path or URL; put only the decision and the next action in the handoff.

Redact secrets: API keys, passwords, tokens, machine login credentials, and PII. If a local handoff already contains them, point to that file—do not copy them forward.

1. **当前入口** — which file to open next; point at older handoffs for evidence only.
2. **工作区快照** — required; see above. Capture this workspace, never copy another project's paths.
3. **本轮从哪里开始** — the concrete handoff/commit/task/file and state that this session actually picked up.
4. **本轮解决了什么** — the main-line outcome only.
5. **遇到什么问题，问题如何解决** — pair each observed problem with its evidence and the applied resolution; omit incidental debugger trails.
6. **AI 和人类如何决策** — distinguish AI proposals/inferences from human approvals/rejections/constraints; never present an AI suggestion as a human decision.
7. **Block / Failed** — include only real blockers or failures, each with an evidence source (command, test, artifact/log/path/task/commit, etc.) and current status. If none exists, omit this section entirely; never use an empty placeholder or fabricate a failure.
8. **待解决问题** — still true, still blocking or next; shrink this list when the user named a next-session focus.
9. **下次从哪里接手，优先做什么** — concrete first command or file, then an ordered list. Include duration and completion signal for long tasks.
10. **建议调用的 skills** — only skills that exist in this workspace or that this session actually used (path or name). Skip the section if none. Do not suggest `ig-handoff` as a next-step skill.
11. **不要做** — only if this session established a hard don't (product red line, wrong refactor, mixed measurement series).
12. **关键提交 / HEAD** — this session's commits with one-line why. If the snapshot already lists current `HEAD`, do not repeat SHAs here unless a commit message / intent is worth keeping.

Omit: debugger trails, clarifying Q&A, chitchat, terminology debates, and any numbered "Phase N" that collides with `tasks.md` SDD (spec-driven development) phases. Name work by date and activity.

## Template

中文 headings by default; use the English names in parentheses when the output is English.

```markdown
# Handoff: <一句话现状>（YYYY-MM-DD）

> **当前入口** (Current entry). 上一份 `.handoff/<previous>.md` 只作证据，文首「下一任…」已过期.
>
> **执行本文件 = 接着干活。** 不要新建 `.handoff/` 文件。只有用户点名 `ig-handoff` 时才写下一份交接。

## 工作区快照 (Workspace)

- <公有/私有> `<abs-path>` — `<branch>` `HEAD <sha>` — <干净 / 不干净>
- <in-tree 名> 是软链接 → `<abs-target>`。仓库内读取用 `<in-tree/foo>`，不要拼 `<wrong/path>`。
- <若是 worktree> 本工作区是 `<main-checkout>` 的 worktree：`<abs-path>`（`<branch>`）
- <若是 submodule> `<in-tree path>` 是 submodule @ `<sha>`（不是软链接）

## 本轮从哪里开始 (Where this session started)

- …

## 本轮解决了什么 (What this session solved)

- …

## 遇到什么问题，问题如何解决 (Problems and resolutions)

- **问题**：…（证据：`<command|test|artifact|log|path|task|commit>`）
  **解决**：…

## AI 和人类如何决策 (AI and human decisions)

- **AI 提议 / 推断**：…
- **人类批准 / 拒绝 / 约束**：…

## Block / Failed

<!-- 仅当存在真实 Block 或 Failed 时保留本节；每项必须有证据和当前状态。没有则删除本节。 -->

- **Block / Failed**：…（证据：`<command|test|artifact|log|path|task|commit>`；状态：…）

## 待解决问题 (Open problems)

1. …

## 下一任从这里接手 (Pick up here)

**优先** (First): <第一件具体事。>

<command or file, if any>

然后按需:

| 顺序 | 做什么 | 为何 |
|------|--------|------|
| 1 | | |

## 建议调用的 skills (Suggested skills)

- `skill-name` — why

## 明确不要做 (Do not)

- …

## 关键提交 / HEAD (Key commits)

- `<repo>`：`<sha>` — <一句 why>
```

形状示例（不要把这些路径抄进别的仓库的交接）：

```markdown
## 工作区快照

- 公共仓库：`/abs/app` — `main` `HEAD abc…` — 干净
- 私有仓库：`/abs/notes` — `feat/x` `HEAD def…` — 干净
- 仓库内 `<link>` 是软链接 → `/abs/notes/<sub>`。读取用 `<link>/roadmap.md`，不要拼 `<link>/<sub>/...`
```

最低限度示例：

```markdown
## 关键提交 / HEAD

- app：`abc…` — <一句 why>
- private notes：`def…` — <一句 why>；仓库内 `<link>` 是指向该私有仓库的软链接
```

## Examples

| User says | Do |
|-----------|----|
| `@ig-handoff` / names ig-handoff | Write **one** session-end file (or update the current entry). |
| `阅读交接文档，根据提示开始干活。` + a `.handoff/*.md` path | Read that file and work. **Do not write a handoff.** |
| `执行 .handoff/….md` / 接手 / resume | Same: work only. |
| Finished a spec, a measurement, or row 1 of 「下一任」 | Keep working or stop. **Do not write a handoff.** |
