import assert from "node:assert/strict";
import { test } from "node:test";
import { headId, matchesGoal, operate } from "../src/graph.ts";
import { levels } from "../src/levels/index.ts";
import { follow } from "../src/levels/scenarios.ts";

const courseOrder = [
  "repository", "clone", "commit", "branch", "checkout", "merge",
  "merge-conflict", "push", "fetch-pull", "fork", "pull-request",
  "rebase", "stash", "revert-reset", "tag-release", "gitignore", "head",
];

test("the course contains seventeen ordered graph lessons", () => {
  assert.deepEqual(levels.map((level) => level.id), courseOrder);
});

test("lesson replay accepts a conflict transition but rejects unrelated failures", () => {
  const { start, solution, goal } = levels.find((level) => level.id === "merge-conflict");
  assert.equal(matchesGoal(follow(start, solution), goal), true);
  assert.throws(() => follow(start, [{ action: "checkout", target: "missing-branch" }]));
  const conflicted = operate(start, "merge", "feature").graph;
  assert.equal(conflicted.conflict.kind, "merge");
  assert.throws(() => follow(conflicted, [{ action: "checkout", target: "missing-branch" }]));
});

test("lesson snapshots encode the operations described in their instructions", () => {
  const lesson = (id) => levels.find((level) => level.id === id);
  const tip = (graph) => graph.commits.find((commit) => commit.id === headId(graph));
  for (const id of ["repository", "clone"]) {
    assert.equal(lesson(id).start.initialized, false);
    assert.deepEqual(lesson(id).start.commits, []);
    assert.deepEqual(lesson(id).start.branches, {});
    assert.equal(lesson(id).goal.initialized, true);
  }
  assert.equal(tip(lesson("commit").goal).tree["README.md"], "# Branchcraft");
  assert.deepEqual(lesson("branch").goal.head, { branch: "main" });
  assert.deepEqual(lesson("checkout").goal.head, { branch: "feature" });
  assert.equal(tip(lesson("merge").goal).parents.length, 2);
  assert.equal(operate(lesson("merge-conflict").start, "merge", "feature").graph.conflict.kind, "merge");
  assert.equal(lesson("merge-conflict").goal.conflict, null);
  assert.equal(tip(lesson("merge-conflict").goal).parents.length, 2);
  assert.equal(tip(lesson("merge-conflict").goal).tree["README.md"], "Main and feature documentation");
  for (const id of ["push", "fetch-pull"]) {
    const { goal } = lesson(id);
    assert.equal(goal.branches.main, goal.origin.branches.main);
    assert.equal(goal.tracking["origin/main"], goal.branches.main);
  }
  assert.equal(lesson("fork").goal.branches.main, "c0");
  assert.notEqual(lesson("fork").goal.branches.contribution, "c0");
  assert.equal(tip(lesson("pull-request").goal).parents.length, 2);
  assert.deepEqual(tip(lesson("rebase").goal).parents, [lesson("rebase").goal.branches.main]);
  assert.equal(lesson("stash").goal.stash.length, 1);
  assert.equal(lesson("stash").goal.dirty, false);
  assert.equal(lesson("stash").goal.staged, false);
  assert.equal(lesson("revert-reset").goal.branches.experiment, "c2");
  assert.deepEqual(tip(lesson("revert-reset").goal).parents, ["c2"]);
  assert.equal(tip(lesson("revert-reset").goal).tree["config.txt"], "safe=true");
  assert.equal(lesson("tag-release").goal.tags["v1.0.0"], "c1");
  assert.equal(tip(lesson("gitignore").goal).tree[".gitignore"], "build/\n");
  assert.equal(tip(lesson("gitignore").goal).tree["build/output.js"], undefined);
  assert.equal(lesson("gitignore").goal.working["build/output.js"], "Generated build output");
  assert.deepEqual(lesson("head").goal.head, { commit: "c0" });
  assert.equal(lesson("head").goal.branches.main, "c1");
});

for (const level of levels) {
  test(`${level.id}: its solution starts unfinished and reaches the goal`, () => {
    const original = structuredClone(level.start);
    let graph = level.start;
    assert.equal(matchesGoal(graph, level.goal), false, "The initial graph must require work");
    assert.ok(level.solution.length > 0, "A lesson needs an executable solution");

    for (const step of level.solution) {
      const before = structuredClone(graph);
      const result = operate(graph, step.action, step.target, step.name);
      const enteredConflict = graph.conflict === null && result.graph.conflict !== null;
      assert.ok(result.ok || enteredConflict, `${level.id}: ${step.action}: ${result.output}`);
      assert.deepEqual(graph, before, "An operation must not mutate the previous graph");
      graph = result.graph;
    }

    assert.equal(matchesGoal(graph, level.goal), true, "The solution must match its goal");
    assert.deepEqual(level.start, original, "Solving a lesson must preserve its restart state");
  });

  test(`${level.id}: three complete quiz questions accompany the graph`, () => {
    assert.equal(level.quiz.length, 3);
    for (const question of level.quiz) {
      assert.ok(question.prompt.trim());
      assert.equal(question.options.length, 3);
      assert.ok(question.options.every((option) => option.trim()));
      assert.ok(Number.isInteger(question.answer));
      assert.ok(question.answer >= 0 && question.answer < 3);
      assert.ok(question.explanation.trim());
    }
  });
}
