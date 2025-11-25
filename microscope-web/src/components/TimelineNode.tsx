import { NodeService } from '../services/NodeService';
import type { TimelineNode } from '../types/timeline';
import styles from './TimelineNode.module.css';
import clsx from 'clsx';
import { useRef, memo, useCallback, useMemo } from 'react';
import { HighlightableText } from './HighlightableText';
import { debounce } from '../utils/debounce';

interface TimelineNodeProps {
  node: TimelineNode;
  affirmedWords: string[];
  bannedWords: string[];
}

function TimelineNodeComponentInternal({ node, affirmedWords, bannedWords }: TimelineNodeProps) {
  const titleRef = useRef<HTMLDivElement>(null);

  const handleToggleTone = () => {
    const newTone = node.tone === 'light' ? 'dark' : 'light';
    NodeService.updateNode(node.id, { tone: newTone });
  };

  const handleToggleGhost = () => {
    NodeService.updateNode(node.id, { isGhost: !node.isGhost });
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.innerText;
    if (newText !== undefined && newText !== node.title) {
      NodeService.updateNode(node.id, { title: newText });
    }
  };

  // Debounce the description update to avoid excessive re-renders while typing.
  // useMemo is used to ensure the debounced function is not re-created on every render.
  const updateDescription = useMemo(
    () =>
      debounce((newDescription: string) => {
        if (newDescription !== node.description) {
          NodeService.updateNode(node.id, { description: newDescription });
        }
      }, 300),
    [node.id, node.description]
  );
  
  // The blur event for the description should also trigger an update.
  const handleDescriptionBlur = (currentValue: string) => {
     if (currentValue !== node.description) {
        NodeService.updateNode(node.id, { description: currentValue });
     }
  };

  return (
    <div
      className={clsx(
        'non-pannable-node', // Marker class to prevent pan/zoom on nodes
        styles.node,
        styles[node.tone],
        { [styles.ghost]: node.isGhost }
      )}
      // Add a data attribute for e2e testing or styling if needed
      data-node-id={node.id}
    >
      {/* SVG Anchors */}
      <div className={clsx(styles.anchor, styles.top, styles.left)} data-anchor="top-left"></div>
      <div className={clsx(styles.anchor, styles.top, styles.right)} data-anchor="top-right"></div>
      <div className={clsx(styles.anchor, styles.bottom, styles.left)} data-anchor="bottom-left"></div>
      <div className={clsx(styles.anchor, styles.bottom, styles.right)} data-anchor="bottom-right"></div>

      <div
        ref={titleRef}
        className={styles.title}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleTitleBlur}
        dangerouslySetInnerHTML={{ __html: node.title }}
      />
      
      <HighlightableText
        value={node.description}
        onChange={updateDescription}
        onBlur={handleDescriptionBlur}
        affirmedWords={affirmedWords}
        bannedWords={bannedWords}
      />
      
      {/* Interaction Buttons */}
      <div className={styles['button-group']}>
        <button className={styles.button} onClick={handleToggleTone}>Toggle Tone</button>
        <button className={styles.button} onClick={handleToggleGhost}>Toggle Ghost</button>
      </div>
    </div>
  );
}

export const TimelineNodeComponent = memo(TimelineNodeComponentInternal);
