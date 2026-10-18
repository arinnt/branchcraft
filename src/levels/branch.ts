import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "branch",
  term: "Branch",
  definition: "A branch is a movable name for a line of development, letting work evolve independently.",
  metaphor: "A side pipe carries a recipe experiment without disturbing the main jar.",
  command: "git branch <name>",
  action: "Open a side pipe",
  instruction: "Pull the valve to split a new pipe off the main line.",
  color: "#a78bfa",
  graphKind: "branch",
  quiz: [
    { prompt: "Why create a branch?", options: ["To experiment separately", "To erase all history", "To upload a release"], answer: 0, explanation: "A branch gives work its own line without disturbing another." },
    { prompt: "A branch name points to what?", options: ["A commit", "A file extension", "A team member"], answer: 0, explanation: "A branch is a movable reference to a commit." },
    { prompt: "Which command makes a branch?", options: ["git branch <name>", "git pipe <name>", "git fork <name>"], answer: 0, explanation: "git branch creates a branch reference." },
  ],
};

export default level;
