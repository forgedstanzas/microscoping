# **Microscope Web: Phase 4 Implementation Plan**

Focus: Customization Engine, Affirmation Logic, Layout Transitions, and Focus Mode.  
Prerequisite: Phase 3 (Logic Systems) completed.

## **1\. Objectives**

1. **View Settings Engine:** Allow users to upload JSON files that control not just colors (CSS), but also Layout Constants (Geometry).  
2. **Affirmation Logic:** Implement the "Yes" list feedback (Green highlighting) parallel to the "No" list.  
3. **Layout Transitions:** Ensure smooth visual movement when switching between Linear and Zig-Zag views.  
4. **Legacy Focus Mode:** Implement the "Spotlight" effect (dimming unrelated content) when interacting with Legacy Threads.

## **2\. Technical Strategy**

### **2.1 The View Settings Engine**

We will create a ViewContext that serves two consumers:

1. **The CSS Root:** Updates CSS Variables (--node-bg, etc.) for styling.  
2. **The Layout Adapters:** Passes geometric constants (zigzagOffset, gapSize) to the JSLA functions.

**Schema:**

interface ViewSettings {  
  theme: Record\<string, string\>; // Maps to CSS vars  
  layout: {  
    adapter: 'linear' | 'zigzag';  
    constants: {  
      cardWidth: number;    // Default 300  
      zigzagOffset: number; // Default 250  
      gapSize: number;      // Default 50  
    }  
  }  
}

### **2.2 Focus Mode Logic (Class-Based)**

Instead of complex conditional rendering, we will use CSS Classes triggered by global state.

* **Global State:** activeLegacyId: string | null  
* **Node Logic:** className={clsx('node', isDimmed && 'dimmed')}.  
* **SVG Logic:** className={clsx('thread', isActive && 'active')}.

## **3\. Step-by-Step Implementation**

### **Step 1: "Yes" List Affirmation**

* **Action:** Update PaletteEnforcer.ts and TimelineNode.tsx.  
* **Logic:**  
  * Extend the fuzzy search to check the Palette.Yes list.  
  * **Priority:** If a word matches *both* (rare), "No" (Ban) takes precedence over "Yes" (Affirmation).  
* **Visuals:**  
  * Add a secondary highlight style: text-decoration: solid underline green or a subtle green background highlight.  
  * Tooltip: *"Encouraged Ingredient: \[Match\]"*.

### **Step 2: View Settings Loader**

* **Action:** Create ViewSettingsService.ts.  
* **Function:** applySettings(settings: ViewSettings).  
  * **Theme:** Iterate settings.theme keys and set document.documentElement.style.setProperty(key, value).  
  * **Geometry:** Dispatch update to the Layout Engine to re-calculate positions using settings.layout.constants.  
* **UI:** Add "Upload View Settings" button to the Settings Tab (Sideboard).

### **Step 3: Layout Transitions (CSS)**

* **Action:** Update TimelineNode.module.css.  
* **CSS Transition:**  
  .node {  
    /\* ...absolute positioning \*/  
    transition: top 0.6s cubic-bezier(0.25, 0.8, 0.25, 1),   
                left 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);  
  }

* **Logic:** When the JSLA switches from Linear to ZigZag, the React component receives new {x, y} props. The CSS transition handles the interpolation (sliding) automatically.  
* **SVG Handling:** The SVG lines reactively re-render based on the anchors. *Note: SVGs might snap rather than animate smoothly without complex libraries. For Phase 4, we accept the snap or simple fade-out/fade-in during transition.*

### **Step 4: Legacy Focus Mode**

* **Action:** Update Sideboard.tsx and Canvas.tsx.  
* **Interaction:**  
  * **Hover/Click Tag (Sideboard):** Sets activeLegacyId.  
* **Canvas Visuals:**  
  * **Nodes:** If activeLegacyId is set and the Node does *not* contain that tag: apply .dimmed (opacity: 0.2; filter: grayscale(100%)).  
  * **Threads:** If activeLegacyId is set, hide all other threads. Set the active thread stroke-opacity: 1 and stroke-width: 6px.  
* **Exit:** Clicking the canvas background clears activeLegacyId.

## **4\. Reversibility & Risk Analysis**

### **A. Transition Performance**

* **Risk:** Animating 500+ nodes simultaneously via CSS top/left might cause layout thrashing on low-end devices.  
* **Mitigation:** Use transform: translate(x, y) instead of top/left. This offloads rendering to the GPU. This requires refactoring the JSLA output to providing "Transform" strings instead of coordinate props, or using a wrapper.  
* **Decision:** We will implement transform based positioning in Phase 4 for performance.

### **B. "Yes" List Noise**

* **Risk:** Common words in the "Yes" list (e.g., "Magic") might result in a document covered in green lines, distracting the user.  
* **Mitigation:** Add a user preference toggle in Settings: "Show Palette Affirmations". Default to **On**.

### **C. View Settings Validity**

* **Risk:** User uploads a JSON with cardWidth: "Huge", crashing the math.  
* **Mitigation:** Use a validation schema (Zod or manual check) before applying settings. Fallback to defaults if invalid.

### **D. Focus Mode Traps**

* **Risk:** User gets "stuck" in Focus mode (everything dimmed) and doesn't know how to exit.  
* **Mitigation:** Display a prominent "Exit Focus Mode" floating badge or button when active, in addition to the "Click Background" behavior.