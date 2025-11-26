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
  id: string; // The ID of the node (Period or Event) that the button is attached to
  button: { x: number; y: number };
  parentId: string; // The ID of the Period this button will add an event to
  direction: 'above' | 'below';
}

export const EventButtonOverlay: React.FC<EventButtonOverlayProps> = ({ nodes, layout, layoutConstants, layoutMode, nodeBorderWidth }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null); // Renamed state to hoveredNodeId

  const eventButtonPlacements = useMemo(() => {
    const placements: EventButtonPlacement[] = [];
    const allPeriodNodes = nodes.filter(node => node.type === 'period' && layout.has(node.id));

    allPeriodNodes.forEach(period => {
      // Find all events for the current period
      const childEvents = nodes
        .filter(node => node.type === 'event' && node.parentId === period.id && layout.has(node.id))
        .sort((a, b) => a.order - b.order);

      let targetNodeForButton: TimelineNode;

      if (childEvents.length === 0) {
        // If no events, the button goes on the period itself
        targetNodeForButton = period;
      } else {
        // If there are events, the button goes on the last one
        targetNodeForButton = childEvents[childEvents.length - 1];
      }

      // Now, calculate the button placement based on the targetNode
      const targetLayout = layout.get(targetNodeForButton.id);
      if (!targetLayout) return; // Should not happen if layout.has(node.id) check is sufficient

      // Determine the default layout direction based on the overall layout mode.
      const isZigZag = layoutMode === 'zigzag';
      const eventLayoutLightDefault = isZigZag ? 'above' : 'below';
      const eventLayoutDarkDefault = 'below';

      // Use the override from layoutConstants if it exists, otherwise use the calculated default.
      const direction =
        targetNodeForButton.tone === 'light'
          ? layoutConstants?.eventLayoutLightPeriod ?? eventLayoutLightDefault
          : layoutConstants?.eventLayoutDarkPeriod ?? eventLayoutDarkDefault;

      const buttonX = targetLayout.x + targetLayout.width / 2;
      let buttonY;

      if (direction === 'above') {
        buttonY = targetLayout.y; // Center of button on top edge
      } else { // 'below'
        buttonY = targetLayout.y + targetLayout.height; // Center of button on bottom edge
      }

      placements.push({
        id: targetNodeForButton.id, // The ID of the node that gets the hover effect
        button: { x: buttonX, y: buttonY },
        parentId: period.id, // The parentId for the NEW event is always the period's ID
        direction: direction,
      });
    });
    return placements;
  }, [nodes, layout, layoutConstants, layoutMode]);

  // Rename handleAddEvent to be more specific if needed, but it calls the correct service function
  const handleAddEvent = useCallback((parentId: string) => {
    NodeService.addEventToPeriod(parentId);
  }, []);

  return (
    <svg className={styles.eventButtonSvg} onMouseLeave={() => setHoveredNodeId(null)}> // Renamed state usage
      {eventButtonPlacements.map(placement => {
        const isHovered = hoveredNodeId === placement.id;
        // Get the layout for the node the button is actually attached to
        const targetNodeLayout = layout.get(placement.id);
        const hoverStripHeight = nodeBorderWidth; 

        // Safety check, don't render if we don't have layout info for the target
        if (!targetNodeLayout) return null;

        return (
          <g
            key={placement.id}
            className={styles.eventButtonSegment}
            onMouseEnter={() => setHoveredNodeId(placement.id)} // Renamed state usage
          >
            {/* An invisible hover target as a strip on the top or bottom edge */}
            <rect
                x={targetNodeLayout.x}
                y={placement.direction === 'above' ? targetNodeLayout.y : targetNodeLayout.y + targetNodeLayout.height - hoverStripHeight}
                width={targetNodeLayout.width}
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
                opacity: isHovered ? 1 : 0, // Simplified, as placement.hasNoEvents is gone
                pointerEvents: isHovered ? 'all' : 'none', // Simplified
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
