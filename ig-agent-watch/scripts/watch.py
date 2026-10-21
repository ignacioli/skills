#!/usr/bin/env python3
"""Read-only facts about a long-running agent's worktree. See ../SKILL.md.

Prints `key=value` lines and never concludes anything: thresholds and judgment
live in SKILL.md. Lists print as `key_count=N` plus `key[1]=...` lines.
Only write: the --state snapshot, to the path the caller passes.
"""
import argparse
import collections
import fnmatch  # noqa: F401  (kept for readers; matching is done by glob_to_re)
import json
import os
import re
import subprocess
import sys
import time

MAX_LIST = 15           # cap on printed items per list
TAIL_BYTES = 2_000_000  # how much of a log's end is read for tail analysis

DEFAULT_TEST_GLOBS = [
    "*Tests.swift", "*Test.swift", "*_test.go", "*.test.ts", "*.test.tsx",
    "*.test.js", "*.test.jsx", "*.test.mjs", "*.spec.ts", "*.spec.tsx", "*.spec.js",
    "*_test.py", "test_*.py", "*_test.rb", "*_spec.rb", "*Test.java", "*Tests.java",
    "*Test.kt", "*Tests.kt", "*Test.cs", "*Tests.cs", "*Test.php", "*_test.rs",
    "*_test.dart", "*_test.cc", "*_test.cpp",
    "**/tests/**", "**/test/**", "**/__tests__/**", "**/spec/**", "**/*Tests/**", "**/*Test/**",
]
DEFAULT_INFRA_GLOBS = [
    "**/mocks/**", "**/mock/**", "**/__mocks__/**", "**/fixtures/**", "**/fixture/**",
    "**/stubs/**", "**/fakes/**", "**/testdata/**", "**/testing/**", "**/harness/**",
    "**/testutils/**", "**/testutil/**", "**/test-helpers/**", "**/test_helpers/**",
    "**/__snapshots__/**", "*Mock*", "*Fake*", "*Stub*", "*Fixture*", "*Harness*",
    "*Helpers.swift", "conftest.py",
]
SOURCE_EXTS = {
    ".swift", ".kt", ".java", ".go", ".rs", ".py", ".js", ".jsx", ".ts", ".tsx", ".mjs",
    ".rb", ".php", ".c", ".cc", ".cpp", ".h", ".hpp", ".m", ".mm", ".cs", ".scala",
    ".dart", ".sh", ".lua", ".ex", ".exs", ".vue", ".svelte",
}
DEFAULT_ERROR = r"(?i)\b(error|errors|fail|failed|failure|fatal|exception|panic|traceback|denied|timed? ?out|capacity)\b"
DEFAULT_ERROR_IGNORE = r"(?i)\b(passed|succeeded|0 (errors?|failures?|failed)|no errors?)\b"
DEFAULT_PASS = r"\b(PASS|PASSED|passed|succeeded|OK)\b|✓|✔"
DEFAULT_FAIL = r"\b(FAIL|FAILED|failed|FAILURE)\b|✗|✘|\*\* TEST FAILED"
DEFAULT_ASSERT = (
    r"XCTAssert|XCTFail|XCTUnwrap|#expect|#require|\bassert[A-Za-z_]*\s*[(!]|\bassert\s|"
    r"\bassert_|\bexpect\s*\(|\bExpect\s*\(|\bEXPECT_|\bASSERT_|\bt\.(Error|Errorf|Fatal|Fatalf)\(|"
    r"\.should\b|\.to(Be|Equal|StrictEqual|Throw|Contain|Match|HaveBeen)\w*\(|\bself\.assert|\bverify\s*\("
)
DEFAULT_SKIP = (
    r"XCTSkip|\.skip\s*\(|\b(x?it|xdescribe|xtest)\.skip\b|\bxit\s*\(|\bxdescribe\s*\(|"
    r"@Ignore\b|@Disabled\b|\.disabled\s*\(|\bDISABLED_|@pytest\.mark\.(skip|xfail)|pytest\.skip|"
    r"@unittest\.skip|\bt\.Skip(Now|f)?\s*\(|#\[ignore\]|\bit\.todo\b|\btest\.todo\b|\bpending\s*\("
)
COMMENT_PREFIX = re.compile(r"^\s*(//+|#+|--+|/\*+|\*)\s*")

LIST_KEYS = ("log", "scope", "forbid", "test-glob", "infra-glob")


# ---------------------------------------------------------------- helpers
def glob_to_re(glob):
    """gitignore-like: * and ? stay inside a path segment, ** crosses segments."""
    i, out = 0, ""
    while i < len(glob):
        c = glob[i]
        if glob.startswith("**/", i):
            out += "(?:.*/)?"
            i += 3
        elif glob.startswith("**", i):
            out += ".*"
            i += 2
        elif c == "*":
            out += "[^/]*"
            i += 1
        elif c == "?":
            out += "[^/]"
            i += 1
        else:
            out += re.escape(c)
            i += 1
    return re.compile("^" + out + "$")


class Globs:
    """A glob without a slash also matches the basename, like .gitignore."""

    def __init__(self, globs):
        self.items = [(g, glob_to_re(g), "/" not in g) for g in globs]

    def match(self, path):
        base = path.rsplit("/", 1)[-1]
        for _, rx, bare in self.items:
            if rx.match(path) or (bare and rx.match(base)):
                return True
        return False


def git(wt, *args, check=True):
    p = subprocess.run(["git", "-C", wt, "-c", "core.quotepath=off", *args],
                       capture_output=True, text=True, errors="replace")
    if check and p.returncode != 0:
        die("git %s failed: %s" % (" ".join(args[:3]), p.stderr.strip()[:200]))
    return p.stdout


def die(msg):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(2)


def out(key, value):
    print("%s=%s" % (key, value))


def out_list(key, items):
    out(key + "_count", len(items))
    for n, it in enumerate(items[:MAX_LIST], 1):
        out("%s[%d]" % (key, n), it)
    if len(items) > MAX_LIST:
        out(key + "_truncated", len(items) - MAX_LIST)


def short(s, n=160):
    s = s.strip()
    return s if len(s) <= n else s[: n - 1] + "…"


def load_config(path):
    cfg = collections.defaultdict(list)
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            cfg[k.strip()].append(v.strip())
    return cfg


# ---------------------------------------------------------------- args
def parse():
    ap = argparse.ArgumentParser(
        prog="watch.sh",
        description="Read-only facts about an agent's worktree. key=value output, no verdicts.",
    )
    ap.add_argument("--worktree", default=".", help="worktree to inspect (default .)")
    ap.add_argument("--base", help="commit the agent started from (required)")
    ap.add_argument("--log", action="append", default=[], help="agent log file; repeatable")
    ap.add_argument("--scope", action="append", default=[], help="allowed path glob; repeatable")
    ap.add_argument("--forbid", action="append", default=[], help="forbidden path glob; repeatable")
    ap.add_argument("--task-file", help="checklist file (counts '- [x]' / '- [ ]')")
    ap.add_argument("--state", help="snapshot path: compared if present, then overwritten")
    ap.add_argument("--pid-pattern", help="regex matched against `ps` command lines")
    ap.add_argument("--test-glob", action="append", default=[], help="extra test-file glob")
    ap.add_argument("--infra-glob", action="append", default=[], help="extra test-infra glob")
    ap.add_argument("--error-pattern", help="regex marking error lines in logs")
    ap.add_argument("--pass-pattern", help="regex marking a passing test in logs")
    ap.add_argument("--fail-pattern", help="regex marking a failing test in logs")
    ap.add_argument("--assert-pattern", help="regex marking an assertion line")
    ap.add_argument("--skip-pattern", help="regex marking a skip/disable marker")
    ap.add_argument("--tail", type=int, default=300, help="log lines analysed at the end (default 300)")
    ap.add_argument("--recent", type=int, default=8, help="commits examined for file churn (default 8)")
    ap.add_argument("--config", help="key=value file (default <worktree>/.long-task-watch.conf if present)")
    a = ap.parse_args()

    wt = os.path.realpath(a.worktree)
    cfg_path = a.config or os.path.join(wt, ".long-task-watch.conf")
    if os.path.isfile(cfg_path):
        cfg = load_config(cfg_path)
        for k in LIST_KEYS:
            attr = k.replace("-", "_")
            setattr(a, attr, cfg.get(k, []) + getattr(a, attr))
        for k in ("base", "task-file", "state", "pid-pattern", "error-pattern", "pass-pattern",
                  "fail-pattern", "assert-pattern", "skip-pattern"):
            attr = k.replace("-", "_")
            if getattr(a, attr) is None and cfg.get(k):
                setattr(a, attr, cfg[k][-1])
        a.config_used = cfg_path
    else:
        a.config_used = ""
    if not a.base:
        die("--base <commit> is required")
    a.worktree = wt
    return a


# ---------------------------------------------------------------- collectors
def changed_files(wt, base):
    """path -> dict(added, deleted, untracked). Working tree vs base, plus untracked."""
    files = {}
    raw = git(wt, "diff", "--numstat", "-z", "-M", base)
    parts = raw.split("\0")
    i = 0
    while i < len(parts):
        head = parts[i]
        if not head:
            i += 1
            continue
        add, dele, path = head.split("\t", 2)
        if path == "":  # rename: next two fields are old, new
            path = parts[i + 2]
            i += 2
        i += 1
        files[path] = {"added": 0 if add == "-" else int(add),
                       "deleted": 0 if dele == "-" else int(dele), "untracked": False}
    for path in git(wt, "ls-files", "--others", "--exclude-standard", "-z").split("\0"):
        if not path:
            continue
        files[path] = {"added": count_lines(os.path.join(wt, path)), "deleted": 0, "untracked": True}
    return files


def count_lines(p, cap=2_000_000):
    try:
        if os.path.islink(p) or not os.path.isfile(p) or os.path.getsize(p) > cap:
            return 0
        with open(p, "rb") as f:
            data = f.read()
        return 0 if b"\0" in data else data.count(b"\n") + (0 if data.endswith(b"\n") or not data else 1)
    except OSError:
        return 0


def tree_fingerprint(wt, base, files):
    import hashlib
    h = hashlib.sha1()
    h.update(git(wt, "diff", "-M", base).encode("utf-8", "replace"))
    for p, f in sorted(files.items()):
        if f["untracked"]:
            try:
                st = os.stat(os.path.join(wt, p))
                h.update(("%s:%d:%d" % (p, st.st_size, int(st.st_mtime))).encode())
            except OSError:
                pass
    return h.hexdigest()[:12]


def diff_markers(wt, base, is_test, assert_rx, skip_rx):
    """Scan the unified diff (test files only) for assertion and skip changes."""
    raw = git(wt, "diff", "-U0", "--no-color", "--no-ext-diff", "-M", base)
    res = {"removed": 0, "modified": 0, "deleted": 0, "added": 0, "commented": 0, "skips": 0}
    per_file = collections.Counter()
    skip_lines, commented_lines = [], []
    cur, rem, add = None, 0, 0

    def flush():
        nonlocal rem, add
        pair = min(rem, add)
        res["modified"] += pair
        res["deleted"] += rem - pair
        if cur and rem - pair:
            per_file[cur] += rem - pair
        rem = add = 0

    for line in raw.split("\n"):
        if line.startswith("diff --git"):
            flush()
            cur = None
        elif line.startswith("+++ "):
            if line[4:] != "/dev/null":
                cur = line[6:] if line.startswith("+++ b/") else line[4:]
        elif line.startswith("--- "):
            if line[4:] != "/dev/null" and cur is None:
                cur = line[6:] if line.startswith("--- a/") else line[4:]
        elif line.startswith("@@"):
            flush()
        elif line.startswith("-") and cur and is_test(cur):
            if assert_rx.search(line[1:]):
                res["removed"] += 1
                rem += 1
        elif line.startswith("+") and cur and is_test(cur):
            body = line[1:]
            if skip_rx.search(body) and not COMMENT_PREFIX.match(body):
                res["skips"] += 1
                skip_lines.append("%s: %s" % (cur, short(body, 100)))
            if assert_rx.search(body):
                if COMMENT_PREFIX.match(body):
                    res["commented"] += 1
                    commented_lines.append("%s: %s" % (cur, short(body, 100)))
                else:
                    res["added"] += 1
                    add += 1
    flush()
    return res, per_file, skip_lines, commented_lines


def read_tail(path, nlines):
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as f:
            f.seek(max(0, size - TAIL_BYTES))
            data = f.read().decode("utf-8", "replace")
    except OSError:
        return []
    return data.split("\n")[-nlines:]


def norm(line):
    line = re.sub(r"\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(\.\d+)?Z?", "<ts>", line)
    line = re.sub(r"0x[0-9a-fA-F]+|[0-9a-fA-F]{8,}", "<hex>", line)
    line = re.sub(r"\d+(\.\d+)?", "#", line)
    return re.sub(r"\s+", " ", line).strip()


def analyse_log(path, a, rx):
    r = {"path": path}
    try:
        st = os.stat(path)
    except OSError:
        r["exists"] = "no"
        return r
    r.update(exists="yes", size=st.st_size, age=int(time.time() - st.st_mtime))
    tail = read_tail(path, a.tail)
    err = collections.Counter()
    anyl = collections.Counter()
    sample = {}
    for ln in tail:
        n = norm(ln)
        if len(n) >= 30:
            anyl[n] += 1
            sample.setdefault(n, ln)
        if rx["error"].search(ln) and not rx["ignore"].search(ln):
            err[n] += 1
            sample.setdefault(n, ln)
    r["tail_lines"] = len(tail)
    r["err_top"] = [(c, sample[n]) for n, c in err.most_common(1)]
    r["any_top"] = [(c, sample[n]) for n, c in anyl.most_common(1)]
    r["tail_pass"] = sum(1 for ln in tail if rx["pass"].search(ln))
    r["tail_fail"] = sum(1 for ln in tail if rx["fail"].search(ln))
    tp = tf = 0
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            for ln in f:
                if rx["pass"].search(ln):
                    tp += 1
                if rx["fail"].search(ln):
                    tf += 1
    except OSError:
        pass
    r["total_pass"], r["total_fail"] = tp, tf
    r["tail_text"] = "\n".join(tail)
    return r


def find_processes(pattern):
    try:
        p = subprocess.run(["ps", "-axo", "pid=,etime=,pcpu=,command="],
                           capture_output=True, text=True, errors="replace")
    except OSError:
        return None
    rx = re.compile(pattern)
    me = {os.getpid(), os.getppid()}
    # ancestors of this script also carry the pattern in their own command line
    pid = os.getppid()
    for _ in range(6):
        try:
            pp = subprocess.run(["ps", "-o", "ppid=", "-p", str(pid)], capture_output=True, text=True)
            pid = int(pp.stdout.strip() or 0)
        except (OSError, ValueError):
            break
        if pid <= 1:
            break
        me.add(pid)
    found = []
    for line in p.stdout.splitlines():
        m = re.match(r"\s*(\d+)\s+(\S+)\s+(\S+)\s+(.*)$", line)
        if not m or int(m.group(1)) in me:
            continue
        cmd = m.group(4)
        if "watch.sh" in cmd or "watch.py" in cmd or " ps -axo" in cmd:
            continue
        if rx.search(cmd):
            found.append((m.group(1), m.group(2), m.group(3), short(cmd, 100)))
    return found


# ---------------------------------------------------------------- main
def main():
    a = parse()
    wt, base = a.worktree, a.base
    if git(wt, "rev-parse", "--is-inside-work-tree", check=False).strip() != "true":
        die("%s is not a git worktree" % wt)
    if subprocess.run(["git", "-C", wt, "rev-parse", "--verify", "-q", base + "^{commit}"],
                      capture_output=True).returncode != 0:
        die("base %s does not resolve to a commit" % base)

    state_path = os.path.abspath(a.state) if a.state else None
    if state_path and (state_path + os.sep).startswith(wt + os.sep):
        die("--state must be outside the worktree (writing there would dirty it)")

    now = int(time.time())
    out("watch_version", 1)
    out("now", now)
    out("worktree", wt)
    out("branch", git(wt, "rev-parse", "--abbrev-ref", "HEAD").strip())
    out("base", git(wt, "rev-parse", "--short", base).strip())
    out("config_file", a.config_used or "none")

    # ---- progress
    head = git(wt, "rev-parse", "--short", "HEAD").strip()
    commits = int(git(wt, "rev-list", "--count", base + "..HEAD").strip() or 0)
    out("head", head)
    out("commits_since_base", commits)
    if commits:
        subj, ct = git(wt, "log", "-1", "--format=%s%x00%ct").rstrip("\n").split("\0")
        out("last_commit_subject", short(subj))
        out("last_commit_age_s", now - int(ct))
    files = changed_files(wt, base)
    unc = [p for p in git(wt, "status", "--porcelain", "-z").split("\0") if p]
    out("uncommitted_files", len(unc))
    out("changed_files_total", len(files))
    newest = 0
    for p in files:
        try:
            newest = max(newest, int(os.stat(os.path.join(wt, p)).st_mtime))
        except OSError:
            pass
    if newest:
        out("newest_changed_file_age_s", now - newest)

    done = total = None
    if a.task_file:
        tf = a.task_file if os.path.isabs(a.task_file) else os.path.join(wt, a.task_file)
        try:
            txt = open(tf, encoding="utf-8", errors="replace").read()
            done = len(re.findall(r"(?m)^\s*[-*] \[[xX]\]", txt))
            total = done + len(re.findall(r"(?m)^\s*[-*] \[ \]", txt))
            out("tasks_done", done)
            out("tasks_total", total)
        except OSError:
            out("tasks_done", "unreadable")

    # ---- scope
    if a.scope:
        sc = Globs(a.scope)
        out_list("out_of_scope", sorted(p for p in files if not sc.match(p)))
    else:
        out("out_of_scope_count", "n/a (no --scope)")
    if a.forbid:
        fb = Globs(a.forbid)
        out_list("forbid_hits", sorted(p for p in files if fb.match(p)))
    else:
        out("forbid_hits_count", "n/a (no --forbid)")

    # ---- test scale
    tg = Globs(DEFAULT_TEST_GLOBS + a.test_glob)
    ig = Globs(DEFAULT_INFRA_GLOBS + a.infra_glob)
    is_test = tg.match
    t_add = s_add = 0
    t_files = []
    for p, f in files.items():
        if is_test(p):
            t_add += f["added"]
            t_files.append((f["added"], p))
        elif os.path.splitext(p)[1].lower() in SOURCE_EXTS:
            s_add += f["added"]
    out("test_files_changed", len(t_files))
    out("test_added_lines", t_add)
    out("source_added_lines", s_add)
    out("test_to_source_ratio", "%.2f" % (t_add / s_add) if s_add else ("inf" if t_add else "0.00"))
    out_list("largest_test_files", ["%d %s" % x for x in sorted(t_files, reverse=True)[:5]])
    added = [p for p, f in files.items() if f["untracked"] or f["deleted"] == 0 and f["added"] > 0]
    new_paths = set()
    for p in added:  # only genuinely new paths: absent at base
        if subprocess.run(["git", "-C", wt, "cat-file", "-e", "%s:%s" % (base, p)],
                          capture_output=True).returncode != 0:
            new_paths.add(p)
    infra = sorted(p for p in new_paths if ig.match(p) or
                   (is_test(p) and os.path.splitext(p)[1] in (".sh", ".py", ".json", ".yml", ".yaml", ".mk")
                    and not tg.match(os.path.basename(p))))
    out_list("new_test_infra", infra)
    new_dirs = set()
    for p in new_paths:
        if not is_test(p):
            continue
        d = os.path.dirname(p)
        while d and not new_dirs.issuperset({d}):
            if git(wt, "ls-tree", "-r", "--name-only", base, "--", d).strip():
                break
            new_dirs.add(d)
            d = os.path.dirname(d)
    top_new = sorted(d for d in new_dirs if os.path.dirname(d) not in new_dirs)
    out_list("new_test_dirs", top_new)

    # ---- assertions and skips (test files only)
    arx = re.compile(a.assert_pattern or DEFAULT_ASSERT)
    srx = re.compile(a.skip_pattern or DEFAULT_SKIP)
    m, per_file, skip_lines, commented = diff_markers(wt, base, is_test, arx, srx)
    out("assert_lines_removed", m["removed"])
    out("assert_lines_modified", m["modified"])
    out("assert_lines_deleted", m["deleted"])
    out("assert_lines_added", m["added"])
    out_list("assert_deleted_in", ["%d %s" % (c, p) for p, c in per_file.most_common(5)])
    out_list("skip_markers_added", skip_lines)
    out_list("commented_out_assertions_added", commented)

    # ---- stall: logs
    rx = {
        "error": re.compile(a.error_pattern or DEFAULT_ERROR),
        "ignore": re.compile(DEFAULT_ERROR_IGNORE),
        "pass": re.compile(a.pass_pattern or DEFAULT_PASS),
        "fail": re.compile(a.fail_pattern or DEFAULT_FAIL),
    }
    logs = []
    for n, lp in enumerate(a.log, 1):
        lp_abs = lp if os.path.isabs(lp) else os.path.join(os.getcwd(), lp)
        r = analyse_log(lp_abs, a, rx)
        logs.append(r)
        k = "log[%d]." % n
        out(k + "path", lp_abs)
        out(k + "exists", r["exists"])
        if r["exists"] != "yes":
            continue
        out(k + "size_bytes", r["size"])
        out(k + "age_s", r["age"])
        out(k + "tail_lines", r["tail_lines"])
        for label, key in (("top_error_repeat", "err_top"), ("top_line_repeat", "any_top")):
            c, s = r[key][0] if r[key] else (0, "")
            out(k + label + "_count", c)
            out(k + label + "_sample", short(s))
        out(k + "tail_pass_markers", r["tail_pass"])
        out(k + "tail_fail_markers", r["tail_fail"])
        out(k + "total_pass_markers", r["total_pass"])
        out(k + "total_fail_markers", r["total_fail"])
    if logs:
        ages = [r["age"] for r in logs if r["exists"] == "yes"]
        if ages:
            out("logs_min_age_s", min(ages))

    # ---- stall: file churn (best effort)
    churn = collections.Counter()
    if commits:
        raw = git(wt, "log", "-%d" % a.recent, "--name-only", "--format=%x00", base + "..HEAD")
        for block in raw.split("\0"):
            for p in set(x for x in block.split("\n") if x.strip()):
                churn[p] += 1
    n_scanned = min(commits, a.recent)
    out("churn_commits_scanned", n_scanned)
    out_list("file_churn", ["%d/%d commits %s" % (c, n_scanned, p)
                            for p, c in churn.most_common(5) if c >= 2])
    mentions = collections.Counter()
    if logs and files:
        names = {}
        for p in files:
            names.setdefault(os.path.basename(p), p)
        for r in logs:
            text = r.get("tail_text", "")
            for b, p in names.items():
                if len(b) >= 8:
                    c = text.count(b)
                    if c:
                        mentions[p] += c
    out_list("log_file_mentions", ["%d %s" % (c, p) for p, c in mentions.most_common(5) if c >= 3])

    # ---- process
    if a.pid_pattern:
        procs = find_processes(a.pid_pattern)
        if procs is None:
            out("process_alive", "unknown")
        else:
            out("process_alive", "yes" if procs else "no")
            out_list("process", ["pid=%s etime=%s cpu%%=%s %s" % x for x in procs])
    else:
        out("process_alive", "n/a (no --pid-pattern)")

    # ---- state compare and write
    fp = tree_fingerprint(wt, base, files)
    snap = {
        "ts": now, "head": head, "commits": commits, "uncommitted": len(unc),
        "tasks_done": done, "tree_fp": fp, "test_added": t_add, "source_added": s_add,
        "assert_removed": m["removed"], "skips": m["skips"],
        "logs": {r["path"]: r["size"] for r in logs if r.get("exists") == "yes"},
    }
    out("tree_fingerprint", fp)
    if state_path:
        prev = None
        if os.path.isfile(state_path):
            try:
                prev = json.load(open(state_path, encoding="utf-8"))
            except (OSError, ValueError):
                out("state_previous", "unreadable (overwritten)")
        if prev:
            out("state_previous_age_s", now - prev.get("ts", now))
            out("delta_head_changed", "yes" if prev.get("head") != head else "no")
            out("delta_tree_changed", "yes" if prev.get("tree_fp") != fp else "no")
            for k, label in (("commits", "commits"), ("uncommitted", "uncommitted_files"),
                             ("tasks_done", "tasks_done"), ("test_added", "test_added_lines"),
                             ("source_added", "source_added_lines"),
                             ("assert_removed", "assert_lines_removed"), ("skips", "skip_markers_added")):
                if snap.get(k) is not None and prev.get(k) is not None:
                    out("delta_" + label, snap[k] - prev[k])
            for n, r in enumerate(logs, 1):
                if r["path"] in snap["logs"]:
                    out("delta_log[%d]_bytes" % n, snap["logs"][r["path"]] - prev.get("logs", {}).get(r["path"], 0))
        elif prev is None and not os.path.isfile(state_path):
            out("state_previous", "none (first snapshot)")
        try:
            os.makedirs(os.path.dirname(state_path) or ".", exist_ok=True)
            with open(state_path, "w", encoding="utf-8") as f:
                json.dump(snap, f, indent=1)
            out("state_written", state_path)
        except OSError as e:
            out("state_written", "failed: %s" % e)


if __name__ == "__main__":
    main()
