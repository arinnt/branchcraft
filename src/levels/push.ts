import { newGraph } from "../graph.ts";
import { follow, record } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const root = newGraph();
const local = record(root, "README.md", "Ready to share", "Prepare shared documentation");
const start = {
  ...local,
  origin: { branches: { ...root.branches }, commits: root.commits },
  tracking: { "origin/main": "c0" },
};
const solution: SolutionStep[] = [{ action: "push" }];

const level: LevelDefinition = {
  id: "push",
  term: "Push",
  definition: "Pushing sends local commits to a remote and requests an update to its branch reference.",
  command: "git push origin main",
  instruction: "Publish the documentation commit on local main to origin's main branch.",
  hint: "Local main is one commit ahead of the configured remote. Choose Push.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "What changed on origin after your push?", options: ["Its main branch advanced to your documentation commit", "Its main branch was deleted", "It created a stash"], answer: 0, explanation: "The remote accepted your new commit and advanced main." },
    { prompt: "Did your push create another local commit?", options: ["Yes, a merge", "Yes, a root", "No, it published the existing commit"], answer: 2, explanation: "Push transfers existing history rather than creating a new snapshot." },
    { prompt: "Why was this push a fast-forward?", options: ["The remote was unrelated", "The previous remote tip is an ancestor of local main", "HEAD was detached"], answer: 1, explanation: "Local main extends c0, the remote's previous tip, so the update preserves remote history." },
  ],
};

export default level;
