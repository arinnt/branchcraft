import { diverged, follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = diverged(true);
const solution: SolutionStep[] = [
  { action: "merge", target: "feature" },
  { action: "edit", target: "README.md", name: "Main and feature documentation" },
  { action: "stage" },
  { action: "commit", name: "Resolve documentation conflict" },
];

const level: LevelDefinition = {
  id: "merge-conflict",
  term: "Merge conflict",
  definition: "A merge conflict requires a person to choose final file contents before Git can finish integrating incompatible edits.",
  command: "git merge feature; git add README.md; git commit",
  instruction: "Merge feature into main. When it stops with a conflict, resolve README.md to 'Main and feature documentation', stage it, and commit as 'Resolve documentation conflict'.",
  hint: "Both branches changed README.md. Start the merge, edit the conflicting file, stage the resolution, then commit.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Which file required your resolution in this merge?", options: ["README.md", "feature.txt", ".gitignore"], answer: 0, explanation: "main and feature both changed README.md differently from their common ancestor." },
    { prompt: "What did staging your resolved README tell Git?", options: ["To delete feature", "That the chosen contents were ready to commit", "To publish a release"], answer: 1, explanation: "Editing chooses the contents; staging marks that resolution for the resulting commit." },
    { prompt: "What connects the two histories in your finished graph?", options: ["A detached HEAD", "A remote tag", "The two-parent resolution commit on main"], answer: 2, explanation: "Finishing the conflicted merge creates a merge commit retaining both branch tips as parents." },
  ],
};

export default level;
