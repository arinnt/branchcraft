import { newGraph } from "../graph.ts";
import { follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = follow(newGraph(), [
  { action: "edit", target: "draft.md", name: "Unfinished release notes" },
  { action: "stage" },
  { action: "edit", target: "draft.md", name: "Unfinished release notes with examples" },
]);
const solution: SolutionStep[] = [{ action: "stash" }];

const level: LevelDefinition = {
  id: "stash",
  term: "Stash",
  definition: "A stash saves unfinished working and staged changes so you can temporarily return to a clean checkout.",
  command: "git stash",
  instruction: "Stash the unfinished draft, preserving its staged and working versions while leaving main clean.",
  hint: "Choose Stash. The goal has one saved entry and no new history commit; Pop would restore and remove that entry.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Where did your unfinished draft go?", options: ["Into a release tag", "Into the saved stash entry", "To origin/main"], answer: 1, explanation: "The stash retains both the staged draft and the newer working draft." },
    { prompt: "Did stashing advance main in this graph?", options: ["No, main still points to the same commit", "Yes, to a merge", "Yes, to the remote tip"], answer: 0, explanation: "The game represents stash entries separately from the branch's commit history." },
    { prompt: "What would Pop do to the entry you just created?", options: ["Publish it on GitHub", "Create a branch", "Restore its changes and remove the saved entry"], answer: 2, explanation: "A successful stash pop reapplies the saved work and removes that stash entry." },
  ],
};

export default level;
