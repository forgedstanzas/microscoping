import { TimelineNodeComponent } from './TimelineNode';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useNodes } from '../hooks/useNodes';
import { calculateLayout as linearCalculateLayout, type DimensionMap, type LayoutMap } from '../layout/LinearAdapter';
import { calculateLayout as zigZagCalculateLayout } from '../layout/ZigZagAdapter'; // Import ZigZag
import { LegacyOverlay } from './LegacyOverlay';
import './Canvas.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ViewSettings } from '../types/settings';

interface CanvasProps {
  layoutMode: 'zigzag' | 'linear';
  setLayoutMode: React.Dispatch<React.SetStateAction<'zigzag' | 'linear'>>;
  affirmedWords: string[];
  bannedWords: string[];
  layoutConstants: ViewSettings['layout']['constants']; // New prop
}

export function Canvas({ layoutMode, setLayoutMode, affirmedWords, bannedWords, layoutConstants }: CanvasProps) {
  const nodes = useNodes();
  const [layout, setLayout] = useState<LayoutMap>(new Map());
  const [dimensions, setDimensions] = useState<DimensionMap>(new Map());
  const [initialY, setInitialY] = useState(window.innerHeight / 2); // Center Y for ZigZag

  // Update initialY on window resize
  useEffect(() => {
    const handleResize = () => setInitialY(window.innerHeight / 2);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // A ref to the ResizeObserver to avoid re-creating it on every render.
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

  // The callback ref that will be attached to each node for measurement.
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      observer.current.observe(node);
    }
  }, []);

  // Recalculate layout when nodes, dimensions, or layoutMode change
  useEffect(() => {
    if (nodes.length > 0) {
      let dimensionsToUse: DimensionMap;

      // Check if we have measured dimensions for all nodes
      if (dimensions.size === nodes.length) {
        dimensionsToUse = dimensions;
      } else {
        // Fallback to default dimensions if not all nodes have been measured yet
        const defaultDims = new Map<string, { width: number; height: number }>();
        nodes.forEach(node => {
          defaultDims.set(node.id, { width: layoutConstants?.cardWidth ?? 300, height: 150 });
        });
        dimensionsToUse = defaultDims;
      }
      
      let newLayout: LayoutMap;
      if (layoutMode === 'zigzag') {
        newLayout = zigZagCalculateLayout(nodes, dimensionsToUse, layoutConstants);
      } else { // layoutMode === 'linear'
        newLayout = linearCalculateLayout(nodes, dimensionsToUse, layoutConstants);
      }
      
      setLayout(newLayout);
    }
  }, [nodes, dimensions, layoutMode, layoutConstants]); // Add layoutConstants to dependencies

  const handleCanvasClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('canvas-background')) {
      (document.activeElement as HTMLElement)?.blur();
    }
  };

  return (
    <div className="canvas-container">
      <TransformWrapper
        minScale={0.1}
        maxScale={3}
        initialScale={0.8}
        initialPositionX={200}
        initialPositionY={initialY} // Use the calculated initialY
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        panning={{ excluded: ['non-pannable-node'] }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100vw', height: '100vh' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          {/* Background div to capture clicks for blurring active elements */}
          <div className="canvas-background" onMouseDown={handleCanvasClick} />

          <LegacyOverlay nodes={nodes} layout={layout} />

          {nodes.map(node => {
            const nodeLayout = layout.get(node.id);
            if (!nodeLayout) return null; // Don't render if layout not ready

            const style = {
              transform: `translate(${nodeLayout.x}px, ${nodeLayout.y}px)`,
            };

            return (
              <div
                key={node.id}
                className='node-wrapper'
                style={style}
                ref={measureRef} // Attach measureRef
                data-node-id={node.id} // Attach ID for ResizeObserver
              >
                <TimelineNodeComponent
                  node={node}
                  bannedWords={bannedWords} // Pass banned words
                  affirmedWords={affirmedWords} // Pass affirmed words
                />
              </div>
            );
          })}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
