import { newGraph } from "../graph.ts";
import { follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = follow(newGraph(), [
  { action: "edit", target: "build/output.js", name: "Generated build output" },
]);
const solution: SolutionStep[] = [
  { action: "ignore", target: "build/" },
  { action: "stage" },
  { action: "commit", name: "Ignore generated build output" },
];

const level: LevelDefinition = {
  id: "gitignore",
  term: ".gitignore",
  definition: ".gitignore specifies untracked file patterns Git should exclude from ordinary staging. It does not untrack files already in commits.",
  command: "printf 'build/\\n' >> .gitignore; git add .gitignore; git commit",
  instruction: "Add build/ to .gitignore, stage the ignore rule without the generated output, and commit as 'Ignore generated build output'.",
  hint: "Choose Ignore with build/ as the pattern, then Stage and Commit. Keep build/output.js out of the committed snapshot.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Which file belongs in the commit you just created?", options: ["build/output.js only", "Every generated file", ".gitignore, but not build/output.js"], answer: 2, explanation: "The ignore rule is versioned configuration, while the untracked generated output is excluded from staging." },
    { prompt: "Did your ignore rule delete build/output.js from the working directory?", options: ["No, it only excluded the untracked file", "Yes, ignore deletes files", "Yes, it moved the file to origin"], answer: 0, explanation: "Ignoring an untracked file does not remove its local contents." },
    { prompt: "Would the new rule remove an already tracked build file from history?", options: ["Yes, from every commit", "No, ignore rules do not untrack existing files", "Yes, after checkout"], answer: 1, explanation: "The build output in this exercise was untracked. Already tracked files require explicit removal from the index to stop tracking them." },
  ],
};

export default level;
