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

    // Determine the event layout direction for this specific period
    const currentPeriodEventLayoutDirection =
      period.tone === 'light'
        ? layoutConstants?.eventLayoutLightPeriod ?? 'above' // Default for zigzag light is 'above'
        : layoutConstants?.eventLayoutDarkPeriod ?? 'below'; // Default for zigzag dark is 'below'

    // Define accumulators for events and scenes, relative to the period's frame
    let currentYAbove = 0; // Starts at 0 (top of period) and goes negative
    let currentYBelow = periodDims.height; // Starts at period's bottom and goes positive

    // Helper to calculate event group (event + scenes) height
    const getEventGroupTotalHeight = (eventNode: NodeWithChildren): number => {
        let height = (dimensions.get(eventNode.id) || { width: CARD_WIDTH, height: 150 }).height;
        eventNode.children.forEach(sceneNode => {
            if (sceneNode.type === 'scene') {
                height += GAP_VERTICAL + (dimensions.get(sceneNode.id) || { width: CARD_WIDTH, height: 150 }).height;
            }
        });
        return height;
    };


    // Layout Events and their nested Scenes
    // Filter out only Event type children for this section.
    const events = period.children.filter(child => child.type === 'event');

    events.forEach(event => {
        const eventDims = dimensions.get(event.id) || { width: CARD_WIDTH, height: 150 };
        const eventGroupHeight = getEventGroupTotalHeight(event); // Total height of event + its scenes
        let eventLayoutY; // Final Y for the event itself

        if (currentPeriodEventLayoutDirection === 'above') {
            currentYAbove -= (eventGroupHeight + GAP_VERTICAL); // Stack upwards from period top
            eventLayoutY = periodY + currentYAbove; // Event Y relative to canvas, accounting for period's offset
        } else { // 'below'
            eventLayoutY = periodY + currentYBelow + GAP_VERTICAL; // Stack downwards from period bottom
            currentYBelow += (eventGroupHeight + GAP_VERTICAL); // Advance accumulator
        }

        layoutMap.set(event.id, {
            x: currentX,
            y: eventLayoutY,
            width: eventDims.width,
            height: eventDims.height,
        });

        // Layout Scenes nested under this Event (always below their parent event)
        let sceneYAccumulator = eventLayoutY + eventDims.height + GAP_VERTICAL;
        event.children.forEach(scene => {
            if (scene.type !== 'scene') return;
            const sceneDims = dimensions.get(scene.id) || { width: CARD_WIDTH, height: 150 };
            layoutMap.set(scene.id, {
                x: currentX + SCENE_INDENTATION, // Indent scene
                y: sceneYAccumulator,
                width: sceneDims.width,
                height: sceneDims.height,
            });
            sceneYAccumulator += sceneDims.height + GAP_VERTICAL;
        });
    });

    // Advance currentX for the next Period column
    currentX += CARD_WIDTH + GAP_HORIZONTAL + 34; // Add 34px horizontal margin
  });

  return layoutMap;
}
