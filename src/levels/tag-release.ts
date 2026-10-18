import { newGraph } from "../graph.ts";
import { follow, record } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = record(newGraph(), "VERSION", "1.0.0", "Prepare version 1.0.0");
const solution: SolutionStep[] = [{ action: "tag", target: "c1", name: "v1.0.0" }];

const level: LevelDefinition = {
  id: "tag-release",
  term: "Tag and release",
  definition: "A Git tag names a specific commit. A GitHub release is separate hosted metadata and downloadable assets associated with a tag.",
  command: "git tag v1.0.0 c1",
  instruction: "Mark the version preparation commit c1 with the local tag v1.0.0. Do not add another commit.",
  hint: "Select c1 and choose Tag with the name v1.0.0. This creates a local tag, not a published GitHub release.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "Which commit does your v1.0.0 tag identify?", options: ["The initial root", "The version preparation commit c1", "A new release commit"], answer: 1, explanation: "The tag names the existing commit containing VERSION set to 1.0.0." },
    { prompt: "Did creating this tag move HEAD or main?", options: ["No, it added a named reference to the existing commit", "Yes, HEAD detached", "Yes, main moved backward"], answer: 0, explanation: "Creating a tag does not check it out or advance the branch." },
    { prompt: "What is still needed for a GitHub release based on your local tag?", options: ["Run git release locally", "Delete the tag's commit", "Publish the tag and create release metadata on GitHub"], answer: 2, explanation: "A local Git tag alone neither uploads itself nor creates GitHub release notes or assets." },
  ],
};

export default level;
