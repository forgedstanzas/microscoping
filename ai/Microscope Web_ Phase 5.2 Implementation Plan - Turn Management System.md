# Microscope Web: Phase 5.2 Implementation Plan - Turn Management System

## 1. Objectives
- Implement a turn-based system allowing only one user to make modifications at a time.
- Provide a clear UI indicator of whose turn it is.
- Enable the current turn holder to pass the turn to another connected user.

## 2. Technical Strategy

### 2.1. Y.js `meta` Map for Turn State
- Introduce a new `META_KEY` in `src/types/meta.ts` (e.g., `activePlayerId`) to store the `peerId` of the current turn holder.
- The `YjsProvider` will be responsible for initializing `activePlayerId` upon session creation (e.g., set to host's `peerId`).

### 2.2. New `TurnService` (or extension to `NodeService`)
- Create a new service `TurnService.ts` or extend `NodeService.ts` with turn-management methods.
- Method: `passTurn(newActivePlayerId: string)`:
    - Validates `newActivePlayerId` is a currently connected peer.
    - Updates `activePlayerId` in the `meta` map.
- Method: `requestTurn()` (optional, for future expansion):
    - Allows a user to request the turn from the current holder.

### 2.3. Permission Enforcement
- Modify relevant methods in `NodeService.ts` (e.g., `addNode`, `updateNode`, `deleteNode`) to check `activePlayerId` from `useMeta()`.
- If the current user's `peerId` does not match `activePlayerId`, actions should be prevented or visually disabled.

## 3. UI Implementation

### 3.1. Turn Indicator
- Display the username associated with `activePlayerId` in a prominent UI element (e.g., in `SideboardSettings.tsx` or a new overlay).
- Leverage `useMeta()` to reactively display the current turn holder.

### 3.2. Pass Turn Mechanism
- Add a "Pass Turn" button or dropdown in `SideboardSettings.tsx` (or similar location).
- The button should only be active for the current `activePlayerId`.
- The dropdown should list connected peers (available from `useYjsContext().peers`) to select the next turn holder.
- On selection, call `TurnService.passTurn()`.

### 3.3. Visual Feedback for Non-Turn Holders
- Visually indicate when a user does not have the turn (e.g., disable input fields for node content, show a "waiting for turn" message).

## 4. Step-by-Step Implementation

### Step 1: Define `META_KEY` for `activePlayerId`
- Update `src/types/meta.ts` with `activePlayerId`.
- Update `src/hooks/useMeta.ts` to expose `activePlayerId`.

### Step 2: Implement `TurnService` (or extend `NodeService`)
- Create `src/services/TurnService.ts` (if new service) or add methods to `NodeService.ts`.
- Integrate `TurnService` into `YjsProvider` for instantiation and context provision.

### Step 3: Enforce Permissions
- Modify `NodeService` methods to prevent non-turn holders from making changes.

### Step 4: Implement UI for Turn Indicator and Pass Turn
- Update `SideboardSettings.tsx` (or create new component) to display the current turn holder and the "Pass Turn" control.

## 5. Ambiguities & Future Risks
- **Conflict Resolution:** How to handle scenarios where multiple users attempt to pass the turn simultaneously. Y.js's conflict resolution should handle this for the `meta` map, but UI feedback needs to be clear.
- **Disconnected Turn Holder:** What happens if the `activePlayerId` disconnects? The `YjsProvider`'s host election logic might need to be extended to automatically pass the turn to the new host or a randomly selected peer.
