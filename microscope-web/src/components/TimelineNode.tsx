import { NodeService } from '../services/NodeService';
import type { TimelineNode } from '../types/timeline';
import styles from './TimelineNode.module.css';
import clsx from 'clsx';
import { useRef, memo } from 'react';

interface TimelineNodeProps {
  node: TimelineNode;
}

function TimelineNodeComponentInternal({ node }: TimelineNodeProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  const handleToggleTone = () => {
    const newTone = node.tone === 'light' ? 'dark' : 'light';
    NodeService.updateNode(node.id, { tone: newTone });
  };

  const handleToggleGhost = () => {
    NodeService.updateNode(node.id, { isGhost: !node.isGhost });
  };

  const handleContentBlur = (field: 'title' | 'description') => {
    const ref = field === 'title' ? titleRef : descriptionRef;
    const newText = ref.current?.innerText;

    // Only update if the text has actually changed
    if (newText !== undefined && newText !== node[field]) {
      NodeService.updateNode(node.id, { [field]: newText });
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
        onBlur={() => handleContentBlur('title')}
      >
        {node.title}
      </div>
      <div
        ref={descriptionRef}
        className={styles.description}
        contentEditable
        suppressContentEditableWarning
        onBlur={() => handleContentBlur('description')}
        // Use dangerouslySetInnerHTML to handle newlines from Y.js correctly
        dangerouslySetInnerHTML={{ __html: node.description || 'No description.' }}
      >
      </div>
      
      {/* Interaction Buttons */}
      <div className={styles['button-group']}>
        <button className={styles.button} onClick={handleToggleTone}>Toggle Tone</button>
        <button className={styles.button} onClick={handleToggleGhost}>Toggle Ghost</button>
      </div>
    </div>
  );
}

export const TimelineNodeComponent = memo(TimelineNodeComponentInternal);
