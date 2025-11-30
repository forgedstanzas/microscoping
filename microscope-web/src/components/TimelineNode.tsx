import type { TimelineNode } from '../types/timeline';
import styles from './TimelineNode.module.css';
import clsx from 'clsx';
import { useRef, memo, useMemo } from 'react';
import { HighlightableText } from './HighlightableText';
import { debounce } from '../utils/debounce';
import { useModal } from '../context/ModalContext';
import { useYjsContext } from '../context/YjsContext';
import { useMeta } from '../hooks/useMeta';

interface TimelineNodeProps {
  node: TimelineNode;
  affirmedWords: string[];
  bannedWords: string[];
  selectedLegacy: string | null;
}

function TimelineNodeComponentInternal({ node, affirmedWords, bannedWords, selectedLegacy }: TimelineNodeProps) {
  const { services, myPeerId } = useYjsContext();
  const { isStrictMode, activePlayerId, hostId } = useMeta();
  const titleRef = useRef<HTMLDivElement>(null);
  const { showConfirm } = useModal();

  const isHost = myPeerId === hostId;
  const isMyTurn = myPeerId === activePlayerId;
  const canEdit = !isStrictMode || isMyTurn || isHost;
  const isEditable = canEdit;

  const handleToggleTone = () => {
    const newTone = node.tone === 'light' ? 'dark' : 'light';
    services.nodeService.updateNode(node.id, { tone: newTone });
  };

  const handleToggleGhost = () => {
    services.nodeService.updateNode(node.id, { isGhost: !node.isGhost });
  };

  const handleDelete = () => {
    const hasChildren = services.nodeService.hasChildren(node.id);
    const shouldSkipConfirm = (node.description || '').trim() === '' && !hasChildren;

    if (shouldSkipConfirm) {
      services.nodeService.deleteNode(node.id);
    } else {
      const title = `Delete '${node.title}'?`;
      const body = "Are you sure? " + (hasChildren ? "All child events will also be deleted. " : "") + "This cannot be undone.";
      const message = `${title}\n\n${body}`;

      showConfirm(message, () => services.nodeService.deleteNode(node.id));
    }
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.innerText;
    if (newText !== undefined && newText !== node.title) {
      services.nodeService.updateNode(node.id, { title: newText });
    }
  };

  const updateDescription = useMemo(
    () =>
      debounce((newDescription: string) => {
        if (newDescription !== node.description) {
          services.nodeService.updateNode(node.id, { description: newDescription });
        }
      }, 300),
    [services.nodeService, node.id, node.description]
  );
  
  const handleDescriptionBlur = (currentValue: string) => {
     if (currentValue !== node.description) {
        services.nodeService.updateNode(node.id, { description: currentValue });
     }
  };

  const isDimmed = !!selectedLegacy && !node.isBookend && !(node.tags || []).includes(selectedLegacy);

  return (
    <div
      className={clsx(
        'non-pannable-node',
        styles.node,
        styles[node.tone],
        { [styles.ghost]: node.isGhost },
        { [styles.event]: node.type === 'event' },
        { [styles.dimmed]: isDimmed },
        { [styles.disabled]: !canEdit }
      )}
      data-node-id={node.id}
    >
      <div className={styles.contentWrapper}>
        <div className={clsx(styles.anchor, styles.top, styles.left)} data-anchor="top-left"></div>
        <div className={clsx(styles.anchor, styles.top, styles.right)} data-anchor="top-right"></div>
        <div className={clsx(styles.anchor, styles.bottom, styles.left)} data-anchor="bottom-left"></div>
        <div className={clsx(styles.anchor, styles.bottom, styles.right)} data-anchor="bottom-right"></div>

        <div
          ref={titleRef}
          className={styles.title}
          contentEditable={isEditable}
          suppressContentEditableWarning
          onBlur={handleTitleBlur}
          dangerouslySetInnerHTML={{ __html: node.title }}
        />
        
        <HighlightableText
          value={node.description || ''}
          onChange={updateDescription}
          onBlur={handleDescriptionBlur}
          affirmedWords={affirmedWords}
          bannedWords={bannedWords}
          placeholder={
            node.type === 'period' ? 'Describe the Period...' :
            node.type === 'event' ? 'Describe the Event...' : ''
          }
          isEditable={isEditable}
        />
        
        <div className={styles['button-group']}>
          <button className={styles.button} onClick={handleToggleTone} disabled={!canEdit}>{node.tone === 'light' ? 'Light' : 'Dark'}</button>
          <button className={styles.button} onClick={handleToggleGhost} disabled={!canEdit}>Ghost</button>
          {!node.isBookend && (
            <button className={styles.button} onClick={handleDelete} disabled={!canEdit}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}

export const TimelineNodeComponent = memo(TimelineNodeComponentInternal);

