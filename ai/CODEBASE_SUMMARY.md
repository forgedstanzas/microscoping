# Codebase Summary for Gemini AI

This document provides a summary of the `microscope-web` codebase, focusing on established conventions, architectural patterns, good practices, and potential security considerations. This information is intended to guide future AI interactions with this repository, ensuring adherence to project standards and efficient development.

## 1. Established Coding Standards & Conventions

Adherence to these conventions is paramount for maintaining consistency and avoiding common pitfalls.

### 1.1. TypeScript & Imports
- **Type-Only Imports:** Always explicitly use the `type` keyword for importing TypeScript types or interfaces. The build toolchain is strict about this, and failure to do so can result in runtime errors.
  ```typescript
  // Correct
  import type { MyType } from './my-file';
  import { myValue, type MyOtherType } from './my-file';
  ```
- **Strict Typing:** Favor explicit typing where beneficial, but leverage TypeScript's inference where appropriate. Avoid `any` unless absolutely necessary and justified.

### 1.2. Styling with CSS Modules
- **Component-Scoped Styles:** All component-specific styling is encapsulated in co-located CSS Module files (e.g., `MyComponent.tsx` and `MyComponent.module.css`).
- **Global Theme Variables:** All theme-dependent values (colors, backgrounds) are defined as CSS variables in `src/index.css` under the `:root` (light theme) and `[data-theme="dark"]` selectors.
- **Chained UI Variables:** To allow for both global and specific theming of UI elements, a "chained" variable pattern is used. A global variable (e.g., `--ui-bg`) sets a default for a category of components, and specific variables (e.g., `--button-bg`) use the global variable as their own default (`--button-bg: var(--ui-bg);`). This allows a user's settings file to override either the general `--ui-bg` or the specific `--button-bg`.
- **Protected Modal Variables:** The custom modal dialog has its own set of non-chained variables (e.g., `--modal-bg`) to ensure it is immune to custom theme overrides and always remains readable.

### 1.3. React Best Practices
- **Memoization:** Use `React.memo` for components that are expensive to render, especially if they are part of a list and their parent re-renders frequently.
- **`useCallback` / `useMemo`:** Utilize these hooks for optimizing expensive computations or preventing unnecessary re-renders due to referential inequality of functions/objects passed as props to memoized children.
- **`contentEditable`:** Be extremely cautious when mixing `contentEditable` with React's rendering lifecycle. Avoid programmatically setting `innerText` on a focused element. Use `useEffect` with `document.activeElement` checks to sync external state only when the element is not being actively edited by the user.

## 2. Architectural Patterns & Core Technologies

### 2.1. State Management
- **Primary State (Y.js):** All core application data that requires persistence and collaboration (e.g., Timeline Nodes, Palette word lists) is stored in a singleton Y.js document (`ydoc`). Logic is encapsulated in custom hooks (e.g., `useNodes`, `usePalette`) that subscribe to changes in Y.js data structures and update React state.
- **Global UI State ("Lift State Up"):** Non-collaborative, session-specific global state (e.g., theme, layout constants, palette state) is managed by custom hooks called a single time in the root `App.tsx` component. The resulting state and dispatch functions are then passed down to child components via props. This ensures a single source of truth for UI state and prevents synchronization issues between different parts of the component tree.
- **Global Context Providers:** For state that needs to be accessed by deeply nested components without excessive prop-drilling, a React Context is used. This pattern is implemented for:
  - **Theme:** `ThemeProvider` and `useSharedTheme`.
  - **Modal Dialogs:** `ModalProvider` and `useModal`.

### 2.2. Collaborative UX Patterns
- **One-Time Event Log (for Sharing):** To implement a "share" feature that is resistant to race conditions, an event log pattern is used. The sender pushes a unique, timestamped event object to a `Y.Array`. Receiving clients observe this array, process each new event only once (by tracking its unique ID), and can then act on it (e.g., by prompting the user to accept the shared settings). This avoids the "last write wins" problem of using a simple `Y.Map` key for transient messages.
- **Custom Modal for Asynchronous Actions:** To handle browser security features that block dialogs (`window.confirm`) from background tabs, a custom modal system was built. When a collaborative event arrives that requires user confirmation, the application shows a non-intrusive notification or state change. The custom modal confirmation is only shown after the user interacts with the UI in that tab, guaranteeing it is user-initiated.

### 2.3. Dynamic & Responsive Layout
- **"Measure-Then-Render" for Dynamic Content:** For complex layouts where container size depends on dynamic children (like the Sideboard's "Peel-Off" logic), a two-phase pattern is used:
  1.  **Measure Pass:** All child components are rendered into a hidden, off-screen container (`visibility: hidden`, `position: absolute`). `useEffect` and `useRef` are used to measure the true `offsetHeight` of each child.
  2.  **Display Pass:** The measured heights are stored in state. A `useMemo` hook then uses these precise measurements to accurately calculate the final layout (e.g., how many tabs are needed). The component re-renders, showing only the correctly laid-out components.
- **Fixed-Position UI Elements:** Top-level UI elements like the `Sideboard` use `position: fixed` to ensure they are pinned to the viewport and do not scroll with the main canvas content. The root `body` has `overflow: hidden` to prevent page-level scrollbars.

## 3. Separation of Concerns
- **Services vs. Hooks:**
  - **Hooks** (e.g., `useViewSettings`) are used for logic that is stateful and tied to the React component lifecycle. They manage React state (`useState`) and side effects (`useEffect`).
  - **Services** (e.g., `SessionManager`, `ViewSettingsService`) are refactored to be collections of pure, static functions. They contain business logic that is independent of the UI lifecycle. UI-related tasks like showing a confirmation dialog are handled in the component layer, which then calls the service with the final, confirmed data.

## 4. Good Practices / Anti-Patterns to Avoid
- **Y.js Sync Awareness:** When creating a hook that interacts with Y.js data, always get the `isSynced` flag from the `useYjs` hook. Do not attempt to read from or attach observers to Y.js data structures until `isSynced` is `true`. This prevents race conditions where the hook might attach to a stale data object before the persisted state from IndexedDB is loaded.
- **Full-Page Layout:** For a full-page app, remove the default Vite/CRA styles from `App.css` and `index.css` (e.g., `max-width`, `padding`, `display: flex`). The `body` and `#root` should be configured to fill the viewport (`height: 100vh`, `overflow: hidden`).
