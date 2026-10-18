import { newGraph } from "../graph.ts";
import { follow, record } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = record(newGraph(), "README.md", "Current documentation", "Add current documentation");
const solution: SolutionStep[] = [{ action: "checkout", target: "c0" }];

const level: LevelDefinition = {
  id: "head",
  term: "HEAD",
  definition: "HEAD identifies the current checkout. It usually follows a branch, but checking out a commit directly detaches HEAD from branch references.",
  command: "git checkout c0",
  instruction: "Inspect the root commit c0 in detached HEAD state. Keep main pointing to its documentation commit.",
  hint: "Choose Checkout with the commit ID c0, not the branch main. The HEAD marker should move without moving main.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "What does HEAD reference after your checkout?", options: ["The root commit directly", "The main branch", "The remote origin"], answer: 0, explanation: "Checking out c0 directly detached HEAD and made it reference that commit." },
    { prompt: "Where does main remain in your final graph?", options: ["At c0", "At the documentation commit c1", "It was deleted"], answer: 1, explanation: "Detached checkout changed HEAD and working files but did not move main." },
    { prompt: "How could you safely keep new work committed from this detached position?", options: ["Assume main moves automatically", "Delete the root", "Create a branch referencing the new work"], answer: 2, explanation: "A branch reference makes detached commits easy to find after switching elsewhere. Detached commits do not automatically advance main." },
  ],
};

export default level;
