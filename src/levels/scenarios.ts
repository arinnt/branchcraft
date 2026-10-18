import { headId, newGraph, operate } from "../graph.ts";
import type { Graph } from "../graph.ts";
import type { SolutionStep } from "./types.ts";

export function follow(start: Graph, steps: SolutionStep[]): Graph {
  return steps.reduce((graph, step) => {
    const result = operate(graph, step.action, step.target, step.name);
    const enteredConflict = graph.conflict === null && result.graph.conflict !== null;
    if (!result.ok && !enteredConflict) {
      throw new Error(`Invalid lesson step ${step.action}: ${result.output}`);
    }
    return result.graph;
  }, start);
}

export function record(graph: Graph, path: string, contents: string, message: string): Graph {
  return follow(graph, [
    { action: "edit", target: path, name: contents },
    { action: "stage" },
    { action: "commit", name: message },
  ]);
}

export function emptyGraph(): Graph {
  return {
    ...newGraph(),
    initialized: false,
    commits: [],
    branches: {},
    head: { branch: "main" },
  };
}

export function diverged(conflicting = false): Graph {
  let graph = record(newGraph(), "README.md", "Project overview", "Document the project");
  graph = follow(graph, [{ action: "branch", target: headId(graph), name: "feature" }]);
  graph = record(graph, conflicting ? "README.md" : "main.txt", "Main branch update", "Update main");
  graph = follow(graph, [{ action: "checkout", target: "feature" }]);
  graph = record(graph, conflicting ? "README.md" : "feature.txt", "Feature branch update", "Implement feature");
  return follow(graph, [{ action: "checkout", target: "main" }]);
}

export function remoteAhead(): Graph {
  const local = newGraph();
  const remote = record(newGraph(), "README.md", "Published documentation", "Publish documentation");
  return {
    ...local,
    origin: { branches: { ...remote.branches }, commits: remote.commits },
    tracking: { "origin/main": headId(local) },
  };
}
