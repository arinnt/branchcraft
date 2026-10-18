import { diverged, follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = diverged();
const solution: SolutionStep[] = [{ action: "merge", target: "feature" }];

const level: LevelDefinition = {
  id: "pull-request",
  term: "Pull request",
  definition: "A GitHub pull request proposes integrating one branch into another and provides review and checks. Opening one is not a local Git operation.",
  command: "git checkout main; git merge feature",
  instruction: "Simulate the integration of an approved pull request: merge the reviewed feature branch into main, preserving both histories.",
  hint: "This graph models the merge result only; it does not open a GitHub pull request. Merge feature while main is checked out.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Which branch was the integration destination in your graph?", options: ["feature", "origin/main", "main"], answer: 2, explanation: "main was checked out and advanced to the resulting merge commit, corresponding to the pull request's base branch." },
    { prompt: "Did your local merge create a GitHub review discussion?", options: ["No, review discussions belong to GitHub pull requests", "Yes, all merges open one", "Yes, it published comments"], answer: 0, explanation: "The exercise simulates integration. GitHub review, checks, and pull request metadata are outside this local graph." },
    { prompt: "Which integration strategy does your final two-parent commit show?", options: ["Squash merge", "Merge commit", "Rebase-only integration"], answer: 1, explanation: "The resulting commit retains both main and feature tips as parents; other GitHub merge strategies produce different topology." },
  ],
};

export default level;
