// src/hooks/useEntitlements.ts
import { useMemo } from 'react';
import { useYjsContext } from '../context/YjsContext';
import { useMeta } from './useMeta';

/**
 * A centralized hook for managing user permissions and entitlements.
 * This hook is the single source of truth for what a user is allowed to do.
 */
export const useEntitlements = () => {
  const { myPeerId } = useYjsContext();
  const { isStrictMode, activePlayerId, hostId } = useMeta();

  const entitlements = useMemo(() => {
    // Base Entitlements
    const isHost = myPeerId !== null && myPeerId === hostId;
    const isMyTurn = myPeerId !== null && myPeerId === activePlayerId;

    // Granular Editing Entitlements
    // Rule: Only the host can edit session metadata.
    const canEditMeta = isHost;

    // Rule: Anyone can edit nodes if strict mode is off.
    // If strict mode is on, only the player whose turn it is can edit.
    // The host no longer has a special override for nodes.
    const canEditNodes = !isStrictMode || isMyTurn;

    return {
      isHost,
      isMyTurn,
      canEditMeta,
      canEditNodes,
    };
  }, [myPeerId, hostId, activePlayerId, isStrictMode]);

  return entitlements;
};
