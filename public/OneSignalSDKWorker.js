importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// 🔔 JoinUp! PWA Smart Push & Deep Linking
self.addEventListener('push', function(event) {
    if (event.data) {
        try {
            const payload = event.data.json();
            // If OneSignal didn't display it automatically, or we want custom control
            if (payload.custom && payload.custom.a) {
                const data = payload.custom.a;
                const options = {
                    body: payload.alert || '',
                    icon: data.icon || '/icon-192x192.png',
                    badge: '/icon-192x192.png',
                    data: { url: data.url || '/' }
                };
                event.waitUntil(self.registration.showNotification(payload.title || 'JoinUp!', options));
            }
        } catch (e) {
            console.error("[SW] Push Parse Error:", e);
        }
    }
});

self.addEventListener('notificationclick', function(event) {
    const notification = event.notification;
    notification.close(); // MUST close immediately

    // Extract URL from data (Backend-passed) or notification.url
    const url = (notification.data && notification.data.url) ? notification.data.url : (notification.url || '/');

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(windowClients) {
                // 1. Find if a window is already open
                for (var i = 0; i < windowClients.length; i++) {
                    var client = windowClients[i];
                    // Focus existing window and navigate to new URL
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus().then(c => {
                             if (url && url !== '/') return c.navigate(url);
                        });
                    }
                }
                // 2. Open new window if none exists
                if (clients.openWindow) {
                    return clients.openWindow(url || '/');
                }
            })
    );
});