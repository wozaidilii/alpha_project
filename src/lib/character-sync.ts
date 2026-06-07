import {
  CHARACTER_STORAGE_KEY,
  CHARACTER_UPDATED_EVENT,
  deserializeCharacter,
  type CharacterConfig,
} from "~/types/character";

export function readStoredCharacter(): CharacterConfig | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CHARACTER_STORAGE_KEY);
  if (!stored) return null;
  return deserializeCharacter(stored);
}

export function notifyCharacterUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHARACTER_UPDATED_EVENT));
}
