import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "merge",
  term: "Merge",
  definition: "Merging combines the changes from one branch into another.",
  metaphor: "Join two pipes so both batches flow into one shared jar.",
  command: "git merge <branch>",
  action: "Join the pipes",
  instruction: "Pull both ends of the tubing toward the center to combine the streams.",
  color: "#e9a23b",
  graphKind: "merge",
  quiz: [
    { prompt: "What does merge do?", options: ["Combines branch changes", "Copies a remote repository", "Hides a commit"], answer: 0, explanation: "Merge joins histories so changes from one branch are included in another." },
    { prompt: "What can a merge commit have?", options: ["Two parent commits", "No parents ever", "A remote URL as parent"], answer: 0, explanation: "A merge commit joins the tips of both histories." },
    { prompt: "Which command merges a branch into your current one?", options: ["git merge <branch>", "git join <branch>", "git commit <branch>"], answer: 0, explanation: "Run git merge while on the branch you want to merge into." },
  ],
};

export default level;
