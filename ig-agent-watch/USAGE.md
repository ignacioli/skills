# ig-agent-watch: usage examples

Worked example: a Codex run implementing a feature in a worktree (`.worktrees/stage-d`), watched by a human and a Claude session. Paths and numbers are illustrative; nothing here is specific to Codex, Xcode or Swift.

## For a human

1. **One-off check.** Tell your assistant: "use ig-agent-watch on stage-d", with the base commit, the agent's log paths, and the scope / forbidden paths from the task prompt. It runs the script and reports using the reading table in `SKILL.md`.
2. **Timed patrol.** Say: "patrol every 20 minutes, state file at `~/.watch/stage-d.json`". The assistant schedules it (`CronCreate` or `/loop 20m` in Claude Code, cron or launchd elsewhere). Trends (`delta_*`) appear from the second patrol on.
3. **What you read.**
   - Healthy, one line: `[watch 14:20] ok: 3 commits (+1), tasks 20/29, tests 0.66:1, logs growing, process alive`
   - Problem, 2-3 lines: level, evidence (key=value plus the log sample), suggested action, e.g. "2 assertions deleted in `tests/test_app.py`; suggest telling the agent to restore them".
4. **You decide.** The skill never stops or messages the agent. After the report, you choose: tighten the prompt, ask the agent to restore an assertion, or let it run.
5. **Stop retyping parameters.** Put them in `<worktree>/.long-task-watch.conf`:

```
scope=ios/**
scope=design/**
forbid=**/*.xcdatamodeld/**
task-file=specs/004-stage-d/tasks.md
```

Then only `--base` and `--log` are needed.

## For an AI agent (Claude)

On a patrol request:

```bash
bash ig-agent-watch/scripts/watch.sh --worktree .worktrees/stage-d --base cf903d8 \
  --log .handoff/logs/…implement-run.log --log .handoff/logs/…resume1-run.log \
  --scope 'ios/**' --scope 'design/**' --forbid '**/*.xcdatamodeld/**' \
  --task-file specs/004-…/tasks.md --pid-pattern 'codex exec.*stage-d' \
  --state ~/.watch/stage-d.json
```

Then read the output row by row against the reading table:

- `top_error_repeat_count=8` with an Xcode `IDESchemeActionSDKRecord` sample: toolchain noise, not a loop.
- `file_churn` shows `project.pbxproj` in 3/3 commits: a manifest every phase must update, ignore.
- `out_of_scope_count=0`, `forbid_hits_count=0`, `assert_lines_deleted=0`, `test_to_source_ratio=0.66`: all normal.

Result: the one-line ok report above.

A bad patrol looks like `assert_lines_deleted=2`, `skip_markers_added_count=1`, `forbid_hits_count=1`. Report level "needs a human" in 2-3 lines with the evidence and a suggestion, then stop and wait. Do not touch the agent.

## When the agent exits

Run one more patrol: `process_alive=no` is now expected. Check the scope, forbid, assertion and skip rows against the final diff, report, and stop the timer.
