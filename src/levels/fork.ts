import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "fork",
  term: "Fork",
  definition: "A fork is your own server-side copy of another repository, commonly used for contributions.",
  metaphor: "Make your own pantry from a shared recipe shelf; the original stays untouched.",
  command: "GitHub: Fork repository",
  action: "Fork the pantry",
  instruction: "Drag the shared jar into your own pantry shelf.",
  color: "#efb366",
  graphKind: "remote",
  quiz: [
    { prompt: "Where is a GitHub fork created?", options: ["As a server-side copy", "Only as a local branch", "Inside a commit message"], answer: 0, explanation: "A fork is a copy hosted under your account or organization." },
    { prompt: "Does forking change the original repository?", options: ["No, it creates a separate copy", "Yes, it renames it", "It erases its history"], answer: 0, explanation: "The original remains separate from your fork." },
    { prompt: "What often follows a fork contribution?", options: ["A pull request", "A git init on the original", "A forced reset"], answer: 0, explanation: "Contributors commonly propose fork changes with a pull request." },
  ],
};

export default level;
