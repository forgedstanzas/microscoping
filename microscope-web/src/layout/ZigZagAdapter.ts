import type { TimelineNode, NodeTone } from '../types/timeline';
import type { DimensionMap, LayoutMap } from './LinearAdapter'; // Reusing types from LinearAdapter
import type { ViewSettings } from '../types/settings';

/**
 * Calculates the visual layout for a given list of timeline nodes using a
 * hierarchical (parent/child) zig-zag structure and pre-measured dimensions.
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
  if (nodes.length === 0) { // dimensions.size === 0 is not a strict requirement here due to default fallback
    return layoutMap;
  }

  // Use provided constants or fall back to defaults
  const CARD_WIDTH = layoutConstants?.cardWidth ?? 300;
  const GAP_HORIZONTAL = layoutConstants?.gapSize ?? 100;
  const GAP_VERTICAL = layoutConstants?.gapSize ?? 40;
  const PERIOD_Y_OFFSET = layoutConstants?.zigzagOffset ?? 250; // Vertical offset for Period Y-axis from center
  const SCENE_INDENTATION = layoutConstants?.gapSize ? layoutConstants.gapSize / 2 : 50; // Use half gapSize for indentation

  // 1. Build the tree structure (same as LinearAdapter)
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

    // Period Y-Axis: Light Periods shift up, Dark Periods shift down
    let periodY = 0;
    if (period.tone === 'light') {
      periodY = -PERIOD_Y_OFFSET; // Shift up from the center
    } else {
      periodY = PERIOD_Y_OFFSET; // Shift down from the center
    }

    layoutMap.set(period.id, {
      x: currentX,
      y: periodY,
      width: periodDims.width,
      height: periodDims.height,
    });

    // Stacking for children (Events/Scenes)
    let childY = periodY; // Start stacking from the period's Y position
    const periodMidHeight = periodDims.height / 2;

    if (period.tone === 'light') {
      // Light Periods: Children stack upwards (-Y direction)
      childY -= periodMidHeight + GAP_VERTICAL; // Start above period
      
      period.children.forEach(event => {
        const eventDims = dimensions.get(event.id) || { width: CARD_WIDTH, height: 150 };
        childY -= eventDims.height; // Subtract height first for upwards growth
        layoutMap.set(event.id, {
          x: currentX,
          y: childY,
          width: eventDims.width,
          height: eventDims.height,
        });
        
        // Handle Scenes nested under Events (also stack upwards)
        let sceneY = childY - GAP_VERTICAL; // Start above event
        event.children.forEach(scene => {
          const sceneDims = dimensions.get(scene.id) || { width: CARD_WIDTH, height: 150 };
          sceneY -= sceneDims.height; // Subtract height first for upwards growth
          layoutMap.set(scene.id, {
            x: currentX + SCENE_INDENTATION, // Indent scene
            y: sceneY,
            width: sceneDims.width,
            height: sceneDims.height,
          });
          sceneY -= GAP_VERTICAL; // Space between scenes
        });
        childY = sceneY; // Continue stacking from the last scene's Y
        childY -= GAP_VERTICAL; // Space between events
      });
    } else {
      // Dark Periods: Children stack downwards (+Y direction)
      childY += periodMidHeight + GAP_VERTICAL; // Start below period
      
      period.children.forEach(event => {
        const eventDims = dimensions.get(event.id) || { width: CARD_WIDTH, height: 150 };
        layoutMap.set(event.id, {
          x: currentX,
          y: childY,
          width: eventDims.width,
          height: eventDims.height,
        });
        childY += eventDims.height + GAP_VERTICAL; // Add height for downwards growth

        // Handle Scenes nested under Events (also stack downwards)
        event.children.forEach(scene => {
          const sceneDims = dimensions.get(scene.id) || { width: CARD_WIDTH, height: 150 };
          layoutMap.set(scene.id, {
            x: currentX + SCENE_INDENTATION, // Indent scene
            y: childY,
            width: sceneDims.width,
            height: sceneDims.height,
          });
          childY += sceneDims.height + GAP_VERTICAL; // Space between scenes
        });
      });
    }

    // Advance currentX for the next Period column
    currentX += CARD_WIDTH + GAP_HORIZONTAL + 34; // Add 34px horizontal margin
  });

  return layoutMap;
}
