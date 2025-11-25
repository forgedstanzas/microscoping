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

