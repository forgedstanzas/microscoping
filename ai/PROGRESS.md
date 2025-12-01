# Project Progress & Status

This document tracks the implementation progress for the Microscope Web project.

*Last Updated: 2025-11-30*

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
  - **Multi-Room Architecture:** The core data layer (`useYjs`) and all services (`NodeService`, `SessionManager`, `useViewSettings`, etc.) were refactore dependent on a room-specific `Y.Doc` instance.
  - **Lobby UI:** A `Lobby.tsx` component was created to allow users to create, join, or rejoin a session.
  - **Recent Sessions List:** The lobby now displays a clickable list of recently visited sessions.
  - **Host Election:** Logic was implemented to ensure a host is always present.

### Step 2: Turn Management System
- **Status:** Complete
- **Details:** Implemented a "Strict Mode" for turn-based play, enforced by the `useEntitlements` hook.
  - **Core Logic:** `TurnService` handles turn passing, and `useEntitlements` is the single source of truth for permissions (`canEditNodes`, `canEditMeta`).
  - **UI Enforcement:** `TimelineNode` and `EventButtonOverlay` are disabled for users whose turn it is not in strict mode.
  - **Host Controls:** The "Strict Turn Order" toggle is now consolidated on the Metadata tab for the host, along with UI to display the current turn and allow the active player to pass it.

### Step 3: PWA & Offline Support
- **Status:** Complete
- **Details:** The application was configured as a Progressive Web App (PWA).
  - `vite-plugin-pwa` was installed and configured.
  - A manifest and service worker are now generated, and placeholder icons have been added.

---
## ➡️ Current Status

- **Phase 5 in progress.** Steps 1, 2, and 3 are complete. Step 4 (Tutorial & Rules Reference) is pending.

---
## ⚠️ Potential Future Issues

This section documents architectural issues that have been resolved but whose patterns might still exist elsewhere in the code or could be accidentally re-introduced.

### Yjs Observer Pattern & Strict Mode

- **Symptom:** The list of connected peers would show duplicate entries, and peer usernames would be incorrect, especially when re-joining a session from the "Recent Sessions" list.
- **Root Cause Analysis:**
    1.  **Architectural Flaw:** The primary issue was that `YjsProvider` was responsible for both rendering the `<Lobby>` and the main app. When a user joined a room, `YjsProvider` would change what it rendered, causing React's Strict Mode to unmount and re-mount the entire provider. This created two concurrent connection attempts, leading to race conditions.
    2.  **Brittle Pattern:** Several components and hooks used a brittle pattern for syncing Yjs data to React state. They would initialize state with an empty value (`useState([])`) and then use a `useEffect` hook to both set up an observer *and* manually call an update function. This manual call was a workaround for the incorrect initial state and was the direct cause of double-processing issues when the component re-mounted.
- **Solution:**
    1.  **Architectural Refactor:** The logic for determining the `roomId` was lifted out of `YjsProvider` and into `App.tsx`. The `App` component now acts as a router, rendering either the `<Lobby>` or a stable `<YjsProvider>` that is always mounted with a valid `roomId`. This resolved the unmount/remount cycle.
    2.  **Canonical Pattern Enforcement:** All identified instances of the brittle observer pattern (`SideboardSettings.tsx`, `MetadataTab.tsx`, `usePalette.ts`) were refactored to use the correct, canonical pattern: `useState(() => yjsType.toArray())`. This initializes the state correctly on the first render and makes the manual update call unnecessary.
- **Risk / Going Forward:** Any new component that needs to display reactive data from a Yjs map or array **must** follow the canonical pattern of initializing its state directly from the Yjs data type in the `useState` initializer. The brittle `useEffect` + manual call pattern should be considered an anti-pattern and be avoided.