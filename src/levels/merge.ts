import { diverged, follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = diverged();
const solution: SolutionStep[] = [{ action: "merge", target: "feature" }];

const level: LevelDefinition = {
  id: "merge",
  term: "Merge",
  definition: "Merging integrates another branch's history into the current branch while retaining both histories.",
  command: "git merge feature",
  instruction: "Merge feature into main. Preserve both independent changes with a two-parent merge commit.",
  hint: "HEAD already follows main. Choose Merge with feature as the target.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Why does your new merge commit have two parents?", options: ["It records the previous main and feature tips", "It cloned two remotes", "Every commit has two parents"], answer: 0, explanation: "Both branches had independent commits, so the merge joins their tips." },
    { prompt: "Which branch advanced to your merge commit?", options: ["feature only", "main", "Neither branch"], answer: 1, explanation: "The merge ran while HEAD was attached to main, so main advanced." },
    { prompt: "Which files survive in the merged snapshot?", options: ["Only main.txt", "Only feature.txt", "README.md, main.txt, and feature.txt"], answer: 2, explanation: "The independent edits affect different paths, so the merge preserves both changes and their shared README." },
  ],
};

export default level;
