# **Microscope Web: Phase 1 Implementation Plan**

**Focus:** Core Foundation, Networking, Persistence, and Basic Canvas Interaction.

## **1\. Architecture & Tech Stack**

| Component | Technology | Reasoning | Reversibility Score |
| :---- | :---- | :---- | :---- |
| **Build Tool** | Vite \+ React \+ TypeScript | Industry standard, fast HMR. | **High** (Easy to swap to Next.js later if needed) |
| **Styling** | CSS Modules \+ CSS Variables | Scoped styles prevent conflicts; Variables allow instant theming. | **Medium** (Refactoring to Tailwind later would be tedious) |
| **State/Network** | **Y.js** (y-webrtc) | Handles decentralized sync and conflict resolution. | **Very Low** (Core architecture; replacing this is a rewrite) |
| **Persistence** | **IndexedDB** (idb-keyval) | Offline-first capability for large datasets. | **Medium** (Swapping to localStorage is easy, but migrating schema is hard) |
| **Canvas** | react-zoom-pan-pinch | handles matrix math for infinite canvas. | **Medium** (Easy to swap wrapper, but layout logic depends on it) |

## **2\. Data Schema (TypeScript Interfaces)**

We will use a **Map \+ List** approach for Y.js to ensure robust reordering and quick lookups.

// src/types/timeline.ts

export type NodeTone \= 'light' | 'dark';  
export type NodeType \= 'period' | 'event' | 'scene';

export interface TimelineNode {  
  id: string;              // UUID  
  type: NodeType;  
  parentId: string | null; // Null for top-level Periods  
    
  // Content  
  title: string;  
  description: string;  
    
  // State  
  tone: NodeTone;  
  isGhost: boolean;        // Visual: dotted border  
  isBookend: boolean;      // True for Start/End cards  
    
  // Positioning  
  order: number;           // Fractional index for sorting  
}

// Y.js Data Model Structure  
// \-------------------------  
// yDoc.getMap('nodes') \-\> Maps ID to TimelineNode  
// yDoc.getMap('meta')  \-\> Stores title, focus, lens  
// yDoc.getMap('palette') \-\> Stores yes/no lists

## **3\. Step-by-Step Implementation**

### **Step 1: Project Scaffolding**

* **Goal:** A running React app with TypeScript and CSS Modules set up.  
* **Actions:**  
  1. Initialize Vite project: npm create vite@latest microscope-web \-- \--template react-ts  
  2. Install core dependencies: npm install yjs y-webrtc idb-keyval uuid react-zoom-pan-pinch clsx  
  3. Setup CSS Variables in src/index.css:  
     :root {  
       \--node-bg: \#ffffff;  
       \--node-text: \#000000;  
       \--canvas-bg: \#f0f0f0;  
       \--tone-light: \#ffffff;  
       \--tone-dark: \#333333;  
     }  
     @media (prefers-color-scheme: dark) { ... }

### **Step 2: The Data Layer (Y.js \+ Persistence)**

* **Goal:** Data creates, updates, and persists to IndexedDB automatically.  
* **Actions:**  
  1. Create src/hooks/useYjs.ts:  
     * Initialize Y.Doc.  
     * Connect WebrtcProvider to public signaling servers.  
     * Add IndexeddbPersistence provider.  
  2. Create NodeService.ts:  
     * addNode(node): Wraps Y.js transaction.  
     * updateNode(id, fields): Helper for partial updates.  
     * deleteNode(id): Removes from Map.

### **Step 3: Initialization Logic**

* **Goal:** The canvas is never blank.  
* **Actions:**  
  1. In App.tsx (inside a useEffect), check yDoc.getMap('nodes').size.  
  2. If size is 0 (First load):  
     * Create **Start Period** (Type: Period, IsBookend: True, Order: 0).  
     * Create **End Period** (Type: Period, IsBookend: True, Order: 1).  
     * Commit transaction.

### **Step 4: Canvas & Layout (The "JSLA" V1)**

* **Goal:** Render nodes on an infinite canvas in a linear layout.  
* **Actions:**  
  1. Implement **LinearJSLA** (JavaScript Layout Adapter):  
     * Input: List of Nodes.  
     * Logic: Filter Periods \-\> Sort by order. Assign X \= index \* 300px.  
     * Output: Map of { \[id\]: { x, y } }.  
  2. Create Canvas.tsx:  
     * Wrap content in TransformWrapper & TransformComponent.  
     * Render a div for every Node using absolute positioning from the JSLA.

### **Step 5: Node Components & Interaction**

* **Goal:** Visual cards that look like the design requirements.  
* **Actions:**  
  1. Create TimelineNode.module.css:  
     * .node: Absolute position, transition on transform.  
     * .light: border: 4px solid white.  
     * .dark: border: 4px solid black (or hashed pattern).  
     * .ghost: border-style: dotted; backdrop-filter: blur(4px).  
  2. Create TimelineNode.tsx:  
     * Render Title/Description.  
     * Tone Toggle Button (Click to flip Light/Dark).  
     * Ghost Toggle (Right-click or menu).

## **4\. Reversibility & Risk Analysis**

This section analyzes "How hard is this to change later?" for decisions made in Phase 1\.

### **A. Switching from Y.js to a Central Server (SQL/Node.js)**

* **Difficulty:** **Extreme (9/10)**  
* **Why:** The app assumes synchronous, local data availability. Moving to a REST/GraphQL API would require rewriting every data hook, adding loading states, and handling optimistic UI updates manually.  
* *Mitigation:* We are committed to Peer-to-Peer.

### **B. Changing the Layout Logic (JSLA)**

* **Difficulty:** **Low (2/10)**  
* **Why:** We are decoupling "Data" from "Visual Position." The LinearJSLA is just a function that returns X/Y coordinates. Replacing it with a "ZigZagJSLA" later is just writing a new math function; the components don't care.

### **C. Changing the "Ghost Node" Visuals**

* **Difficulty:** **Trivial (1/10)**  
* **Why:** This is purely CSS. We update .ghost class in TimelineNode.module.css and it propagates instantly.

### **D. Moving Start/End Bookends**

* **Difficulty:** **Medium (5/10)**  
* **Why:** If we decide later that Bookends aren't pinned to the far left/right, we need to update the LinearJSLA math to treat them like normal nodes. The data structure supports this (isBookend is just a flag), but the sorting logic would need adjustment.

### **E. Changing Persistence (IndexedDB \-\> Cloud Save)**

* **Difficulty:** **Medium-High (7/10)**  
* **Why:** Currently, "Save" means "Local." Adding Cloud Save implies User Auth (Login/Signup), which is currently out of scope. The database code is isolated, but the *user flow* would change drastically.