import type { LayoutMap } from '../layout/LinearAdapter';
import type { TimelineNode } from '../types/timeline';
import { useMemo } from 'react';
import stringHash from '@sindresorhus/string-hash';

interface LegacyOverlayProps {
  nodes: TimelineNode[];
  layout: LayoutMap;
}

interface ThreadEdge {
  id: string;
  tag: string;
  d: string; // SVG path command
  strokeWidth: number;
}

const THREAD_CONFIG = {
  baseThickness: 2,
  factor: 3,
  maxThickness: 12,
  slotSize: 15, // Vertical pixels per slot on the node's edge
};

/**
 * Generates a color from a string. Used to give each tag a consistent color.
 */
function tagToColor(tag: string): string {
  const hash = stringHash(tag);
  // Simple hashing to HSL values for pleasant, non-clashing colors
  const hue = hash % 360;
  const saturation = 70;
  const lightness = 50;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function LegacyOverlay({ nodes, layout }: LegacyOverlayProps) {
  const edges = useMemo(() => {
    if (layout.size === 0 || nodes.length === 0) {
      return [];
    }

    const calculatedEdges: ThreadEdge[] = [];
    const tagToNodes = new Map<string, TimelineNode[]>();

    // 1. Group nodes by tag
    for (const node of nodes) {
      if (node.tags) {
        for (const tag of node.tags) {
          if (!tagToNodes.has(tag)) {
            tagToNodes.set(tag, []);
          }
          tagToNodes.get(tag)!.push(node);
        }
      }
    }

    // 2. Create edges for each tag
    for (const [tag, taggedNodes] of tagToNodes.entries()) {
      if (taggedNodes.length < 2) continue;

      // Sort nodes by their horizontal layout position to create the sequence
      const sortedNodes = taggedNodes.sort((a, b) => (layout.get(a.id)?.x ?? 0) - (layout.get(b.id)?.x ?? 0));
      const tagFrequency = sortedNodes.length;

      for (let i = 0; i < sortedNodes.length - 1; i++) {
        const sourceNode = sortedNodes[i];
        const targetNode = sortedNodes[i + 1];

        const sourceLayout = layout.get(sourceNode.id);
        const targetLayout = layout.get(targetNode.id);

        if (!sourceLayout || !targetLayout) continue;

        // --- Vertical Slot Calculation ---
        const sourceTags = (sourceNode.tags || []).sort();
        const targetTags = (targetNode.tags || []).sort();
        const tagIndexOnSource = sourceTags.indexOf(tag);
        const tagIndexOnTarget = targetTags.indexOf(tag);

        const sourceSlotCount = sourceTags.length;
        const targetSlotCount = targetTags.length;

        const sourceCenterY = sourceLayout.y + sourceLayout.height / 2;
        const sourceSlotY = sourceCenterY - (sourceSlotCount * THREAD_CONFIG.slotSize) / 2 + (tagIndexOnSource * THREAD_CONFIG.slotSize) + THREAD_CONFIG.slotSize / 2;
        
        const targetCenterY = targetLayout.y + targetLayout.height / 2;
        const targetSlotY = targetCenterY - (targetSlotCount * THREAD_CONFIG.slotSize) / 2 + (tagIndexOnTarget * THREAD_CONFIG.slotSize) + THREAD_CONFIG.slotSize / 2;

        // --- Path Calculation ---
        const p1 = { x: sourceLayout.x + sourceLayout.width, y: sourceSlotY };
        const p2 = { x: targetLayout.x, y: targetSlotY };
        
        const controlPointDistance = Math.abs(p2.x - p1.x) * 0.5;
        const c1 = { x: p1.x + controlPointDistance, y: p1.y };
        const c2 = { x: p2.x - controlPointDistance, y: p2.y };
        
        const d = `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;

        // --- Thickness Calculation ---
        const strokeWidth = Math.min(
          THREAD_CONFIG.baseThickness + (tagFrequency - 1) * THREAD_CONFIG.factor,
          THREAD_CONFIG.maxThickness
        );

        calculatedEdges.push({
          id: `${sourceNode.id}-${targetNode.id}-${tag}`,
          tag,
          d,
          strokeWidth,
        });
      }
    }

    return calculatedEdges;
  }, [nodes, layout]);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 5, // Explicitly set z-index
      }}
    >
      <g>
        {edges.map(edge => (
          <path
            key={edge.id}
            d={edge.d}
            fill="none"
            stroke={tagToColor(edge.tag)}
            strokeWidth={edge.strokeWidth}
            strokeLinecap="round"
            opacity={0.8}
          />
        ))}
      </g>
    </svg>
  );
}
