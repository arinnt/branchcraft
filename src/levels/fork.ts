import { newGraph } from "../graph.ts";
import { follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = newGraph();
const solution: SolutionStep[] = [
  { action: "branch", target: "c0", name: "contribution" },
  { action: "checkout", target: "contribution" },
  { action: "edit", target: "CONTRIBUTING.md", name: "Run tests before submitting changes." },
  { action: "stage" },
  { action: "commit", name: "Document contribution checks" },
];

const level: LevelDefinition = {
  id: "fork",
  term: "Fork",
  definition: "A GitHub fork is a separate hosted repository associated with an upstream project. Git itself has no 'git fork' command.",
  command: "git branch contribution; git checkout contribution; git add CONTRIBUTING.md; git commit",
  instruction: "Simulate isolated contribution work locally: create and check out contribution at c0, write CONTRIBUTING.md as 'Run tests before submitting changes.', and commit as 'Document contribution checks'. Leave main unchanged.",
  hint: "The contribution branch models isolation, not a real GitHub fork. Create it, check it out, then edit, stage, and commit.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "What did your contribution branch demonstrate?", options: ["GitHub created a hosted fork", "Isolated work while main stayed unchanged", "A remote pull request was merged"], answer: 1, explanation: "The local branch simulates independent contribution work; it does not create a separate GitHub repository." },
    { prompt: "Where is your contribution commit reachable?", options: ["From contribution, but not yet main", "Only from a release tag", "From main alone"], answer: 0, explanation: "HEAD followed contribution when you committed, so contribution advanced and main remained at c0." },
    { prompt: "How would a real GitHub fork differ from the branch you built?", options: ["It would remove commit parents", "It would require git fork", "It would be a separate hosted repository"], answer: 2, explanation: "GitHub provides fork functionality; Git branches remain references within a repository." },
  ],
};

export default level;
