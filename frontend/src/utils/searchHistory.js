// Per-field recent-search history, persisted in localStorage. Each field
// passes a distinct `key` (e.g. "movies", "screenings") so histories don't mix.
const PREFIX = "searchHistory:";
const MAX = 8;

export function loadHistory(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Add `term` as the most-recent entry (case-insensitive dedupe), capped at MAX.
export function pushHistory(key, term) {
  const value = term.trim();
  if (!value) return loadHistory(key);
  const rest = loadHistory(key).filter(
    (t) => t.toLowerCase() !== value.toLowerCase()
  );
  const next = [value, ...rest].slice(0, MAX);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(next));
  } catch {
    // Ignore quota / unavailable-storage errors; history is best-effort.
  }
  return next;
}

export function clearHistory(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore — nothing to clean up if storage is unavailable.
  }
  return [];
}
