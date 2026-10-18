import { newGraph } from "../graph.ts";
import { follow, record } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

let history = record(newGraph(), "config.txt", "safe=true", "Use safe configuration");
history = record(history, "config.txt", "safe=false", "Disable safety checks");
history = follow(history, [
  { action: "branch", target: "c2", name: "experiment" },
  { action: "checkout", target: "experiment" },
]);
const start = record(history, "config.txt", "safe=experimental", "Try an experiment");
const solution: SolutionStep[] = [
  { action: "reset", target: "c2" },
  { action: "stash" },
  { action: "checkout", target: "main" },
  { action: "revert", target: "c2" },
];

const level: LevelDefinition = {
  id: "revert-reset",
  term: "Revert and reset",
  definition: "Reset moves the current branch to a selected commit; revert creates a new commit that reverses an earlier change without rewriting shared history.",
  command: "git reset --mixed c2; git stash; git checkout main; git revert c2",
  instruction: "Reset experiment to c2, then stash the experimental working change that reset preserves. Check out main and revert c2 to restore config.txt to 'safe=true' without removing c2 from main's ancestry.",
  hint: "Mixed reset moves the branch and unstages changes but preserves working files. Stash that remaining edit before switching to main and reverting 'Disable safety checks'.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "What happened to the experiment branch reference after your reset?", options: ["It moved back to c2", "It became a release tag", "It moved origin/main"], answer: 0, explanation: "Reset moved the current experiment branch back, removing its unpublished experiment commit from that branch's reachable history." },
    { prompt: "Is c2 still an ancestor of main after your revert?", options: ["No, revert deletes it", "Yes, the undo is a new descendant commit", "No, main has no ancestors"], answer: 1, explanation: "Revert preserves the original history and records the inverse change in a new commit." },
    { prompt: "Why use revert rather than reset for the shared main change?", options: ["Revert creates a GitHub fork", "Reset cannot move references", "Revert preserves history others may already use"], answer: 2, explanation: "Moving a shared branch backward rewrites its visible history. The revert records a compatible follow-up change." },
  ],
};

export default level;
