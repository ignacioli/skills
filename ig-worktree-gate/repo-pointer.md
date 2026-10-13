# AGENTS.md pointer (append; do not replace the file)

English:

**Protected primary branch.** Do not modify tracked files, stage, or commit on `main` or `master`. Fetch the up-to-date primary tip, then create a topic branch (prefer a dedicated git worktree) before changing tracked files. Direct commits to the primary branch are forbidden. Gitignored local state on the primary checkout is allowed.

**Local toolchain bootstrap.** After `git worktree add`, and before using project skills, SpecKit, `.handoff`, Cursor subagents, or Codex project subagents in that worktree, run `scripts/bootstrap-local-worktree.sh` with the worktree as `cwd`. The script relative-symlinks ignored runtime subtrees from the primary checkout and skips missing sources. Do not symlink all of `.specify/`, `.cursor/`, or `.codex/`. Agents: run `ig-worktree-gate` before tracked-file edits.

中文（仅当仓库已有 `AGENTS.zh.md`）:

**受保护的主分支。** 不得在 `main` 或 `master` 上修改已跟踪文件、暂存或提交。先 fetch 最新主分支 tip，再创建主题分支（优先独立 git worktree），然后才改已跟踪文件。禁止直接提交到主分支。主 checkout 上的 gitignore 本地状态可以保留。

**本地工具链 bootstrap。** `git worktree add` 之后，以及在该 worktree 中使用项目 skills、SpecKit、`.handoff`、Cursor subagent 或 Codex 项目 subagent 之前，把该 worktree 作为 `cwd` 运行 `scripts/bootstrap-local-worktree.sh`。脚本把主 checkout 上被忽略的运行时子树做成相对 symlink，缺失的源则跳过。不要链整个 `.specify/`、`.cursor/` 或 `.codex/`。Agent 在改跟踪文件前运行 `ig-worktree-gate`。
