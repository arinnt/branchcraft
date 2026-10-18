import { emptyGraph, follow, remoteAhead } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = { ...emptyGraph(), origin: remoteAhead().origin };
const solution: SolutionStep[] = [{ action: "clone" }];

const level: LevelDefinition = {
  id: "clone",
  term: "Clone",
  definition: "Cloning creates a local repository from a remote repository's history and checks out its default branch.",
  command: "git clone <repository-url>",
  instruction: "Clone the configured origin so local main and origin/main point to its published documentation commit.",
  hint: "Choose Clone in the empty local repository. The remote already contains two commits.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Where does local main point after your clone?", options: ["The newest commit on origin/main", "An unrelated root", "A stash entry"], answer: 0, explanation: "The clone copies origin's history and checks out its main tip." },
    { prompt: "What does origin/main represent in your cloned graph?", options: ["An independent working directory", "The last known position of remote main", "A release tag"], answer: 1, explanation: "origin/main is a local remote-tracking reference recording the remote main position." },
    { prompt: "Did cloning your graph change the remote commits?", options: ["Yes, it rewrote every parent", "Yes, it deleted main", "No, it copied existing history locally"], answer: 2, explanation: "Cloning reads the remote. Editing and committing in the clone do not publish anything automatically." },
  ],
};

export default level;
