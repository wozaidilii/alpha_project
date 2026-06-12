export interface PlayerAvatar {
  icon: string;
  color: string;
}

export interface PlayerProfile {
  id: string;
  email: string | null;
  name: string;
  avatar: PlayerAvatar;
  profileCompleted: boolean;
  soloHighScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerSession {
  token: string;
  user: PlayerProfile;
}

export interface FunfactQuestion {
  id: string;
  sourceId: string;
  format: "multiple_choice" | "true_false";
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

export interface QuizResult {
  questionId: string;
  title: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  score: number;
}

export interface AppGlobalData {
  token: string;
  user: PlayerProfile | null;
  questions: FunfactQuestion[];
  lastResults: QuizResult[];
  totalScore: number;
  bestScore: number;
}

export interface AppInstance {
  globalData: AppGlobalData;
}
