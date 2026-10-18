import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "repository",
  term: "Repository",
  definition: "A repository stores a project's files together with their complete change history.",
  metaphor: "A workshop jar: the ingredients are files, and its label is the project.",
  command: "git init",
  action: "Start the workshop",
  instruction: "Tap the empty jar three times to stock your workshop with a project.",
  color: "#f3ba62",
  graphKind: "commit",
  quiz: [
    { prompt: "What lives inside a repository?", options: ["Only the latest file", "Project files and their history", "A list of collaborators"], answer: 1, explanation: "A repository keeps project content and its version history together." },
    { prompt: "Which command creates a repository here?", options: ["git init", "git pour", "git start"], answer: 0, explanation: "git init initializes a new local repository." },
    { prompt: "In our workshop, what does the jar represent?", options: ["A pull request", "The project's repository", "A remote server"], answer: 1, explanation: "The jar is the container for the project and its history." },
  ],
};

export default level;
