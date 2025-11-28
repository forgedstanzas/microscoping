import type { TimelineNode, NodeType } from '../types/timeline';
import { v4 as uuidv4 } from 'uuid';
import { extractTags } from '../utils/parser';
import * as Y from 'yjs';
import { META_KEYS } from '../types/meta';

/**
 * NodeService provides an API for CRUD (Create, Read, Update, Delete)
 * operations on TimelineNode objects within a Y.js document.
 * An instance of this class is scoped to a specific Y.Doc.
 */
export default class NodeService {
  private ydoc: Y.Doc;
  private nodesMap: Y.Map<TimelineNode>;
  private metaMap: Y.Map<any>;
  private tagObserver: (event: Y.YMapEvent<TimelineNode>) => void;
  private isDestroyed = false;

  /**
   * @param ydoc The Y.js document to operate on.
   */
  constructor(ydoc: Y.Doc) {
    this.ydoc = ydoc;
    this.nodesMap = ydoc.getMap<TimelineNode>('nodes');
    this.metaMap = ydoc.getMap<any>('meta');

    // Background tag synchronization observer
    this.tagObserver = (event: Y.YMapEvent<TimelineNode>) => {
      this.ydoc.transact(() => {
        event.keysChanged.forEach((key) => {
          const node = this.nodesMap.get(key);
          if (node) {
            const currentTags = JSON.stringify(node.tags || []);
            const newTags = JSON.stringify(extractTags(node.description));

            if (currentTags !== newTags) {
              console.log(`NodeService (Observer): Syncing tags for node ${node.id}`);
              this.nodesMap.set(node.id, { ...node, tags: extractTags(node.description) });
            }
          }
        });
      }, 'tag-sync');
    };
    
    this.nodesMap.observe(this.tagObserver);
  }
  
  /**
   * Cleans up the observers attached by this service instance.
   */
  public destroy() {
    if (this.isDestroyed) return;
    this.nodesMap.unobserve(this.tagObserver);
    this.isDestroyed = true;
  }

  /**
   * Creates a new node with sensible defaults and adds it to the document.
   * @param props The properties for the new node.
   * @returns The fully-formed TimelineNode that was created.
   */
  public addNode(
    props: Partial<Omit<TimelineNode, 'id'>> & { type: NodeType; title: string }
  ): TimelineNode {
    const defaults: Omit<TimelineNode, 'id' | 'type' | 'title'> = {
      parentId: null,
      description: '',
      tone: 'light',
      isGhost: false,
      isBookend: false,
      order: Date.now(),
      tags: [],
    };

    const newNode: TimelineNode = {
      ...defaults,
      ...props,
      id: uuidv4(),
    };
    newNode.tags = extractTags(newNode.description);

    this.ydoc.transact(() => {
      this.nodesMap.set(newNode.id, newNode);
    });

    console.log('NodeService: Added node', newNode);
    return newNode;
  }

  /**
   * Updates one or more fields of an existing node.
   * @param nodeId The ID of the node to update.
   * @param fields An object with the fields to update.
   */
  public updateNode(nodeId: string, fields: Partial<TimelineNode>) {
    const existingNode = this.nodesMap.get(nodeId);

    if (existingNode) {
      if (typeof fields.description === 'string') {
        fields.tags = extractTags(fields.description);
      }
      const updatedNode = { ...existingNode, ...fields };
      this.ydoc.transact(() => {
        this.nodesMap.set(nodeId, updatedNode);
      });
      console.log('NodeService: Updated node', updatedNode);
    } else {
      console.warn(`NodeService: updateNode called with non-existent nodeId '${nodeId}'`);
    }
  }

  /**
   * Deletes a node and its descendants from the document.
   * @param nodeId The ID of the node to delete.
   */
  public deleteNode(nodeId: string) {
    const nodeToDelete = this.nodesMap.get(nodeId);

    if (!nodeToDelete) {
      console.warn(`NodeService: deleteNode called with non-existent nodeId '${nodeId}'`);
      return;
    }

    this.ydoc.transact(() => {
      const nodesToDeleteIds: string[] = [nodeId];
      if (nodeToDelete.type === 'period') {
        const childrenIds = Array.from(this.nodesMap.values())
          .filter(node => node.parentId === nodeId)
          .map(node => node.id);
        nodesToDeleteIds.push(...childrenIds);
      }
      nodesToDeleteIds.forEach(id => {
        this.nodesMap.delete(id);
      });
      console.log('NodeService: Deleted nodes:', nodesToDeleteIds);
    });
  }

  /**
   * Retrieves a node by its ID.
   * @param nodeId The ID of the node to retrieve.
   * @returns The TimelineNode if found, otherwise undefined.
   */
  public getNode(nodeId: string): TimelineNode | undefined {
    return this.nodesMap.get(nodeId);
  }

  /**
   * Retrieves all nodes as an array.
   * @returns An array of all TimelineNode objects.
   */
  public getAllNodes(): TimelineNode[] {
    return Array.from(this.nodesMap.values());
  }

  /**
   * Checks if a given node has any child nodes.
   * @param nodeId The ID of the node to check.
   * @returns True if the node has children, false otherwise.
   */
  public hasChildren(nodeId: string): boolean {
    const node = this.nodesMap.get(nodeId);
    if (!node || node.type !== 'period') {
        return false;
    }
    return Array.from(this.nodesMap.values()).some(n => n.parentId === nodeId);
  }

  /**
   * Inserts a new Period node between two existing Period nodes.
   * @param prevPeriodId The ID of the Period node before the insertion point.
   * @param nextPeriodId The ID of the Period node after the insertion point.
   * @returns The newly created TimelineNode, or undefined if insertion fails.
   */
  public insertPeriodBetween(prevPeriodId: string, nextPeriodId: string): TimelineNode | undefined {
    const prevPeriod = this.nodesMap.get(prevPeriodId);
    const nextPeriod = this.nodesMap.get(nextPeriodId);

    if (!prevPeriod || !nextPeriod || prevPeriod.type !== 'period' || nextPeriod.type !== 'period') {
      console.error('NodeService: Cannot insert period between non-existent or non-period nodes.');
      return undefined;
    }

    const newOrder = (prevPeriod.order + nextPeriod.order) / 2;
    const newTone = prevPeriod.tone === 'light' ? 'dark' : 'light';

    return this.addNode({
      type: 'period',
      title: 'New Period',
      isGhost: true,
      order: newOrder,
      tone: newTone,
    });
  }

  /**
   * Inserts a new Event node between two existing nodes.
   * @param prevNodeId The ID of the node before the insertion point.
   * @param nextNodeId The ID of the node after the insertion point.
   * @returns The newly created TimelineNode, or undefined if insertion fails.
   */
  public insertEventBetween(prevNodeId: string, nextNodeId: string): TimelineNode | undefined {
    const prevNode = this.nodesMap.get(prevNodeId);
    const nextNode = this.nodesMap.get(nextNodeId);

    if (!prevNode || !nextNode) {
      console.error('NodeService: Cannot insert event between non-existent nodes.');
      return undefined;
    }
    
    const parentId = prevNode.type === 'period' ? prevNode.id : prevNode.parentId;
    const parentNode = parentId ? this.nodesMap.get(parentId) : undefined;
    
    if (!parentNode || (nextNode.parentId !== parentId && nextNode.parentId !== prevNode.id)) {
        console.error('NodeService: Nodes do not share a common, valid parent.');
        return undefined;
    }

    const newOrder = (prevNode.order + nextNode.order) / 2;

    return this.addNode({
      type: 'event',
      title: 'New Event',
      isGhost: true,
      parentId: parentId,
      order: newOrder,
      tone: parentNode.tone,
    });
  }

  /**
   * Adds a new Event node to a Period.
   * @param parentId The ID of the parent Period node.
   * @returns The newly created TimelineNode, or undefined if creation fails.
   */
  public addEventToPeriod(parentId: string): TimelineNode | undefined {
    const parentPeriod = this.nodesMap.get(parentId);

    if (!parentPeriod || parentPeriod.type !== 'period') {
      console.error(`NodeService: Cannot add event to non-existent or non-period parent '${parentId}'.`);
      return undefined;
    }

    const existingEvents = Array.from(this.nodesMap.values())
      .filter(node => node.type === 'event' && node.parentId === parentId)
      .sort((a, b) => a.order - b.order);

    let newOrder: number;
    if (existingEvents.length > 0) {
      const lastEventOrder = existingEvents[existingEvents.length - 1].order;
      const nextBoundary = parentPeriod.order + 1;
      newOrder = (lastEventOrder + nextBoundary) / 2;
    } else {
      newOrder = parentPeriod.order + 0.5;
    }
    
    const newTone = parentPeriod.tone; 

    return this.addNode({
      type: 'event',
      title: 'New Event',
      isGhost: true,
      parentId: parentId,
      order: newOrder,
      tone: newTone,
    });
  }

  /**
   * Updates the history title in the meta map.
   */
  public setHistoryTitle(title: string) {
    this.metaMap.set(META_KEYS.HISTORY_TITLE, title);
  }

  /**
   * Updates the current focus in the meta map.
   */
  public setCurrentFocus(focus: string) {
    this.metaMap.set(META_KEYS.CURRENT_FOCUS, focus);
  }

  /**
   * Updates the active player ID (Lens) in the meta map.
   */
  public setActivePlayerId(id: number | null) {
    this.metaMap.set(META_KEYS.ACTIVE_PLAYER_ID, id);
  }

  /**
   * Updates the strict mode flag in the meta map.
   */
  public setIsStrictMode(isStrict: boolean) {
    this.metaMap.set(META_KEYS.IS_STRICT_MODE, isStrict);
  }

  /**
   * Updates the host ID in the meta map.
   */
  public setHostId(id: number) {
    this.metaMap.set(META_KEYS.HOST_ID, id);
  }
}