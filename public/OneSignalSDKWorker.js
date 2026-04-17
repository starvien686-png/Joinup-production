importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// 🔔 JoinUp! PWA Deep Linking & Window Management
self.addEventListener('notificationclick', function(event) {
    const notification = event.notification;
    // OneSignal standard payload stores the URL in 'url'
    const url = notification.data ? notification.data.url : (notification.url || '/');

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(windowClients) {
                // 1. If a window for this PWA is already open, focus it and navigate
                for (var i = 0; i < windowClients.length; i++) {
                    var client = windowClients[i];
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus().then(c => {
                             // Use hash navigation if possible to avoid full reload
                             if (url && url !== '/') return c.navigate(url);
                        });
                    }
                }
                // 2. If no window is open, open a new one to the target URL
                if (clients.openWindow) {
                    return clients.openWindow(url || '/');
                }
            })
    );
});