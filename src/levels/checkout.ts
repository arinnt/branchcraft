import { newGraph } from "../graph.ts";
import { follow } from "./scenarios.ts";
import type { LevelDefinition, SolutionStep } from "./types.ts";

const start = follow(newGraph(), [{ action: "branch", target: "c0", name: "feature" }]);
const solution: SolutionStep[] = [{ action: "checkout", target: "feature" }];

const level: LevelDefinition = {
  id: "checkout",
  term: "Checkout",
  definition: "Checking out a branch attaches HEAD to it and updates the working files to its commit snapshot.",
  command: "git checkout feature",
  instruction: "Switch from main to the existing feature branch without adding any commits.",
  hint: "Choose Checkout and target the feature branch, not its commit ID.",
  start,
  goal: follow(start, solution),
  solution,
  quiz: [
    { prompt: "What does HEAD follow after your checkout?", options: ["The feature branch", "The origin remote", "A release tag"], answer: 0, explanation: "Checking out feature attaches HEAD to that branch." },
    { prompt: "Did switching branches create a commit in your graph?", options: ["Yes, a merge commit", "No", "Yes, a new root"], answer: 1, explanation: "Checkout changes the active reference and working snapshot, not history." },
    { prompt: "Why did main stay at the root after your switch?", options: ["Checkout deleted its history", "Branches cannot move", "Checkout does not advance other branches"], answer: 2, explanation: "Neither branch moved; only HEAD changed from main to feature." },
  ],
};

export default level;
