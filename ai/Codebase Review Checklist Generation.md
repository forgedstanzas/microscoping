

# **Architectural Audit and Engineering Standards Review: Local-First Collaborative Environments**

## **1\. Architectural Paradigm Shift: The Local-First Collaborative Model**

The software architecture described in the provided codebase summary represents a significant departure from traditional client-server paradigms, adopting a "Local-First" methodology that prioritizes client-side autonomy, real-time collaboration, and data sovereignty. By leveraging **TypeScript**, **React**, and **Y.js** within a peer-to-peer (P2P) network topology orchestrated via **WebRTC**, the system fundamentally redistributes the responsibilities of persistence, logic, and security from a centralized backend to the distributed browser environment.1 This architectural pivot, while offering substantial benefits in terms of latency reduction and offline resilience, introduces a complex set of engineering challenges that require rigorous analysis.

In a conventional Model-View-Controller (MVC) application, the server acts as the authoritative source of truth, managing state synchronization, access control, and data validation. Conversely, this application relies on a "High Trust" model where the **Y.js document (ydoc)** serves as the decentralized Central Source of Truth.1 This ydoc is replicated across all connected peers, meaning that the integrity of the application state relies entirely on the correctness of the Conflict-free Replicated Data Type (CRDT) merge operations and the security of the client runtime environment. The absence of a central gatekeeper for data operations necessitates a defensive programming strategy that treats all peer inputs as potentially untrusted, despite the trust model implied by the business logic.

The decision to utilize **IndexedDB** for persistence via y-indexeddb 1 solidifies the device-centric nature of the application. Unlike cloud-native applications where data "lives" on a server and is cached on the client, here the data "lives" on the client and is merely synchronized with peers. This inversion renders traditional server-side security mechanisms—such as SQL injection prevention or API rate limiting—irrelevant, as noted in the summary, but it simultaneously elevates the importance of client-side encryption, quota management, and Man-in-the-Middle (MITM) protection.2 The following report dissects these components, analyzing the implications of the technology stack on security posture, rendering performance, and accessibility compliance.

### **1.1 The Role of Conflict-Free Replicated Data Types (CRDTs)**

At the core of the collaboration engine is Y.js, a high-performance CRDT library. The system uses a specialized data binding approach where the ydoc acts as a distributed database. The application's architecture must account for the unique characteristics of CRDTs, specifically the monotonic growth of document history. In a collaborative session, every character insertion and deletion is preserved as a "tombstone" to ensure eventual consistency across peers who may go offline and reconnect later.3  
The summary indicates that Y.js manages the shared state for nodes, positioning, and text content.1 This implies that the application's memory footprint is directly correlated with the longevity and activity of the collaborative session. As the history grows, the computational cost of applying updates and the memory required to store state vectors increases. While Y.js is highly optimized, the "High Trust" model suggests that clients sync the entire document history upon connection.4 This presents a scalability bottleneck that must be addressed through sub-document architectures or garbage collection strategies, discussed in later sections.

---

## **2\. Network Topology and Signaling Security**

The communication layer, built on **WebRTC** (y-webrtc), establishes a mesh network where peers communicate directly. While the data transfer itself is peer-to-peer, the establishment of these connections relies on a signaling server to exchange Session Description Protocol (SDP) offers and Interactive Connectivity Establishment (ICE) candidates.5 This signaling phase represents the most critical attack surface in the described architecture.

### **2.1 Signaling Server Vulnerabilities and MITM Attacks**

The summary mentions reliance on public signaling servers for peer discovery.1 In the WebRTC protocol, signaling is "out-of-band," meaning it is not defined by the standard and is not protected by the WebRTC encryption layer (DTLS-SRTP) that secures the media/data stream itself.6  
The signaling server acts as a matchmaker. If an actor controls the signaling server or can intercept traffic to it (Man-in-the-Middle), they can manipulate the connection establishment process.

* **Identity Spoofing:** An attacker can intercept an SDP offer from Peer A and forward it to a malicious Peer M instead of the intended Peer B. Peer A effectively establishes a secure WebRTC connection with the attacker, believing they are Peer B.7  
* **Traffic Redirection:** By injecting false ICE candidates, an attacker can force traffic to route through a compromised TURN server or relay, allowing for metadata analysis or denial-of-service (DoS) attacks.7  
* **Session Injection:** Public signaling servers typically lack strict authentication. Any user who discovers the "Room Name" (the identifier used to group peers) can join the mesh. Since the application uses a "High Trust" model, a malicious user who successfully joins the signaling room will receive the full Y.js document state immediately upon connection.4

Mitigation Strategy:  
The analysis indicates that relying on public signaling servers is insufficient for a production-grade application handling potentially sensitive data. The implementation of a Secure, Authenticated Signaling Server is mandatory. This server should enforce:

1. **Room-Level Authentication:** Before a client can upgrade to a WebSocket connection for signaling, they must present a valid cryptographic token (e.g., JWT) proving they are authorized to access that specific room ID.9  
2. **Encryption of Signaling Traffic:** All signaling traffic must occur over **WSS (WebSocket Secure)** or **HTTPS** to prevent passive eavesdropping on the SDP exchange.9

### **2.2 Network Address Translation (NAT) and Privacy Leaks**

WebRTC creates direct connections between clients. To achieve this, clients must exchange their IP addresses. In many network environments (corporate offices, mobile networks), clients are behind NATs and cannot be reached directly.

* **STUN (Session Traversal Utilities for NAT):** STUN servers allow clients to discover their public IP address. However, this public IP is then broadcast to every other peer in the mesh. In a corporate environment, revealing the internal or public IP topology to external peers constitutes a privacy leak and a potential security risk.9  
* **TURN (Traversal Using Relays around NAT):** When direct P2P connection fails (e.g., Symmetric NAT), a TURN server relays the traffic.  
* **The Privacy Vulnerability:** Without a configured TURN server that forces relaying (or strictly configured ICE policies), the application leaks user IP addresses by default. This allows any peer in the room to map the geographical location and network provider of every other peer.6

**Table 1: WebRTC Server Infrastructure Analysis**

| Server Type | Function | Security Implication in P2P Mesh | Recommendation |
| :---- | :---- | :---- | :---- |
| **Signaling** | Exchanges SDP/ICE data to initiate calls. | **High Risk.** If public/unsecured, allows unauthorized peers to join the mesh and sync data. | deploy custom server with JWT auth. |
| **STUN** | Discovers public IP address for P2P connection. | **Medium Risk.** Exposes user's public IP to all peers. | Use standard STUN but warn users of IP exposure. |
| **TURN** | Relays traffic when P2P fails (Symmetric NAT). | **High Value.** Masks user IP if forced; essential for corporate firewalls. | Mandatory for enterprise use; requires auth credentials. |

### **2.3 Peer-to-Peer Topologies: Mesh vs. Star**

The y-webrtc provider defaults to a **Full Mesh** topology, where every client connects to every other client. The number of connections grows quadratically ($N(N-1)/2$).

* **Scalability Limits:** As the number of collaborators increases, the CPU and bandwidth required to maintain distinct encrypted streams for each peer becomes prohibitive. Research suggests that browser performance degrades significantly beyond 4-6 active peers in a full mesh for video, though data channels (used by Y.js) can scale slightly higher.10  
* **Performance Bottleneck:** Each WebRTC connection requires its own heartbeat, encryption handshake, and state maintenance. In a large collaboration session (e.g., 20+ users), the overhead of maintaining the mesh can saturate the client's network stack, leading to sync latency or "split-brain" scenarios where the document state diverges.8

Architectural Insight:  
For sessions exceeding 10 users, the architecture should transition from a pure Mesh to a Star Topology (using y-websocket as a central relay) or a hybrid SFU (Selective Forwarding Unit) approach. While y-webrtc is excellent for serverless prototypes, it lacks the scalability for enterprise-grade deployment without a super-peer or relay server.12

---

## **3\. Data Persistence and Client-Side Cryptography**

The application eschews a server-side database in favor of **IndexedDB** for data persistence.1 This "Local-First" approach empowers users with ownership of their data but strips away the physical security guarantees of a data center. The data resides on the user's device, often a laptop or mobile phone, which is susceptible to theft, loss, or unauthorized access.

### **3.1 The "Encryption at Rest" Fallacy**

Browsers do not encrypt IndexedDB storage. The underlying files (often LevelDB or SQLite blobs) are stored in the user's profile directory in plaintext. Any malware running with user privileges, or any individual with physical access to the unlocked machine, can copy these files and extract the Y.js document history.14  
The summary notes that "server-side security concerns... are not applicable".1 This implies a dangerous assumption that client-side storage is secure by isolation. In reality, the absence of a server boundary makes the client device the single point of failure for data confidentiality.

### **3.2 Web Crypto API Implementation Strategy**

To secure this data, the application must implement application-level encryption using the **Web Crypto API**. This standard provides low-level cryptographic primitives that are optimized for the browser.

* **Key Generation:** The application must generate a strong symmetric key (e.g., **AES-GCM 256-bit**) for encrypting the ydoc updates before they are written to IndexedDB.16  
* **Key Storage and Wrapping:** Storing the encryption key alongside the encrypted data (e.g., in localStorage) defeats the purpose. The Best Practice is **Key Wrapping**.  
  1. The user provides a password or passphrase.  
  2. A **Key Derivation Function** (PBKDF2 or Argon2) derives a "Key-Wrapping Key" (KWK) from the password \+ a random salt.  
  3. The actual Data Encryption Key (DEK) is encrypted (wrapped) using the KWK.  
  4. Only the wrapped key and the salt are stored.  
     This ensures that the data cannot be decrypted without the user's password, providing true encryption at rest.17

Implementation Detail: extractable: false  
When generating the DEK, it should be marked as { extractable: false }. This flag instructs the browser that the raw key material should not be exposed to JavaScript. While the key handle can be used for encrypt/decrypt operations within the secure context, the raw bytes cannot be exported. This mitigates the risk of XSS attacks simply exfiltrating the key to a remote server, although an XSS attacker could still theoretically ask the browser to decrypt data while the user is logged in.19

### **3.3 Storage Quotas and Eviction Policy**

IndexedDB is subject to browser storage quotas, which are typically calculated as a percentage of available disk space (e.g., 50-60%).20

* **Quota Exceeded Error:** If the ydoc history grows indefinitely (a common trait of CRDTs), the application may eventually hit this limit. When the quota is reached, the browser throws a QuotaExceededError.21  
* **Eviction Behavior:** Browsers may automatically evict data from "Best Effort" storage buckets when disk space is low. This eviction happens without user intervention and can result in total data loss for a Local-First app.  
* **Persistence Mode:** The application must request **Persistent Storage** permission via navigator.storage.persist(). If granted, the browser will not evict the data without explicit user action, effectively treating the IndexedDB storage as a permanent file system.21

---

## **4\. The Rendering Engine: Two-Pass Layouts and Performance Physics**

The application employs a sophisticated "Two-Pass Layout" system to support dynamic features like the "Peel-Off" logic in the Sideboard.1 This involves a cycle of:

1. **Render:** Initial render of components to the DOM.  
2. **Measure:** ResizeObserver captures intrinsic dimensions.  
3. **Calculate:** Layout adapters (LinearAdapter, ZigZagAdapter) compute absolute coordinates.  
4. **Reposition:** React updates state with new coordinates, triggering a re-render.

This architecture creates a visually rich experience but fights against the browser's optimized rendering pipeline, introducing risks of **Layout Thrashing** and **Infinite Resize Loops**.

### **4.1 Layout Thrashing (Forced Reflows)**

Browsers optimize rendering by queuing DOM changes and applying them in a batch. However, requesting geometric properties (like offsetHeight, getBoundingClientRect, scrollTop) forces the browser to immediately flush the queue and recalculate the layout to return an accurate value. This is called a **Forced Reflow**.23

* **The Thrashing Cycle:** If the application iterates through a list of nodes, reading the height of Node A and then immediately setting the style of Node A, it triggers a reflow. If it then reads Node B and sets Node B, it triggers *another* reflow.  
* **Performance Impact:** In a document with hundreds of nodes, this sequential read-write-read-write pattern can increase the layout time from milliseconds to seconds, causing the main thread to freeze and the UI to become unresponsive.25  
* **Batching Strategy:** To mitigate this, the application must strictly separate the "Read" phase from the "Write" phase. All dimensions should be measured first and stored, and *then* all style updates should be applied. Libraries like fastdom or custom hooks that utilize requestAnimationFrame can enforce this batching.26

**Table 2: Common Layout-Thrashing Triggers**

| Property/Method | Trigger Type | Impact Description |
| :---- | :---- | :---- |
| elem.offsetHeight / offsetWidth | **Read** | Forces synchronous layout calculation of the specific element and its parents. |
| elem.getBoundingClientRect() | **Read** | Forces full layout calculation to determine exact viewport coordinates. |
| window.getComputedStyle() | **Read** | Forces style recalculation and potentially layout if accessing geometry. |
| elem.style.height \= '...' | **Write** | Invalidates the current layout tree; marks the document as "dirty". |
| elem.focus() | **Read/Write** | Can force layout to scroll the focused element into view. |

### **4.2 The ResizeObserver Loop Limit**

The ResizeObserver API is designed to report changes in element dimensions. However, a common error in Two-Pass Layouts is the **"ResizeObserver loop limit exceeded"**.28

* **Mechanism:** This error occurs when a resize callback triggers a DOM mutation that immediately changes the size of the observed element *within the same animation frame*.  
  * *Example:* Node A is measured at 100px. The Layout Adapter runs and sets Node A's container width to 50px. This forces the text inside Node A to wrap, increasing its height to 120px. ResizeObserver fires again immediately. The browser detects this infinite recursion potential and blocks it, logging the error.29  
* **Implication:** While the browser prevents the infinite loop (by deferring the next observation to the next frame), this indicates unstable layout logic. It can lead to UI "jitters" or "pop-in" where elements settle into their final positions visibly after the initial paint.  
* **Strict Mode Double-Invocation:** In React 18+ Strict Mode, effects are mounted twice. This can exacerbate resize loop issues if the ResizeObserver disconnect logic is not perfectly handled in the useEffect cleanup function.30

### **4.3 Rendering Optimization: useLayoutEffect vs. useEffect**

The timing of the layout measurement is critical.

* **useEffect:** Fires *after* the browser has painted the screen. Using this for layout measurement results in the user seeing the "Pass 1" (incorrect) layout, followed by a visible jump to the "Pass 2" (correct) layout. This is known as **Cumulative Layout Shift (CLS)** and degrades user experience.32  
* **useLayoutEffect:** Fires synchronously *after* DOM mutations but *before* the paint. This is the correct hook for the "Two-Pass" measurement phase, as it allows the application to measure and update coordinates before the user sees the frame. However, heavy calculations inside useLayoutEffect will block the paint, increasing **Interaction to Next Paint (INP)** latency.33  
* **Recommendation:** The layout adapters (LinearAdapter, etc.) must be highly optimized. If the calculation is expensive, it cannot run in useLayoutEffect. The system may need to adopt a **Virtualization** strategy (e.g., react-window) to only calculate layouts for currently visible nodes.35

---

## **5\. Conflict Resolution and State Management (Y.js Internals)**

The system's "High Trust" model is implemented via Y.js, which creates a shared state that is eventually consistent. While this solves the problem of concurrent edits (e.g., two users typing in the same field), it introduces specific challenges regarding memory management and document size.

### **5.1 Document History and "Tombstones"**

Y.js achieves consistency by never truly deleting data. When a character is deleted, it is marked with a "tombstone" so that concurrent operations can still reference it if necessary (e.g., an "Undo" operation).

* **Monotonic Growth:** In a long-lived document, such as a project plan edited over months, the ydoc accumulates a vast history of deleted content. This increases the binary size of the document update vector, delaying the initial load from IndexedDB and increasing the bandwidth required to sync with new peers.3  
* **Garbage Collection (GC):** Y.js supports garbage collection of tombstones. However, GC is aggressive by default. If Peer A is offline for a month, and the group GCs the history Peer A relies on, Peer A may be unable to merge their changes upon reconnection.  
* **Pruning Strategy:** For a robust local-first app, the recommendation is to implement **History Truncation** or **Snapshotting**. The application should allow users to "Squash" the history, creating a fresh ydoc that contains only the current state, and archiving the old document. This balances performance with the ability to sync.4

### **5.2 Subdocuments and Multiplexing**

The codebase summary mentions distinct sections like "Legacies" and "Palette".1 Storing these in a single monolithic ydoc is inefficient. The **Subdocument** pattern allows nesting separate Y.Doc instances within a main document.

* **Lazy Loading:** Subdocuments enable the application to load the "Root" document quickly (containing just the list of available subdocs) and only load the heavy content of a subdoc when the user actually navigates to that tab. This drastically reduces memory usage and startup time.37  
* **The Multiplexing Challenge:** Standard y-webrtc providers do not support multiplexing multiple documents over a single connection out of the box. Loading 10 subdocuments would typically require opening 10 separate WebRTC connections, which would immediately saturate the browser's connection limits and CPU.39  
* **Solution:** The application requires a custom provider implementation that supports **Protocol Multiplexing**. This involves wrapping Y.js sync messages in a custom envelope that includes the target\_doc\_id, allowing a single WebRTC data channel or WebSocket connection to service updates for dozens of subdocuments simultaneously.40

### **5.3 Memory Leaks in Single Page Applications (SPAs)**

Y.js providers (y-webrtc, y-indexeddb) attach event listeners to the global document or window object. In a React SPA, components mount and unmount frequently.

* **The Leak:** If a component creates a new WebrtcProvider() on mount but fails to call provider.destroy() on unmount, the provider (and the entire ydoc it references) remains in memory, continuing to process network traffic and utilize CPU.42  
* **Hook Safety:** All Y.js provider instantiation must occur within a useEffect hook that returns a cleanup function explicitly calling .destroy() on the provider and .destroy() on the ydoc (if it is no longer needed).43

---

## **6\. Accessibility in Non-Standard Layouts**

The decision to use absolute positioning calculated by layout adapters 1 creates a "Visual vs. DOM" disconnect that poses severe accessibility (A11y) barriers. This architecture inherently fights against the semantic flow of HTML.

### **6.1 DOM Order vs. Visual Order**

Screen readers (JAWS, NVDA, VoiceOver) and keyboard navigation (Tab key) strictly follow the order of elements in the DOM. In an absolute layout system, the visual position of an element is determined by its transform: translate(x, y) style, not its position in the DOM tree.

* **The Disconnect:** A user might see Node A visually next to Node B. However, if Node B was created later, it might be at the end of the DOM. Pressing "Tab" from Node A might jump the focus to the sidebar or footer instead of Node B, creating a chaotic and unusable navigation experience.44  
* **WCAG Violation:** This explicitly violates **WCAG 2.1 Success Criterion 1.3.2 (Meaningful Sequence)** and **2.4.3 (Focus Order)**.

### **6.2 The "Roving TabIndex" Pattern**

To make this grid-like or free-form layout accessible, the application must take manual control of focus management using the **Roving TabIndex** pattern.

* **Mechanism:**  
  1. All nodes in the canvas are set to tabindex="-1" (making them focusable programmatically but removing them from the natural tab order).  
  2. The *currently active* node is set to tabindex="0".  
  3. The application attaches a keydown listener to the container.  
  4. When the user presses an Arrow Key, the application uses its internal Layout Adapter logic (the same logic used for positioning) to identify the "target" node in that direction.  
  5. The application programmatically calls .focus() on the target node and updates the tabindex states.46  
* **Why not aria-activedescendant?** While aria-activedescendant allows a container to "own" focus while referencing a child, the Roving TabIndex pattern is generally more robust for interactive grids where each item may contain its own interactive controls (like the contentEditable text).48

### **6.3 Semantic Roles for contentEditable**

The HighlightableText component uses contentEditable divs. To a screen reader, a plain div is not an input.

* **Role Requirements:** The component must explicitly declare role="textbox". Because it supports multi-line text, it must also include aria-multiline="true".50  
* **Labeling:** Unlike standard inputs, contentEditable divs cannot be labeled with a simple \<label for="..."\>. They require aria-labelledby pointing to a visible label ID, or aria-label for invisible labels. Without this, screen reader users will encounter a text entry field with no context.51

---

## **7\. Engineering Standards and Modern Ecosystem Integration**

To maintain a codebase of this complexity in 2025, strict adherence to modern engineering standards is required to prevent technical debt and ensure long-term maintainability.

### **7.1 TypeScript Configuration (2025 Standards)**

* **Strict Mode:** The tsconfig.json must have "strict": true. This enables noImplicitAny, strictNullChecks, and strictFunctionTypes. In a codebase relying on complex geometric calculations (Layout Adapters), strictNullChecks is vital to prevent runtime crashes when a dimension is missing.52  
* **Type Narrowing:** Utilizing the satisfies operator (introduced in TS 4.9) allows for validating configuration objects against a type while preserving the literal types of the values, which is useful for theme configuration.53  
* **Type-Only Imports:** Use import type {... } for all interface and type imports. This assists the bundler (Vite/Rolldown) in tree-shaking, ensuring that type definitions do not bloat the runtime bundle.54

### **7.2 CSS Architecture: Modules and Variables**

The summary mentions usage of **CSS Modules** and **CSS Variables**. This is a robust pattern if executed correctly.

* **Theming Strategy:** Global theme variables (colors, spacing) should be defined in a :root block in src/index.css.  
* **Module Composition:** CSS Modules should reference these variables using var(--theme-color). They should *not* import global SASS/LESS files, which duplicates CSS.  
* **Class Utilities:** The clsx or classnames library is standard for combining the hashed class names generated by CSS Modules with conditional state classes (e.g., styles.active).55

### **7.3 React Concurrency and Batching**

React 18 introduced automatic batching, but the manual nature of the "Two-Pass Layout" may bypass it if not careful.

* **flushSync:** In rare cases where a layout measurement *must* happen immediately after a state update (before the browser paints), flushSync can be used. However, this forces a reflow and should be used sparingly.  
* **Concurrent Features:** Features like useTransition could be explored for the "Peel-Off" logic. If moving a panel is computationally expensive, wrapping that state update in startTransition allows React to keep the UI responsive while calculating the new layout in the background.35

---

## **8\. Comprehensive Audit Checklist**

The following checklist synthesizes the findings into actionable audit items.

| Severity | Category | Check Item | Rationale & Context |
| :---- | :---- | :---- | :---- |
| **Critical** | **Signaling** | **Authenticate Signaling:** Verify y-webrtc signaling server requires auth token/password. | Public signaling allows any actor to join the mesh and corrupt data (MITM). |
| **Critical** | **Encryption** | **Web Crypto API:** Confirm y-indexeddb writes are encrypted with AES-GCM (extractable: false). | Local storage is plaintext; protects data if device is compromised. |
| **Critical** | **XSS** | **Sanitization:** Audit HighlightableText for DOMPurify usage on contentEditable inputs. | Prevents script injection via shared document state. |
| **High** | **Network** | **TURN Server:** Confirm existence of authenticated TURN server configuration. | Required for firewall traversal and masking user IP addresses. |
| **High** | **Performance** | **Resize Loops:** Check ResizeObserver callbacks for guard clauses (size delta checks). | Prevents "Loop Limit Exceeded" errors and UI freezes. |
| **High** | **Performance** | **Batching:** Verify strict separation of DOM reads (measure) and writes (update). | Prevents Layout Thrashing (forced reflows) in the Two-Pass system. |
| **High** | **Memory** | **Cleanup:** Ensure provider.destroy() is called in useEffect cleanup. | Prevents memory leaks and "zombie" connections in the SPA. |
| **High** | **A11y** | **Roving TabIndex:** Verify custom keyboard navigation logic for absolute layouts. | Restores accessibility for keyboard/screen reader users. |
| **High** | **A11y** | **Semantics:** Check role="textbox" and aria-label on contentEditable divs. | Ensures screen readers identify input fields correctly. |
| **Medium** | **Scalability** | **Multiplexing:** Check if Subdocuments reuse a single connection (Multiplexing) or open new ones. | Prevents connection saturation when using multiple subdocs. |
| **Medium** | **Storage** | **Quotas:** Implement navigator.storage.persist() request logic. | Prevents browser from evicting local data under space pressure. |
| **Medium** | **Code Quality** | **Strict Mode:** Verify strict: true in tsconfig.json. | Enforces type safety for complex layout logic. |

### **Conclusion**

The "Local-First" architecture of this codebase offers a responsive and privacy-centric user experience but requires the engineering team to assume responsibilities typically handled by backend infrastructure. Security cannot be "outsourced" to a server; it must be built into the client via **Web Crypto**, **Authenticated Signaling**, and **Turn Servers**. Performance relies on a delicate dance with the browser's rendering engine, necessitating strict **Batching** and **Layout Optimization**. Finally, Accessibility requires a deliberate reconstruction of the navigation experience using **Roving TabIndex**. By addressing these pillars, the application can transition from a high-trust prototype to a secure, scalable, and inclusive production platform.

#### **Works cited**

1. CODEBASE\_SUMMARY.md  
2. \[AskJS\] Security difference between localStorage and IndexedDB : r/javascript \- Reddit, accessed November 24, 2025, [https://www.reddit.com/r/javascript/comments/ywt70l/askjs\_security\_difference\_between\_localstorage/](https://www.reddit.com/r/javascript/comments/ywt70l/askjs_security_difference_between_localstorage/)  
3. One large Y.Doc or many smaller Y.Doc? \- Yjs Community, accessed November 24, 2025, [https://discuss.yjs.dev/t/one-large-y-doc-or-many-smaller-y-doc/922](https://discuss.yjs.dev/t/one-large-y-doc-or-many-smaller-y-doc/922)  
4. Common Concepts & Best Practices \- Yjs Community, accessed November 24, 2025, [https://discuss.yjs.dev/t/common-concepts-best-practices/2436](https://discuss.yjs.dev/t/common-concepts-best-practices/2436)  
5. A Study of WebRTC Security, accessed November 24, 2025, [https://webrtc-security.github.io/](https://webrtc-security.github.io/)  
6. WebRTC Security in 2025: Protocols, Vulnerabilities, and Best Practices, accessed November 24, 2025, [https://webrtc.ventures/2025/07/webrtc-security-in-2025-protocols-vulnerabilities-and-best-practices/](https://webrtc.ventures/2025/07/webrtc-security-in-2025-protocols-vulnerabilities-and-best-practices/)  
7. WebRTC Security: A Comprehensive Guide for Developers \- VideoSDK, accessed November 24, 2025, [https://www.videosdk.live/developer-hub/webrtc/webrtc-security](https://www.videosdk.live/developer-hub/webrtc/webrtc-security)  
8. WebRTC Connector for Yjs \- GitHub, accessed November 24, 2025, [https://github.com/yjs/y-webrtc](https://github.com/yjs/y-webrtc)  
9. WebRTC Security: Best Practices and Key Risks Explained \- Digital Samba, accessed November 24, 2025, [https://www.digitalsamba.com/blog/webrtc-security](https://www.digitalsamba.com/blog/webrtc-security)  
10. Thoughts of webRTC or any other alternatives for voice video call. \- Reddit, accessed November 24, 2025, [https://www.reddit.com/r/WebRTC/comments/15jlf7x/thoughts\_of\_webrtc\_or\_any\_other\_alternatives\_for/](https://www.reddit.com/r/WebRTC/comments/15jlf7x/thoughts_of_webrtc_or_any_other_alternatives_for/)  
11. Offline, Peer-to-Peer, Collaborative Editing using Yjs \- Show \- discuss.ProseMirror, accessed November 24, 2025, [https://discuss.prosemirror.net/t/offline-peer-to-peer-collaborative-editing-using-yjs/2488](https://discuss.prosemirror.net/t/offline-peer-to-peer-collaborative-editing-using-yjs/2488)  
12. Keys to Optimizing End-to-End Latency with WebRTC \- Red5 Pro, accessed November 24, 2025, [https://www.red5.net/blog/keys-to-optimizing-end-to-end-latency-with-webrtc/](https://www.red5.net/blog/keys-to-optimizing-end-to-end-latency-with-webrtc/)  
13. WebRTC Topology: SFU vs MCU vs P2P \- Medium, accessed November 24, 2025, [https://medium.com/@justin.edgewoods/webrtc-topology-sfu-vs-mcu-vs-p2p-bdd846eee35c](https://medium.com/@justin.edgewoods/webrtc-topology-sfu-vs-mcu-vs-p2p-bdd846eee35c)  
14. Securing Front-End Storage: Cookies, localStorage, and IndexedDB \- NamasteDev Blogs, accessed November 24, 2025, [https://namastedev.com/blog/securing-front-end-storage-cookies-localstorage-and-indexeddb/](https://namastedev.com/blog/securing-front-end-storage-cookies-localstorage-and-indexeddb/)  
15. Understanding IndexedDB: A Beginner's Guide to Client-Side Databases \- Medium, accessed November 24, 2025, [https://medium.com/@khouloud.haddad/understanding-indexeddb-a-beginners-guide-to-client-side-databases-febd140e30fd](https://medium.com/@khouloud.haddad/understanding-indexeddb-a-beginners-guide-to-client-side-databases-febd140e30fd)  
16. SubtleCrypto \- Web APIs | MDN, accessed November 24, 2025, [https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)  
17. Saving Web Crypto Keys using indexedDB \- GitHub, accessed November 24, 2025, [https://gist.github.com/saulshanabrook/b74984677bccd08b028b30d9968623f5](https://gist.github.com/saulshanabrook/b74984677bccd08b028b30d9968623f5)  
18. Zero-Knowledge AES-256 Encryption: Securing Your Business with Web Crypto API and IndexedDB \- Zerocrat, accessed November 24, 2025, [https://zerocrat.com/advanced-encryption-zero-knowledge-aes-256-encryption-for-unrivaled-data-protection/](https://zerocrat.com/advanced-encryption-zero-knowledge-aes-256-encryption-for-unrivaled-data-protection/)  
19. How to protect a non-extractable Secret Key in indexedDB? \- Stack Overflow, accessed November 24, 2025, [https://stackoverflow.com/questions/68194489/how-to-protect-a-non-extractable-secret-key-in-indexeddb](https://stackoverflow.com/questions/68194489/how-to-protect-a-non-extractable-secret-key-in-indexeddb)  
20. How to Store Unlimited\* Data in the Browser with IndexedDB \- SitePoint, accessed November 24, 2025, [https://www.sitepoint.com/indexeddb-store-unlimited-data/](https://www.sitepoint.com/indexeddb-store-unlimited-data/)  
21. Storage quotas and eviction criteria \- Web APIs \- MDN Web Docs, accessed November 24, 2025, [https://developer.mozilla.org/en-US/docs/Web/API/Storage\_API/Storage\_quotas\_and\_eviction\_criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)  
22. Browser Storage \- RxDB as a Database for Browsers, accessed November 24, 2025, [https://rxdb.info/articles/browser-storage.html](https://rxdb.info/articles/browser-storage.html)  
23. What forces layout/reflow. The comprehensive list. \- GitHub Gist, accessed November 24, 2025, [https://gist.github.com/paulirish/5d52fb081b3570c81e3a](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)  
24. Avoid large, complex layouts and layout thrashing | Articles \- web.dev, accessed November 24, 2025, [https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)  
25. Are layout thrashing, reflow the same meaning in HTML? \- Stack Overflow, accessed November 24, 2025, [https://stackoverflow.com/questions/66450070/are-layout-thrashing-reflow-the-same-meaning-in-html](https://stackoverflow.com/questions/66450070/are-layout-thrashing-reflow-the-same-meaning-in-html)  
26. DAreRodz/react-lazy-fastdom: React component that renders children elements when they enter the viewport. \- GitHub, accessed November 24, 2025, [https://github.com/DAreRodz/react-lazy-fastdom](https://github.com/DAreRodz/react-lazy-fastdom)  
27. fastdom \- NPM, accessed November 24, 2025, [https://www.npmjs.com/package/fastdom](https://www.npmjs.com/package/fastdom)  
28. How to fix \`ResizeObserver loop limit exceeded\` \- TrackJS, accessed November 24, 2025, [https://trackjs.com/javascript-errors/resizeobserver-loop-limit-exceeded/](https://trackjs.com/javascript-errors/resizeobserver-loop-limit-exceeded/)  
29. How to fix \`ResizeObserver loop completed with undelivered notifications.\` \- TrackJS, accessed November 24, 2025, [https://trackjs.com/javascript-errors/resizeobserver-loop-completed-with-undelivered-notifications/](https://trackjs.com/javascript-errors/resizeobserver-loop-completed-with-undelivered-notifications/)  
30. ResizeObserver loop limit exceeded · Issue \#55 · bvaughn/react-virtualized-auto-sizer, accessed November 24, 2025, [https://github.com/bvaughn/react-virtualized-auto-sizer/issues/55](https://github.com/bvaughn/react-virtualized-auto-sizer/issues/55)  
31. alert shows twice in react js \[duplicate\] \- javascript \- Stack Overflow, accessed November 24, 2025, [https://stackoverflow.com/questions/77905368/alert-shows-twice-in-react-js](https://stackoverflow.com/questions/77905368/alert-shows-twice-in-react-js)  
32. useLayoutEffect vs useEffect: A Practical Guide to React Side Effects \- CodeParrot AI, accessed November 24, 2025, [https://codeparrot.ai/blogs/uselayouteffect-vs-useeffect-a-practical-guide-to-react-side-effects](https://codeparrot.ai/blogs/uselayouteffect-vs-useeffect-a-practical-guide-to-react-side-effects)  
33. What is useLayoutEffect, and how is it different from useEffect? \- GeeksforGeeks, accessed November 24, 2025, [https://www.geeksforgeeks.org/reactjs/what-is-uselayouteffect-and-how-is-it-different-from-useeffect/](https://www.geeksforgeeks.org/reactjs/what-is-uselayouteffect-and-how-is-it-different-from-useeffect/)  
34. useLayoutEffect \- React, accessed November 24, 2025, [https://react.dev/reference/react/useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)  
35. React Performance Optimization: Best Techniques for Faster, Smoother Apps in 2025, accessed November 24, 2025, [https://www.growin.com/blog/react-performance-optimization-2025/](https://www.growin.com/blog/react-performance-optimization-2025/)  
36. Clear document history and reject old updates \- Yjs Community, accessed November 24, 2025, [https://discuss.yjs.dev/t/clear-document-history-and-reject-old-updates/945](https://discuss.yjs.dev/t/clear-document-history-and-reject-old-updates/945)  
37. Liveblocks 1.6: Introducing Yjs subdocuments support, accessed November 24, 2025, [https://liveblocks.io/blog/liveblocks-1-6-introducing-yjs-subdocuments-support](https://liveblocks.io/blog/liveblocks-1-6-introducing-yjs-subdocuments-support)  
38. Subdocuments \- Yjs Docs, accessed November 24, 2025, [https://docs.yjs.dev/api/subdocuments](https://docs.yjs.dev/api/subdocuments)  
39. Multiple text types per doc \+ multiple editors in the UI \#310 \- GitHub, accessed November 24, 2025, [https://github.com/BitPhinix/slate-yjs/discussions/310](https://github.com/BitPhinix/slate-yjs/discussions/310)  
40. API modifications proposal · Issue \#61 \- GitHub, accessed November 24, 2025, [https://github.com/yjs/y-webrtc/issues/61](https://github.com/yjs/y-webrtc/issues/61)  
41. Subdocuments in ws-provider \- Yjs Community, accessed November 24, 2025, [https://discuss.yjs.dev/t/subdocuments-in-ws-provider/2107](https://discuss.yjs.dev/t/subdocuments-in-ws-provider/2107)  
42. Fixing a Memory Leak in a Production Node.js App \- Kent C. Dodds, accessed November 24, 2025, [https://kentcdodds.com/blog/fixing-a-memory-leak-in-a-production-node-js-app](https://kentcdodds.com/blog/fixing-a-memory-leak-in-a-production-node-js-app)  
43. Memory issue with yjs \- \#3 by dmonad \- Yjs Community, accessed November 24, 2025, [https://discuss.yjs.dev/t/memory-issue-with-yjs/2568/3](https://discuss.yjs.dev/t/memory-issue-with-yjs/2568/3)  
44. Understanding Success Criterion 2.4.3: Focus Order | WAI \- W3C, accessed November 24, 2025, [https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)  
45. Source Order Matters \- Adrian Roselli, accessed November 24, 2025, [https://adrianroselli.com/2015/09/source-order-matters.html](https://adrianroselli.com/2015/09/source-order-matters.html)  
46. Control focus with tabindex | web.dev, accessed November 24, 2025, [https://web.dev/articles/control-focus-with-tabindex](https://web.dev/articles/control-focus-with-tabindex)  
47. Keyboard-navigable JavaScript widgets \- Accessibility \- MDN Web Docs \- Mozilla, accessed November 24, 2025, [https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Keyboard-navigable\_JavaScript\_widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Keyboard-navigable_JavaScript_widgets)  
48. Radio Group Example Using Roving tabindex | APG | WAI \- W3C, accessed November 24, 2025, [https://www.w3.org/WAI/ARIA/apg/patterns/radio/examples/radio/](https://www.w3.org/WAI/ARIA/apg/patterns/radio/examples/radio/)  
49. Roving tabindex w/ React \- javascript \- Stack Overflow, accessed November 24, 2025, [https://stackoverflow.com/questions/51992950/roving-tabindex-w-react](https://stackoverflow.com/questions/51992950/roving-tabindex-w-react)  
50. WebAIM List: what ar any risks of making elements contenteditable, accessed November 24, 2025, [https://webaim.org/discussion/mail\_thread?thread=11084](https://webaim.org/discussion/mail_thread?thread=11084)  
51. Contenteditable HTML: A Guide to Interactive Web Content | The Code Dose, accessed November 24, 2025, [https://thecodedose.com/blog/contenteditable-html-a-guide-to-interactive-web-content/](https://thecodedose.com/blog/contenteditable-html-a-guide-to-interactive-web-content/)  
52. Mastering TypeScript Best Practices to Follow in 2025 \- Bacancy Technology, accessed November 24, 2025, [https://www.bacancytechnology.com/blog/typescript-best-practices](https://www.bacancytechnology.com/blog/typescript-best-practices)  
53. Best Practices for Using TypeScript in 2025: A Guide for Experienced Developers \- Medium, accessed November 24, 2025, [https://medium.com/@nikhithsomasani/best-practices-for-using-typescript-in-2025-a-guide-for-experienced-developers-4fca1cfdf052](https://medium.com/@nikhithsomasani/best-practices-for-using-typescript-in-2025-a-guide-for-experienced-developers-4fca1cfdf052)  
54. TypeScript Best Practices in 2025 \- DEV Community, accessed November 24, 2025, [https://dev.to/mitu\_mariam/typescript-best-practices-in-2025-57hb](https://dev.to/mitu_mariam/typescript-best-practices-in-2025-57hb)  
55. CSS Best Practices for React Projects: Scaling with Confidence | by Vaibhav Thakur, accessed November 24, 2025, [https://medium.com/@vaibhav11t/css-best-practices-for-react-projects-scaling-with-confidence-8ef300801193](https://medium.com/@vaibhav11t/css-best-practices-for-react-projects-scaling-with-confidence-8ef300801193)