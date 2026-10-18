import assert from "node:assert/strict";
import { test } from "node:test";
import { loadGame, newGraph, recordAction } from "../src/engine.ts";

const level = (id, graphKind, term = id) => ({
  id,
  term,
  definition: "",
  metaphor: "",
  command: "",
  action: "",
  instruction: "",
  color: "#79c6a3",
  graphKind,
  quiz: [],
});

const commit = level("commit", "commit");

test("reset follows the current branch's first parent", () => {
  const graph = newGraph();
  recordAction(graph, commit);
  recordAction(graph, level("branch", "branch"));
  graph.currentBranch = "experiment";
  recordAction(graph, commit);
  const experimentHead = graph.branches.experiment;
  graph.currentBranch = "main";
  recordAction(graph, commit);
  graph.currentBranch = "experiment";

  recordAction(graph, level("reset", "reset"));

  assert.equal(graph.branches.experiment, graph.nodes.find((node) => node.id === experimentHead).parents[0]);
  assert.notEqual(graph.branches.experiment, graph.branches.main);
});

test("merge creates a two-parent resolution and returns to the target branch", () => {
  const graph = newGraph();
  recordAction(graph, level("branch", "branch"));
  recordAction(graph, commit);
  graph.currentBranch = "experiment";

  recordAction(graph, level("merge", "merge"));

  const merge = graph.nodes.at(-1);
  assert.equal(merge.parents.length, 2);
  assert.equal(graph.currentBranch, "main");
  assert.equal(graph.branches.main, merge.id);
});

test("conflict resolution is represented by a merge commit", () => {
  const graph = newGraph();
  recordAction(graph, level("branch", "branch"));
  recordAction(graph, commit);
  graph.currentBranch = "experiment";

  recordAction(graph, level("merge-conflict", "merge"));

  assert.equal(graph.nodes.at(-1).message, "conflict resolution");
  assert.equal(graph.nodes.at(-1).parents.length, 2);
});

test("rebase replays feature commits on top of the current main head", () => {
  const graph = newGraph();
  recordAction(graph, commit);
  recordAction(graph, level("branch", "branch"));
  graph.currentBranch = "experiment";
  recordAction(graph, commit);
  graph.currentBranch = "main";
  recordAction(graph, commit);
  const mainHead = graph.branches.main;

  recordAction(graph, level("rebase", "commit"));

  const rebased = graph.nodes.find((node) => node.id === graph.branches.experiment);
  assert.deepEqual(rebased.parents, [mainHead]);
  assert.match(rebased.message, /^rebase:/);
  assert.equal(graph.currentBranch, "experiment");
});

test("fetch advances only the remote-tracking ref and pull integrates it", () => {
  const graph = newGraph();
  const localHead = graph.branches.main;
  const fetchPull = level("fetch-pull", "remote");

  recordAction(graph, fetchPull, false, 1);
  const fetchedHead = graph.remoteBranches.main;
  assert.notEqual(fetchedHead, localHead);
  assert.equal(graph.branches.main, localHead);
  assert.equal(graph.branches["origin/main"], undefined);

  recordAction(graph, fetchPull, false, 2);
  assert.equal(graph.branches.main, fetchedHead);
  assert.equal(graph.remoteBranches.main, fetchedHead);
});

test("legacy saves migrate remoteHead into a remote-tracking ref", () => {
  const legacyGraph = newGraph();
  delete legacyGraph.remoteBranches;
  globalThis.localStorage = {
    getItem: () => JSON.stringify({
      unlockedLevel: 0,
      completed: [],
      graph: legacyGraph,
    }),
  };

  try {
    assert.equal(loadGame(17).graph.remoteBranches.main, legacyGraph.remoteHead);
  } finally {
    delete globalThis.localStorage;
  }
});
