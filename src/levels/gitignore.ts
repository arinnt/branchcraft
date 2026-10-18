import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "gitignore",
  term: ".gitignore",
  definition: "A .gitignore file tells Git which untracked files or paths to leave out.",
  metaphor: "Set a sieve over the jar so scraps like spills never enter the recipe archive.",
  command: "echo '*.log' >> .gitignore",
  action: "Set the sieve",
  instruction: "Drag scraps behind the sieve; keep project ingredients in the jar.",
  color: "#84c17c",
  graphKind: "commit",
  quiz: [
    { prompt: "What does .gitignore list?", options: ["Untracked paths Git should ignore", "Commits to publish", "Branches to merge"], answer: 0, explanation: ".gitignore patterns keep matching untracked files out of status." },
    { prompt: "Can adding a path to .gitignore untrack a file already committed?", options: ["No, it is already tracked", "Yes, it deletes the history", "Only after a push"], answer: 0, explanation: "Ignoring does not stop tracking a file already in the index." },
    { prompt: "Where are ignore patterns kept?", options: ["In a .gitignore file", "In the commit hash", "In HEAD only"], answer: 0, explanation: "Patterns are written in .gitignore files." },
  ],
};

export default level;
