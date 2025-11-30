import type { TimelineNode } from '../types/timeline';
import type { ViewSettings } from '../types/settings';

/**
 * A map of measured node dimensions, where the key is the node's ID.
 */
export type DimensionMap = Map<string, { width: number; height: number }>;

/**
 * A map of calculated layout positions, including dimensions.
 */
export type LayoutMap = Map<string, { x: number; y: number; width: number; height: number }>;

/**
 * Calculates the visual layout for a given list of timeline nodes using a
 * hierarchical (parent/child) structure and pre-measured dimensions.
 *
 * @param nodes - An array of all TimelineNode objects.
 * @param dimensions - A map containing the measured width and height of each node.
 * @param layoutConstants - An object containing customizable layout constants.
 * @returns A map where keys are node IDs and values are their {x, y, width, height}.
 */
export function calculateLayout(
  nodes: TimelineNode[],
  dimensions: DimensionMap,
  layoutConstants: ViewSettings['layout']['constants'] | undefined
): LayoutMap {
  const layoutMap: LayoutMap = new Map();
  if (nodes.length === 0 || dimensions.size === 0) {
    return layoutMap;
  }

  // Use provided constants or fall back to defaults
  const CARD_WIDTH = layoutConstants?.cardWidth ?? 300;
  const GAP_HORIZONTAL = layoutConstants?.gapSize ?? 100; // Using gapSize for horizontal spacing
  const GAP_VERTICAL = layoutConstants?.gapSize ?? 40;   // Using gapSize for vertical spacing
  const SCENE_INDENTATION = layoutConstants?.gapSize ? layoutConstants.gapSize / 2 : 50;

  // 1. Build the tree structure
  const nodeMap = new Map<string, NodeWithChildren>();
  nodes.forEach(node => nodeMap.set(node.id, { ...node, children: [] }));
  const tree: NodeWithChildren[] = [];

  nodes.forEach(node => {
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(nodeMap.get(node.id)!);
      }
    } else {
      // Assume nodes without a parent are top-level Periods
      tree.push(nodeMap.get(node.id)!);
    }
  });

  // Sort nodes at each level by their `order` property
  const sortChildrenRecursive = (node: NodeWithChildren) => {
    node.children.sort((a, b) => a.order - b.order);
    node.children.forEach(sortChildrenRecursive);
  };
  tree.sort((a, b) => a.order - b.order);
  tree.forEach(sortChildrenRecursive);


  // 2. Calculate positions
  let currentX = 0; // The running X-coordinate for Period columns

  tree.forEach(period => {
    const periodDims = dimensions.get(period.id) || { width: CARD_WIDTH, height: 150 };
    layoutMap.set(period.id, {
      x: currentX,
      y: 0, // Periods always start at Y=0 in linear layout
      width: periodDims.width,
      height: periodDims.height,
    });

    // Accumulator for events and scenes relative to the period.
    // In linear mode, events and scenes always stack downwards from the period.
    let eventsBelowCurrentY = periodDims.height; // Tracks the Y-coordinate for the next element below the period.

    // Layout Events and their nested Scenes
    period.children.forEach(event => {
      if (event.type !== 'event') return; // Only process events for now

      const eventDims = dimensions.get(event.id) || { width: CARD_WIDTH, height: 150 };
      const eventX = currentX + (periodDims.width - eventDims.width) / 2; // Center event under period

      // Calculate Y position, always below the period.
      const eventLayoutY = eventsBelowCurrentY + GAP_VERTICAL;
      
      layoutMap.set(event.id, {
        x: eventX,
        y: eventLayoutY,
        width: eventDims.width,
        height: eventDims.height,
      });

      // Start the scene accumulator below the current event.
      let sceneYAccumulator = eventLayoutY + eventDims.height + GAP_VERTICAL;

      event.children.forEach(scene => {
        if (scene.type !== 'scene') return;
        const sceneDims = dimensions.get(scene.id) || { width: CARD_WIDTH, height: 150 };
        layoutMap.set(scene.id, {
          x: eventX + SCENE_INDENTATION, // Indent scene relative to its parent event
          y: sceneYAccumulator,
          width: sceneDims.width,
          height: sceneDims.height,
        });
        sceneYAccumulator += sceneDims.height + GAP_VERTICAL;
      });
      
      // The next item below the period should be placed after all scenes of the current event.
      eventsBelowCurrentY = sceneYAccumulator - GAP_VERTICAL;
    });

    // Advance currentX for the next Period column
    currentX += CARD_WIDTH + GAP_HORIZONTAL + 34; // Add 34px horizontal margin
  });

  return layoutMap;
}

/**
 * A temporary structure to hold the tree representation of nodes.
 */
interface NodeWithChildren extends TimelineNode {
  children: NodeWithChildren[];
}
