import { follow, remoteAhead } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = remoteAhead();
const solution: SolutionStep[] = [{ action: "fetch" }, { action: "pull" }];

const level: LevelDefinition = {
  id: "fetch-pull",
  term: "Fetch and pull",
  definition: "Fetch updates remote-tracking information; pull fetches and then integrates the remote branch into the current branch.",
  command: "git fetch origin; git pull origin main",
  instruction: "Fetch origin's documentation commit, then pull it into local main so the working README matches origin.",
  hint: "Fetch first to inspect origin/main without moving main. Pull then fast-forwards main to the downloaded commit.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Which reference did your fetch update before main moved?", options: ["A release tag", "origin/main", "HEAD's branch name"], answer: 1, explanation: "Fetch updated the remote-tracking reference while leaving local main and its working files unchanged." },
    { prompt: "Why did your pull need no merge commit?", options: ["Local main had no independent changes", "Pull never merges", "The remote had no commits"], answer: 0, explanation: "The remote commit descends directly from local main, allowing a fast-forward." },
    { prompt: "Which file arrived in your working directory after the pull?", options: ["feature.txt", ".gitignore", "README.md"], answer: 2, explanation: "The pulled commit records README.md with 'Published documentation'." },
  ],
};

export default level;
