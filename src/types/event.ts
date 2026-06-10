export interface HistoricalEvent {
  id: string;
  title: string;
  description: string;
  year: number; // negative = BCE
  lat: number;
  lng: number;
  location: string;
  category: "world" | "china";
  wikipediaTitle?: string;
  imageUrl?: string;
  /** 答题时可见的模糊线索 */
  hint?: string;
  /** 题目难度 1–5 */
  difficulty?: number;
  /** 答题后展示的冷知识，1–3 条 */
  funfact?: string[];
}
