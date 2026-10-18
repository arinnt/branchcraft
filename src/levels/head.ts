import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "head",
  term: "HEAD",
  definition: "HEAD names the current checkout, usually the branch or commit you are working from.",
  metaphor: "A pointer clipped to the recipe card your hands are following right now.",
  command: "git rev-parse --short HEAD",
  action: "Move the pointer",
  instruction: "Move the bright pointer to the recipe card you want to work on.",
  color: "#f28f70",
  graphKind: "tag",
  quiz: [
    { prompt: "What does HEAD usually identify?", options: ["Your current checkout", "The newest remote release only", "A list of ignored files"], answer: 0, explanation: "HEAD points to the current commit, commonly through the current branch." },
    { prompt: "When attached to a branch, what does HEAD follow?", options: ["That branch's current commit", "Every remote at once", "The .gitignore patterns"], answer: 0, explanation: "Normally HEAD is a symbolic reference to the checked-out branch." },
    { prompt: "What is detached HEAD?", options: ["HEAD points directly to a commit", "A remote is disconnected", "A merge is complete"], answer: 0, explanation: "Detached HEAD means the checkout is on a commit rather than a branch." },
  ],
};

export default level;
