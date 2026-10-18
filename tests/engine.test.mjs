import assert from "node:assert/strict";
import { test } from "node:test";
import { cloneGraph, headId, matchesGoal, newGraph, operate } from "../src/graph.ts";
import { loadGame, saveGame } from "../src/save.ts";

function run(graph, action, target, name) {
  const before = structuredClone(graph);
  const result = operate(graph, action, target, name);
  assert.deepEqual(graph, before, `${action} must not mutate its input`);
  assert.equal(result.ok, true, `${result.command}: ${result.output}`);
  assert.equal(typeof result.command, "string");
  assert.equal(typeof result.output, "string");
  return result.graph;
}

function reject(graph, action, target, name, pattern) {
  const before = structuredClone(graph);
  const result = operate(graph, action, target, name);
  assert.equal(result.ok, false);
  assert.deepEqual(graph, before);
  assert.deepEqual(result.graph, before, "failed operation must be atomic");
  if (pattern) assert.match(result.output, pattern);
  return result;
}

function save(graph, path = "file.txt", contents = "hello", message = "Commit") {
  return run(run(run(graph, "edit", path, contents), "stage"), "commit", undefined, message);
}

function current(graph) {
  return graph.commits.find((commit) => commit.id === headId(graph));
}

function empty(origin = { branches: {}, commits: [] }) {
  return {
    ...newGraph(), commits: [], branches: {}, initialized: false, origin, tracking: {},
  };
}

function divergent(sameFile = false) {
  let graph = run(newGraph(), "branch", undefined, "feature");
  graph = save(graph, "main.txt", "main", "main change");
  graph = run(graph, "checkout", "feature");
  graph = save(graph, sameFile ? "main.txt" : "feature.txt", "feature", "feature one");
  return graph;
}

test("newGraph has every API field, an empty root, and independent storage", () => {
  const graph = newGraph();
  assert.deepEqual(Object.keys(graph).sort(), [
    "commits", "branches", "head", "dirty", "staged", "working", "index",
    "origin", "tracking", "tags", "stash", "conflict", "initialized",
  ].sort());
  assert.equal(headId(graph), "c0");
  assert.deepEqual(current(graph), { id: "c0", parents: [], message: "Initial commit", tree: {} });
  assert.deepEqual(graph.head, { branch: "main" });
  assert.equal(graph.initialized, true);
  assert.equal(graph.dirty, false);
  assert.equal(graph.staged, false);
  assert.deepEqual(graph.origin.branches, { main: "c0" });
  assert.deepEqual(graph.tracking, { "origin/main": "c0" });
  assert.deepEqual(graph.origin.commits, graph.commits);
  assert.notEqual(graph.origin.commits[0], graph.commits[0]);
  graph.working.x = "x";
  assert.deepEqual(newGraph().working, {});
});

test("cloneGraph deeply copies all mutable model structures", () => {
  let graph = save(newGraph());
  graph = run(graph, "push");
  graph = run(run(graph, "edit", "file.txt", "pending"), "stash");
  graph.conflict = { kind: "merge", target: "c0" };
  const original = structuredClone(graph);
  const copy = cloneGraph(graph);
  copy.commits[1].tree.extra = "x";
  copy.commits[1].parents.push("other");
  copy.branches.main = "other";
  copy.head.branch = "other";
  copy.origin.commits[1].tree.extra = "remote";
  copy.origin.branches.main = "other";
  copy.tracking["origin/main"] = "other";
  copy.tags.tag = "other";
  copy.stash[0].working.extra = "stash";
  copy.stash[0].index.extra = "index";
  copy.conflict.target = "other";
  copy.working.extra = "working";
  copy.index.extra = "index";
  assert.deepEqual(graph, original);
});

test("init approximates an unborn repository with c0 and preserves working files/origin", () => {
  const graph = empty();
  graph.working.note = "untracked";
  const initialized = run(graph, "init");
  assert.equal(headId(initialized), "c0");
  assert.equal(initialized.working.note, "untracked");
  assert.equal(initialized.dirty, true);
  assert.equal(initialized.staged, false);
  assert.match(operate(graph, "init").output, /unborn/);
  assert.deepEqual(run(initialized, "init"), initialized);
  for (const action of ["edit", "stage", "commit", "branch", "checkout", "merge", "fetch", "push"]) {
    reject(graph, action, undefined, undefined, /Not a Git repository/);
  }
});

test("edit, selective stage, commit, and partial staging track three distinct trees", () => {
  let graph = run(newGraph(), "edit", "a", "one");
  assert.equal(graph.dirty, true);
  assert.equal(graph.staged, false);
  graph = run(graph, "edit", "b", "two");
  graph = run(graph, "stage", "a");
  assert.equal(graph.dirty, true);
  assert.equal(graph.staged, true);
  graph = run(graph, "edit", "a", "later");
  graph = run(graph, "commit", undefined, "first");
  assert.deepEqual(current(graph).tree, { a: "one" });
  assert.deepEqual(graph.index, { a: "one" });
  assert.deepEqual(graph.working, { a: "later", b: "two" });
  assert.equal(graph.dirty, true);
  assert.equal(graph.staged, false);
  assert.equal(current(graph).message, "first");
  graph = run(run(graph, "stage"), "commit");
  assert.equal(current(graph).message, "Commit");
  assert.equal(graph.dirty, false);
  reject(graph, "commit", undefined, undefined, /Nothing staged/);
  reject(graph, "stage", "missing", undefined, /Path not found/);
});

test("default edits are deterministic and successive edits change content", () => {
  const first = run(newGraph(), "edit");
  assert.deepEqual(first, run(newGraph(), "edit"));
  const second = run(first, "edit");
  assert.notEqual(second.working["file.txt"], first.working["file.txt"]);
  reject(first, "edit", "../outside");
  reject(first, "edit", "/absolute");
  reject(first, "edit", ".git/config");
  reject(first, "edit", "file.txt/child");
  reject(run(newGraph(), "edit", "dir/child", "nested"), "edit", "dir");
});

test("branch creates without switching; selected commit, tags, and detached commits work", () => {
  let graph = save(newGraph());
  graph = run(graph, "branch", "c0", "topic");
  assert.deepEqual(graph.head, { branch: "main" });
  assert.equal(graph.branches.topic, "c0");
  graph = run(graph, "tag", "HEAD", "v1");
  assert.equal(graph.tags.v1, headId(graph));
  graph = run(graph, "checkout", "c0");
  assert.deepEqual(graph.head, { commit: "c0" });
  const main = graph.branches.main;
  graph = save(graph, "detached", "yes");
  assert.equal(graph.branches.main, main);
  assert.deepEqual(current(graph).parents, ["c0"]);
  graph = run(graph, "branch", undefined, "rescued");
  assert.equal(graph.branches.rescued, headId(graph));
  graph = run(graph, "checkout", "v1");
  assert.deepEqual(graph.head, { commit: main });
  graph = run(graph, "checkout", "topic");
  assert.deepEqual(graph.head, { branch: "topic" });
  assert.deepEqual(graph.working, {});
});

test("invalid and duplicate refs/revisions fail atomically", () => {
  let graph = run(newGraph(), "branch", undefined, "topic");
  graph = run(graph, "tag", undefined, "v1");
  for (const name of ["", "HEAD", "a b", "a..b", ".hidden", "a.lock", "/a", "a/", "a//b", "a@{b", "-bad"]) {
    reject(graph, "branch", undefined, name);
    reject(graph, "tag", undefined, name);
  }
  reject(graph, "branch", undefined, "topic");
  reject(graph, "branch", undefined, "topic/sub");
  reject(graph, "tag", undefined, "v1");
  for (const action of ["branch", "tag", "checkout", "merge", "rebase", "reset", "cherry-pick", "revert"]) {
    reject(graph, action, "missing", "new");
  }
  reject(newGraph(), "reset");
  assert.equal(run(newGraph(), "tag", "HEAD^0", "root").tags.root, "c0");
});

test("prototype-looking refs and file paths remain ordinary own properties", () => {
  const originalPrototype = Object.getPrototypeOf({});
  let graph = save(newGraph(), "__proto__", "safe file contents");
  assert.equal(Object.hasOwn(current(graph).tree, "__proto__"), true);
  assert.equal(current(graph).tree.__proto__, "safe file contents");
  assert.equal(Object.getPrototypeOf(current(graph).tree), originalPrototype);
  graph = run(graph, "branch", undefined, "__proto__");
  graph = run(graph, "tag", undefined, "__proto__");
  assert.equal(Object.hasOwn(graph.branches, "__proto__"), true);
  assert.equal(Object.hasOwn(graph.tags, "__proto__"), true);
  graph = run(graph, "checkout", "__proto__");
  assert.deepEqual(graph.head, { branch: "__proto__" });
  graph = save(graph, "constructor", "ordinary file");
  graph = run(graph, "branch", undefined, "constructor");
  graph = run(graph, "checkout", "constructor");
  assert.equal(graph.working.constructor, "ordinary file");
  assert.equal(Object.getPrototypeOf(graph.branches), originalPrototype);
  assert.equal(Object.getPrototypeOf(graph.working), originalPrototype);
  assert.equal(Object.getPrototypeOf({}), originalPrototype);
  assert.equal(matchesGoal(graph, renamed(graph)), true);
});

test("dirty or staged checkout/merge/rebase/pull reject without losing files", () => {
  const dirty = run(newGraph(), "edit");
  const staged = run(dirty, "stage");
  for (const graph of [dirty, staged]) {
    for (const action of ["checkout", "merge", "rebase", "pull", "cherry-pick", "revert"]) {
      reject(graph, action, "main");
    }
  }
});

test("merge handles up-to-date and fast-forward without adding commits", () => {
  let graph = run(newGraph(), "branch", undefined, "feature");
  graph = run(graph, "checkout", "feature");
  graph = save(graph);
  const tip = headId(graph);
  graph = run(graph, "checkout", "main");
  const count = graph.commits.length;
  graph = run(graph, "merge", "feature");
  assert.equal(graph.commits.length, count);
  assert.equal(graph.branches.main, tip);
  assert.deepEqual(graph.head, { branch: "main" });
  assert.deepEqual(graph.working, current(graph).tree);
  assert.deepEqual(run(graph, "merge", "c0"), graph);
  assert.deepEqual(run(graph, "merge", "HEAD"), graph);
});

test("divergent merge creates ordered parents and combines independent content", () => {
  let graph = divergent();
  const feature = headId(graph);
  const main = graph.branches.main;
  graph = run(graph, "merge", "main");
  assert.deepEqual(current(graph).parents, [feature, main]);
  assert.deepEqual(current(graph).tree, { "feature.txt": "feature", "main.txt": "main" });
  assert.deepEqual(graph.head, { branch: "feature" });
  assert.equal(graph.dirty, false);
  assert.equal(graph.staged, false);
  assert.equal(graph.conflict, null);
});

test("detached merges move only detached HEAD and unrelated histories fail atomically", () => {
  let graph = divergent();
  const feature = headId(graph);
  graph = run(graph, "checkout", feature);
  graph = run(graph, "merge", "main");
  assert.deepEqual(graph.head, { commit: current(graph).id });
  assert.equal(graph.branches.feature, feature);

  graph.commits.push({ id: "unrelated", parents: [], message: "other root", tree: { other: "x" } });
  graph.branches.unrelated = "unrelated";
  reject(graph, "merge", "unrelated", undefined, /unrelated/);
  reject(graph, "rebase", "unrelated", undefined, /unrelated/);
});

test("same-content merges do not conflict; modify/delete conflicts do", () => {
  let graph = run(newGraph(), "branch", undefined, "feature");
  graph = save(graph, "same", "value");
  graph = run(graph, "checkout", "feature");
  graph = save(graph, "same", "value");
  graph = run(graph, "merge", "main");
  assert.deepEqual(current(graph).tree, { same: "value" });
  assert.equal(current(graph).parents.length, 2);

  graph = save(newGraph(), "file", "base");
  graph = run(graph, "branch", undefined, "feature");
  delete graph.working.file;
  graph = run(run(graph, "stage"), "commit");
  graph = run(graph, "checkout", "feature");
  graph = save(graph, "file", "changed");
  const result = operate(graph, "merge", "main");
  assert.equal(result.ok, false);
  assert.equal(result.graph.conflict.kind, "merge");
  assert.match(result.graph.working.file, /<<<<<<< HEAD/);
});

test("three-way merge combines edits on separate lines and conflicts on overlapping edits", () => {
  let graph = save(newGraph(), "file", "first\nmiddle\nlast\n");
  graph = run(graph, "branch", undefined, "feature");
  graph = save(graph, "file", "FIRST\nmiddle\nlast\n");
  graph = run(graph, "checkout", "feature");
  graph = save(graph, "file", "first\nmiddle\nLAST\n");
  graph = run(graph, "merge", "main");
  assert.equal(current(graph).tree.file, "FIRST\nmiddle\nLAST\n");

  graph = save(newGraph(), "file", "first\nmiddle\nlast\n");
  graph = run(graph, "branch", undefined, "feature");
  graph = save(graph, "file", "first\nMAIN\nlast\n");
  graph = run(graph, "checkout", "feature");
  graph = save(graph, "file", "first\nFEATURE\nlast\n");
  const conflict = operate(graph, "merge", "main");
  assert.equal(conflict.ok, false);
  assert.equal(conflict.graph.conflict.kind, "merge");
});

test("three-way patch application handles additions, deletions and disjoint line insertions", () => {
  let graph = save(newGraph(), "file", "a\nb\nc\n");
  graph = run(graph, "branch", undefined, "feature");
  graph = save(graph, "file", "a\nMAIN\nb\nc\n");
  graph = run(graph, "checkout", "feature");
  graph = save(graph, "file", "a\nb\nc\nFEATURE\n");
  graph = run(graph, "merge", "main");
  assert.equal(current(graph).tree.file, "a\nMAIN\nb\nc\nFEATURE\n");

  graph = save(newGraph(), "file", "a\nb\nc\n");
  graph = run(graph, "branch", undefined, "feature");
  graph = save(graph, "file", "b\nc\n");
  const deletion = headId(graph);
  graph = run(graph, "checkout", "feature");
  graph = save(graph, "file", "a\nb\nC\n");
  graph = run(graph, "cherry-pick", deletion);
  assert.equal(current(graph).tree.file, "b\nC\n");
  graph = run(graph, "revert", deletion);
  assert.equal(current(graph).tree.file, "a\nb\nC\n");
});

test("merge conflict is explicit, keeps HEAD, and resolves only through edit/stage/commit", () => {
  const original = divergent(true);
  const before = structuredClone(original);
  let result = operate(original, "merge", "main");
  assert.equal(result.ok, false);
  assert.deepEqual(original, before);
  let graph = result.graph;
  assert.equal(headId(graph), headId(original));
  assert.equal(graph.commits.length, original.commits.length);
  assert.deepEqual(graph.conflict, { kind: "merge", target: graph.branches.main });
  assert.equal(graph.dirty, true);
  assert.match(graph.working["main.txt"], /=======/);
  reject(graph, "commit");
  reject(run(graph, "stage"), "commit", undefined, undefined, /conflict markers/);
  for (const action of ["checkout", "reset", "stash", "pop", "merge", "rebase", "fetch", "push"]) {
    reject(graph, action, "main", undefined, /Resolve/);
  }
  graph = run(graph, "edit", "main.txt", "resolved");
  reject(graph, "commit");
  graph = run(run(graph, "stage"), "commit", undefined, "resolution");
  assert.equal(graph.conflict, null);
  assert.deepEqual(current(graph).parents, [headId(original), original.branches.main]);
  assert.deepEqual(current(graph).tree, { "main.txt": "resolved" });
  assert.equal(graph.dirty, false);
});

test("rebase replays the entire chain with new IDs, original messages and cumulative trees", () => {
  let graph = divergent();
  graph = save(graph, "second.txt", "second", "feature two");
  const oldTip = headId(graph);
  const originalCount = graph.commits.length;
  const onto = graph.branches.main;
  graph = run(graph, "rebase", "main");
  assert.equal(graph.commits.length, originalCount + 2);
  assert.notEqual(headId(graph), oldTip);
  const last = current(graph);
  const first = graph.commits.find((commit) => commit.id === last.parents[0]);
  assert.deepEqual(first.parents, [onto]);
  assert.equal(first.message, "feature one");
  assert.equal(last.message, "feature two");
  assert.deepEqual(last.tree, {
    "main.txt": "main", "feature.txt": "feature", "second.txt": "second",
  });
  assert.equal(graph.branches.main, onto);
  assert.deepEqual(graph.head, { branch: "feature" });
  assert.deepEqual(run(graph, "rebase", "main"), graph);
});

test("rebase fast-forwards, supports detached HEAD, and rejects conflicts atomically", () => {
  let graph = divergent();
  graph = run(graph, "checkout", "c0");
  graph = run(graph, "rebase", "main");
  assert.deepEqual(graph.head, { commit: graph.branches.main });
  assert.deepEqual(graph.working, current(graph).tree);
  reject(divergent(true), "rebase", "main", undefined, /Rebase conflict.*unchanged/);
  graph = divergent();
  graph = save(graph, "main.txt", "conflicts after first replay");
  reject(graph, "rebase", "main", undefined, /unchanged/);
});

test("mixed reset follows the checked-out branch, preserves files, and unstages", () => {
  let graph = divergent();
  const feature = headId(graph);
  const main = graph.branches.main;
  graph = run(graph, "edit", "pending", "yes");
  graph = run(graph, "stage");
  const working = { ...graph.working };
  graph = run(graph, "reset");
  assert.equal(headId(graph), "c0");
  assert.equal(graph.branches.main, main);
  assert.deepEqual(graph.working, working);
  assert.deepEqual(graph.index, {});
  assert.equal(graph.staged, false);
  assert.equal(graph.dirty, true);
  assert.ok(graph.commits.some((commit) => commit.id === feature));
  graph = run(graph, "reset", feature);
  assert.equal(headId(graph), feature);
  assert.deepEqual(graph.index, { "feature.txt": "feature" });
});

test("reset works detached and supports first-parent and nth-parent revision expressions", () => {
  let graph = run(divergent(), "merge", "main");
  const merge = headId(graph);
  const parents = [...current(graph).parents];
  graph = run(graph, "checkout", merge);
  graph = run(graph, "reset", "HEAD^2");
  assert.deepEqual(graph.head, { commit: parents[1] });
  graph = run(graph, "reset", merge);
  graph = run(graph, "reset", "HEAD~1");
  assert.deepEqual(graph.head, { commit: parents[0] });
  reject(graph, "reset", "HEAD^99");
});

test("cherry-pick applies only the selected commit delta to the current tree", () => {
  let graph = divergent();
  const original = current(graph);
  graph = run(graph, "checkout", "main");
  const parent = headId(graph);
  graph = run(graph, "cherry-pick", original.id);
  assert.deepEqual(current(graph).parents, [parent]);
  assert.equal(current(graph).message, original.message);
  assert.deepEqual(current(graph).tree, { "main.txt": "main", "feature.txt": "feature" });
  reject(graph, "cherry-pick", original.id, undefined, /empty/);
});

test("revert creates an inverse patch commit without resetting branch history", () => {
  let graph = save(newGraph(), "a", "one");
  const selected = headId(graph);
  graph = save(graph, "b", "unrelated");
  const parent = headId(graph);
  graph = run(graph, "revert", selected);
  assert.deepEqual(current(graph).parents, [parent]);
  assert.deepEqual(current(graph).tree, { b: "unrelated" });
  assert.match(current(graph).message, /^Revert/);
  assert.ok(graph.commits.some((commit) => commit.id === selected));
  reject(graph, "revert", selected, undefined, /empty/);
  reject(newGraph(), "revert", "c0", undefined, /empty/);
});

test("cherry-pick/revert conflicts are real patch conflicts and can be resolved", () => {
  const cases = [
    ["cherry-pick", divergent(true), "main"],
    ["revert", save(save(newGraph(), "a", "one"), "a", "two"), "c1"],
  ];
  for (const [action, original, target] of cases) {
    const before = structuredClone(original);
    const result = operate(original, action, target);
    assert.equal(result.ok, false);
    assert.deepEqual(original, before);
    assert.equal(result.graph.conflict.kind, action);
    assert.equal(headId(result.graph), headId(original));
    let graph = run(result.graph, "edit", action === "revert" ? "a" : "main.txt", "resolution");
    graph = run(run(graph, "stage"), "commit");
    assert.deepEqual(current(graph).parents, [headId(original)]);
    assert.equal(graph.conflict, null);
  }
});

test("merge commits cannot be cherry-picked/reverted/rebased without choosing mainline", () => {
  let graph = run(divergent(), "merge", "main");
  reject(graph, "cherry-pick", "HEAD", undefined, /mainline/);
  reject(graph, "revert", "HEAD", undefined, /mainline/);
  graph = run(graph, "branch", "c0", "other");
  graph = run(graph, "checkout", "other");
  graph = save(graph, "other", "other");
  graph = run(graph, "checkout", "feature");
  reject(graph, "rebase", "other", undefined, /merge commits/);
});

test("fetch copies actual remote ancestry, only moves tracking refs, and is idempotent", () => {
  const graph = newGraph();
  graph.origin = {
    branches: { main: "remote2", topic: "remote1" },
    commits: [
      { id: "remote2", parents: ["remote1"], message: "second", tree: { r: "two" } },
      { id: "remote1", parents: ["c0"], message: "first", tree: { r: "one" } },
      structuredClone(graph.commits[0]),
    ],
  };
  const fetched = run(graph, "fetch");
  assert.equal(headId(fetched), "c0");
  assert.deepEqual(fetched.branches, { main: "c0" });
  assert.deepEqual(fetched.tracking, { "origin/main": "remote2", "origin/topic": "remote1" });
  assert.equal(fetched.commits.length, 3);
  assert.deepEqual(fetched.working, {});
  assert.deepEqual(fetched.origin, graph.origin);
  assert.deepEqual(run(fetched, "fetch"), fetched);
  assert.deepEqual(run(newGraph(), "fetch"), newGraph());
});

test("fetch rejects missing, cyclic, and conflicting remote objects atomically", () => {
  const missing = newGraph();
  missing.origin.branches.main = "missing";
  reject(missing, "fetch", undefined, undefined, /missing objects/);
  const cycle = newGraph();
  cycle.origin = {
    branches: { main: "remote" },
    commits: [{ id: "remote", parents: ["remote"], message: "", tree: {} }],
  };
  reject(cycle, "fetch", undefined, undefined, /cyclic/);
  const collision = newGraph();
  collision.origin = {
    branches: { main: "c0" },
    commits: [{ id: "c0", parents: [], message: "different object", tree: {} }],
  };
  reject(collision, "fetch", undefined, undefined, /conflicts/);
  const duplicate = newGraph();
  duplicate.origin = {
    branches: { main: "c0" },
    commits: [structuredClone(duplicate.commits[0]), structuredClone(duplicate.commits[0])],
  };
  reject(duplicate, "fetch", undefined, undefined, /duplicate object IDs/);
});

test("ordinary fetch retains stale tracking refs rather than implicitly pruning", () => {
  const graph = run(run(newGraph(), "branch", undefined, "topic"), "push", "topic");
  graph.origin.branches = {};
  const fetched = run(graph, "fetch");
  assert.equal(fetched.tracking["origin/topic"], graph.branches.topic);
});

test("push transfers reachable history, updates remote refs, and rejects non-fast-forward", () => {
  let graph = save(newGraph());
  graph = run(graph, "push");
  assert.equal(graph.origin.branches.main, headId(graph));
  assert.equal(graph.tracking["origin/main"], headId(graph));
  assert.deepEqual(graph.origin.commits, graph.commits);
  graph = save(graph, "second", "two");
  graph = run(graph, "push");
  assert.equal(graph.origin.commits.length, 3);
  graph = run(graph, "reset", "c0");
  reject(graph, "push", undefined, undefined, /non-fast-forward/);
  const remote = graph.origin.branches.main;
  assert.equal(remote, "c2");
});

test("push checks remote ancestry even when origin objects have not been fetched", () => {
  const graph = save(newGraph(), "local", "yes");
  graph.origin = {
    branches: { main: "remote" },
    commits: [
      structuredClone(graph.commits[0]),
      { id: "remote", parents: ["c0"], message: "remote", tree: { remote: "yes" } },
    ],
  };
  reject(graph, "push", undefined, undefined, /non-fast-forward/);
  let detached = run(graph, "checkout", "c0");
  reject(detached, "push", undefined, undefined, /detached HEAD/);
  detached = run(detached, "push", "new-branch");
  assert.equal(detached.origin.branches["new-branch"], "c0");
});

test("pull fetches and fast-forwards or merges actual remote content", () => {
  let graph = save(newGraph(), "remote", "one");
  graph = run(graph, "push");
  const remote = headId(graph);
  graph = run(graph, "checkout", "c0");
  graph = run(graph, "branch", undefined, "local");
  graph = run(graph, "checkout", "local");
  graph = run(graph, "pull", "main");
  assert.equal(headId(graph), remote);
  assert.deepEqual(graph.head, { branch: "local" });
  assert.deepEqual(graph.working, { remote: "one" });
  graph = run(graph, "checkout", "c0");
  graph = save(graph, "local", "two");
  const parent = headId(graph);
  reject(graph, "pull", undefined, undefined, /Detached HEAD/);
  graph = run(graph, "pull", "main");
  assert.deepEqual(current(graph).parents, [parent, remote]);
  assert.deepEqual(current(graph).tree, { local: "two", remote: "one" });
  reject(graph, "pull", "missing", undefined, /Remote branch/);
});

test("pull exposes merge conflicts after fetching and can be resolved", () => {
  let graph = save(newGraph(), "file", "remote");
  graph = run(graph, "push");
  graph = run(graph, "checkout", "c0");
  graph = save(graph, "file", "local");
  const result = operate(graph, "pull", "main");
  assert.equal(result.ok, false);
  assert.equal(result.graph.conflict.kind, "merge");
  assert.equal(result.graph.tracking["origin/main"], graph.origin.branches.main);
  graph = run(run(run(result.graph, "edit", "file", "both"), "stage"), "commit");
  assert.equal(current(graph).parents.length, 2);
});

test("clone requires an uninitialized empty destination and copies actual origin", () => {
  let source = run(save(newGraph(), "file", "remote"), "push");
  const origin = structuredClone(source.origin);
  const graph = run(empty(origin), "clone");
  assert.equal(graph.initialized, true);
  assert.equal(headId(graph), source.origin.branches.main);
  assert.deepEqual(graph.working, { file: "remote" });
  assert.deepEqual(graph.index, graph.working);
  assert.deepEqual(graph.tracking, { "origin/main": headId(graph) });
  assert.deepEqual(graph.origin, origin);
  reject(graph, "clone", undefined, undefined, /uninitialized/);
  reject(empty(), "clone", undefined, undefined, /no branches/);
  const nonempty = empty(origin);
  nonempty.working.untracked = "do not overwrite";
  reject(nonempty, "clone", undefined, undefined, /empty repository/);
  source.origin.branches = { trunk: headId(source) };
  assert.deepEqual(run(empty(source.origin), "clone").head, { branch: "trunk" });
  const incomplete = empty({ branches: { main: "missing" }, commits: [] });
  reject(incomplete, "clone", undefined, undefined, /missing objects/);
  const falselyDirty = empty(origin);
  falselyDirty.dirty = true;
  reject(falselyDirty, "clone", undefined, undefined, /empty repository/);
});

test("stash/pop preserve exact staged and unstaged snapshots in LIFO order", () => {
  let graph = save(newGraph(), "file", "base");
  graph = run(run(graph, "edit", "file", "staged"), "stage");
  graph = run(graph, "edit", "file", "unstaged");
  const snapshot = { working: { ...graph.working }, index: { ...graph.index } };
  graph = run(graph, "stash");
  assert.equal(graph.stash.length, 1);
  assert.equal(graph.stash[0].dirty, true);
  assert.equal(graph.stash[0].staged, true);
  assert.equal(graph.dirty, false);
  assert.equal(graph.staged, false);
  graph = run(run(graph, "edit", "second", "second stash"), "stash");
  graph = run(graph, "pop");
  assert.equal(graph.working.second, "second stash");
  assert.equal(graph.stash.length, 1);
  reject(graph, "pop", undefined, undefined, /current changes/);
  graph = run(graph, "edit", "second", "second stash");
  graph = run(run(graph, "stage"), "commit");
  graph = run(graph, "reset", "HEAD~1");
  // Return to a clean base without introducing a new snapshot.
  graph.working = { file: "base" };
  graph.index = { file: "base" };
  graph.dirty = false;
  graph.staged = false;
  graph = run(graph, "pop");
  assert.deepEqual(graph.working, snapshot.working);
  assert.deepEqual(graph.index, snapshot.index);
  assert.equal(graph.dirty, true);
  assert.equal(graph.staged, true);
  assert.equal(graph.stash.length, 0);
  reject(newGraph(), "stash", undefined, undefined, /No local changes/);
  reject(newGraph(), "pop", undefined, undefined, /No stash/);
});

test("stash applies safely across commits using its stored base and keeps conflicting entries", () => {
  let graph = save(newGraph(), "file", "base");
  graph = run(graph, "edit", "file", "staged");
  graph = run(graph, "stage");
  graph = run(graph, "edit", "file", "working");
  graph = run(graph, "stash");
  graph = save(graph, "other", "new base content");
  graph = run(graph, "pop");
  assert.deepEqual(graph.working, { file: "working", other: "new base content" });
  assert.deepEqual(graph.index, { file: "staged", other: "new base content" });
  assert.equal(graph.dirty, true);
  assert.equal(graph.staged, true);

  graph = save(newGraph(), "file", "base");
  graph = run(run(graph, "edit", "file", "stashed"), "stash");
  graph = save(graph, "file", "committed on a different base");
  reject(graph, "pop", undefined, undefined, /conflicts.*stash was kept/);
  assert.equal(graph.stash.length, 1);
});

test("identical staged stash snapshots retain distinct bases and pop in LIFO order", () => {
  let graph = save(newGraph(), "file", "A");
  const firstBase = headId(graph);
  graph = run(run(run(graph, "edit", "file", "C"), "stage"), "stash");
  graph = save(graph, "file", "B");
  const secondBase = headId(graph);
  graph = run(run(run(graph, "edit", "file", "C"), "stage"), "stash");
  assert.equal(graph.stash.length, 2);
  assert.equal(graph.stash[0].base, firstBase);
  assert.equal(graph.stash[1].base, secondBase);
  assert.deepEqual(graph.stash[0].working, graph.stash[1].working);
  assert.deepEqual(graph.stash[0].index, graph.stash[1].index);
  graph = cloneGraph(graph);
  assert.equal(graph.stash[0].base, firstBase);
  assert.equal(graph.stash[1].base, secondBase);

  graph = run(graph, "pop");
  assert.deepEqual(graph.working, { file: "C" });
  assert.deepEqual(graph.index, { file: "C" });
  assert.equal(graph.dirty, false);
  assert.equal(graph.staged, true);
  assert.equal(graph.stash.length, 1);
  assert.equal(graph.stash[0].base, firstBase);

  graph = run(graph, "reset", secondBase);
  graph = run(graph, "edit", "file", "B");
  assert.equal(graph.dirty, false);
  reject(graph, "pop", undefined, undefined, /conflicts.*stash was kept/);
  assert.equal(graph.stash.length, 1);

  graph = run(graph, "checkout", firstBase);
  graph = run(graph, "pop");
  assert.deepEqual(graph.working, { file: "C" });
  assert.deepEqual(graph.index, { file: "C" });
  assert.equal(graph.staged, true);
  assert.equal(graph.stash.length, 0);
});

test("stash honors an explicit base and safely rejects a missing base object", () => {
  let graph = save(newGraph(), "file", "base");
  const base = headId(graph);
  graph = run(run(run(graph, "edit", "file", "staged"), "stage"), "stash");
  assert.equal(graph.stash[0].base, base);
  // Explicit identity must suffice even without the old content-matching objects.
  graph.commits = graph.commits.filter((commit) => !commit.message.startsWith("Stash "));
  graph = run(graph, "pop");
  assert.deepEqual(graph.index, { file: "staged" });
  graph = run(graph, "stash");
  graph.stash[0].base = "missing";
  reject(graph, "pop", undefined, undefined, /base objects are missing/);
});

test("legacy stash snapshots without a base remain backward compatible", () => {
  let graph = save(newGraph(), "file", "base");
  graph = run(run(run(graph, "edit", "file", "staged"), "stage"), "stash");
  delete graph.stash[0].base;
  graph = run(graph, "pop");
  assert.deepEqual(graph.index, { file: "staged" });

  graph = save(newGraph(), "file", "base");
  graph.stash.push({
    working: { file: "unstaged" }, index: { file: "base" }, dirty: true, staged: false,
  });
  graph = run(graph, "pop");
  assert.deepEqual(graph.working, { file: "unstaged" });
  assert.deepEqual(graph.index, { file: "base" });
});

test("ignored files survive stashing and conflicting merge transitions without being stashed", () => {
  let graph = run(newGraph(), "ignore", "*.log");
  graph = run(run(graph, "stage"), "commit");
  graph = run(graph, "edit", "ignored.log", "precious ignored contents");
  graph = run(graph, "edit", "file", "stash me");
  graph = run(graph, "stash");
  assert.equal(graph.working["ignored.log"], "precious ignored contents");
  assert.equal(graph.stash[0].working["ignored.log"], undefined);
  graph = run(graph, "edit", "ignored.log", "new ignored contents");
  graph = run(graph, "pop");
  assert.equal(graph.working["ignored.log"], "new ignored contents");
  assert.equal(graph.working.file, "stash me");

  graph = run(newGraph(), "ignore", "*.log");
  graph = run(run(graph, "stage"), "commit");
  graph = run(graph, "branch", undefined, "feature");
  graph = save(graph, "file", "main");
  graph = run(graph, "checkout", "feature");
  graph = save(graph, "file", "feature");
  graph = run(graph, "edit", "ignored.log", "preserve");
  const conflict = operate(graph, "merge", "main");
  assert.equal(conflict.graph.working["ignored.log"], "preserve");
});

test("ignore writes .gitignore, skips ignored untracked files, and never ignores tracked files", () => {
  let graph = run(newGraph(), "ignore", "*.log");
  assert.equal(graph.working[".gitignore"], "*.log\n");
  assert.equal(graph.dirty, true);
  graph = run(run(graph, "stage"), "commit");
  graph = run(graph, "edit", "debug.log", "ignored");
  assert.equal(graph.dirty, false);
  assert.equal(graph.staged, false);
  reject(graph, "stage", "debug.log", undefined, /ignored/);
  graph = run(graph, "stage");
  assert.equal(graph.staged, false);
  assert.equal(graph.index["debug.log"], undefined);
  assert.equal(graph.working["debug.log"], "ignored");
  graph = save(graph, "tracked.log.txt", "tracked");
  graph = run(graph, "ignore", "tracked.log.txt");
  graph = run(run(graph, "stage"), "commit");
  graph = run(graph, "edit", "tracked.log.txt", "modified");
  assert.equal(graph.dirty, true);
  reject(graph, "ignore", "\nbad");
});

test("ignore supports directories, rooted patterns, wildcards, negation and ignored checkout preservation", () => {
  let graph = newGraph();
  for (const pattern of ["build/", "/root.txt", "**/*.log", "!keep.log"]) {
    graph = run(graph, "ignore", pattern);
  }
  graph = run(run(graph, "stage"), "commit");
  for (const path of ["build/out", "nested/build/out", "root.txt", "nested/a.log"]) {
    graph = run(graph, "edit", path, "ignored");
    assert.equal(graph.dirty, false, path);
  }
  graph = run(graph, "branch", undefined, "topic");
  graph = run(graph, "checkout", "topic");
  assert.equal(graph.working["build/out"], "ignored");
  graph = run(graph, "edit", "keep.log", "not ignored");
  assert.equal(graph.dirty, true);
  graph = run(graph, "stage");
  assert.equal(graph.index["keep.log"], "not ignored");
  assert.equal(graph.index["nested/a.log"], undefined);
});

function renamed(graph, prefix = "renamed-") {
  const copy = cloneGraph(graph);
  const id = (old) => prefix + old;
  for (const commit of [...copy.commits, ...copy.origin.commits]) {
    commit.id = id(commit.id);
    commit.parents = commit.parents.map(id);
    commit.message = "irrelevant message";
    commit.tree = { "different.txt": "content ignored" };
  }
  for (const refs of [copy.branches, copy.origin.branches, copy.tracking, copy.tags]) {
    for (const key of Object.keys(refs)) refs[key] = id(refs[key]);
  }
  if ("commit" in copy.head) copy.head.commit = id(copy.head.commit);
  if (copy.conflict) copy.conflict.target = id(copy.conflict.target);
  copy.commits.reverse();
  return copy;
}

test("goals compare ref-labeled topology independent of commit IDs, order, messages and content", () => {
  let graph = run(divergent(), "merge", "main");
  graph = run(graph, "tag", undefined, "v1");
  graph = run(graph, "push");
  const other = renamed(graph);
  assert.equal(matchesGoal(graph, other), true);
  assert.equal(matchesGoal(other, graph), true);
  assert.equal(matchesGoal(newGraph(), newGraph()), true);
  assert.equal(matchesGoal(empty(), empty()), true);
});

test("goals discard unreachable reset/rebase/remote objects but retain reachable ancestor structure", () => {
  let graph = save(newGraph());
  graph = run(graph, "reset", "c0");
  graph.working = {};
  graph.index = {};
  graph.dirty = false;
  assert.equal(matchesGoal(graph, newGraph()), true);
  graph.origin.commits.push({ id: "unreachable", parents: [], message: "", tree: {} });
  assert.equal(matchesGoal(graph, newGraph()), true);
  let rebased = run(divergent(), "rebase", "main");
  const reachable = cloneGraph(rebased);
  reachable.commits = reachable.commits.filter((commit) => commit.id !== "c2");
  assert.equal(matchesGoal(rebased, reachable), true);
  const bad = cloneGraph(rebased);
  current(bad).parents = ["c0"];
  assert.equal(matchesGoal(rebased, bad), false);
});

test("goals distinguish every named ref category, HEAD attachment, ordered parents and flags", () => {
  let graph = run(run(divergent(), "merge", "main"), "push");
  graph = run(graph, "tag", undefined, "v1");
  const mutations = [
    (g) => { g.branches.main = "c0"; },
    (g) => { g.branches.extra = "c0"; },
    (g) => { g.head = { branch: "main" }; },
    (g) => { g.head = { commit: headId(g) }; },
    (g) => { g.origin.branches.feature = "c0"; },
    (g) => { g.tracking["origin/feature"] = "c0"; },
    (g) => { g.tags.v1 = "c0"; },
    (g) => { g.dirty = true; },
    (g) => { g.staged = true; },
    (g) => { g.initialized = false; },
    (g) => { current(g).parents.reverse(); },
    (g) => { g.conflict = { kind: "merge", target: "c0" }; },
    (g) => { g.stash.push({ working: {}, index: {}, dirty: true, staged: false }); },
  ];
  for (const mutate of mutations) {
    const changed = cloneGraph(graph);
    mutate(changed);
    assert.equal(matchesGoal(graph, changed), false, mutate.toString());
  }
});

test("goals compare detached HEAD, conflict target/kind and ordered stash statuses", () => {
  let graph = run(divergent(true), "checkout", "c0");
  const detached = renamed(graph);
  assert.equal(matchesGoal(graph, detached), true);
  detached.head.commit = detached.branches.main;
  assert.equal(matchesGoal(graph, detached), false);

  graph = operate(divergent(true), "merge", "main").graph;
  const conflict = renamed(graph);
  assert.equal(matchesGoal(graph, conflict), true);
  conflict.conflict.kind = "revert";
  assert.equal(matchesGoal(graph, conflict), false);
  conflict.conflict.kind = "merge";
  conflict.conflict.target = "renamed-c0";
  assert.equal(matchesGoal(graph, conflict), false);

  graph = run(run(newGraph(), "edit"), "stash");
  graph = run(run(run(graph, "edit", "two"), "stage"), "stash");
  const stashed = renamed(graph);
  stashed.stash[0].working = { unrelated: "ignored contents" };
  assert.equal(matchesGoal(graph, stashed), true);
  stashed.stash.reverse();
  assert.equal(matchesGoal(graph, stashed), false);
});

test("goals enforce shared-node identity rather than just equal depths or counts", () => {
  const shared = run(newGraph(), "branch", undefined, "feature");
  const split = cloneGraph(shared);
  split.commits.push({ id: "other-root", parents: [], message: "", tree: {} });
  split.branches.feature = "other-root";
  assert.equal(matchesGoal(shared, split), false);
  assert.equal(matchesGoal(split, shared), false);
  const dangling = cloneGraph(shared);
  dangling.branches.main = "missing";
  assert.equal(matchesGoal(shared, dangling), false);
});

function withStorage(storage, callback) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try {
    callback();
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
}

test("saveGame/loadGame round-trip progress at the versioned key and reset it", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  withStorage(storage, () => {
    assert.deepEqual(loadGame(17), { unlockedLevel: 0, completed: [] });
    const progress = { unlockedLevel: 4, completed: [0, 2, 3] };
    saveGame(progress);
    assert.deepEqual([...values.keys()], ["branchcraft-save-v2"]);
    assert.deepEqual(loadGame(17), progress);
    assert.deepEqual(progress, { unlockedLevel: 4, completed: [0, 2, 3] });
    saveGame({ unlockedLevel: 0, completed: [] });
    assert.deepEqual(loadGame(17), { unlockedLevel: 0, completed: [] });
  });
});

test("loadGame ignores legacy saves, malformed JSON and invalid progress shapes", () => {
  withStorage({ getItem: (key) => key === "branchcraft-save" ? '{"unlockedLevel":8,"completed":[0]}' : null }, () => {
    assert.deepEqual(loadGame(17), { unlockedLevel: 0, completed: [] });
  });
  for (const value of [
    "{broken", "null", "false", "42", '"text"', "[]", "{}",
    '{"unlockedLevel":"4","completed":[]}', '{"unlockedLevel":1.5,"completed":[]}',
    '{"unlockedLevel":4,"completed":"bad"}',
  ]) {
    withStorage({ getItem: () => value }, () => {
      assert.deepEqual(loadGame(17), { unlockedLevel: 0, completed: [] }, value);
    });
  }
});

test("loadGame clamps progress and filters, deduplicates, and bounds completion indices", () => {
  withStorage({
    getItem: () => JSON.stringify({
      unlockedLevel: 99,
      completed: [-1, 0, 0, 1, 2, 3, 16, 17, "1", null, 1.2],
      graph: { stale: "graph snapshots must not be restored" },
    }),
  }, () => {
    assert.deepEqual(loadGame(3), { unlockedLevel: 2, completed: [0, 1, 2] });
  });
  withStorage({ getItem: () => '{"unlockedLevel":1,"completed":[0,1,2,3]}' }, () => {
    assert.deepEqual(loadGame(17), { unlockedLevel: 1, completed: [0, 1] });
  });
  withStorage({ getItem: () => '{"unlockedLevel":-10,"completed":[-1,0,1]}' }, () => {
    assert.deepEqual(loadGame(17), { unlockedLevel: 0, completed: [0] });
  });
});

test("blocked, missing, and throwing browser storage never prevent play", () => {
  withStorage({
    getItem: () => { throw new Error("storage blocked"); },
    setItem: () => { throw new Error("storage quota"); },
  }, () => {
    assert.deepEqual(loadGame(17), { unlockedLevel: 0, completed: [] });
    assert.doesNotThrow(() => saveGame({ unlockedLevel: 1, completed: [0] }));
  });
  withStorage(undefined, () => {
    assert.deepEqual(loadGame(17), { unlockedLevel: 0, completed: [] });
    assert.doesNotThrow(() => saveGame({ unlockedLevel: 1, completed: [0] }));
  });
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => { throw new Error("access denied"); },
  });
  try {
    assert.deepEqual(loadGame(17), { unlockedLevel: 0, completed: [] });
    assert.doesNotThrow(() => saveGame({ unlockedLevel: 1, completed: [0] }));
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});
