export interface QuizQuestion {
  prompt: string;
  options: [string, string, string];
  answer: number;
  explanation: string;
}

export interface LevelDefinition {
  id: string;
  term: string;
  definition: string;
  metaphor: string;
  command: string;
  action: string;
  instruction: string;
  color: string;
  graphKind: "commit" | "branch" | "merge" | "remote" | "reset" | "tag";
  quiz: [QuizQuestion, QuizQuestion, QuizQuestion];
}
