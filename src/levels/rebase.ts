import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "rebase",
  term: "Rebase",
  definition: "Rebasing reapplies commits onto a new base, rewriting them and often creating a linear history.",
  metaphor: "Lift your experiment jars onto the latest main shelf, one recipe card at a time.",
  command: "git rebase <base>",
  action: "Re-stack the jars",
  instruction: "Drag your side jars onto the fresh main shelf in sequence.",
  color: "#b897f8",
  graphKind: "commit",
  quiz: [
    { prompt: "What does rebase do to your commits?", options: ["Reapplies them on a new base", "Deletes the remote copy", "Adds a release tag"], answer: 0, explanation: "Rebase recreates commits on top of a selected base." },
    { prompt: "What history shape does rebase often produce?", options: ["A linear sequence", "A disconnected repository", "A list of pull requests"], answer: 0, explanation: "Rebase can make project history appear linear." },
    { prompt: "Why take care rebasing shared commits?", options: ["It rewrites commit history", "It changes file colors", "It disables branches"], answer: 0, explanation: "Rewritten shared history can disrupt collaborators." },
  ],
};

export default level;
