// microscope-web/src/services/RecentSessionsManager.ts

import { get, set } from 'idb-keyval';

const RECENTS_KEY = 'recent-sessions';

export interface RecentSession {
  id: string;
  name: string;
  lastAccessed: number;
}

/**
 * Adds a session to the list of recent sessions.
 * Keeps the list sorted by last accessed time and limits it to 10 entries.
 */
export async function addRecentSession(
  sessionId: string,
  sessionName: string,
): Promise<void> {
  const recents = (await get<RecentSession[]>(RECENTS_KEY)) || [];

  const now = Date.now();
  const updatedRecents = [
    { id: sessionId, name: sessionName, lastAccessed: now },
    ...recents.filter((s) => s.id !== sessionId),
  ].slice(0, 10); // Keep only the 10 most recent

  await set(RECENTS_KEY, updatedRecents);
}

/**
 * Retrieves the list of recent sessions, sorted by last accessed time.
 */
export async function getRecentSessions(): Promise<RecentSession[]> {
  const recents = (await get<RecentSession[]>(RECENTS_KEY)) || [];
  return recents.sort((a, b) => b.lastAccessed - a.lastAccessed);
}

/**
 * Removes a session from the list of recent sessions.
 * @param sessionId The ID of the session to remove.
 */
export async function removeRecentSession(sessionId: string): Promise<void> {
  const recents = (await get<RecentSession[]>(RECENTS_KEY)) || [];
  const updatedRecents = recents.filter((s) => s.id !== sessionId);
  await set(RECENTS_KEY, updatedRecents);
}
