import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "stash",
  term: "Stash",
  definition: "Stashing temporarily shelves uncommitted changes so you can return to them later.",
  metaphor: "Tuck an unfinished jar under the bench without sealing a permanent recipe card.",
  command: "git stash  ·  git stash pop",
  action: "Tuck it away",
  instruction: "Slide the unfinished jar under the bench, then bring it back out.",
  color: "#d58bb8",
  graphKind: "stash",
  quiz: [
    { prompt: "What is stash useful for?", options: ["Temporarily shelving uncommitted changes", "Publishing commits", "Creating a remote fork"], answer: 0, explanation: "Stash clears changes from the working tree without committing them." },
    { prompt: "Does a stash normally add a commit to your branch?", options: ["No, it stores work temporarily", "Yes, always", "Only to GitHub"], answer: 0, explanation: "Stashed work is stored separately from the normal branch history." },
    { prompt: "Which command can restore and remove the latest stash?", options: ["git stash pop", "git push pop", "git branch pop"], answer: 0, explanation: "git stash pop reapplies the stash and removes it from the stash list." },
  ],
};

export default level;
