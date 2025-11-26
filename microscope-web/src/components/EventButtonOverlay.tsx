import React, { useMemo, useCallback, useState } from 'react';
import styles from './EventButtonOverlay.module.css'; // New CSS module
import { NodeService } from '../services/NodeService';
import type { TimelineNode } from '../types/timeline';
import type { LayoutMap } from '../layout/LinearAdapter'; // Re-use type
import type { ViewSettings } from '../types/settings';

interface EventButtonOverlayProps {
  nodes: TimelineNode[];
  layout: LayoutMap;
  layoutConstants: ViewSettings['layout']['constants'];
  layoutMode: 'zigzag' | 'linear';
  nodeBorderWidth: number; // New prop
}

interface EventButtonPlacement {
  id: string; // Period ID
  button: { x: number; y: number };
  parentId: string; // The period this button belongs to
  direction: 'above' | 'below';
}

export const EventButtonOverlay: React.FC<EventButtonOverlayProps> = ({ nodes, layout, layoutConstants, layoutMode, nodeBorderWidth }) => {
  const [hoveredPeriodId, setHoveredPeriodId] = useState<string | null>(null);

  const eventButtonPlacements = useMemo(() => {
    const periodNodes = nodes
      .filter(node => node.type === 'period' && layout.has(node.id))
      .sort((a, b) => a.order - b.order);

    const placements: EventButtonPlacement[] = [];

    periodNodes.forEach(period => {
      const periodLayout = layout.get(period.id)!;

      // Determine the default layout direction based on the overall layout mode.
      const isZigZag = layoutMode === 'zigzag';
      const eventLayoutLightDefault = isZigZag ? 'above' : 'below';
      const eventLayoutDarkDefault = 'below';

      // Use the override from layoutConstants if it exists, otherwise use the calculated default.
      const direction =
        period.tone === 'light'
          ? layoutConstants?.eventLayoutLightPeriod ?? eventLayoutLightDefault
          : layoutConstants?.eventLayoutDarkPeriod ?? eventLayoutDarkDefault;

      let buttonX = periodLayout.x + periodLayout.width / 2;
      let buttonY;

      if (direction === 'above') {
        buttonY = periodLayout.y; // Center of button on top edge
      } else { // 'below'
        buttonY = periodLayout.y + periodLayout.height; // Center of button on bottom edge
      }

      placements.push({
        id: period.id,
        button: { x: buttonX, y: buttonY },
        parentId: period.id,
        direction, // Add direction to the placement object
      });
    });
    return placements;
  }, [nodes, layout, layoutConstants, layoutMode]);

  const handleAddEvent = useCallback((parentId: string) => {
    NodeService.addEventToPeriod(parentId);
  }, []);

  return (
    <svg className={styles.eventButtonSvg} onMouseLeave={() => setHoveredPeriodId(null)}>
      {eventButtonPlacements.map(placement => {
        const isHovered = hoveredPeriodId === placement.id;
        const periodLayout = layout.get(placement.parentId)!;
        const hoverStripHeight = nodeBorderWidth; // Use prop instead of hardcoded value

        return (
          <g
            key={placement.id}
            className={styles.eventButtonSegment}
            onMouseEnter={() => setHoveredPeriodId(placement.id)}
          >
            {/* An invisible hover target as a strip on the top or bottom edge */}
            <rect
                x={periodLayout.x}
                y={placement.direction === 'above' ? periodLayout.y : periodLayout.y + periodLayout.height - hoverStripHeight}
                width={periodLayout.width}
                height={hoverStripHeight}
                fill="transparent"
                pointerEvents="all" // Make the rect catch mouse events
            />
            {/* An invisible hover target covering the button's area */}
            <rect
                x={placement.button.x - 15} // Button's top-left X
                y={placement.button.y - 15} // Button's top-left Y
                width="30" // Button's width
                height="30" // Button's height
                fill="transparent"
                pointerEvents="all" // Make the rect catch mouse events
            />
            <foreignObject
              x={placement.button.x - 15} // Position top-left corner
              y={placement.button.y - 15}
              width="30"
              height="30"
              style={{
                opacity: isHovered ? 1 : 0,
                pointerEvents: isHovered ? 'all' : 'none',
                overflow: 'visible',
              }}
            >
              <button
                className={styles.addButton}
                onClick={() => handleAddEvent(placement.parentId)}
                title={`Add event to ${placement.id}`}
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
