import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "clone",
  term: "Clone",
  definition: "Cloning copies a remote repository and its history onto your machine.",
  metaphor: "Fill a clean jar from the shared pantry, bringing its recipe cards along.",
  command: "git clone <url>",
  action: "Clone the jar",
  instruction: "Drag the pantry jar toward your bench to make a local copy.",
  color: "#79c6a3",
  graphKind: "remote",
  quiz: [
    { prompt: "What does cloning bring to your machine?", options: ["Just a link", "A copy of the repository and its history", "Only open pull requests"], answer: 1, explanation: "A clone includes the remote repository's files and history." },
    { prompt: "Which command makes a clone?", options: ["git copy", "git clone <url>", "git fetch --clone"], answer: 1, explanation: "git clone takes a repository URL and creates a local copy." },
    { prompt: "Is the pantry jar changed by cloning?", options: ["No, cloning makes a separate local copy", "Yes, it is emptied", "Only after a merge"], answer: 0, explanation: "Cloning copies the project; it does not alter the source repository." },
  ],
};

export default level;
