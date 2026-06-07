/** 冷知识子题型：四选一 / 对错二选一 */
export type FunfactFormat = "multiple_choice" | "true_false";

export interface FunfactQuestionRecord {
  id: string;
  sourceId: string;
  format: FunfactFormat;
  title: string;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  category: string;
  description?: string;
  hint?: string;
  funfact?: string[];
  difficulty?: number;
  imageUrl?: string;
  fallbackImageUrl?: string;
}
