# **Microscope Web: Phase 4.1 Implementation Plan**

Focus: Metadata Tab Content, User Identity Synchronization, and Host Privileges.  
Assumption: All previous phases, including the Phase 3 Sideboard structure, are complete.

## **1\. Objectives**

1. **Identity Synchronization:** Store and share usernames of all connected peers.  
2. **Host Election:** Define and store the ID of the session Host (First user to connect).  
3. **Metadata Tab UI:** Implement dynamic read/write fields for History Title, Focus, Current Lens, and Host Controls.

## **2\. Technical Strategy: Y.js Updates**

We must update the shared state to handle user identities and host authority.

### **2.1 Updating Global Metadata (Y.Map('meta'))**

We will add two new fields to the meta map:

| Field | Type | Description |
| :---- | :---- | :---- |
| hostId | string (PeerID) | The ID of the user with administrative rights. Set once on game creation. |
| isStrictMode | boolean | Host control for enabling/disabling turn enforcement. |

### **2.2 Shared Peer Registry (Y.Map('peers'))**

Since the list of connected peers is dynamic, we need a separate map to store their public data, indexed by their unique PeerID.

| PeerID Key | Value (Object) | Description |
| :---- | :---- | :---- |
| \[peer-uuid-1\] | { username: 'Alice', isHost: true } | Stores the user's chosen name. Used to populate the "Current Lens" dropdown. |

## **3\. Step-by-Step Implementation**

### **Step 1: Peer Identity and Host Setup**

* **Action:** Update ConnectionManager.ts and useYjs.ts.  
* **Initial Setup Logic:**  
  1. On first connection, if Y.Map('meta').get('hostId') is **undefined**, the current user sets themselves as the Host: Y.Map('meta').set('hostId', myPeerId).  
  2. User's local username (from the Lobby) is added to the shared peer registry: Y.Map('peers').set(myPeerId, { username: myUsername }).  
* **Disconnection Handling:** Use provider.on('disconnect', ...) to remove the user's entry from Y.Map('peers'). *Host migration is not required here, as the host's identity only grants UI write access.*

### **Step 2: Component: Metadata Tab (MetadataTab.tsx)**

* **Action:** Create the main content component for the Sideboard.  
* **Data Hooks:** Subscribe to changes in Y.Map('meta') and Y.Map('peers').  
* **Host Check:** Define const isHost \= myPeerId \=== Y.Map('meta').get('hostId'). This determines if inputs are writable.

### **Step 3: Implementing Metadata Fields (Read/Write)**

| Field | UI Component | Write Permissions | Implementation Detail |
| :---- | :---- | :---- | :---- |
| **History Title** | Editable Text Input | All Peers (Collaborative) | Binds to Y.Map('meta').get('title'). |
| **Current Focus** | Editable Text Input | All Peers (Collaborative) | Binds to Y.Map('meta').get('focus'). |
| **Current Lens** | Dropdown Select | **Host Only** (if Strict Mode is enabled) | Populates options from Y.Map('peers') usernames. Host sets Y.Map('meta').set('activePlayerId', selectedPeerId). |
| **Turn Mode** | Toggle Switch | **Host Only** | Toggles Y.Map('meta').set('isStrictMode', boolean). |

### **Step 4: Displaying Connected Peers**

* **Action:** Inside MetadataTab.tsx, render a list of connected users.  
* **Logic:** Iterate through the values of Y.Map('peers').  
  * Display username.  
  * Display (Host) next to the user whose ID matches hostId.  
  * Highlight the user whose ID matches activePlayerId (The Current Lens).

## **4\. Ambiguities & Future Risks**

| Issue | Resolution | Risk/Note |
| :---- | :---- | :---- |
| **Host Leave** | The hostId persists. If the Host leaves, Host privileges are lost for the session. | **Risk: High.** No one can turn Strict Mode off or fix the Lens order. Phase 6 should implement **Host Re-Election** (e.g., first peer to detect the Host leaving claims the role). |
| **Username Collisions** | Two users named "Alice" connect. | We will display **"(Host)"** and **"(Lens)"** clearly, but otherwise rely on their unique PeerIDs. No need for complex name conflict resolution in this phase. |
| **Current Lens Start** | When a game starts, the Lens should be the Host. | The Initialization Logic (Phase 1\) must be updated to set activePlayerId equal to hostId when the Bookends are created. |

