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
  /** 答题后展示的冷知识，1–3 条 */
  funfact?: string[];
}
