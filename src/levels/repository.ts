import { emptyGraph, follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = emptyGraph();
const solution: SolutionStep[] = [{ action: "init" }];

const level: LevelDefinition = {
  id: "repository",
  term: "Repository",
  definition: "A Git repository stores commits, branch references, and the history of a project's files.",
  command: "git init",
  instruction: "Initialize this directory. Create the main branch and the game's initial root commit.",
  hint: "Choose Init. This simulator represents a newly initialized repository with a root commit; real git init starts without commits.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Which branch did you initialize in this graph?", options: ["origin", "main", "feature"], answer: 1, explanation: "HEAD is attached to the newly created main branch." },
    { prompt: "What does the root commit in your graph have?", options: ["Two parents", "One remote parent", "No parents"], answer: 2, explanation: "A root commit has no parent. The game creates it during initialization; real git init does not create a commit." },
    { prompt: "Did initializing this graph publish it on GitHub?", options: ["No, it only initialized local history", "Yes, it opened a pull request", "Yes, it pushed main"], answer: 0, explanation: "git init is local. Creating a GitHub repository and pushing are separate operations." },
  ],
};

export default level;
