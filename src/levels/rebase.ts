import { diverged, follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = follow(diverged(), [{ action: "checkout", target: "feature" }]);
const solution: SolutionStep[] = [{ action: "rebase", target: "main" }];

const level: LevelDefinition = {
  id: "rebase",
  term: "Rebase",
  definition: "Rebasing replays a branch's unique changes on a different base, creating replacement commits with new ancestry.",
  command: "git rebase main",
  instruction: "Rebase feature onto main so feature's change follows main's latest commit in a linear history.",
  hint: "HEAD already follows feature. Choose Rebase with main as the new base.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "What is the parent of your replayed feature commit?", options: ["The latest main commit", "The old feature commit", "No commit"], answer: 0, explanation: "Rebase replayed the feature change on top of main's tip." },
    { prompt: "Why does your replayed feature commit have a new ID?", options: ["Rebase always deletes main", "Its parent changed, so it is a different commit", "It became a tag"], answer: 1, explanation: "Parent references are part of a commit's identity; replaying changes creates a replacement commit." },
    { prompt: "Which branch stayed at its pre-rebase position?", options: ["feature", "Both branches", "main"], answer: 2, explanation: "Rebase moved the current feature branch; main remained the selected base." },
  ],
};

export default level;
