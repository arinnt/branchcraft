import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "pull-request",
  term: "Pull Request",
  definition: "A pull request proposes changes for discussion and review before integration.",
  metaphor: "Slide a tasting tray to the team so they can review a batch before it joins the pantry.",
  command: "GitHub: New pull request",
  action: "Submit the tasting tray",
  instruction: "Push the tray to the review table and invite a teammate to taste.",
  color: "#65b8cd",
  graphKind: "merge",
  quiz: [
    { prompt: "What is a pull request for?", options: ["Discussing and reviewing proposed changes", "Rewinding a local file", "Cloning a repository"], answer: 0, explanation: "A pull request provides a place to review and discuss changes." },
    { prompt: "Must a pull request be merged immediately?", options: ["No, it can be discussed and revised", "Yes, automatically", "Only after a tag"], answer: 0, explanation: "Reviewers can request changes or approve before merge." },
    { prompt: "A pull request is best described as…", options: ["A proposal to integrate changes", "A Git command that downloads files", "A type of branch name"], answer: 0, explanation: "It proposes a branch's changes for review and integration." },
  ],
};

export default level;
