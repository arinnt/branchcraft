import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "merge-conflict",
  term: "Merge Conflict",
  definition: "A merge conflict happens when Git cannot automatically reconcile competing edits.",
  metaphor: "Two colors meet in one tube; choose the blend before the jar can be sealed.",
  command: "git status  →  edit files  →  git add <file>",
  action: "Resolve the blend",
  instruction: "Choose a color for the tangled stream, then press the resolve control.",
  color: "#ed729a",
  graphKind: "merge",
  quiz: [
    { prompt: "Why can a merge conflict happen?", options: ["Competing edits overlap", "A branch has a name", "The repository is cloned"], answer: 0, explanation: "Git asks for help when it cannot safely combine competing changes." },
    { prompt: "Who chooses the final resolution?", options: ["A person edits the result", "Git always guesses", "The remote deletes both edits"], answer: 0, explanation: "You resolve the file, then stage the resolution." },
    { prompt: "What is a useful first command during a conflict?", options: ["git status", "git release", "git clone"], answer: 0, explanation: "git status shows conflicted files and what needs attention." },
  ],
};

export default level;
