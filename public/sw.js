
const CACHE_NAME = 'bookvault-v1';

self.addEventListener('install', (event) => {
    console.log('[SW] Installed BookVault Service Worker');
    self.skipWaiting(); // Activate immediately without waiting
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activated BookVault Service Worker');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => clients.claim()) 
    );
});
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    let data = {
        title:'BookVault',
        body:'You have a new update.',
        url:'/books',
        icon:'/uploads/default-book.png',
        badge:'/uploads/default-book.png'
    };
    try {
        if (event.data) {
            const parsed = event.data.json();
            data = { ...data, ...parsed };
        }
    } catch (e) {
        try {
            data.body = event.data ? event.data.text() : data.body;
        } catch (e2) {}
    }

    const options = {
        body: data.body,
        icon: data.icon  || '/uploads/default-book.png',
        badge: data.badge || '/uploads/default-book.png',
        data: { url: data.url || '/books' },
        vibrate: [200, 100, 200],
        actions: [
            { action: 'open',    title: 'Open BookVault' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        requireInteraction: false,
        tag: 'bookvault-notification' 
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/books';
    const fullUrl = self.location.origin + url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    return client.navigate(fullUrl);
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(fullUrl);
            }
        })
    );
});
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('[SW] Push subscription changed — re-subscribing...');
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: event.oldSubscription
                ? event.oldSubscription.options.applicationServerKey
                : null
        }).then((newSubscription) => {
            return fetch('/push/subscribe', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: newSubscription })
            });
        })
    );
});