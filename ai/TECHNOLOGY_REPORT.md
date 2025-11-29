# Technology Report: Microscope Web

This report details the key libraries, frameworks, and technologies utilized in the Microscope Web application. Understanding this stack is crucial for development, maintenance, and future AI-driven modifications.

---

## 1. Core Languages & Frameworks

*   **TypeScript (v5.x):** The primary language for the entire codebase. TypeScript is used for its strong typing capabilities, which enhance code quality, maintainability, and developer productivity by catching errors early. It is compiled to JavaScript for browser execution.
*   **React (v19.x):** The frontend JavaScript library for building user interfaces. React's component-based architecture and declarative UI paradigm are central to the application's structure.
*   **HTML5 / CSS3:** Standard web technologies for structuring content and applying styles.

---

## 2. State Management

The application employs a layered approach to state management, differentiating between collaborative, global UI, and local component states.

*   **Y.js (v13.x):** The foundational library for **real-time collaborative editing**. Y.js implements Conflict-free Replicated Data Types (CRDTs), allowing multiple users to concurrently modify shared data structures (like `Y.Map` and `Y.Array`) without requiring a central server for conflict resolution.
    *   **Key Usage:** Stores all core application data (timeline nodes, metadata, palette entries).
*   **React Context API:** Used extensively for managing global application state that is either shared across many components or handles cross-cutting concerns.
    *   **`YjsContext`:** Provides access to the `Y.Doc` instance, connection status, user identity, raw Y.js maps (`meta`, `peers`), and **instantiated service objects** (`nodeService`, `sessionService`). It acts as the central hub for all Y.js-related state and functionality.
    *   **`UIStateContext`:** Manages global UI state that is not collaborative (e.g., `layoutMode`, `selectedLegacy`).
    *   **`ThemeContext`:** Manages the active UI theme (light/dark).
    *   **`ModalContext`:** Provides a global, non-blocking modal/alert system for user confirmations and notifications.
*   **`useState` / `useRef` / `useMemo` / `useCallback`:** Standard React hooks for managing local component state, memoizing expensive computations, and optimizing rendering performance.

---

## 3. Data Persistence & Networking

*   **`y-indexeddb` (v9.x):** A Y.js persistence provider. It transparently saves the `Y.Doc`'s state to the browser's IndexedDB, enabling **offline-first capabilities** and local persistence of session data.
*   **`y-webrtc` (v10.x):** A Y.js network provider. It facilitates **peer-to-peer communication** between clients using WebRTC.
    *   **Signaling Servers:** Relies on external signaling servers (e.g., `wss://signaling.y-webrtc.dev`) to introduce peers to each other. Once peers are introduced, they attempt to establish a direct WebRTC connection.
    *   **Awareness Protocol:** `y-webrtc` includes an "awareness" protocol that allows clients to share ephemeral state (like cursor positions, usernames, or who is currently editing) with connected peers.
*   **Local Signaling Server (`y-webrtc` package):** For local development and reliable testing, a dedicated local signaling server can be run (`node signaling.js`) using the `y-webrtc` package's built-in server capabilities. This bypasses the unreliability of public signaling servers.
*   **`idb-keyval` (v6.x):** A super-simple wrapper for IndexedDB. Used by `RecentSessionsManager` to store key-value pairs (specifically, the list of recent sessions) in IndexedDB, separate from the `Y.Doc` data.

---

## 4. Services & Data Logic

*   **Instantiated Services (`NodeService`, `SessionManager`):** These are now TypeScript classes, instantiated once per `Y.Doc` within the `YjsProvider`. They encapsulate business logic and data manipulation related to timeline nodes and session import/export.
    *   **`NodeService`:** Provides a strongly-typed API for CRUD operations on `TimelineNode`s and for updating the `meta` map.
    *   **`SessionManager`:** Handles serializing and deserializing the entire `Y.Doc` content for session import/export.
*   **`META_KEYS` & `MetaMapSchema` (`src/types/meta.ts`):** A centralized definition of all keys and their expected types for the Y.js `meta` map. This provides strong compile-time guarantees and prevents key mismatch bugs.
*   **`RecentSessionsManager`:** Manages adding, retrieving, and deleting entries from a separate list of recently accessed sessions, stored in IndexedDB via `idb-keyval`.

---

## 5. Development & Build Tooling

*   **Vite (v7.x):** A fast frontend build tool that serves as the development server and bundler. Used for its rapid Hot Module Replacement (HMR) and optimized production builds.
*   **npm:** The Node.js package manager used for managing project dependencies and running scripts.
*   **ESLint:** A static code analysis tool used for enforcing coding standards and identifying problematic patterns in the TypeScript/JavaScript code.
*   **UUID (v13.x):** A utility library for generating RFC-compliant UUIDs, used for unique node IDs.
*   **`clsx` (v2.x):** A tiny utility for conditionally joining class names strings together.

---

## 6. UI & Styling

*   **CSS Modules:** Used for component-scoped styling, automatically generating unique class names to prevent style conflicts.
*   **CSS Variables:** All theming (light/dark mode) is implemented using CSS variables, defined globally in `src/index.css`. Components consume these variables (e.g., `color: var(--node-text);`) to adapt to the active theme.
*   **`react-zoom-pan-pinch` (v3.x):** A React component library for implementing intuitive zoom and pan functionality on the canvas.
*   **`ResizeObserver`:** A native browser API used by `useNodeLayout` to efficiently detect changes in the dimensions of DOM elements, enabling dynamic layout recalculations.

---

## 7. Utility Libraries

*   **`debounce`:** A utility function (`src/utils/debounce.ts`) to limit the rate at which a function can fire, particularly useful for optimizing input handlers.
*   **`parser`:** A utility function (`src/utils/parser.ts`) used by `NodeService` to extract `@tags` from node descriptions.
*   **`fuse.js` (v7.x):** A powerful, lightweight fuzzy-search library, used by `PaletteEnforcer` for matching palette entries.
*   **`random-words` (v2.x):** A utility for generating random words, potentially used for dummy data or room name generation.

---

This comprehensive overview should serve as a valuable resource for anyone working on the Microscope Web codebase.
