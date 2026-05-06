importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// 🔔 JoinUp! PWA Smart Deep Linking (Non-Conflicting Handler)
self.addEventListener('notificationclick', function(event) {
    const notification = event.notification;
    notification.close(); // Close the notification immediately

    // Strategy: Try multiple possible URL locations in the payload
    // 1. data.url (Our custom injection)
    // 2. data.custom.a.url (OneSignal standard nested)
    // 3. notification.url (Legacy)
    let url = '/';
    if (notification.data) {
        if (notification.data.url) {
            url = notification.data.url;
        } else if (notification.data.custom && notification.data.custom.a && notification.data.custom.a.url) {
            url = notification.data.custom.a.url;
        }
    } else if (notification.url) {
        url = notification.url;
    }

    // 🌐 Ensure URL is absolute and belongs to our origin
    if (url && !url.startsWith('http')) {
        url = self.location.origin + (url.startsWith('/') ? '' : '/') + url;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(windowClients) {
                // Check if the app is already open
                for (var i = 0; i < windowClients.length; i++) {
                    var client = windowClients[i];
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus().then(c => {
                             if (url && url !== '/') return c.navigate(url);
                        });
                    }
                }
                // If no window is open, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(url || '/');
                }
            })
    );
});