# Project Progress & Status

This document tracks the implementation progress for the Microscope Web project.

*Last Updated: 2025-11-27*

---

## ✅ Completed Steps (Phase 1)

Phase 1 established the core foundation of the application, including the data layer, persistence, and basic canvas rendering.
- **Project Scaffolding:** Initialized the project with Vite, React, and TypeScript.
- **Data & Persistence Layer:** Implemented the core data synchronization fabric using Y.js with a webrtc provider and an IndexedDB persistence layer.
- **Core Services:** Created `useYjs.ts` and `NodeService.ts`.
- **Canvas & Layout Engine v1:** Built the main `Canvas.tsx` component and a `LinearAdapter.ts` layout.
- **Component v1:** Developed the initial `TimelineNode.tsx` component.

---
## ✅ Completed Steps (Phase 2)

Phase 2 focused on adding core interactive features and a more dynamic layout engine.
- **Tag Parsing:** The `NodeService` now automatically parses `@tags` from node descriptions.
- **Advanced Node Styling:** `TimelineNodeComponent` updated with `contentEditable` fields and "tone" styles.
- **Hierarchical Layout Engine:** The layout adapter was updated to calculate node positions based on a parent/child structure.
- **SVG Threading:** The `LegacyOverlay.tsx` component was created to draw bezier curves connecting nodes that share common tags.
- **Dynamic Layout:** Successfully implemented a reactive layout system using `ResizeObserver` to recalculate the layout when node content changes size.

---
## ✅ Completed Steps (Phase 3)

Phase 3 introduced more complex layouts, UI management, and persistence features.
- **Palette Logic:** A `PaletteEnforcer.ts` and `HighlightableText.tsx` component were created to find and highlight "banned ingredients" in node descriptions.
- **The Zig-Zag JSLA:** A `ZigZagAdapter.ts` was created to implement the "Tone-Divergent" layout.
- **The Dynamic Sideboard:** A responsive `Sideboard.tsx` was built with a "Peel-Off" logic to manage tab visibility based on screen space. The `ThemeSwitcher` and a new `LayoutSwitcher` were integrated.
- **Import/Export (Persistence):** A `SessionManager.ts` service was created to handle saving and loading the entire session to/from a `.microscope` file.

---
## ✅ Completed Steps (Phase 4)

Phase 4 was a major polish and feature-expansion phase that prepared the application for multi-user functionality.
- **Interactive Palette & Highlighting:** The palette was made fully interactive and collaborative, allowing users to add/remove "affirmed" and "banned" words, with highlighting applied in real-time.
- **View Settings Loader & UI Polish:** Implemented a system for users to customize the app's appearance by uploading a JSON file. This included adding "Upload/Share/Reset View" features and building a custom `Modal` system to handle confirmations gracefully in background tabs.
- **Layout Transitions:** Added smooth CSS transitions when switching between layouts.
- **Full Node Hierarchy UI:** The complete UI for creating and managing the timeline hierarchy was implemented. This included adding/deleting Periods and Events, a track system with in-sequence insertion buttons, and cascading deletes.
- **Legacy Focus Mode:** Implemented a feature to highlight specific legacy threads and dim non-relevant nodes to improve visualization.

---
## ✅ Completed Steps (Phase 5)

### Step 1: The Lobby & Connection UX
- **Status:** Complete
- **Details:** The application was refactored to support multiple rooms, and a full lobby experience was created.
  - **Multi-Room Architecture:** The core data layer (`useYjs`) and all services (`NodeService`, `SessionManager`, `useViewSettings`, etc.) were refactored to be dependent on a room-specific `Y.Doc` instance, removing the old singleton pattern.
  - **Lobby UI:** A `Lobby.tsx` component was created to serve as the application's entry point. It allows users to create a new room, join an existing room via a code, or rejoin a recent session.
  - **Session Naming:** The "Create Room" flow was updated to include an input for the "History Title," which is now saved as part of the session's metadata.
  - **Recent Sessions List:** The lobby now displays a clickable list of recently visited sessions, which is persisted in the browser's IndexedDB.
  - **Host Election:** Logic was implemented in `App.tsx` to ensure there is always a host. When joining a room, if the previous host is not present, the first user to join becomes the new host.
  - **UI/UX Polish:**
    - The `ThemeSwitcher` was added to the Lobby screen for early access.
    - Placeholder text ("Describe the Period...") was added to Period and Event description boxes to guide users.
    - A `META_KEYS` constants file was created and integrated throughout the codebase to prevent key mismatch bugs when accessing Y.js metadata, improving overall code quality.

---
## ✅ Completed Steps (Code Quality & Refactoring Phase)

This phase focused on improving the internal architecture of the application to enhance maintainability, reduce complexity, and make future development easier and more robust.
- **Y.js React Context:** The prop drilling of `ydoc` and related state was eliminated by creating a `YjsProvider` and a `useYjsContext` hook. All Y.js-dependent logic (initialization, host election, session management) was centralized in this provider, decoupling components.
- **Instantiated, Context-Aware Services:** Static services (`NodeService`, `SessionManager`) were converted into classes that are instantiated once per session and provided through the new `YjsContext`. This simplified the service API and made component logic cleaner.
- **Strongly Typed `meta` Map:** A `MetaMapSchema` interface, `META_KEYS` constants, and a new `useMeta` hook were created to provide compile-time type safety for all interactions with the global metadata map, preventing common bugs.
- **Component Decomposition:** Large components were simplified by extracting logic into dedicated hooks and contexts.
  - A `UIStateContext` was created to manage global, non-collaborative UI state (`layoutMode`, `selectedLegacy`), decoupling `App.tsx` from its children.
  - A `useNodeLayout` hook was created to encapsulate the complex logic of measuring and calculating node positions, dramatically simplifying `Canvas.tsx`.

---
## ➡️ Current Status

- **Refactoring Complete:** All planned architectural refactors are now complete. The codebase is significantly more robust, modular, and maintainable.
- **Next Step:** Proceed with **Phase 5, Step 2: Turn Management System**.