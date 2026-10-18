import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "commit",
  term: "Commit",
  definition: "A commit records a snapshot of staged changes in the repository history.",
  metaphor: "Seal a jar with a dated recipe card so this exact batch can be revisited.",
  command: 'git commit -m "Describe the change"',
  action: "Seal a snapshot",
  instruction: "Drop three ingredients into the jar, then seal your saved snapshot.",
  color: "#f28f70",
  graphKind: "commit",
  quiz: [
    { prompt: "What does a commit record?", options: ["A snapshot of staged changes", "A remote URL", "A deleted branch"], answer: 0, explanation: "A commit saves a snapshot into the project history." },
    { prompt: "What makes a commit message useful?", options: ["It explains the change", "It is as long as possible", "It is left blank"], answer: 0, explanation: "A concise message tells future readers why the snapshot exists." },
    { prompt: "Which command creates a commit?", options: ["git commit -m \"message\"", "git snapshot --remote", "git push -m"], answer: 0, explanation: "git commit records staged changes in local history." },
  ],
};

export default level;
