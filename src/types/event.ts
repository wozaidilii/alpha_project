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
}
