# **Microscope Web: Phase 5 Implementation Plan**

Focus: Deployment, Lobby UX, Turn Enforcement, PWA, and Education.  
Prerequisite: Phase 4 (Polish) completed.

## **1\. Objectives**

1. **Lobby & Connection:** Implement "Create Room," "Join via Code," and "Join via Link" flows.  
2. **Turn Management:** Implement "Tabletop Mode" (Free edit) vs. "Strict Mode" (Locked edits based on Lens).  
3. **PWA Integration:** Configure the app to be installable and offline-capable.  
4. **Education:** Build an interactive Tutorial overlay and a searchable Rules Reference.

## **2\. Technical Strategy**

### **2.1 PWA Strategy (Vite Plugin)**

We will use vite-plugin-pwa.

* **Strategy:** "Cache First" for assets (JS/CSS/Images).  
* **Update Logic:** "Prompt on Update." If we deploy a new version, the user sees a "New Version Available \- Refresh?" toast notification.

### **2.2 Turn Logic (State Machine)**

* **State:** The Y.js meta map will hold:  
  interface GameMeta {  
    isStrictMode: boolean; // Toggle  
    activePlayerId: string; // PeerID of current Lens  
    turnPhase: 'focus' | 'make\_history' | 'legacy'; // Optional tracking  
  }

* **Enforcement:**  
  * **UI Layer:** If isStrictMode && myId \!== activePlayerId, disable the "Add Node" buttons and "Edit Text" inputs.  
  * **Host Override:** The Host always retains "God Mode" permissions to fix mistakes or force-skip turns.

## **3\. Step-by-Step Implementation**

### **Step 1: The Lobby & Connection UX**

* **Action:** Create Lobby.tsx and ConnectionManager.ts.  
* **Flows:**  
  1. **Create:** Generates a 3-word slug (e.g., apple-banana-carrot) mapped to the Y.js Room ID.  
  2. **Join (Manual):** Input field for the 3-word code.  
  3. **Join (Link):** useEffect checks window.location.search for ?room=.... If found, bypass Lobby and auto-connect.  
* **Visuals:** A clean "Title Screen" with a "Recent Sessions" list (pulled from IndexedDB meta-data).

### **Step 2: Turn Management System**

* **Action:** Update Sideboard.tsx (Meta Tab) and Canvas.tsx.  
* **UI \- Host Controls:**  
  * Toggle Switch: "Strict Turn Order".  
  * Dropdown: "Current Lens" (List of connected peers).  
* **UI \- Player Feedback:**  
  * **Active:** Green "It's your turn\!" banner.  
  * **Waiting:** Grey "Waiting for \[Name\]..." banner. Inputs disabled.  
* **Logic:**  
  * Wrap TimelineNode inputs in a TurnGuard component.  
  * TurnGuard checks (\!isStrictMode || isMyTurn || isHost) before allowing interaction.

### **Step 3: PWA & Offline Support**

* **Action:** Install vite-plugin-pwa.  
* **Configuration (vite.config.ts):**  
  * Generate manifest.json: Name "Microscope Web", Theme Color \#222, Icons.  
  * Generate sw.js: Precaching of all build assets.  
* **UI:** Add an "Install App" button in the Settings tab (only visible if the browser supports beforeinstallprompt).

### **Step 4: Tutorial & Rules Reference**

* **Action:** Create TutorialOverlay.tsx and RulesModal.tsx.  
* **Rules Reference:**  
  * Convert the PDF text into a rules.json (Section Title \-\> Content).  
  * Implement a Modal with a Search Bar (Fuse.js) to filter rules (e.g., searching "Push" shows the "Creative Conflict" section).  
* **Tutorial Mode (Interactive):**  
  * State: tutorialStep (0-5).  
  * **Step 1:** Highlight "Add Period" button. "Click here to create the Start Bookend."  
  * **Step 2:** Highlight Description. "Define the starting era."  
  * **Step 3:** Highlight Palette. "Banned ingredients go here."  
  * *Implementation:* A transparent overlay with a "Spotlight" (high z-index cutout) over the relevant UI element.

## **4\. Reversibility & Risk Analysis**

### **A. "Strict Mode" Frustration**

* **Risk:** The game gets stuck because the Active Player went AFK.  
* **Mitigation:** The Host always has Override permissions. We explicitly state this in the UI: *"Host can force-change the active player at any time."*

### **B. PWA Caching Issues**

* **Risk:** Users don't see critical bug fixes because the old version is cached.  
* **Mitigation:** The vite-plugin-pwa "Prompt for Update" strategy ensures users are explicitly told when to refresh for new code.

### **C. Room Code Collision**

* **Risk:** Two groups get "apple-banana-carrot".  
* **Mitigation:** The "Slug" is just a friendly alias. The actual Y.js Room ID is a UUID. The "Slug" maps to the UUID via a specialized hash or (in a serverless future) a simple KV store. *For Phase 5 (Serverless), we will rely on the raw UUID in the URL for absolute uniqueness, and use the 3-word slug only for local network discovery or short-lived sessions if a KV store is available. Otherwise, we default to UUIDs for safety.*

### **D. Mobile Interactions**

* **Risk:** Drag-and-drop on tablets feels janky (scrolling vs. moving nodes).  
* **Mitigation:** We use react-use-gesture or dnd-kit which handles the distinction between "Touch to Scroll" and "Long-Press to Drag" automatically.