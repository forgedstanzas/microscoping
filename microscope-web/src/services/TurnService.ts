// src/services/TurnService.ts

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { META_KEYS } from '../types/meta';

/**
 * Manages turn-based interactions in the collaborative session.
 * This service handles setting and passing the "active player" turn.
 */
export class TurnService {
  private ydoc: Y.Doc;
  private awareness: Awareness;
  private meta: Y.Map<any>;
  private _peerId: number; // Stored as a private property

  constructor(ydoc: Y.Doc, awareness: Awareness, peerId: number) {
    this.ydoc = ydoc;
    this.awareness = awareness;
    this.meta = ydoc.getMap('meta');
    this._peerId = peerId;
  }

  /**
   * Returns the ID of the currently active player (the one with the turn).
   */
  public get activePlayerId(): number | null {
    return this.meta.get(META_KEYS.ACTIVE_PLAYER_ID) as number | null;
  }

  /**
   * Sets the initial active player if one is not already set.
   * This is typically called by the host or the first client to connect.
   */
  public initializeTurn(): void {
    if (this.activePlayerId === undefined || this.activePlayerId === null) {
      this.meta.set(META_KEYS.ACTIVE_PLAYER_ID, this._peerId);
      console.log(`[TurnService] Initial active player set to: ${this._peerId}`);
    }
  }

  /**
   * Passes the turn to a specified peer ID.
   * Only the current active player can pass the turn.
   * @param newActivePlayerId The peer ID of the player to pass the turn to.
   */
  public passTurn(newActivePlayerId: number): boolean {
    if (this.activePlayerId !== this._peerId) {
      console.warn(`[TurnService] Cannot pass turn: Not the active player.`);
      return false;
    }

    if (newActivePlayerId === this._peerId) {
      console.log(`[TurnService] Turn already with current player, no change.`);
      return true; // Already with this player, consider it a success
    }

    // Check if the newActivePlayerId is a currently connected peer
    const connectedPeers = Array.from(this.awareness.getStates().keys());
    if (!connectedPeers.includes(newActivePlayerId)) {
      console.error(`[TurnService] Cannot pass turn: New active player ID ${newActivePlayerId} is not a connected peer.`);
      return false;
    }

    this.ydoc.transact(() => {
      this.meta.set(META_KEYS.ACTIVE_PLAYER_ID, newActivePlayerId);
      console.log(`[TurnService] Turn passed from ${this._peerId} to ${newActivePlayerId}`);
    });
    return true;
  }

  /**
   * Determines the next player in the turn order.
   * The order is determined by sorting peer IDs numerically.
   * @returns The peer ID of the next player in the sequence. Returns null if no players are available.
   */
  public getNextPlayerInTurn(): number | null {
    const connectedPeerIds = Array.from(this.awareness.getStates().keys()).sort((a, b) => a - b);
    
    if (connectedPeerIds.length === 0) {
      return null;
    }

    if (connectedPeerIds.length === 1) {
      return connectedPeerIds[0];
    }

    const currentPlayerId = this.activePlayerId;
    if (currentPlayerId === null) {
      // If there's no active player, default to the first player in the sorted list.
      return connectedPeerIds[0];
    }

    const currentIndex = connectedPeerIds.indexOf(currentPlayerId);
    if (currentIndex === -1) {
      // If the active player is not in the list (e.g., they disconnected), default to the first player.
      return connectedPeerIds[0];
    }

    const nextIndex = (currentIndex + 1) % connectedPeerIds.length;
    return connectedPeerIds[nextIndex];
  }
}
