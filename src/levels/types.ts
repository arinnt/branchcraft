import type { Action, Graph } from "../graph.ts";

export interface QuizQuestion {
  prompt: string;
  options: [string, string, string];
  answer: number;
  explanation: string;
}

export interface SolutionStep {
  action: Action;
  target?: string;
  name?: string;
}

export interface LevelDefinition {
  id: string;
  term: string;
  definition: string;
  command: string;
  instruction: string;
  hint: string;
  start: Graph;
  goal: Graph;
  solution: SolutionStep[];
  quiz: [QuizQuestion, QuizQuestion, QuizQuestion];
}
