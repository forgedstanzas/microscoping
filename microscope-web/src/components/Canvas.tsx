import { TimelineNodeComponent } from './TimelineNode';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useNodes } from '../hooks/useNodes';
import { calculateLayout, type DimensionMap, type LayoutMap } from '../layout/LinearAdapter';
import { LegacyOverlay } from './LegacyOverlay';
import './Canvas.css';
import { useState, useEffect, useCallback, useRef } from 'react';

export function Canvas() {
  const nodes = useNodes();
  const [layout, setLayout] = useState<LayoutMap>(new Map());
  const [dimensions, setDimensions] = useState<DimensionMap>(new Map()); // Re-introduce dimensions state

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
  }, []); // Empty dependency array means this function is stable and won't cause re-renders

  // Recalculate layout when nodes or dimensions change (Step 3)
  useEffect(() => {
    if (nodes.length > 0) {
      let dimensionsToUse: DimensionMap;
      let logMessage: string;

      // Check if we have measured dimensions for all nodes
      if (dimensions.size === nodes.length) {
        dimensionsToUse = dimensions;
        logMessage = '[DEBUG] Calculating layout with REAL dimensions.';
      } else {
        // Fallback to default dimensions if not all nodes have been measured yet
        logMessage = '[DEBUG] Calculating layout with DEFAULT dimensions (waiting for all measurements).';
        const defaultDims = new Map<string, { width: number; height: number }>();
        nodes.forEach(node => {
          defaultDims.set(node.id, { width: 300, height: 150 });
        });
        dimensionsToUse = defaultDims;
      }
      
      const newLayout = calculateLayout(nodes, dimensionsToUse);
      setLayout(newLayout);
    }
  }, [nodes, dimensions]); // Re-run when nodes or dimensions state changes

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
        initialPositionY={100}
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
                <TimelineNodeComponent node={node} />
              </div>
            );
          })}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
