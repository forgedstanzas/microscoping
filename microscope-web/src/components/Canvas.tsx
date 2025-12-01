import { TimelineNodeComponent } from './TimelineNode';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useNodes } from '../hooks/useNodes';
import { LegacyOverlay } from './LegacyOverlay';
import { TrackOverlay, type TrackSegment } from './TrackOverlay';
import { EventButtonOverlay } from './EventButtonOverlay';
import './Canvas.css';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ViewSettings } from '../types/settings';
import type { TimelineNode } from '../types/timeline';
import clsx from 'clsx';
import { useYjsContext } from '../context/YjsContext';
import { useUIState } from '../context/UIStateContext';
import { useNodeLayout } from '../hooks/useNodeLayout';
import { useMeta } from '../hooks/useMeta';

interface CanvasProps {
  affirmedWords: string[];
  bannedWords: string[];
  layoutConstants: NonNullable<ViewSettings['layout']>['constants'];
}

export function Canvas({ affirmedWords, bannedWords, layoutConstants }: CanvasProps) {
  const { services, myPeerId, ydoc, awareness } = useYjsContext();
  const { layoutMode, selectedLegacy } = useUIState();
  const { isStrictMode, activePlayerId } = useMeta();
  const nodes = useNodes(ydoc);
  const { layout, measureRef } = useNodeLayout(nodes);

  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [initialY, setInitialY] = useState(window.innerHeight / 2);
  const [nodeBorderWidth, setNodeBorderWidth] = useState(8);

  // --- Turn Banner Logic ---
  const [activePlayerName, setActivePlayerName] = useState('');

  useEffect(() => {
    if (!awareness) return;

    const updatePlayerName = () => {
      if (activePlayerId) {
        const peerState = awareness.getStates().get(activePlayerId);
        const name = peerState?.user?.name || `Player ${String(activePlayerId).substring(0, 4)}`;
        setActivePlayerName(name);
      } else {
        setActivePlayerName('');
      }
    };

    // We observe the awareness object for any change
    awareness.on('change', updatePlayerName);
    
    // Initial call
    updatePlayerName();

    return () => {
      awareness.off('change', updatePlayerName);
    };
  }, [awareness, activePlayerId]);

  const turnBanner = useMemo(() => {
    if (!isStrictMode) return null;

    const isMyTurn = myPeerId === activePlayerId;
    if (isMyTurn) {
      return <div className="turn-banner your-turn">Your Turn!</div>;
    }

    if (activePlayerId) {
      return <div className="turn-banner waiting">Waiting for {activePlayerName}...</div>;
    }

    return <div className="turn-banner waiting">Waiting for host to select a Lens...</div>;
  }, [isStrictMode, activePlayerId, myPeerId, activePlayerName]);
  // --- End Turn Banner Logic ---

  useEffect(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--node-border-width');
    if (value) {
      setNodeBorderWidth(parseInt(value, 10));
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setInitialY(window.innerHeight / 2);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const periodTrackSegments = useMemo<TrackSegment[]>(() => {
    const periodNodes = nodes
      .filter(node => node.type === 'period' && layout.has(node.id))
      .sort((a, b) => a.order - b.order);
    const segments: TrackSegment[] = [];
    for (let i = 0; i < periodNodes.length - 1; i++) {
      const prevPeriod = periodNodes[i];
      const nextPeriod = periodNodes[i + 1];
      const prevLayout = layout.get(prevPeriod.id)!;
      const nextLayout = layout.get(nextPeriod.id)!;
      const cx1 = prevLayout.x + prevLayout.width / 2;
      const cy1 = prevLayout.y + prevLayout.height / 2;
      const cx2 = nextLayout.x + nextLayout.width / 2;
      const cy2 = nextLayout.y + nextLayout.height / 2;
      
      const buttonX = ( (prevLayout.x + prevLayout.width) + nextLayout.x ) / 2;
      
      const t = isNaN(cx2 - cx1) || (cx2 - cx1) === 0 ? 0 : (buttonX - cx1) / (cx2 - cx1);
      const buttonY = cy1 + t * (cy2 - cy1);
      segments.push({
        id: `${prevPeriod.id}-${nextPeriod.id}`,
        line: { x1: cx1, y1: cy1, x2: cx2, y2: cy2 },
        button: { x: buttonX, y: buttonY },
        onInsertPayload: { prevNodeId: prevPeriod.id, nextNodeId: nextPeriod.id },
      });
    }
    return segments;
  }, [nodes, layout, layoutConstants]);

  const eventTrackSegments = useMemo<TrackSegment[]>(() => {
    const segments: TrackSegment[] = [];
    const eventsByParent = new Map<string, TimelineNode[]>();
    nodes.forEach(node => {
      if (node.type === 'event' && node.parentId && layout.has(node.id)) {
        if (!eventsByParent.has(node.parentId)) {
          eventsByParent.set(node.parentId, []);
        }
        eventsByParent.get(node.parentId)!.push(node);
      }
    });

    for (const [parentId, events] of eventsByParent.entries()) {
      const parentNode = nodes.find(n => n.id === parentId);
      if (!parentNode || !layout.has(parentNode.id)) continue;
      const sortedEvents = events.sort((a, b) => a.order - b.order);
      const allNodesInTrack = [parentNode, ...sortedEvents];
      for (let i = 0; i < allNodesInTrack.length - 1; i++) {
        const prevNode = allNodesInTrack[i];
        const nextNode = allNodesInTrack[i + 1];
        const prevLayout = layout.get(prevNode.id)!;
        const nextLayout = layout.get(nextNode.id)!;
        const cx1 = prevLayout.x + prevLayout.width / 2;
        const cy1 = prevLayout.y + prevLayout.height / 2;
        const cx2 = nextLayout.x + nextLayout.width / 2;
        const cy2 = nextLayout.y + nextLayout.height / 2;
        const buttonX = cx1;
        const topNodeLayout = prevLayout.y < nextLayout.y ? prevLayout : nextLayout;
        const bottomNodeLayout = prevLayout.y < nextLayout.y ? nextLayout : prevLayout;
        const visibleTrackStartY = topNodeLayout.y + topNodeLayout.height;
        const visibleTrackEndY = bottomNodeLayout.y;
        const buttonY = (visibleTrackStartY + visibleTrackEndY) / 2;
        segments.push({
          id: `${prevNode.id}-${nextNode.id}`,
          line: { x1: cx1, y1: cy1, x2: cx2, y2: cy2 },
          button: { x: buttonX, y: buttonY },
          onInsertPayload: { prevNodeId: prevNode.id, nextNodeId: nextNode.id },
        });
      }
    }
    return segments;
  }, [nodes, layout]);

  // --- Insert Callbacks ---
  const handleInsertPeriod = useCallback((payload: { prevNodeId: string, nextNodeId: string }) => {
    services.nodeService.insertPeriodBetween(payload.prevNodeId, payload.nextNodeId);
  }, [services.nodeService]);

  const handleInsertEvent = useCallback((payload: { prevNodeId: string, nextNodeId: string }) => {
    services.nodeService.insertEventBetween(payload.prevNodeId, payload.nextNodeId);
  }, [services.nodeService]);


  const handleCanvasClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('canvas-background')) {
      (document.activeElement as HTMLElement)?.blur();
    }
  };

  const handleRecenter = () => {
    if (!transformRef.current || layout.size === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of layout.values()) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;
    const { setTransform } = transformRef.current;
    setTransform(
      -contentCenterX + window.innerWidth / 2,
      -contentCenterY + window.innerHeight / 2,
      1,
      600,
      'easeOut'
    );
  };

  return (
    <div className="canvas-container">
      {turnBanner}
      <button className="recenter-button" onClick={handleRecenter}>Re-center</button>
      <TransformWrapper
        ref={transformRef}
        minScale={0.1}
        maxScale={3}
        initialScale={0.8}
        initialPositionX={200}
        initialPositionY={initialY}
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        panning={{ excluded: ['non-pannable-node'] }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100vw', height: '100vh' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <div className="canvas-background" onMouseDown={handleCanvasClick} />
          
          <LegacyOverlay nodes={nodes} layout={layout} selectedLegacy={selectedLegacy} />
          <TrackOverlay segments={periodTrackSegments} onInsert={handleInsertPeriod} insertButtonTitle="Add period" />
          <TrackOverlay segments={eventTrackSegments} onInsert={handleInsertEvent} insertButtonTitle="Add event" />
          <EventButtonOverlay
            nodes={nodes}
            layout={layout}
            layoutConstants={layoutConstants}
            layoutMode={layoutMode}
            nodeBorderWidth={nodeBorderWidth}
          />

          {nodes.map(node => {
            const nodeLayout = layout.get(node.id);
            if (!nodeLayout) return null;

            const style = {
              transform: `translate(${nodeLayout.x}px, ${nodeLayout.y}px)`,
            };

            return (
              <div
                key={node.id}
                className={clsx('node-wrapper', node.type === 'period' && 'period-wrapper')}
                style={style}
                ref={measureRef}
                data-node-id={node.id}
              >
                <TimelineNodeComponent
                  node={node}
                  bannedWords={bannedWords}
                  affirmedWords={affirmedWords}
                  selectedLegacy={selectedLegacy}
                />
              </div>
            );
          })}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

