const https = require('https');

// --- OneSignal Configuration ---
const ONESIGNAL_APP_ID = "65d2da97-e8f8-40ed-a298-978a485ba6f9";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const DEFAULT_APP_URL = process.env.APP_URL || "https://joinup-production.onrender.com/";

/**
 * Normalizes email by removing 'mail1.' and converting to lowercase.
 * This ensures consistency for OneSignal external_id matching.
 */
const normalizeEmailForOneSignal = (email) => {
    if (!email) return '';
    return email.toLowerCase().replace('mail1.', '').trim();
};

/**
 * Sends a push notification via OneSignal REST API to a list of users.
 * Target users are matched using their normalized email as external_id.
 */
const sendPushNotification = async (emails, title, message, url) => {
    if (!emails || emails.length === 0 || !ONESIGNAL_REST_API_KEY) {
        if (!ONESIGNAL_REST_API_KEY) console.warn("[OneSignal] Skip push: REST_API_KEY is missing from environment variables.");
        return;
    }
    
    // De-duplicate and normalize emails
    const normalizedEmails = [...new Set(emails.map(e => normalizeEmailForOneSignal(e)).filter(e => !!e))];
    if (normalizedEmails.length === 0) return;

    const data = JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: normalizedEmails,
        contents: { en: message, zh: message },
        headings: { en: title, zh: title },
        url: url || DEFAULT_APP_URL
    });

    const options = {
        hostname: 'onesignal.com',
        port: 443,
        path: '/api/v1/notifications',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                console.log(`[OneSignal] Push sent to ${normalizedEmails.length} users. Response: ${body}`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`[OneSignal] Push request error: ${e.message}`);
            resolve(); 
        });

        req.write(data);
        req.end();
    });
};

/**
 * Sends a broadcast push notification to ALL users via OneSignal segments.
 */
const broadcastPushNotification = async (title, message, url) => {
    if (!ONESIGNAL_REST_API_KEY) {
        console.warn("[OneSignal] Skip broadcast: REST_API_KEY is missing.");
        return;
    }

    const data = JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["Total Subscriptions"],
        contents: { en: message, zh: message },
        headings: { en: title, zh: title },
        url: url || DEFAULT_APP_URL
    });

    const options = {
        hostname: 'onesignal.com',
        port: 443,
        path: '/api/v1/notifications',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                console.log(`[OneSignal] Broadcast sent. Response: ${body}`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`[OneSignal] Broadcast request error: ${e.message}`);
            resolve();
        });

        req.write(data);
        req.end();
    });
};

module.exports = {
    normalizeEmailForOneSignal,
    sendPushNotification,
    broadcastPushNotification
};
