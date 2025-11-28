import { generate, count } from 'random-words';

/**
 * This service handles creating, joining, and managing room connections.
 */
export class ConnectionManager {
  /**
   * Generates a new, unique room identifier and a memorable slug.
   *
   * @returns An object containing the full UUID for the room and a 3-word slug.
   */
  static createRoom(): { roomId: string; slug: string } {
    const roomId = crypto.randomUUID();
    const slug = generate({ exactly: 3, join: '-' });
    return { roomId, slug };
  }

  /**
   * Constructs the full URL for joining a room, including the room ID.
   *
   * @param roomId The unique identifier of the room.
   * @returns The full URL to join the specified room.
   */
  static getRoomUrl(roomId: string): string {
    return `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  }
}
