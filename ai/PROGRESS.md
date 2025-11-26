# Project Progress & Status

This document tracks the implementation progress for the Microscope Web project.

*Last Updated: 2025-11-25*

---

## ✅ Completed Steps (Phase 1)

Phase 1 established the core foundation of the application, including the data layer, persistence, and basic canvas rendering.
- **Project Scaffolding:** Initialized the project with Vite, React, and TypeScript. Set up CSS Modules for scoped styling and established a root CSS variable system for theming.
- **Data & Persistence Layer:** Implemented the core data synchronization fabric using **Y.js** with a webrtc provider for peer-to-peer collaboration. Added the `idb-keyval` library to create a persistence layer, saving the Y.js document to **IndexedDB** for offline-first capabilities.
- **Core Services:** Created `useYjs.ts` to manage the Y.js document and providers, and a `NodeService.ts` to provide a clean API for CRUD (Create, Read, Update, Delete) operations on timeline nodes.
- **Initialization Logic:** Implemented logic in `App.tsx` to populate the canvas with initial "Start" and "End" bookend nodes if the document is empty, ensuring a user is never met with a blank screen.
- **Canvas & Layout Engine v1:** Built the main `Canvas.tsx` component using `react-zoom-pan-pinch` to provide an infinite, pannable, and zoomable workspace. Created the first **JavaScript Layout Adapter (JSLA)**, `LinearAdapter.ts`, which positioned nodes based on a simple horizontal sort order.
- **Component v1:** Developed the initial `TimelineNode.tsx` component to visually represent nodes on the canvas, including basic styles for "light", "dark", and "ghost" states.

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
## 進捗状況 (Phase 3 Progress)

### Step 1: Palette Logic (Fuzzy Search & Highlighting)
- **Status:** Complete
- **Details:**
  - `fuse.js` library installed for fuzzy searching.
  - `PaletteEnforcer.ts` module created to find fuzzy matches for "banned ingredients" within node descriptions.
  - `HighlightableText.tsx` component created and integrated into `TimelineNode.tsx` to provide visual feedback for banned words.
  - **Bugs Resolved:**
    -   The "second occurrence" bug in `PaletteEnforcer.ts` was fixed, ensuring all instances of a banned word are highlighted.
    -   The visual conflict with the browser's native spellchecker was resolved by changing the highlight style from a wavy underline to a subtle box effect.
    -   A critical multi-client synchronization bug in `useNodes.ts` was fixed, ensuring new clients (tabs/windows) correctly load and display the full application state.
    -   The "typing-revert" bug in `HighlightableText.tsx` was fixed by ensuring the `contentEditable` div's content is not overwritten while the user is actively typing, preventing loss of input and maintaining focus.

### Step 2: The Zig-Zag JSLA (Layout Engine)
- **Status:** Complete
- **Details:**
  - `ZigZagAdapter.ts` created, implementing the "Tone-Divergent" layout logic.
  - Integrated into `Canvas.tsx`, dynamically centering the canvas based on window height.
  - Nodes with `light` tone are positioned above the canvas's horizontal center and stack upwards. Nodes with `dark` tone are positioned below the center and stack downwards.
  - Styling for tone borders (`--tone-light`, `--tone-dark`) was refined across light and dark themes to ensure the "light" tone border is always visually lighter than the "dark" tone border.

### Step 3: The Dynamic Sideboard
- **Status:** Complete
- **Details:**
  - `Sideboard.tsx`, `TabManager.tsx`, and placeholder content components (`SideboardMeta.tsx`, `SideboardPalette.tsx`, `SideboardLegacies.tsx`, `SideboardSettings.tsx`) were created.
  - Implemented the "Peel-Off" logic in `Sideboard.tsx` for responsive tab management based on available vertical screen space.
  - The `ThemeSwitcher` component was relocated into `SideboardSettings.tsx` and its absolute positioning CSS was removed, allowing it to render correctly within the settings panel.
  - A new `LayoutSwitcher.tsx` component (for switching between Linear and Zig-Zag layouts) was created and integrated into `SideboardSettings.tsx`. Its styling was adjusted to use standard browser dropdown appearance for consistency.

### Step 4: Import/Export (Persistence)
- **Status:** Complete
- **Details:**
  - `SessionManager.ts` service was created to handle saving and loading the session.
  - `exportSession()` serializes the main Y.js maps (`meta`, `nodes`, `palette`) to a JSON file and triggers a download.
  - `importSession()` reads a JSON file, prompts the user for confirmation, and then atomically overwrites the current session state.
  - UI buttons were added to `SideboardSettings.tsx` to trigger the import and export functions.

---
## ➡️ Current Status

- **Phase 3 Complete:** All objectives for Phase 3 are now implemented, stable, and verified.
- **Next Step:** Proceed with **Phase 4**.

---
## 進捗状況 (Phase 4 Progress)

### Step 1: Interactive Palette & Highlighting
- **Status:** Complete
- **Details:** The initial goal of highlighting "Yes" list words was expanded into a full-featured, collaborative palette system.
  - **Data Layer:** A `usePalette` hook was created to manage `affirmedWords` and `bannedWords` as `Y.Array`s in the shared Y.js document.
  - **UI:** The `SideboardPalette` component was built with side-by-side, scrollable lists for both word types, including text inputs and `+/-` buttons for management. "Enter" key submission was also added.
  - **Highlighting:** `PaletteEnforcer.ts` and `HighlightableText.tsx` were refactored to consume both lists and apply distinct green (affirmed) and red (banned) highlights to words in node descriptions.
  - **Bug Fixes:** A significant number of bugs were resolved to make this feature robust:
    - Fixed a Y.js race condition by making the `usePalette` hook sync-aware.
    - Resolved collaborative inconsistencies by lifting palette and theme state into `App.tsx` and a new `ThemeContext`, creating a single source of truth.
    - Corrected a data-type issue in `SessionManager.ts` to ensure palette lists are properly saved and restored during import/export.

### Step 2: View Settings Loader & UI Polish
- **Status:** Complete
- **Details:** Implemented a system for users to customize the application's appearance and layout by uploading a JSON file. This step also included major UI bug fixes and architectural improvements.
  - **Core Logic:** A `useViewSettings` hook was created to manage all custom settings state, including theme colors and layout constants. Layout adapters were refactored to accept these dynamic constants.
  - **UI & Features:**
    - "Upload View", "Reset View", and "Share View" buttons were added to the settings panel.
    - The "Share View" feature was implemented using a race-condition-proof event log in the Y.js document, ensuring reliable, one-time sharing between clients.
    - A global, custom Modal Dialog system (`ModalContext` and `<Modal/>`) was built to replace all native browser prompts (`alert`, `confirm`), improving UX and resolving issues with background tabs.
  - **CSS & Layout Fixes:**
    - Fixed a "color bleed" issue by implementing a chained CSS variable system (`--ui-bg`).
    - Resolved long-standing layout bugs by removing incorrect default styles, pinning the `Sideboard` to the viewport, and implementing a robust, measurement-based "Peel-Off" logic for the sideboard tabs.
    - Added a "Re-center" button to the canvas as a user-friendly alternative to scrollbars.

---
## ➡️ Current Status

- **Phase 4 - Steps 1 & 2 Complete:** The interactive palette and dynamic view settings features are fully implemented, stable, and verified.
- **Next Step:** Proceed with **Phase 4, Step 3: Layout Transitions**.

### Step 3: Layout Transitions
- **Status:** Complete
- **Details:** The CSS transition on the `.node-wrapper` class was updated to a 600ms `cubic-bezier` curve. This creates a a smoother, more polished animation when the user switches between the "Linear" and "Zig-Zag" layouts.

---
### Step 3.5: Add Full Node Hierarchy UI (Events & Scenes)
- **Status:** Complete
- **Details:** This step was expanded significantly to implement the full UI for creating and managing the timeline hierarchy, including the tracks between nodes and core editing features.
  - **Period and Event Tracks:** A robust track system was implemented to visually connect Periods and Events. This includes a `+` button on each track segment to allow for in-sequence insertion of new nodes. The logic was refined multiple times to ensure correct button placement in all layouts.
  - **Append Event Logic:** The UI for adding events was enhanced. The "Add Event" `+` button now intelligently appears either on an empty Period or on the last Event within a Period, creating a consistent "Append" workflow.
  - **Delete Node Functionality:** A "Delete" button was added to all nodes (except bookends). It uses a confirmation modal and supports cascading deletion (deleting a Period also deletes its child Events). The track system automatically "heals" its connections when a node is removed.
  - **Layout & UX Refinements:**
    - Period node widths were increased to make them more visually distinct.
    - Event and Scene nodes were centered relative to their parents in both `Linear` and `ZigZag` layouts to improve visual hierarchy.
    - The `clip-path` border for Event nodes was fixed to render correctly on all edges.
    - Several interaction bugs were fixed, including an overlay issue that blocked editing of Period nodes.
    - Legacy thread thickness scaling was doubled.
  - **Major Refactoring:** The `PeriodTrackOverlay` and new `EventTrackOverlay` were refactored into a single, generic `TrackOverlay` component. All data-intensive segment calculations were moved into the `Canvas` "container" component, making the overlay a purely presentational component and greatly reducing code duplication.

---
## ➡️ Current Status

- **Phase 4 Complete:** All objectives for Phase 4, including all sub-steps of Step 3, are now implemented, stable, and verified.
- **Next Step:** Awaiting new user requirements.
