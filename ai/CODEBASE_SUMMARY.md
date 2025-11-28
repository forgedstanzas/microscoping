# Codebase Summary for AI Development

*This document reflects the architecture as of the completion of the major refactoring phase. It is the new source of truth.*

This summary provides a high-level overview of the `microscope-web` codebase, focusing on the current architectural patterns and established conventions. Adhering to these patterns is critical for efficient and safe development by both human and AI authors.

---

## 1. Core Architectural Pattern: Provider/Context

The application's architecture is now centered around a **Provider/Context** model. Global state and services are managed in React Contexts and accessed by components via custom hooks. This pattern eliminates "prop drilling" and decouples components.

The providers are nested in `src/main.tsx` in the following order:

1.  `ThemeProvider`: Manages light/dark theme.
2.  `ModalProvider`: Provides a global, non-blocking modal/alert system (`useModal`).
3.  **`YjsProvider`**: The heart of the application. It manages all collaborative state and services.
4.  **`UIStateProvider`**: Manages global, non-collaborative UI state.

### 1.1. The `YjsProvider` and `useYjsContext`

This is the most critical part of the architecture.
- **Responsibilities:** The `YjsProvider` (`src/context/YjsContext.tsx`) handles the entire lifecycle of a collaborative session. This includes:
    - Determining the `roomId` from the URL or the `Lobby`.
    - Initializing the core `useYjs` hook to get the `Y.Doc` and connection status.
    - **Instantiating all services** (`NodeService`, `SessionManager`) and scoping them to the current `ydoc`.
    - Handling all top-level session logic (e.g., creating bookend nodes, host election, saving to recent sessions).
- **Access:** Components **must** access all Y.js-related state and services through the `useYjsContext()` hook.
- **Example:**
  ```typescript
  import { useYjsContext } from '../context/YjsContext';

  function MyComponent() {
    const { ydoc, services, myPeerId, peers } = useYjsContext();
    // ... use services.nodeService or other context values
  }
  ```

### 1.2. The `UIStateProvider` and `useUIState`
- **Responsibilities:** Manages global UI state that is **not** collaborative and does not need to be saved in the Y.js document. This includes state like the current layout mode or focus mode.
- **Access:** Components access this state via the `useUIState()` hook.

---

## 2. State Management Strategy

The application now has a clear, three-tiered state management strategy.

1.  **Collaborative State (Y.js):** All data that must be shared between users and persisted is stored in the `Y.Doc`. This is managed exclusively within `YjsProvider`.
2.  **Global UI State (React Context):** Shared, non-collaborative UI state is managed by `UIStateProvider`.
3.  **Local Component State (`useState`):** State that is local to a single component and doesn't affect others (e.g., `isCollapsed` for a dropdown) is managed with standard `useState` or `useRef`.

---

## 3. Service Layer and Data Access

### 3.1. Instantiated, Context-Aware Services
- **Pattern:** Services like `NodeService` and `SessionManager` are now **classes**, not collections of static functions.
- **Lifecycle:** They are instantiated **once** inside `YjsProvider` when the `ydoc` becomes available.
- **Access:** Service instances are provided through `YjsContext` and **must** be accessed via `useYjsContext().services`.
- **Example:**
  ```typescript
  const { services } = useYjsContext();
  services.nodeService.addNode({ type: 'period', ... });
  ```

### 3.2. Strongly-Typed Metadata (`meta` map)
- **Schema:** The structure of the global `meta` map is defined by the `MetaMapSchema` interface and the `META_KEYS` constants in `src/types/meta.ts`.
- **Reading Data (Reactive):** To read data from the `meta` map in a UI component, **use the `useMeta()` hook**. This hook provides a reactive, strongly-typed JavaScript object with the latest metadata.
  ```typescript
  import { useMeta } from '../hooks/useMeta';
  const { historyTitle, hostId } = useMeta();
  ```
- **Writing Data:** To write data to the `meta` map, use the specific, typed setter methods on the `nodeService` instance.
  ```typescript
  const { services } = useYjsContext();
  services.nodeService.setHistoryTitle('A New Saga');
  ```

---

## 4. Key Logic Flows

### Application Startup
1.  `main.tsx` renders all providers, with `<App />` as the child.
2.  `YjsProvider` takes control. It checks for a `roomId`.
3.  If no `roomId` exists, it renders the `<Lobby />`.
4.  If a `roomId` is found (or chosen in the Lobby), `YjsProvider` initializes `useYjs`, creates the service instances, runs startup effects (host election, etc.), and finally renders its `children` (`<App />`).
5.  `<App />` and its children render, accessing all necessary state and services from the context hooks.

### Component Data Interaction (Example)
**Task:** A button in `MyComponent` needs to update the history title.
1.  **Get the service:** `const { services } = useYjsContext();`
2.  **Call the typed setter:** `onClick={() => services.nodeService.setHistoryTitle('New Title')}`
3.  Separately, a `DisplayComponent` shows the title.
4.  **Get the typed, reactive data:** `const { historyTitle } = useMeta();`
5.  **Render it:** `return <h1>{historyTitle}</h1>;`
The `useMeta` hook ensures `DisplayComponent` automatically re-renders when the title changes.

---

## 5. New Conventions & Anti-Patterns to AVOID

-   **DO NOT** pass `ydoc`, `meta`, `peers`, or `services` as props. Components must get this state from the `useYjsContext` or `useMeta` hooks.
-   **DO NOT** import `NodeService` or `SessionManager` directly into a component to call a method. Get the *instance* from `useYjsContext().services`.
-   **DO NOT** use `meta.get('some-string')` inside a UI component. Use the `useMeta()` hook to get a reactive, typed object.
-   **DO** continue to follow existing conventions like **Type-Only Imports** and **CSS Modules**.