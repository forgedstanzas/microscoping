import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimelineNode } from '../types/timeline';
import { calculateLayout as linearCalculateLayout, type DimensionMap, type LayoutMap } from '../layout/LinearAdapter';
import { calculateLayout as zigZagCalculateLayout } from '../layout/ZigZagAdapter';
import { useUIState } from '../context/UIStateContext';
import { useViewSettings } from './useViewSettings';
import { useYjsContext } from '../context/YjsContext';

/**
 * A hook that encapsulates the complex logic of measuring node dimensions
 * and calculating their positions on the canvas.
 * @param nodes The array of all timeline nodes.
 * @returns An object containing the calculated `layout` map and a `measureRef`
 *          callback to attach to the node elements for measurement.
 */
export function useNodeLayout(nodes: TimelineNode[]) {
  const { ydoc } = useYjsContext();
  const { layoutMode } = useUIState();
  const { layoutConstants } = useViewSettings(ydoc);

  const [layout, setLayout] = useState<LayoutMap>(new Map());
  const [dimensions, setDimensions] = useState<DimensionMap>(new Map());

  // The observer that listens for size changes on each node
  const observer = useRef(
    new ResizeObserver(entries => {
      setDimensions(prev => {
        const newDimensions = new Map(prev);
        let hasChanged = false;
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.nodeId;
          if (id) {
            const { width, height } = entry.contentRect;
            const existing = newDimensions.get(id);
            if (!existing || existing.width !== width || existing.height !== height) {
              newDimensions.set(id, { width, height });
              hasChanged = true;
            }
          }
        }
        return hasChanged ? newDimensions : prev;
      });
    })
  );

  // A callback ref to attach the observer to each node's DOM element
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      observer.current.observe(node);
    }
  }, []);

  // The main effect that recalculates the layout whenever dependencies change
  useEffect(() => {
    if (nodes.length > 0) {
      let dimensionsToUse: DimensionMap;

      // Check if all nodes have been measured by the ResizeObserver
      const allNodesMeasured = nodes.every(node => dimensions.has(node.id));

      if (allNodesMeasured) {
        dimensionsToUse = dimensions;
      } else {
        // If not all nodes are measured, use default dimensions to prevent layout jumps
        const defaultDims = new Map(dimensions);
        nodes.forEach(node => {
          if (!defaultDims.has(node.id)) {
            defaultDims.set(node.id, { width: layoutConstants.cardWidth, height: 150 });
          }
        });
        dimensionsToUse = defaultDims;
      }
      
      // Calculate the layout using the appropriate adapter
      const newLayout = layoutMode === 'zigzag'
        ? zigZagCalculateLayout(nodes, dimensionsToUse, layoutConstants)
        : linearCalculateLayout(nodes, dimensionsToUse, layoutConstants);
      
      setLayout(newLayout);
    }
  }, [nodes, dimensions, layoutMode, layoutConstants]);

  return { layout, measureRef };
}
