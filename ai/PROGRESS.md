# Project Progress & Status

This document tracks the implementation progress for the Microscope Web project.

*Last Updated: 2025-11-24*

---

## ✅ Completed Steps (Phase 1)

All Phase 1 objectives were completed successfully, establishing a solid foundation with a real-time data layer, persistence, basic components, and a theme switcher.

---
## ✅ Completed Steps (Phase 2)

The following Phase 2 features have been implemented:
- **Tag Parsing:** The `NodeService` now automatically parses `@tags` from node descriptions and stores them in the data model.
- **Advanced Node Styling:** `TimelineNodeComponent` has been updated with `contentEditable` fields, specific border/background styles for "tones", and a "ghost" effect.
- **Hierarchical Layout Engine:** The layout adapter (`LinearAdapter.ts`) was successfully updated to calculate node positions based on a hierarchical (parent/child) structure.
- **SVG Threading:** The `LegacyOverlay.tsx` component was created to draw styled, colored bezier curves connecting nodes that share common tags. It includes logic for variable thickness and vertical offsetting.
- **Interaction Fixes:** Resolved issues where the pan/zoom canvas was intercepting clicks, allowing nodes to be edited. Also fixed focus management, border visibility, and text alignment based on user feedback.
- **Dynamic Layout:** Successfully implemented a reactive layout system. The canvas now uses a `ResizeObserver` to dynamically measure the rendered height of each node and recalculates the layout when sizes change. This ensures both nodes and SVG threads are positioned correctly based on content.

---
## ⚠️ Key Decisions & Issues Encountered (Phase 2)

The implementation of the dynamic layout system was a significant challenge that required multiple iterations.

- **Initial Goal:** To create a "two-pass render" where node heights were measured while invisible, and then positioned in a second pass.
- **Problem:** All attempts to hide the nodes for measurement (using `visibility: hidden`, `opacity: 0`, or off-screen `transform` positioning) prevented the `ResizeObserver` from reliably reporting the element's size. This resulted in nodes either not being rendered at all or the layout calculations failing.
- **Event Loop Issue:** While debugging, we discovered another race condition where typing in a `contentEditable` field would trigger a `ResizeObserver` update, which would cause a React re-render, which in turn would cause the textbox to lose focus.
- **Final Solution:**
  1.  **Measurement:** Nodes are always rendered visibly. The `ResizeObserver` is attached directly to the visible nodes. This proved to be the most reliable way to get accurate dimension data. The layout initially uses default heights for a fast first-paint, and then updates to the real measured heights a moment later.
  2.  **Width Calculation:** We discovered that `ResizeObserver` was reporting `Width: 0` because the `width` style was on a child element, not the element being measured. The fix was to move the `width: 300px` property to the wrapper `div` that the observer was attached to.
  3.  **Focus Loss:** The "re-render on type" issue was solved by wrapping the `TimelineNodeComponent` in `React.memo`. This prevents it from re-rendering (and losing focus) when its parent `Canvas` component re-renders during a layout update.

---
## ➡️ Current Status

- **Phase 2 Complete:** All planned features for Phase 2 are implemented, stable, and verified.
- **Next Step:** Ready for **Phase 3 planning** and implementation.
