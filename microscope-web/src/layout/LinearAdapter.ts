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
  layoutConstants: ViewSettings['layout']['constants']
): LayoutMap {
  const layoutMap: LayoutMap = new Map();
  if (nodes.length === 0 || dimensions.size === 0) {
    return layoutMap;
  }

  // Use provided constants or fall back to defaults
  const CARD_WIDTH = layoutConstants?.cardWidth ?? 300;
  const GAP_HORIZONTAL = layoutConstants?.gapSize ?? 100; // Using gapSize for horizontal spacing
  const GAP_VERTICAL = layoutConstants?.gapSize ?? 40;   // Using gapSize for vertical spacing

  // 1. Build the tree structure
  const nodeMap = new Map(nodes.map(node => [node.id, { ...node, children: [] }]));
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
      y: 0,
      width: periodDims.width,
      height: periodDims.height,
    });

    let childY = periodDims.height + GAP_VERTICAL;

    period.children.forEach(event => {
      const eventDims = dimensions.get(event.id) || { width: CARD_WIDTH, height: 150 };
      layoutMap.set(event.id, {
        x: currentX, // Events are in the same column as their Period
        y: childY,
        width: eventDims.width,
        height: eventDims.height,
      });

      childY += eventDims.height + GAP_VERTICAL;

      // Handle Scenes nested under Events
      let sceneY = childY;
      event.children.forEach(scene => {
        const sceneDims = dimensions.get(scene.id) || { width: CARD_WIDTH, height: 150 };
        layoutMap.set(scene.id, {
          x: currentX, // Scenes are also in the same column
          y: sceneY,
          width: sceneDims.width,
          height: sceneDims.height,
        });
        sceneY += sceneDims.height + GAP_VERTICAL;
      });
      childY = sceneY; // Update childY to continue after the last scene
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
