# Microscope Web

## Overview

Microscope Web is a highly collaborative, real-time visualization tool designed for timeline-based thinking and planning. It allows multiple users to create, organize, and connect ideas in a shared canvas environment. The application is built with a focus on modular architecture, real-time synchronization, and a dynamic, themeable user interface.

## Core Technologies

- **Framework:** [React](https://react.dev/) 19 with TypeScript
- **State Management:**
  - **Collaborative State:** [Y.js](https://yjs.dev/) for CRDT-based real-time data synchronization.
  - **UI State:** React Hooks (`useState`, `useMemo`, `useCallback`) and the React Context API for global UI state (e.g., theme, modals).
- **Build Tool:** [Vite](https://vitejs.dev/) (using the `rolldown-vite` resolver)
- **Collaboration Provider:** `y-webrtc` for peer-to-peer connection brokering via public signaling servers.
- **Persistence:** `y-indexeddb` for client-side, offline storage of the shared document state.
- **Canvas Navigation:** `react-zoom-pan-pinch` for pan and zoom functionality.
- **Fuzzy Search:** `fuse.js` for the Palette's "Affirmed" and "Banned" word matching.
- **Styling:** CSS Modules with CSS Variables for component-scoped and themeable styles.

## Project Structure

The `src/` directory is organized by feature/concern to promote separation of concerns and maintainability.

-   `components/`: Contains all reusable React components that make up the UI (e.g., `Canvas`, `Sideboard`, `TimelineNode`).
-   `hooks/`: Houses custom React hooks that encapsulate complex stateful logic, especially for interacting with Y.js or managing global UI state (e.g., `useYjs`, `usePalette`, `useViewSettings`).
-   `context/`: Holds React Context providers for globally shared state that would be cumbersome to pass down through props (e.g., `ThemeContext`, `ModalContext`).
-   `services/`: Contains classes with static methods that provide pure, business-logic-oriented functions, decoupled from the React component lifecycle (e.g., `SessionManager`, `NodeService`).
-   `layout/`: Includes pure functions (Layout Adapters like `LinearAdapter` and `ZigZagAdapter`) that take in data and return calculated positions for nodes on the canvas.
-   `logic/`: Contains pure business logic not directly tied to a service or UI component (e.g., `PaletteEnforcer` for fuzzy-matching text).
-   `types/`: Stores shared TypeScript type and interface definitions.

## Key Architectural Patterns

-   **"Lift State Up" for UI State:** Global, non-collaborative UI state (like the current layout mode or active focus) is managed by a single hook in the root `App.tsx` component and passed down via props. This ensures a single source of truth.
-   **Context for Global Services:** Cross-cutting concerns like theming and modal dialogs are managed by a React Context, allowing any component in the tree to access them without prop-drilling.
-   **Chained CSS Variables:** Theming is achieved via a robust, two-layer CSS variable system. A global variable like `--ui-bg` sets a default for a category of elements, while specific variables like `--button-bg` default to the global one (`var(--ui-bg)`). This allows a custom theme file to easily override either the general `--ui-bg` or the specific `--button-bg`.
-   **"Measure-Then-Render" for Dynamic Layouts:** For complex UI that depends on the size of its dynamic content (like the Sideboard's "Peel-Off" logic), the application uses a two-phase render pattern. It first renders components invisibly to measure their exact `offsetHeight`, then uses those measurements in a second render pass to calculate a pixel-perfect final layout.
-   **Event Log for Collaborative Actions:** To handle one-time collaborative events like "Share View" without race conditions, the app uses a Y.js Array as an event log. Each action appends a unique event, which clients observe and process once, ensuring no event is lost or handled multiple times.

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run the development server:**
    ```bash
    npm run dev
    ```
3.  Open your browser to the URL provided by Vite (usually `http://localhost:5173`).

To test the collaborative features, open the same URL in a second browser window or tab.
