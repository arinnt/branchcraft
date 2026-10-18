export interface SavedGame { unlockedLevel: number; completed: number[] }
const KEY = "branchcraft-save-v2";

export function loadGame(levelCount: number): SavedGame {
  const empty: SavedGame = { unlockedLevel: 0, completed: [] };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return empty;
    const data = raw as Partial<SavedGame>;
    if (!Number.isInteger(data.unlockedLevel) || !Array.isArray(data.completed)) return empty;
    const unlockedLevel = Math.max(0, Math.min(levelCount - 1, data.unlockedLevel!));
    return { unlockedLevel, completed: [...new Set(data.completed.filter(index =>
      Number.isInteger(index) && index >= 0 && index <= unlockedLevel && index < levelCount))] };
  } catch { return empty; }
}

export function saveGame(progress: SavedGame): void {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* Play remains available when storage is blocked. */ }
}
