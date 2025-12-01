import { useEffect, useState } from 'react';
import type * as Y from 'yjs';
import type { TimelineNode } from '../types/timeline';

/**
 * A reactive hook that provides an array of all TimelineNodes from a given
 * Y.js document and automatically updates when nodes are added,
 * changed, or deleted.
 *
 * @param ydoc The Y.js document to observe.
 * @returns An array of TimelineNode objects.
 */
export function useNodes(ydoc: Y.Doc): TimelineNode[] {
  const nodesMap = ydoc.getMap<TimelineNode>('nodes');
  const [nodes, setNodes] = useState<TimelineNode[]>(() => Array.from(nodesMap.values()));

  useEffect(() => {
    const handleChange = () => {
      console.log('[useNodes.handleChange] Nodes observer fired. New node count:', nodesMap.size);
      setNodes(Array.from(nodesMap.values()));
    };

    nodesMap.observe(handleChange);
    handleChange(); // Initial sync

    return () => {
      nodesMap.unobserve(handleChange);
    };
  }, [nodesMap]); // Re-subscribe if the map instance changes

  return nodes;
}

