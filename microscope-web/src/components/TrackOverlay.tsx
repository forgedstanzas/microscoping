import React, { useState } from 'react';
import styles from './TrackOverlay.module.css';
import { useYjsContext } from '../context/YjsContext';
import { useMeta } from '../hooks/useMeta';

export interface TrackSegment {
  id: string;
  line: { x1: number; y1: number; x2: number; y2: number };
  button: { x: number; y: number };
  onInsertPayload: { prevNodeId: string, nextNodeId: string };
}

interface TrackOverlayProps {
  segments: TrackSegment[];
  onInsert: (payload: { prevNodeId: string, nextNodeId: string }) => void;
  insertButtonTitle: string;
}

export const TrackOverlay: React.FC<TrackOverlayProps> = ({ segments, onInsert, insertButtonTitle }) => {
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const { myPeerId } = useYjsContext();
  const { isStrictMode, activePlayerId, hostId } = useMeta();

  const isHost = myPeerId === hostId;
  const isMyTurn = myPeerId === activePlayerId;
  const canEdit = !isStrictMode || isMyTurn || isHost;

  return (
    <svg className={styles.trackSvg} onMouseLeave={() => setHoveredTrackId(null)}>
      {segments.map(segment => {
        const isHovered = hoveredTrackId === segment.id;
        return (
          <g
            key={segment.id}
            className={styles.trackSegment}
            onMouseEnter={() => setHoveredTrackId(segment.id)}
          >
            {/* The visible track line */}
            <line
              x1={segment.line.x1} y1={segment.line.y1}
              x2={segment.line.x2} y2={segment.line.y2}
              className={styles.trackLine}
              style={{ opacity: isHovered ? 1 : 0.5 }}
            />

            {/* Endpoints for the track line */}
            <circle
              cx={segment.line.x1}
              cy={segment.line.y1}
              r="6"
              className={styles.trackEndpoint}
              style={{ opacity: isHovered ? 1 : 0.5 }}
            />
            <circle
              cx={segment.line.x2}
              cy={segment.line.y2}
              r="6"
              className={styles.trackEndpoint}
              style={{ opacity: isHovered ? 1 : 0.5 }}
            />

            {/* An invisible, thicker line for easier hover detection */}
            <line
              x1={segment.line.x1} y1={segment.line.y1}
              x2={segment.line.x2} y2={segment.line.y2}
              className={styles.hoverTarget}
            />
            {canEdit && (
              <foreignObject
                x={segment.button.x - 15}
                y={segment.button.y - 15}
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
                  onClick={() => onInsert(segment.onInsertPayload)}
                  title={insertButtonTitle}
                >
                  +
                </button>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
};
