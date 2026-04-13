/* ==========================================
   FullStack Café - Service Worker (Final)
   ========================================== */

// 1. Push Event: Receives data from the server
self.addEventListener("push", (event) => {
    let data = {
        title: "FullStack Café ☕",
        body: "You have a new update on your order!",
    };

    if (event.data) {
        try {
            // Attempt to parse JSON from the server payload
            const payload = event.data.json();
            data = { ...data, ...payload }; 
        } catch (e) {
            // FALLBACK: If JSON parsing fails (like your "Unexpected token T" error)
            // treat the data as plain text to prevent the notification from breaking.
            console.warn("Push payload was not JSON, using text as body.");
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: "/icons/favicon.png", 
        badge: "/icons/favicon.png",
        
        // Pattern: [vibrate, pause, vibrate] - unique rhythmic feel
        vibrate: [300, 100, 400], 
        
        // Use a unique tag so status updates replace each other instead of stacking
        tag: "order-status", 
        renotify: true, // Wake up the device even if a notification is already visible
        
        data: {
            // Priority: payload.url > payload.data.url > fallback /orders
            url: data.url || (data.data && data.data.url) || "/orders",
        },
        
        // Interactive Buttons
        actions: [
            { action: 'view-order', title: 'View Order 📦' },
            { action: 'close', title: 'Dismiss' }
        ]
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

// 2. Notification Click: Opens the app or focuses an existing tab
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    // If user clicked "Dismiss", just stop here
    if (event.action === 'close') return;

    // Use URL constructor to ensure we have a valid absolute URL
    const targetUrl = new URL(event.notification.data.url, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then((windowClients) => {
                // 1. Try to find an existing open tab and focus it
                for (let client of windowClients) {
                    if (client.url === targetUrl && "focus" in client) {
                        return client.focus();
                    }
                }
                // 2. If no tab is open, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});

// 3. Lifecycle Management
self.addEventListener("install", () => {
    self.skipWaiting(); // Force the new SW to activate immediately
});

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim()); // Take control of all open tabs immediately
});