import { useEffect, useState } from 'react';
import { ydoc } from './useYjs';
import type { TimelineNode } from '../types/timeline';

const nodesMap = ydoc.getMap<TimelineNode>('nodes');

/**
 * A reactive hook that provides an array of all TimelineNodes from the
 * Y.js document and automatically updates when nodes are added,
 * changed, or deleted.
 *
 * @returns An array of TimelineNode objects.
 */
export function useNodes(): TimelineNode[] {
  const [nodes, setNodes] = useState<TimelineNode[]>(() => Array.from(nodesMap.values()));

  useEffect(() => {
    const handleChange = () => {
      setNodes(Array.from(nodesMap.values()));
    };

    // Listen for changes to the nodes map.
    nodesMap.observe(handleChange);

    return () => {
      // Clean up the observer when the component unmounts.
      nodesMap.unobserve(handleChange);
    };
  }, []);

  return nodes;
}
