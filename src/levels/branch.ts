import { newGraph } from "../graph.ts";
import { follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = newGraph();
const solution: SolutionStep[] = [{ action: "branch", target: "c0", name: "feature" }];

const level: LevelDefinition = {
  id: "branch",
  term: "Branch",
  definition: "A branch is a movable reference to a commit, allowing development to proceed independently.",
  command: "git branch feature",
  instruction: "Create a feature branch at the root commit without leaving main.",
  hint: "Select c0, choose Branch, and enter feature. Creating a branch does not check it out.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Which commit do main and feature reference now?", options: ["Different new commits", "The same root commit", "No commit"], answer: 1, explanation: "Creating feature added another reference to c0; it did not create a commit." },
    { prompt: "Which branch does HEAD still follow in your graph?", options: ["main", "feature", "origin/main"], answer: 0, explanation: "git branch creates a branch without switching HEAD." },
    { prompt: "How many commits did creating feature add?", options: ["Two", "One", "Zero"], answer: 2, explanation: "A branch is a reference, not a duplicate commit or a copy of the entire history." },
  ],
};

export default level;
