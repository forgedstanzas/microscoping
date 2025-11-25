import React, { useMemo, useCallback, useState } from 'react';
import styles from './PeriodTrackOverlay.module.css';
import { NodeService } from '../services/NodeService';
import type { TimelineNode } from '../types/timeline';
import type { LayoutMap } from '../layout/LinearAdapter'; // Re-use type
import type { ViewSettings } from '../types/settings';

interface PeriodTrackOverlayProps {
  nodes: TimelineNode[];
  layout: LayoutMap;
  layoutConstants: ViewSettings['layout']['constants'];
}

interface PeriodSegment {
  id: string;
  prevPeriodId: string;
  nextPeriodId: string;
  line: { x1: number; y1: number; x2: number; y2: number };
  button: { x: number; y: number };
}

export const PeriodTrackOverlay: React.FC<PeriodTrackOverlayProps> = ({ nodes, layout, layoutConstants }) => {
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const periodSegments = useMemo(() => {
    const periodNodes = nodes
      .filter(node => node.type === 'period' && layout.has(node.id))
      .sort((a, b) => a.order - b.order);
    const segments: PeriodSegment[] = [];
    const GAP_HORIZONTAL = layoutConstants?.gapSize ?? 50;
    const PERIOD_MARGIN = 34;
    const totalGap = GAP_HORIZONTAL + PERIOD_MARGIN;
    for (let i = 0; i < periodNodes.length - 1; i++) {
      const prevPeriod = periodNodes[i];
      const nextPeriod = periodNodes[i + 1];
      const prevLayout = layout.get(prevPeriod.id)!;
      const nextLayout = layout.get(nextPeriod.id)!;
      const cx1 = prevLayout.x + prevLayout.width / 2;
      const cy1 = prevLayout.y + prevLayout.height / 2;
      const cx2 = nextLayout.x + nextLayout.width / 2;
      const cy2 = nextLayout.y + nextLayout.height / 2;
      // --- User's Specified Button Position Logic ---
      const rightEdgeOfPrevNode = prevLayout.x + prevLayout.width;
      const buttonX = rightEdgeOfPrevNode + totalGap / 2;
      // 2. Use linear interpolation to find the corresponding vertical position on the track line
      const t = (buttonX - cx1) / (cx2 - cx1);
      const buttonY = cy1 + t * (cy2 - cy1);
      console.log('--- Button Position Debug ---');
      console.log(`Prev Node Right Edge: ${rightEdgeOfPrevNode}`);
      console.log(`Next Node Left Edge: ${nextLayout.x}`);
      console.log(`  Calculated Total Gap: ${totalGap} (gapSize: ${GAP_HORIZONTAL} + margin: ${PERIOD_MARGIN})`);
      console.log(`  Midpoint of Gap: ${totalGap / 2}`);
      console.log(`  Button X Coordinate (center): ${buttonX}`);
      console.log('-----------------------------');
      segments.push({
        id: `${prevPeriod.id}-${nextPeriod.id}`,
        prevPeriodId: prevPeriod.id,
        nextPeriodId: nextPeriod.id,
        line: { x1: cx1, y1: cy1, x2: cx2, y2: cy2 },
        button: { x: buttonX, y: buttonY },
      });
    }
    return segments;
  }, [nodes, layout, layoutConstants]);
  const handleInsertPeriod = useCallback((prevPeriodId: string, nextPeriodId: string) => {
    NodeService.insertPeriodBetween(prevPeriodId, nextPeriodId);
  }, []);
  return (
    <svg className={styles.periodTrackSvg} onMouseLeave={() => setHoveredTrackId(null)}>
      {periodSegments.map(segment => {
        const isHovered = hoveredTrackId === segment.id;
        return (
          <g
            key={segment.id}
            className={styles.trackSegment}
            onMouseEnter={() => setHoveredTrackId(segment.id)}
            // onMouseLeave is now on the parent SVG
          >
            {/* The visible track line */}
            <line
              x1={segment.line.x1} y1={segment.line.y1}
              x2={segment.line.x2} y2={segment.line.y2}
              className={styles.trackLine}
              style={{ opacity: isHovered ? 1 : 0.5 }}
            />
            {/* An invisible, thicker line for easier hover detection */}
            <line
              x1={segment.line.x1} y1={segment.line.y1}
              x2={segment.line.x2} y2={segment.line.y2}
              className={styles.hoverTarget}
            />
            {/* Layer 2 is now Layer 1: The button is inside the SVG */}
            <foreignObject
              x={segment.button.x - 15} // Position top-left corner
              y={segment.button.y - 15}
              width="30"
              height="30"
              style={{
                opacity: isHovered ? 1 : 0,
                pointerEvents: isHovered ? 'all' : 'none',
                overflow: 'visible', // Allows hover scale effect to not be clipped
              }}
            >
              <button
                className={styles.addButton}
                onClick={() => handleInsertPeriod(segment.prevPeriodId, segment.nextPeriodId)}
                title={`Add period`}
              >
                +
              </button>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
};
