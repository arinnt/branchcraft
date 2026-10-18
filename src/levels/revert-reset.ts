import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "revert-reset",
  term: "Revert vs Reset",
  definition: "Revert adds a commit that undoes changes; reset moves a branch pointer and may discard work.",
  metaphor: "Revert adds a new recipe to undo a batch; reset moves the shelf back to an earlier card.",
  command: "git revert <commit>  ·  git reset <commit>",
  action: "Undo with care",
  instruction: "Choose between adding an undo jar and moving the shelf marker backward.",
  color: "#f0786b",
  graphKind: "reset",
  quiz: [
    { prompt: "Which is usually safer for shared history?", options: ["git revert", "git reset --hard", "Either rewrites shared history"], answer: 0, explanation: "Revert preserves history by adding a new commit." },
    { prompt: "What does reset move?", options: ["A branch pointer", "The remote URL", "The repository owner"], answer: 0, explanation: "Reset moves the current branch reference to another commit." },
    { prompt: "What does git revert create?", options: ["A new commit that undoes changes", "A cloned repository", "A remote branch"], answer: 0, explanation: "Revert records the inverse change as a new commit." },
  ],
};

export default level;
