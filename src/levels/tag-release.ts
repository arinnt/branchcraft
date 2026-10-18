import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "tag-release",
  term: "Tag / Release",
  definition: "A tag marks a specific commit; a release packages a notable version for people to use.",
  metaphor: "Pin a numbered label to a finished jar, then prepare a box for the pantry.",
  command: "git tag v1.0.0  ·  GitHub: Create release",
  action: "Label the batch",
  instruction: "Pin a version label onto the finished jar and place it in a release box.",
  color: "#f2c35f",
  graphKind: "tag",
  quiz: [
    { prompt: "What does a Git tag point to?", options: ["A specific commit", "Every future commit", "A local-only file"], answer: 0, explanation: "Tags mark a chosen point in history, often a version." },
    { prompt: "How does a GitHub release relate to a tag?", options: ["It adds release information around a version", "It deletes the tag", "It is a branch switch"], answer: 0, explanation: "A release is a hosted announcement/package associated with a tag." },
    { prompt: "Which can mark version v1.0.0 locally?", options: ["git tag v1.0.0", "git release --all", "git branch --tag"], answer: 0, explanation: "git tag creates a tag reference to a commit." },
  ],
};

export default level;
