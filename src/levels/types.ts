import { matchesGoal } from "../graph.ts";
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
  validateGoal?: (graph: Graph) => boolean;
  solution: SolutionStep[];
  quiz: [QuizQuestion, QuizQuestion, QuizQuestion];
}

export function isLevelComplete(graph: Graph, level: LevelDefinition): boolean {
  return matchesGoal(graph, level.goal) && (level.validateGoal?.(graph) ?? true);
}
