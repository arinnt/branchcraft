import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "push",
  term: "Push",
  definition: "Pushing sends your local commits to a remote repository.",
  metaphor: "Pump your sealed jars up the tube to the shared pantry.",
  command: "git push",
  action: "Pump it upstream",
  instruction: "Tap the pump to send your saved jars to the remote shelf.",
  color: "#5ac8a4",
  graphKind: "remote",
  quiz: [
    { prompt: "Which direction does push move commits?", options: ["Local to remote", "Remote to local", "Between files"], answer: 0, explanation: "Push publishes local commits to a remote repository." },
    { prompt: "What does git push need to send?", options: ["Commits on a branch", "An unsaved color", "A glossary entry"], answer: 0, explanation: "Push transfers local commits to the configured remote branch." },
    { prompt: "Does push normally create a pull request?", options: ["No, it publishes commits", "Yes, for every commit", "Only when offline"], answer: 0, explanation: "A pull request is a separate collaboration step." },
  ],
};

export default level;
