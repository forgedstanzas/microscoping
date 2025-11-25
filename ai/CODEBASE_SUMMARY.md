# Codebase Summary for Gemini AI

This document provides a summary of the `microscope-web` codebase, focusing on established conventions, architectural patterns, good practices, and potential security considerations. This information is intended to guide future AI interactions with this repository, ensuring adherence to project standards and efficient development.

## 1. Established Coding Standards & Conventions

Adherence to these conventions is paramount for maintaining consistency and avoiding common pitfalls.

### 1.1. TypeScript & Imports
- **Type-Only Imports:** Always explicitly use the `type` keyword for importing TypeScript types or interfaces. The build toolchain (Vite/rolldown) is strict about this, and failure to do so results in runtime errors.
  ```typescript
  // Correct
  import type { MyType } from './my-file';
  import { myValue, type MyOtherType } from './my-file';

  // Incorrect (will cause runtime errors if MyType is only a type)
  // import { MyType } from './my-file';
  ```
- **File Extensions:** Use `.ts` or `.tsx` for TypeScript files.
- **Strict Typing:** Favor explicit typing where beneficial, but leverage TypeScript's inference where appropriate. Avoid `any` unless absolutely necessary and justified.

### 1.2. Styling
- **CSS Modules:** Styles are component-scoped using CSS Modules (`.module.css`). This prevents global style clashes.
- **CSS Variables for Theming:** Theme-dependent values (colors, backgrounds) are defined as CSS variables in `src/index.css` under the `:root` (light theme) and `[data-theme="dark"]` selectors. Components must consume these variables (e.g., `color: var(--node-text);`) for automatic theme adaptation.
- **Border Tone Consistency:** When defining tone-specific borders, ensure the visual lightness hierarchy is maintained. `--tone-light` should always be visually lighter than `--tone-dark` in both light and dark themes.

### 1.3. Component Structure & Naming
- **Folder Organization (`src/`):**
    - `components/`: Reusable React components (e.g., `TimelineNodeComponent.tsx`, `ThemeSwitcher.tsx`).
    - `hooks/`: Custom React hooks, often encapsulating logic for state interaction or side effects (e.g., `useYjs.ts`, `useNodes.ts`).
    - `services/`: Encapsulates business logic and data manipulation, especially interactions with the Y.js document (e.g., `NodeService.ts`, `SessionManager.ts`).
    - `layout/`: Pure functions (Layout Adapters) that calculate visual positioning from data (e.g., `LinearAdapter.ts`, `ZigZagAdapter.ts`).
    - `logic/`: Pure business logic not directly tied to a service or UI (e.g., `PaletteEnforcer.ts`).
    - `utils/`: Generic, reusable utility functions (e.g., `debounce.ts`).
    - `types/`: Shared TypeScript type and interface definitions.
- **Component Naming:** PascalCase for component files and names (e.g., `MyComponent.tsx`).
- **CSS Module Naming:** kebab-case for CSS module files (e.g., `my-component.module.css`).

### 1.4. React Best Practices
- **Memoization:** Use `React.memo` for functional components that re-render frequently with the same props, especially if their parent re-renders. This is crucial for performance and avoiding UI bugs (e.g., preventing `contentEditable` fields from losing focus during layout recalculations).
- **`useCallback` / `useMemo`:** Utilize these hooks for optimizing expensive computations or preventing unnecessary re-renders due to referential inequality of functions/objects passed as props to memoized children.
- **Controlled vs. Uncontrolled Components:** For `contentEditable` elements, carefully manage the synchronization between React state/props and the DOM's `innerText`. If an element is actively being edited, avoid programmatic updates to `innerText` to prevent cursor jumps or loss of focus. The `HighlightableText` component's `useEffect` logic is a good example of this pattern (`document.activeElement !== editorRef.current`).

## 2. Architectural Patterns & Core Technologies

### 2.1. Y.js for Collaborative State Management
- **Central Source of Truth:** The entire application state is primarily managed by a singleton Y.js document (`ydoc`). This enables real-time, multi-client collaboration out-of-the-box.
- **Reactive Hooks:** Custom hooks (e.g., `useNodes`) are used to subscribe to changes in the Y.js document and update React component state.
- **Transactions:** Always wrap multiple Y.js modifications within `ydoc.transact(() => { ... });` to ensure atomicity, optimize performance, and prevent intermediate state propagation.

### 2.2. Two-Pass Layout / Dynamic Sizing
- **Measurement Strategy:** Components that require dynamic sizing (like nodes with variable text content) are rendered, then their actual dimensions are measured using `ResizeObserver`. These measured dimensions are then fed back into a layout calculation.
- **Layout Adapters:** Pure functions (`LinearAdapter.ts`, `ZigZagAdapter.ts`) calculate `(x, y)` positions based on node data and measured dimensions.
- **Initial Render Fallback:** During the initial render (before dimensions are fully measured), a fallback to default dimensions is used to prevent layout errors and ensure immediate visibility.

### 2.3. Responsive UI with "Peel-Off" Logic
- **Sideboard:** The main responsive panel uses a `ResizeObserver` to monitor its own available vertical height.
- **Tab Management:** Content sections (`Meta`, `Palette`, `Legacies`) are dynamically grouped into tabs based on a "Peel-Off" priority queue. If vertical space is constrained, lower-priority sections move to their own tabs.

## 3. Security Standards

While this project is a client-side application, certain security considerations are relevant:

### 3.1. `contentEditable` Usage
- **XSS Risk:** `contentEditable` fields, especially when combined with `dangerouslySetInnerHTML`, can be a source of Cross-Site Scripting (XSS) vulnerabilities if user input is directly rendered without sanitization. In this project, `innerText` is used for input values, which mitigates direct HTML injection for text content. However, if any `dangerouslySetInnerHTML` is used with user-provided data, ensure thorough sanitization on input or before rendering.
- **Focus Management:** As observed, improper handling can lead to frustrating UX, but also potentially subtle interaction bugs.

### 3.2. Data Persistence & Export
- **Client-Side Only:** Data is stored in IndexedDB (via `y-indexeddb`) and exported as local JSON files. There is no server-side component for data storage, so traditional server-side security concerns (e.g., SQL injection, API key exposure) are not applicable.
- **File Handling:** The import function directly processes user-provided JSON files. Ensure robust error handling for malformed files. Confirmation dialogs are used for destructive operations like overwriting sessions.

### 3.3. Y.js & Collaboration
- **Signaling Server:** `y-webrtc` relies on public signaling servers for peer discovery. While data is peer-to-peer encrypted, awareness of the signaling server's role in connection establishment is important. For sensitive applications, self-hosting a signaling server would be advisable.
- **Trust Model:** The current application assumes a high trust model among collaborators in a session, as all clients have full read/write access to the shared Y.js document.

## 4. Good Practices / Anti-Patterns to Avoid

-   **Avoid Inline Styles for Layout/Positioning:** Prefer CSS Modules for styling, especially for properties affecting layout (`position`, `top`, `left`, `transform`, `width`, `height`). Inline styles should be reserved for truly dynamic, calculated values.
-   **Beware of `visibility: hidden`:** When measuring elements with `ResizeObserver`, `visibility: hidden` can prevent accurate dimension reporting. Prefer `opacity: 0` or rendering off-screen (but still in the DOM flow) if invisibility during measurement is required.
-   **`contentEditable` Pitfalls:** Be extremely cautious when mixing `contentEditable` with React's rendering lifecycle. Avoid directly setting `innerText` on a focused `contentEditable` element programmatically. Use `useEffect` with `document.activeElement` checks to sync external state only when the element is not active.
-   **Debugging:** When encountering rendering or layout issues, use a methodical, step-by-step debugging approach with `console.log` at critical junctures to trace data flow and state changes. Isolate the problem to the smallest possible unit.
-   **Referential Equality:** Be mindful of `useCallback` and `useMemo` for functions and objects passed as props to memoized components to prevent unnecessary re-renders.
-   **Consistency:** Strive for UI/UX consistency. If one dropdown is a standard browser control, similar dropdowns should follow suit unless there's a strong, justified reason for custom styling.
