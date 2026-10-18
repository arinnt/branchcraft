import { newGraph } from "../graph.ts";
import { follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = newGraph();
const solution: SolutionStep[] = [
  { action: "edit", target: "README.md", name: "# Branchcraft" },
  { action: "stage" },
  { action: "commit", name: "Add project README" },
];

const level: LevelDefinition = {
  id: "commit",
  term: "Commit",
  definition: "A commit records the staged file snapshot, a message, and its parent commit references.",
  command: "git add README.md; git commit -m \"Add project README\"",
  instruction: "Write '# Branchcraft' to README.md, stage it, and commit with the message 'Add project README'.",
  hint: "Use Edit with README.md and the requested contents, then Stage, then Commit with the requested message.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Which snapshot did your new commit record?", options: ["Only a branch name", "The staged README.md contents", "Every remote file"], answer: 1, explanation: "The index held README.md with '# Branchcraft'; committing recorded that snapshot." },
    { prompt: "Which commit is the parent of the README commit?", options: ["The new commit itself", "A future merge", "The initial root commit"], answer: 2, explanation: "The new commit extends the previously checked-out root commit." },
    { prompt: "Where is HEAD after your commit?", options: ["Attached to main at the new commit", "Detached at the root", "On origin/main"], answer: 0, explanation: "Committing while attached advances main, and HEAD continues to follow main." },
  ],
};

export default level;
