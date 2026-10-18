import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "checkout",
  term: "Checkout / Switch",
  definition: "Switching moves your working context to another branch or commit.",
  metaphor: "Turn the tap selector to pour from a different recipe line.",
  command: "git switch <branch>",
  action: "Turn the selector",
  instruction: "Slide the handle between the main and experiment pipes.",
  color: "#62b6cb",
  graphKind: "branch",
  quiz: [
    { prompt: "What changes when you switch branches?", options: ["Your working context", "The repository owner", "The commit's hash"], answer: 0, explanation: "Switching updates the working tree to the selected branch." },
    { prompt: "Which modern command switches branches?", options: ["git switch <branch>", "git move <branch>", "git pull <branch>"], answer: 0, explanation: "git switch is the dedicated branch-switching command." },
    { prompt: "Does switching itself merge your branches?", options: ["No", "Yes, always", "Only on GitHub"], answer: 0, explanation: "Switching changes context; it does not combine histories." },
  ],
};

export default level;
