import type { LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: "fetch-pull",
  term: "Fetch vs Pull",
  definition: "Fetch downloads remote updates without integrating them; pull fetches and integrates them.",
  metaphor: "Fetch brings a jar to your bench; pull brings it in and pours it into your batch.",
  command: "git fetch  ·  git pull",
  action: "Fetch, then pull",
  instruction: "First bring down the remote jar; then pour its contents into your work.",
  color: "#8aa6ff",
  graphKind: "remote",
  quiz: [
    { prompt: "What does git fetch do?", options: ["Downloads updates without integrating them", "Deletes the remote", "Always creates a release"], answer: 0, explanation: "Fetch updates remote-tracking references but leaves your current branch unchanged." },
    { prompt: "What does git pull usually do?", options: ["Fetches, then integrates updates", "Only shows a graph", "Uploads local changes"], answer: 0, explanation: "Pull combines fetching with an integration step." },
    { prompt: "Which is safer for inspecting updates first?", options: ["Fetch", "Reset", "Push"], answer: 0, explanation: "Fetch lets you inspect incoming commits before integrating them." },
  ],
};

export default level;
