import { notifications } from './services/notification.js';
import { ThemeService } from './services/themeService.js';
import { I18n } from './services/i18n.js';
import api from './utils/api.js';
import { renderRegister } from './views/register.js?v=16';
import { renderHome } from './views/home.js?v=17';
import { openFeedbackModal } from './views/feedback.js?v=16';
import { showUserProfile } from './views/userProfileModal.js?v=1';
import { MockStore } from './models/mockStore.js?v=21';
import { openRatingModal, checkPendingFeedback } from './views/rating.js?v=5';

window.I18n = I18n;
window.notifications = notifications;
window.showUserProfile = showUserProfile;
window.openRatingModal = openRatingModal;
window.socket = io(); // Initialize Socket.io globally

// --- OneSignal Push Setup ---
const normalizeEmail = (email) => {
    if (!email) return '';
    // Normalize NCNU aliases for OneSignal external_id
    // s112000000@mail1.ncnu.edu.tw -> s112000000@ncnu.edu.tw
    return email.toLowerCase().replace('mail1.', '').trim();
};

window.OneSignal = window.OneSignal || [];
OneSignal.push(function () {
    OneSignal.init({
        appId: "65d2da97-e8f8-40ed-a298-978a485ba6f9",
    });
});



const app = document.getElementById('app');
window.activeViewInterval = null; // Global tracker for page-level polling (messages, home, etc.)

// --- Tab Visibility Optimization ---
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('[System] Tab is hidden. Background polling paused to save quota.');
    } else {
        console.log('[System] Tab is visible. Resuming active view pollers.');
    }
});



const state = {
    isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
    userEmail: localStorage.getItem('userEmail'),
    onLoggedIn: () => { }
};


if (window.socket) {
    window.socket.on('join_request', (data) => {
        console.log('[Socket] Received real-time join request:', data);

        notifications.showNativeBanner({
            title: `🚀 ${I18n.t('notifications.type.join_request') || 'New Join Request'}`,
            body: data.message,
            data: {
                type: 'join_request',
                targetId: data.event_id,
                metadata: {
                    event_type: data.event_type,
                    event_title: data.event_title,
                    user_email: data.applicant_email,
                    snapshot_display_name: data.applicant_name
                }
            }
        });

    });

    window.socket.on('join_accepted', (data) => {
        console.log('[Socket] Received real-time join acceptance:', data);

        notifications.showNativeBanner({
            title: `🎉 Accepted!`,
            body: data.message || `You have been accepted to "${data.eventName}"! Click here to view your activity history and enter the chat room.`,
            data: {
                type: 'ACCEPTED',
                id: data.eventId,
                metadata: {
                    event_title: data.eventName,
                    event_type: data.eventType
                }
            }
        });
    });

    window.socket.on('new_event_popup', (data) => {
        console.log('[Socket] Global Event Broadcast:', data);
        const emoji = { 'sports': '🏀', 'carpool': '🚗', 'study': '📚', 'hangout': '🎉', 'housing': '🏠' }[data.category] || '🆕';
        notifications.showNativeBanner({
            title: `${emoji} New Event / 新活動!`,
            body: `New Event: "${data.title}" just posted! Check it out. / 剛剛有人發布了新活動：「${data.title}」，快去看看吧！`,
            data: { type: 'NEW_EVENT', link: data.category }
        });
        if (window.checkNotificationBadge) window.checkNotificationBadge();
    });

    window.socket.on('reminder_notification', (data) => {
        console.log('[Socket] Event Reminder:', data);
        notifications.showNativeBanner({
            title: `⏰ Reminder / 活動提醒`,
            body: data.message,
            data: { type: 'REMINDER', link: 'home' }
        });
        if (window.checkNotificationBadge) window.checkNotificationBadge();
    });
}

if (state.isLoggedIn && state.userEmail) {
    const cleanEmail = normalizeEmail(state.userEmail);
    OneSignal.push(function () {
        OneSignal.login(cleanEmail);
    });

    if (window.socket) {
        window.socket.emit('register_user', cleanEmail);
        console.log(`[Socket] Registered targeted room for: ${cleanEmail}`);
    }
}

const render = () => {

    if (state.isLoggedIn) {

        const user = MockStore.getUser(state.userEmail);

        const userProfile = JSON.parse(localStorage.getItem('userProfile'));

        if (userProfile) checkPendingFeedback(userProfile);

        if (user && user.violationCount >= 3) {

            alert(I18n.t('auth.err.blocked_msg', { reason: 'Multiple Violations', date: 'Permanent' }));

            localStorage.removeItem('isLoggedIn');

            localStorage.removeItem('userProfile');

            state.isLoggedIn = false;

            state.userEmail = '';

        }

    }



    if (!state.isLoggedIn) {

        renderRegister();

    } else {
        const hash = window.location.hash.substring(1);
        if (hash) {
            console.log('[DeepLink] Routing to:', hash);
            window.navigateTo(hash);
        } else {
            renderHome();
        }
    }

};



window.navigateTo = (viewName) => {
    // 🛑 STOP: Clear any existing page-level intervals before navigating to a new view
    if (window.activeViewInterval) {
        clearInterval(window.activeViewInterval);
        window.activeViewInterval = null;
        console.log('[System] Cleared active view interval to prevent zombie poller.');
    }

    // Reset global layout styles that might have been changed by full-screen views (like chat)
    document.body.style.paddingBottom = '80px';
    document.body.style.overflow = '';
    document.body.style.backgroundColor = 'var(--bg-body)';

    if (viewName === 'home') {

        state.isLoggedIn = true;

        renderHome();

    } else if (viewName === 'login' || viewName === 'register') {

        if (state.isLoggedIn) {
            window.location.hash = '#home';
            renderHome();
            return;
        }

        state.isLoggedIn = false;

        renderRegister();

    } else if (viewName === 'groupbuy') {

        import('./views/groupbuy.js?v=13').then(module => { module.renderGroupBuy(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else if (viewName === 'messages' || viewName.startsWith('messages?')) {

        const roomMatch = viewName.match(/room=([^&]+)/);

        const roomId = roomMatch ? roomMatch[1] : null;

        import('./views/messages.js?v=16').then(module => { module.renderMessages(roomId); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else if (viewName === 'profile') {

        import('./views/profile.js?v=19').then(module => { module.renderProfile(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else if (viewName === 'asset-delivery') {

        import('./views/assetDelivery.js?v=1').then(module => { module.renderAssetDelivery(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else if (viewName === 'admin') {

        import('./views/admin.js?v=15').then(module => { module.renderAdminDashboard(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else if (viewName === 'sports' || viewName.startsWith('sports?')) {

        import('./views/sports.js?v=4').then(module => { module.renderSports(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else if (viewName === 'carpool' || viewName.startsWith('carpool?')) {

        import('./views/carpool.js?v=4').then(module => { module.renderCarpool(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else if (viewName === 'study' || viewName.startsWith('study?')) {

        import('./views/study.js?v=3').then(module => { module.renderStudy(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else if (viewName === 'food' || viewName === 'travel' || viewName.startsWith('food?') || viewName.startsWith('travel?')) {

        import('./views/travel.js?v=21').then(module => { module.renderTravel(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else if (viewName === 'settings') {

        import('./views/settings.js?v=1').then(module => { module.renderSettings(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else if (viewName === 'my-activities') {
        import('./views/my_activities_dashboard.js?v=1').then(module => { module.renderMyActivitiesDashboard(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });
    } else if (viewName === 'activities') {
        import('./views/activities.js?v=21').then(module => { module.renderActivities(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });
    } else if (viewName.startsWith('messages?')) {
        const roomMatch = viewName.match(/room=([^&]+)/);
        const roomId = roomMatch ? roomMatch[1] : null;
        const prefillMatch = viewName.match(/prefill=([^&]+)/);
        const prefill = prefillMatch ? decodeURIComponent(prefillMatch[1]) : null;
        import('./views/messages.js?v=16').then(module => { module.renderMessages(roomId, prefill); }).catch(err => { module.renderMessages(roomId); });
    } else if (viewName === 'contact') {
        import('./views/contact.js?v=1').then(module => { module.renderContact(); }).catch(err => { alert(I18n.t('app.err.load_fail', { error: err.message })); });

    } else {

        alert(I18n.t('app.alert.dev_mode', { view: viewName }));

    }

};

window.updateGlobalUI = (user) => {
    if (!user) return;

    // 1. Update Global Header (Home View)
    const nameEl = document.getElementById('header-user-name');
    const deptEl = document.getElementById('header-user-dept');
    const avatarEl = document.getElementById('header-user-avatar');

    if (nameEl) {
        nameEl.innerText = user.username || user.displayName || '';
        nameEl.classList.remove('skeleton', 'skeleton-text');
    }
    if (deptEl) {
        const deptDisplay = user.major || user.department || '';
        deptEl.innerHTML = deptDisplay ? `<span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: normal; margin-left: 0.5rem;">(${deptDisplay})</span>` : '';
        deptEl.classList.remove('skeleton', 'skeleton-text');
    }
    if (avatarEl) {
        avatarEl.classList.remove('skeleton', 'skeleton-circle');
        avatarEl.innerHTML = user.profile_pic
            ? `<img src="${user.profile_pic}" style="width: 100%; height: 100%; object-fit: cover;">`
            : '👤';
    }

    // 2. Dispatch event for other views (like Profile) to self-update
    window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: user }));
};

window.refreshUserProfile = async () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userEmail = localStorage.getItem('userEmail');
    if (!isLoggedIn || !userEmail) return;

    try {
        // Use the new secure session-based endpoint with authentication header
        const response = await (window.api || api).fetch('/api/v1/users/me', {
            idempotency: false,
            headers: { 'x-user-email': userEmail }
        });
        if (response && !response.error) {
            const user = response;
            localStorage.setItem('userProfile', JSON.stringify(user));
            window.updateGlobalUI(user);
        }
    } catch (e) {
        console.error('[Hydration] Failed to refresh profile:', e);
    }
};



window.openFeedback = openFeedbackModal;



window.contactSupport = () => {

    const userProfileStr = localStorage.getItem('userProfile');

    if (!userProfileStr) { alert(I18n.t('auth.err.login_required')); return; }

    const user = JSON.parse(userProfileStr);

    const adminId = 'admin@joinup.tw';

    const applicationId = `support_${user.email}`;



    let room = MockStore.getChatRoomByApplication(applicationId);

    if (!room) {

        room = MockStore.createChatRoom({

            postId: 'system_support',

            applicationId: applicationId,

            roomType: 'support',

            teamName: I18n.t('messages.room.contact_support'),

            participants: [

                { id: user.email, name: user.displayName, role: 'user' },

                { id: adminId, name: I18n.t('messages.role.support'), role: 'admin' }

            ]

        });

        MockStore.sendChatMessage(room.id, 'system', 'System', I18n.t('support.msg.initial'));

    }

    window.navigateTo(`messages?room=${room.id}`);

};



window.reportCurrentTarget = (targetId, targetType) => { window.openFeedback({ targetId: targetId, targetType: targetType, defaultType: 'violation' }); };

window.handleReportChat = (roomId) => { window.openFeedback({ targetId: roomId, targetType: 'chat', defaultType: 'violation' }); };



window.validLogin = (user) => {

    const status = MockStore.getUserStatus ? MockStore.getUserStatus(user.email) : { isBlocked: false };

    if (status.isBlocked) {

        const dateStr = new Date(status.expiresAt).toLocaleDateString();

        alert(I18n.t('auth.err.blocked_msg', { reason: status.reason, date: dateStr }));

        localStorage.removeItem('isLoggedIn');

        state.isLoggedIn = false;

        renderRegister();

        return;

    }

    try {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userProfile', JSON.stringify(user));
        localStorage.setItem('userEmail', user.email);
    } catch (e) {
        const lite = { ...user, profile_pic: '', photoURL: '' };
        localStorage.setItem('userProfile', JSON.stringify(lite));
    }

    state.isLoggedIn = true;

    state.user = user;

    state.onLoggedIn(user);
    render();

    // Red Dot Bootstrap
    if (window.checkNotificationBadge) window.checkNotificationBadge();
    setInterval(() => {
        if (state.isLoggedIn) window.checkNotificationBadge();
    }, 30000); // Check every 30s


    // OneSignal & Socket.io Sync
    const cleanEmail = normalizeEmail(user.email);
    OneSignal.push(function () {
        OneSignal.login(cleanEmail);
        console.log(`[OneSignal] Sync external_id: ${cleanEmail}`);
    });

    if (window.socket) {
        window.socket.emit('register_user', cleanEmail);
        console.log(`[Socket] Logged in and registered room for: ${cleanEmail}`);
    }

    setTimeout(window.checkNotificationBadge, 500);

};







window.sendAppNotification = (userId, type, message, link) => {

    const key = `joinup_notifs_${userId}`;

    const notifs = JSON.parse(localStorage.getItem(key) || '[]');

    notifs.unshift({

        id: Date.now().toString(),

        type: type,

        message: message,

        link: link,

        createdAt: new Date().toISOString(),

        isRead: false

    });

    localStorage.setItem(key, JSON.stringify(notifs));

    if (window.checkNotificationBadge) window.checkNotificationBadge();

};



window.showAnnouncements = async () => {
    const existing = document.querySelector('.announcement-overlay');
    if (existing) existing.remove();

    const currentUserStr = localStorage.getItem('userProfile');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const safeUserEmail = localStorage.getItem('userEmail') || (currentUser ? currentUser.email : '');

    let personalNotifications = [];
    const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';
    const isZH = currentLang.toLowerCase().includes('zh');

    // 1. SEDOT DATA LANGSUNG DARI DATABASE MySQL TIAP KALI LONCENG DIKLIK!
    if (safeUserEmail) {
        try {
            // Mark all as read immediately when opening the bell
            (window.api || api).fetch('/api/v1/notifications/mark-all-read', {
                method: 'POST',
                body: { user_email: safeUserEmail }
            }).then(() => {
                if (window.checkNotificationBadge) window.checkNotificationBadge();
            }).catch(e => console.warn("Failed to clear notifications:", e));

            const res = await (window.api || api).fetch(`/api/v1/notifications?user_email=${encodeURIComponent(safeUserEmail)}&limit=20`, { idempotency: false });


            if (res.success && res.data && res.data.list) {
                console.log("Fetched Notifications (Raw):", res.data.list);
                personalNotifications = res.data.list.map(n => {
                    const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {});
                    let msg = isZH ? '系統通知' : 'System Notification';
                    let link = '';
                    let iconType = 'info';

                    if (n.type === 'join_request') {
                        const evtName = meta.event_title || '活動';
                        const sender = meta.snapshot_display_name || '有人';
                        const adminBadge = meta.user_email === 'ncnujoinupadmin@gmail.com' ? `<span style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 900; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-left: 4px;">🛡️ ADMIN</span>` : '';
                        msg = isZH ? `🔔 新申請：${sender}${adminBadge} 申請加入 "${evtName}"` : `🔔 New request: ${sender}${adminBadge} wants to join "${evtName}"`;

                        // 👇 INI BARIS YANG KEMARIN TERHAPUS (Wajib ada!) 👇
                        const category = meta.event_type || 'sports';

                        // Cek semua kemungkinan tempat ID acara disimpan (Sangat Fleksibel)
                        const actionMeta = typeof n.action_metadata === 'string' ? JSON.parse(n.action_metadata) : (n.action_metadata || {});

                        const postId = meta.event_id ||
                            meta.post_id ||
                            meta.activity_id ||
                            meta.targetId ||
                            meta.carpool_id ||
                            meta.study_id ||
                            meta.hangout_id ||
                            meta.id ||
                            actionMeta.event_id ||
                            actionMeta.post_id ||
                            actionMeta.targetId ||
                            n.aggregate_id ||
                            n.event_id ||
                            n.post_id ||
                            n.activity_id ||
                            n.target_id ||
                            '';

                        // Jika postId masih kosong, kita coba cek apakah category terselip di metadata
                        const finalPostId = (postId && postId !== 'undefined') ? postId : '';

                        link = `action:review_${category}_app:${n.id}:${finalPostId}:${meta.user_email}:${encodeURIComponent(evtName)}`;
                        iconType = 'action';
                    } else if (n.type === 'ACCEPTED') {
                        msg = I18n.t('notifications.type.accepted', { eventTitle: meta.event_title || 'Event' });
                        iconType = 'success';
                        link = 'activities';
                    } else if (n.type === 'REJECTED') {
                        msg = I18n.t('notifications.type.rejected', { eventTitle: meta.event_title || 'Event' });
                        iconType = 'info';
                        link = 'activities';
                    } else if (n.type === 'NEW_EVENT') {
                        const category = meta.category || 'sports';
                        const displayCat = I18n.t(`home.cat.${category}`);
                        msg = I18n.t('notifications.type.new_event', {
                            category: displayCat,
                            eventTitle: meta.title || meta.event_title || 'Event'
                        });
                        iconType = 'success';
                        link = category;
                    } else if (n.type === 'CANCELLED') {
                        msg = I18n.t('notifications.type.cancelled', { eventTitle: meta.event_title || 'Event' });
                        iconType = 'info';
                    } else if (n.type === 'daily_digest' || n.type === 'event_reminder') {
                        msg = meta.message || (isZH ? '活動提醒' : 'Event Reminder');
                        iconType = 'info';
                        link = meta.link || 'home';
                    } else if (n.type === 'chat_message') {
                        const sender = meta.sender_name || (isZH ? '有人' : 'Someone');
                        const evtTitle = meta.event_title || (isZH ? '活動' : 'Event');
                        const snippet = meta.message || '';
                        msg = isZH 
                            ? `💬 ${sender} 在 "${evtTitle}" 中：${snippet}`
                            : `💬 ${sender} in "${evtTitle}": ${snippet}`;
                        iconType = 'info';
                        link = `messages?room=${meta.room_id}`;
                    }

                    return {
                        id: n.id,
                        type: iconType,
                        message: msg,
                        link: link,
                        createdAt: n.created_at,
                        isRead: n.is_read == 1 || n.is_read === true
                    };
                });
                console.log('Notifications Data (Mapped):', personalNotifications);
            }
        } catch (err) {
            console.error("Failed to fetch notifications from server:", err);
        }
    }

    // Fallback kalau DB beneran kosong, cek local storage lama
    if (personalNotifications.length === 0) {
        const localNotifs = JSON.parse(localStorage.getItem(`joinup_notifs_${safeUserEmail}`) || '[]');
        personalNotifications = localNotifs;
    }

    // Urutkan dari yang terbaru
    personalNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const txtNotifCenter = isZH ? '🔔 通知中心' : '🔔 Notification Center';
    const txtPersonal = isZH ? '個人通知' : 'Personal Notifications';
    const txtSystem = isZH ? '系統公告' : 'System Announcements';
    const txtNoNotif = isZH ? '沒有新通知' : 'No new notifications';

    const announcements = [
        { date: '2026/03/31', title: isZH ? '🎉 全新通知系統上線！' : '🎉 New Notification System!', content: isZH ? '資料庫升級完成，通知不再遺漏！' : 'Database upgraded, notifications are now fully synced!' }
    ];

    const overlay = document.createElement('div');
    overlay.className = 'announcement-overlay';

    const renderPersonal = () => {
        if (personalNotifications.length === 0) return `<div style="padding: 1rem; color: #999; text-align: center;">${txtNoNotif}</div>`;
        return personalNotifications.map(n => {
            // Robust action check: legacy 'action' iconType OR original 'join_request' type
            const isJoinRequest = n.type === 'action' || n.link?.startsWith('action:review_');
            const icon = isJoinRequest ? '⚡' : (n.type === 'success' ? '🎉' : '🔔');
            const bgStyle = isJoinRequest ? 'background: #FFF3E0; border-left: 4px solid #FF9800;' : (n.type === 'success' ? 'background: #E8F5E9; border-left: 4px solid #4CAF50;' : '');

            let actionButtons = '';
            if (isJoinRequest && n.link && n.link.startsWith('action:review_')) {
                const parts = n.link.split(':');
                // parts format: [action, type_app, appId, postId, email, name]
                const category = parts[1]?.replace('review_', '').replace('_app', '') || 'sports';
                const appId = parts[2];
                const postId = parts[3];
                const applicantEmail = parts[4];
                const teamName = decodeURIComponent(parts[5] || '');

                const txtAccept = isZH ? '接受 (Accept)' : 'Accept';
                const txtReject = isZH ? '拒絕 (Reject)' : 'Reject';

                actionButtons = `
                <div style="display: flex; gap: 8px; margin-top: 10px;" onclick="event.stopPropagation()">
                    <button onclick="window.handleReviewAction('reject', '${appId}', '${postId}', '${applicantEmail}', '${teamName}', '${category}')" style="flex: 1; padding: 8px; background: white; color: #F44336; border: 1px solid #F44336; border-radius: 8px; font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: all 0.2s;">${txtReject}</button>
                    <button onclick="window.handleReviewAction('accept', '${appId}', '${postId}', '${applicantEmail}', '${teamName}', '${category}')" style="flex: 1; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: bold; cursor: pointer; transition: all 0.2s;">${txtAccept}</button>
                </div>
                `;
            }

            return `
            <div class="notification-item ${n.isRead ? 'read' : 'unread'}" onclick="window.handleNotificationClick('${n.link}')" style="cursor: pointer; ${bgStyle}">
                <div class="notif-icon">${icon}</div>
                <div class="notif-content">
                    <div class="notif-msg" style="${isJoinRequest ? 'font-weight: bold; color: #E65100;' : ''}">${n.message}</div>
                    <div class="notif-time">${new Date(n.createdAt).toLocaleString()}</div>
                    ${actionButtons}
                </div>
                ${n.link && !isJoinRequest ? '<div class="notif-arrow">›</div>' : ''}
            </div>
            `;
        }).join('');
    };

    const renderSystem = () => {
        return announcements.map(item => `
            <div class="announcement-item">
                <div class="announcement-date">${item.date}</div>
                <div class="announcement-title">${item.title}</div>
                <div class="announcement-text">${item.content}</div>
            </div>
        `).join('');
    };

    overlay.innerHTML = `
        <div class="announcement-modal">
            <div class="announcement-header">
                <h2>${txtNotifCenter}</h2>
                <button class="announcement-close" onclick="this.closest('.announcement-overlay').remove()">×</button>
            </div>
            <div class="announcement-body">
                <style>
                    .notif-section { margin-bottom: 24px; }
                    .notif-section h3 { font-size: 0.9rem; color: #888; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px; }
                    .notif-list, .announcement-list { display: flex; flex-direction: column; gap: 12px; }
                </style>
                <div class="notif-section">
                    <h3>${txtPersonal}</h3>
                    <div class="notif-list">${renderPersonal()}</div>
                </div>
                <div style="height: 1px; background: rgba(0,0,0,0.05); margin: 20px 0;"></div>
                <div class="notif-section">
                    <h3>${txtSystem}</h3>
                    <div class="announcement-list">${renderSystem()}</div>
                </div>
            </div>
        </div>
        <style>
            .notif-section h3 { font-size: 1rem; color: #555; margin-bottom: 0.5rem; }
            .notification-item { display: flex; align-items: start; padding: 0.8rem; border-bottom: 1px solid #f0f0f0; transition: background 0.2s; }
            .notification-item:hover { background: #f9f9f9; }
            .notification-item.unread { background: #e3f2fd; }
            .notif-icon { font-size: 1.2rem; margin-right: 0.8rem; }
            .notif-content { flex: 1; }
            .notif-msg { font-size: 0.95rem; color: #333; margin-bottom: 0.2rem; }
            .notif-time { font-size: 0.8rem; color: #999; }
            .notif-arrow { font-size: 1.2rem; color: #ccc; padding-left: 0.5rem; }
        </style>
    `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (window.checkNotificationBadge) window.checkNotificationBadge();
        }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.classList.add('show'); });
};



window.handleNotificationClick = (link) => {

    if (link) {

        const ov = document.querySelector('.announcement-overlay');

        if (ov) ov.remove();



        if (link.startsWith('action:review_sports_app:')) {
            const parts = link.split(':');
            window.showReviewApplicationModal(parts[2], parts[3], parts[4], decodeURIComponent(parts[5] || ''), 'sports');
            return;
        }
        if (link.startsWith('action:review_carpool_app:')) {
            const parts = link.split(':');
            window.showReviewApplicationModal(parts[2], parts[3], parts[4], decodeURIComponent(parts[5] || ''), 'carpool');
            return;
        }
        if (link.startsWith('action:review_study_app:')) {
            const parts = link.split(':');
            window.showReviewApplicationModal(parts[2], parts[3], parts[4], decodeURIComponent(parts[5] || ''), 'study');
            return;
        }
        if (link.startsWith('action:review_hangout_app:')) {
            const parts = link.split(':');
            window.showReviewApplicationModal(parts[2], parts[3], parts[4], decodeURIComponent(parts[5] || ''), 'hangout');
            return;
        }
        if (link.startsWith('action:review_housing_app:')) {
            const parts = link.split(':');
            window.showReviewApplicationModal(parts[2], parts[3], parts[4], decodeURIComponent(parts[5] || ''), 'housing');
            return;
        }

        else if (link.startsWith('messages?')) { window.navigateTo(link); }

        else if (link === 'sports') { window.navigateTo('sports'); }
        else if (link === 'carpool') { window.navigateTo('carpool'); }
        else if (link === 'study') { window.navigateTo('study'); }
        else if (link === 'hangout') { window.navigateTo('hangout'); }
        else if (link === 'housing') { window.navigateTo('housing'); }
        else if (link.startsWith('action:rate:')) {

            const postId = link.split(':')[2];

            const post = MockStore.getPosts({ includeAll: true }).find(p => p.id === postId);

            if (post) openRatingModal(post);

        } else {
            // Safely navigate using hash if it's a relative path to prevent server-side API hits
            if (link && !link.includes(':') && !link.startsWith('#')) {
                window.navigateTo(link);
            } else if (link) {
                window.location.href = link;
            }
        }

    }

};

window.showReviewApplicationModal = async (appId, postId, applicantEmail, teamName, category, serverSnapshot = null) => {
    const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';
    const isZH = currentLang.toLowerCase().includes('zh');

    const overlayId = 'review-app-overlay';
    if (document.getElementById(overlayId)) return;

    let realUserData = null;
    try {
        console.log("Fetching profile for:", applicantEmail);
        const res = await fetch(`/api/v1/profile-user?email=${applicantEmail}`);
        if (res.ok) {
            const data = await res.json();
            // --- PERBAIKAN 1: Ambil data orang pertama [0] ---
            if (Array.isArray(data) && data.length > 0) {
                realUserData = data[0];
            } else if (data && !Array.isArray(data)) {
                realUserData = data;
            }
        }
    } catch (e) { console.warn("Failed to pull profile:", e); }

    const txtHobbyLabel = isZH ? '興趣' : 'Hobby';
    const txtBioLabel = isZH ? '個人簡介' : 'Bio';
    const txtApplyFor = isZH ? '申請加入：' : 'Applying for:';

    // --- PERBAIKAN 2: Gunakan data dari realUserData dengan benar ---
    let applicantName = realUserData?.username || 'Applicant';
    let applicantDept = realUserData?.major || (isZH ? '學生' : 'Student');
    let studyYear = realUserData?.study_year ? (isZH ? `大${realUserData.study_year}` : `Year ${realUserData.study_year}`) : '';
    let bio = realUserData?.bio || (isZH ? '希望能加入這個活動！' : 'I would love to join this activity!');
    let hobby = realUserData?.hobby || (isZH ? '熱愛交流' : 'Loves connecting with people');

    // --- CARA PINTAR AMBIL FOTO (Anti Error 500) ---
    let userPic = '';
    if (Array.isArray(realUserData) && realUserData.length > 0) {
        userPic = realUserData[0].profile_pic;
    } else if (realUserData && realUserData.profile_pic) {
        userPic = realUserData.profile_pic;
    }

    let avatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

    if (userPic) {
        if (userPic.startsWith('data:image')) {
            // JIKA FOTO ADALAH BASE64, PAKAI LANGSUNG (JANGAN ditambah /uploads/)
            avatar = userPic;
        } else if (userPic.startsWith('http')) {
            avatar = userPic;
        } else {
            // JIKA HANYA NAMA FILE, BARU TAMBAH /uploads/
            avatar = userPic.includes('uploads') ? (userPic.startsWith('/') ? userPic : '/' + userPic) : `/uploads/${userPic}`;
        }
    }

    const displayTeamName = teamName || (isZH ? '活動' : 'Event');

    const modalHtml = `
        <div id="${overlayId}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100000; backdrop-filter: blur(8px); animation: fadeIn 0.2s ease-out;">
            <div style="background: var(--bg-card); width: 92%; max-width: 380px; border-radius: 24px; padding: 2rem; text-align: center; box-shadow: var(--shadow-lg); border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <span style="font-size: 0.75rem; font-weight: bold; color: #FF9800; background: rgba(255, 152, 0, 0.1); padding: 4px 12px; border-radius: 12px; text-transform: uppercase; border: 1px solid rgba(255, 152, 0, 0.2);">${category || 'Activity'}</span>
                    <button onclick="document.getElementById('${overlayId}').remove()" style="background: var(--bg-secondary); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center;">✕</button>
                </div>

                <img src="${avatar}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid var(--bg-card); box-shadow: 0 8px 20px rgba(0,0,0,0.15); margin-bottom: 15px;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">

                <h4 style="margin: 0; font-size: 1.4rem; color: var(--text-primary);">${applicantName}</h4>
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 15px;">
                    🎓 ${applicantDept} ${studyYear ? `| ${studyYear}` : ''}
                </div>

                <div style="background: var(--bg-secondary); padding: 16px; border-radius: 16px; margin-bottom: 1.5rem; text-align: left; border: 1px solid var(--border-color);">
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.7rem; color: var(--text-secondary); font-weight: bold; text-transform: uppercase;">${txtHobbyLabel}</label>
                        <div style="font-size: 0.9rem; color: var(--text-primary);">${hobby}</div>
                    </div>
                    <div>
                        <label style="font-size: 0.7rem; color: var(--text-secondary); font-weight: bold; text-transform: uppercase;">${txtBioLabel}</label>
                        <div style="font-size: 0.9rem; color: var(--text-primary); font-style: italic;">"${bio}"</div>
                    </div>
                </div>

                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem; padding: 10px; background: rgba(25, 118, 210, 0.1); border-radius: 12px; border: 1px solid rgba(25, 118, 210, 0.2);">
                    ${txtApplyFor} <strong style="color: #1976D2;">${displayTeamName}</strong>
                </div>

                <div style="display: flex; gap: 1rem;">
                    <button onclick="window.handleReviewAction('reject', '${appId}', '${postId}', '${applicantEmail}', '${teamName}', '${category}')" style="flex: 1; padding: 1rem; background: var(--bg-card); color: #F44336; border: 2px solid #F44336; border-radius: 14px; cursor: pointer; font-weight: bold;">Reject</button>
                    <button onclick="window.handleReviewAction('accept', '${appId}', '${postId}', '${applicantEmail}', '${teamName}', '${category}')" style="flex: 1; padding: 1rem; background: #4CAF50; color: white; border: none; border-radius: 14px; cursor: pointer; font-weight: bold;">Accept</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.handleReviewAction = async (action, appId, postId, applicantEmail, teamName, category) => {
    // Cek bahasa yang sedang dipakai user
    const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || localStorage.getItem('i18nextLng') || 'zh-TW';
    const isZH = currentLang.toLowerCase().includes('zh');

    const userProfileStr = localStorage.getItem('userProfile');
    const userProfile = userProfileStr ? JSON.parse(userProfileStr) : null;
    const safeHostEmail = userProfile ? userProfile.email : null;

    if (!safeHostEmail) {
        alert(isZH ? "登入超時，請重新登入！" : "Login session expired!");
        return;
    }

    const payloadData = {
        event_type: category || 'study',
        event_id: (!postId || postId === 'undefined') ? '' : postId,
        participant_id: (!appId || appId === 'undefined') ? 0 : appId,
        target_user_email: (!applicantEmail || applicantEmail === 'undefined') ? '' : applicantEmail,
        host_email: safeHostEmail
    };

    // 🚨 PELACAK: Tampilkan di Console (F12) untuk melihat data apa yang dikirim
    console.log("=== DATA SENT TO SERVER ===", {
        action,
        appId,
        postId,
        applicantEmail,
        payload: payloadData
    });

    // Validasi kritis: Harus punya ID Acara dan Email Pengaju agar bisa diproses server
    if (!payloadData.event_id || !payloadData.target_user_email) {
        console.error("Missing critical data for review!", payloadData);
        alert(isZH
            ? `舊通知數據不完整 (ID: ${payloadData.event_id || '?'}), 請忽略此通知。`
            : `Old notification data is missing details (ID: ${payloadData.event_id || '?'}). Please ignore it.`);
        document.getElementById('review-app-overlay')?.remove();
        return;
    }

    try {
        const endpoint = action === 'accept' ? '/api/v1/join/approve' : '/api/v1/join/reject';

        await (window.api || api).fetch(endpoint, {
            method: 'POST',
            body: payloadData
        });

        document.getElementById('review-app-overlay')?.remove();
        alert(action === 'accept' ? (isZH ? "已接受！ ✓" : "Accepted! ✓") : (isZH ? "已拒絕 ✗" : "Declined ✗"));
        window.location.reload();

    } catch (err) {
        console.error("Failed to Review:", err);
        const errorMsg = err.message || (isZH ? "請確認您是否為此活動的發起人！" : "Make sure you are the host of this event!");
        alert((isZH ? "失敗：" : "Failed: ") + errorMsg);
    }
};


window.deletePost = async (id, category) => {
    const isZH = localStorage.getItem('language')?.includes('zh') || false;
    const confirmMsg = isZH
        ? "⚠️ 確定要刪除此活動嗎？\n一旦刪除，所有人都將無法在列表中看到它。數據將被保留在系統中，但此操作無法撤回。\n\n(注意：如果已有參與者被接受，將會扣除 1 積分)"
        : "⚠️ Are you sure you want to delete this event?\nOnce deleted, no one will be able to see it in the lists. Data will be preserved in the system, but this action cannot be undone.\n\n(Note: If participants have already been accepted, 1 credit point will be deducted)";

    if (!confirm(confirmMsg)) return;

    try {
        let endpoint = '';
        switch (category) {
            case 'carpool': endpoint = `/update-carpool-status/${id}`; break;
            case 'study': endpoint = `/update-study-status/${id}`; break;
            case 'hangout': endpoint = `/update-hangout-status/${id}`; break;
            case 'housing': endpoint = `/update-housing-status/${id}`; break;
            default: endpoint = `/update-activity-status/${id}`; // sports
        }

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'deleted' })
        });

        if (response.ok) {
            alert(isZH ? "✅ 活動已成功刪除！" : "✅ Event deleted successfully!");
            // Refresh current view or redirect
            window.location.reload();
        } else {
            const err = await response.json();
            alert((isZH ? "❌ 刪除失敗: " : "❌ Delete failed: ") + (err.error || err.message));
        }
    } catch (error) {
        console.error("Delete Error:", error);
        alert(isZH ? "❌ 發生錯誤，請稍後再試。" : "❌ An error occurred. Please try again later.");
    }
};



window.checkNotificationBadge = async () => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;

    try {
        const res = await fetch(`/api/v1/notifications/unread-count?user_email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        
        const badge = document.querySelector('.notification-badge-dot');
        if (badge) {
            const count = data.count || 0;
            if (count > 0) {
                badge.style.display = 'flex';
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.alignItems = 'center';
                badge.style.justifyContent = 'center';
                badge.style.justifyContent = 'center';
                badge.style.color = 'white';
                badge.style.fontSize = '10px';
                badge.style.fontWeight = 'bold';
                badge.style.pointerEvents = 'none'; // Ensure clicks pass to the bell
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (err) {
        console.warn("Failed to update notification badge:", err);
    }
};



// ==========================================================

// --- POP-UP DETAIL ACARA DENGAN TERJEMAHAN SEMPURNA ---

// ==========================================================

window.showEventDetail = async (activityId) => {

    try {

        const response = await fetch(`/activity/${activityId}`);

        const data = await response.json();



        if (!response.ok) return alert('Gagal memuat event!');



        const currentUserStr = localStorage.getItem('userProfile');

        const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};

        const isHost = (currentUser.email === data.host_email);



        const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

        const hostAvatar = data.profile_pic || defaultAvatar;



        const getSportTrans = (sport) => {

            const map = {

                '籃球': 'sports.type.basketball', '羽球': 'sports.type.badminton',

                '排球': 'sports.type.volleyball', '網球': 'sports.type.tennis',

                '桌球': 'sports.type.table_tennis', '棒壘球': 'sports.type.baseball',

                '足球': 'sports.type.soccer', '健身重訓': 'sports.type.gym',

                '瑜珈': 'sports.type.yoga', '有氧舞蹈': 'sports.type.aerobics',

                '慢跑': 'sports.type.jogging', '游泳': 'sports.type.swimming',

                '騎單車': 'sports.type.cycling', '其他': 'sports.type.other'

            };

            return (typeof I18n !== 'undefined' && map[sport]) ? I18n.t(map[sport]) : sport;

        };



        const getLocTrans = (loc) => {

            const map = {

                '體育健康中心 (1F 健身房)': 'sports.loc.gym_1f', '體育健康中心 (2F 綜合球場)': 'sports.loc.gym_2f',

                '體育健康中心 (3F 羽球場)': 'sports.loc.gym_3f', '游泳池 (室內)': 'sports.loc.pool',

                '學生活動中心 (舞鏡月屋)': 'sports.loc.dance_room', '室外籃球場 (靠宿舍)': 'sports.loc.court_basket',

                '室外排球場 (靠田徑場)': 'sports.loc.court_volley', '網球場': 'sports.loc.court_tennis',

                '田徑場 (司令台)': 'sports.loc.track', '壘球場': 'sports.loc.field_softball',

                '大草皮 (近校門)': 'sports.loc.grass_field', '埔里國小 (籃球場)': 'sports.loc.puli_elem',

                '埔里鎮立育樂中心': 'sports.loc.puli_rec', '虎頭山 (慢跑/飛行傘點)': 'sports.loc.hutou',

                '地理中心碑 (階梯訓練)': 'sports.loc.geographic', '國立中興大學(NCHU)籃球場': 'sports.loc.nchu',

                '自訂': 'sports.loc.custom'

            };

            return (typeof I18n !== 'undefined' && map[loc]) ? I18n.t(map[loc]) : loc;

        };



        const translatedSportType = data.sport_type ? getSportTrans(data.sport_type) : '';

        const translatedLocation = data.location ? getLocTrans(data.location) : '';



        // SENSOR BAHASA YANG KUAT

        const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || localStorage.getItem('i18nextLng') || 'zh-TW';

        const isZH = currentLang.toLowerCase().includes('zh');



        // Terjemahan Label Teks

        const txtHobby = isZH ? '興趣' : 'Hobby';

        const txtType = isZH ? '運動項目' : 'Type';

        const txtEventTime = isZH ? '運動時間' : 'Event Time';

        const txtDeadline = isZH ? '截止日期' : 'Deadline';

        const txtQuota = isZH ? '剩餘名額' : 'Quota Remaining';

        const txtPeople = isZH ? '人' : 'people';

        const txtLocation = isZH ? '地點' : 'Location';

        const txtClose = isZH ? '關閉活動' : 'Close Event';

        const txtEnterChat = isZH ? '進入聊天室' : 'Enter Chat Room';



        let locQuery = data.location || '';

        if (!locQuery.includes('埔里') && !locQuery.includes('暨大') && !locQuery.includes('NCHU')) { locQuery = '南投縣埔里鎮 ' + locQuery; }

        const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(locQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;



        // Format Tanggal disesuaikan Bahasa (Inggris = AM/PM, Mandarin = 24 Jam)

        const formatDate = (dateString) => {

            if (!dateString) return '-';

            const d = new Date(dateString);

            if (isNaN(d)) return dateString;

            if (isZH) {

                return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

            } else {

                let h = d.getHours();

                const ampm = h >= 12 ? 'PM' : 'AM';

                h = h % 12; h = h ? h : 12;

                return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}, ${h.toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${ampm}`;

            }

        };



        const overlay = document.createElement('div');

        overlay.id = 'event-detail-overlay';

        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; justify-content: center; align-items: flex-end; animation: fadeIn 0.3s;';



        overlay.innerHTML = `

            <div style="background: var(--bg-card); width: 100%; max-width: 600px; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 25px; overflow-y: auto; box-shadow: var(--shadow-lg); position: relative; animation: slideUp 0.3s ease; border: 1px solid var(--border-color); border-bottom: none;">

                <button onclick="document.getElementById('event-detail-overlay').remove()" style="position: absolute; top: 15px; right: 15px; background: var(--bg-secondary); border: none; width: 30px; height: 30px; border-radius: 50%; font-weight: bold; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; z-index: 10;">✕</button>

               

                <div style="display: inline-block; padding: 5px 12px; background: rgba(255, 152, 0, 0.1); color: #E65100; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; border: 1px solid rgba(255, 152, 0, 0.2);">

                    ${data.category || 'Event'}

                </div>

                <h2 style="margin: 0 0 20px 0; color: var(--text-primary); font-size: 1.5rem; font-weight: 700;">${data.title}</h2>

               

                <div style="background: var(--bg-secondary); border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px; border: 1px solid var(--border-color); margin-bottom: 20px;">

                    <img src="${hostAvatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid var(--bg-card); box-shadow: var(--shadow-sm);">

                    <div>

                        <div style="font-weight: bold; font-size: 1.1rem; color: var(--text-primary);">${data.host_name || 'Host'}</div>

                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">🎓 ${data.host_dept || '-'} (Year ${data.study_year || '-'})</div>

                        ${data.hobby ? `<div style="font-size: 0.8rem; color: #2196F3; margin-top: 4px;">🎯 ${txtHobby}: ${data.hobby}</div>` : ''}

                    </div>

                </div>



                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; margin-bottom: 20px; font-size: 0.95rem; color: var(--text-primary); line-height: 1.6;">

                    ${translatedSportType ? `<div style="margin-bottom: 8px;"><strong>🏷️ ${txtType}:</strong> ${translatedSportType}</div>` : ''}

                    <div style="margin-bottom: 8px;"><strong>🕒 ${txtEventTime}:</strong> ${formatDate(data.event_time)}</div>

                    <div style="margin-bottom: 8px;"><strong>⏳ ${txtDeadline}:</strong> ${formatDate(data.deadline)}</div>

                    <div style="margin-bottom: 8px;"><strong>👥 ${txtQuota}:</strong> <span style="color: #E65100; font-weight: bold;">${data.people_needed} ${txtPeople}</span></div>

                </div>



                <div style="margin-bottom: 20px;">

                    <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: var(--text-primary);">📍 ${txtLocation}: ${translatedLocation || data.location}</h3>

                    <div style="width: 100%; height: 200px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); background: var(--bg-secondary);">

                        <iframe width="100%" height="100%" style="border:0" loading="lazy" allowfullscreen src="${mapsUrl}"></iframe>

                    </div>

                </div>



                <div style="display: flex; gap: 10px; margin-top: 30px;">

                    ${isHost ? `

                        <button onclick="window.closeEventEarly('${data.id}')" style="flex: 1; padding: 15px; background: #f44336; color: white; border: none; border-radius: 12px; font-size: 1.05rem; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px;">

                            🛑 ${txtClose}

                        </button>

                    ` : ''}

                    <button onclick="document.getElementById('event-detail-overlay').remove(); window.navigateTo('messages?room=${data.category || 'sports'}_${data.id}')" style="flex: 2; padding: 15px; background: #2196F3; color: white; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px;">

                        💬 ${txtEnterChat}

                    </button>

                </div>

            </div>

        `;



        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        document.body.appendChild(overlay);



    } catch (err) { console.error('Error fetching event detail:', err); }

};



window.closeEventEarly = async (activityId) => {

    const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';

    const isZH = currentLang.toLowerCase().includes('zh');

    const msgConfirm = isZH ? '確定要立即關閉此活動的報名嗎？活動將從公開列表中移除。' : 'Close registration for this event now? It will be removed from public lists.';

    const msgSuccess = isZH ? '活動已成功關閉！' : 'Event closed successfully!';

    const msgFail = isZH ? '關閉活動失敗。' : 'Failed to close event.';



    if (!confirm(msgConfirm)) return;



    try {

        const response = await fetch(`/activity/${activityId}/close`, { method: 'POST' });

        if (response.ok) {

            alert(msgSuccess);

            document.getElementById('event-detail-overlay').remove();

            window.location.reload();

        }

    } catch (e) {

        alert(msgFail);

    }

};



window.showKickMemberModal = async (roomId) => {
    // roomId format is eventType_eventId
    const parts = roomId.split('_');
    if (parts.length < 2) return alert("Invalid Room ID");
    
    const category = parts[0];
    const postId = parts[1];

    const currentUserStr = localStorage.getItem('userProfile');
    const user = currentUserStr ? JSON.parse(currentUserStr) : {};
    if (!user.email) return alert("Please login first.");
    
    const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';
    const isZH = currentLang.toLowerCase().includes('zh');

    // Show loading or just fetch
    try {
        const res = await (window.api || api).fetch(`/api/v1/host/participants?event_type=${category}&event_id=${postId}&host_email=${encodeURIComponent(user.email)}`, { idempotency: false });
        
        if (!res.success) {
            // If host check fails, they might just not be the host
            return alert(isZH ? "只有發起人可以管理成員！" : "Only the Host can manage members!");
        }

        const participants = res.data || [];
        const members = participants.filter(p => (p.status === 'approved' || p.status === 'accepted') && p.user_email.toLowerCase() !== user.email.toLowerCase());

        const txtTitle = isZH ? '管理成員' : 'Manage Members';
        const txtKick = isZH ? '移除' : 'Kick';
        const txtNoMember = isZH ? '聊天室內沒有其他成員。' : 'No other members in the chat.';
        const txtClose = isZH ? '關閉' : 'Close';

        const overlay = document.createElement('div');
        overlay.id = 'kick-member-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 999999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px);';

        let membersHtml = '';
        if (members.length > 0) {
            membersHtml = members.map(m => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 8px; margin-bottom: 8px; border: 1px solid #eee;">
                    <span style="font-weight: bold; color: #333;">${m.snapshot_display_name || m.user_email}</span>
                    <button onclick="window.executeKickMember('${roomId}', '${m.user_email}', '${(m.snapshot_display_name || m.user_email).replace(/'/g, "\\'")}', '${category}', '${postId}')" style="background: #F44336; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">${txtKick}</button>
                </div>
            `).join('');
        } else {
            membersHtml = `<p style="text-align: center; color: #888;">${txtNoMember}</p>`;
        }

        overlay.innerHTML = `
            <div style="background: var(--bg-card); width: 90%; max-width: 400px; border-radius: 16px; padding: 20px; box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); animation: scaleIn 0.2s ease-out;">
                <h3 style="margin: 0 0 15px 0; color: var(--text-primary); text-align: center;">🛡️ ${txtTitle}</h3>
                <div style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
                    ${membersHtml}
                </div>
                <button onclick="document.getElementById('kick-member-overlay').remove()" style="width: 100%; padding: 12px; background: var(--bg-secondary); color: var(--text-primary); border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">${txtClose}</button>
            </div>
        `;
        document.body.appendChild(overlay);

    } catch (err) {
        console.error("Failed to fetch members:", err);
        alert(isZH ? "無法取得成員名單" : "Failed to fetch member list");
    }
};


window.executeKickMember = async (roomId, memberEmail, memberName, category, postId) => {

    const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';
    const isZH = currentLang.toLowerCase().includes('zh');
    const msgConfirm = isZH ? `確定要將 ${memberName} 移出活動與聊天室嗎？` : `Are you sure you want to remove ${memberName} from this event and chat?`;

    if (confirm(msgConfirm)) {
        const currentUserStr = localStorage.getItem('userProfile');
        const user = currentUserStr ? JSON.parse(currentUserStr) : {};

        try {
            // Call the backend to reject/remove the user
            const res = await (window.api || api).post('/api/v1/join/reject', {
                event_type: category,
                event_id: postId,
                target_user_email: memberEmail,
                host_email: user.email,
                participant_id: 'KICK_ACTION'
            });

            if (!res.success) throw new Error(res.message || "Failed");

            if (window.sendAppNotification) {
                window.sendAppNotification(memberEmail, 'info', isZH ? `⚠️ 您已被發起人移出活動。` : `⚠️ You have been removed from the activity by the Host.`, '');
            }

            alert(isZH ? "已成功移除！" : "Member removed successfully!");
            document.getElementById('kick-member-overlay').remove();

            if (window.location.hash.includes('messages')) {
                window.location.reload();
            } else if (window.manageParticipantsDashboard) {
                window.manageParticipantsDashboard(postId, category);
            }
        } catch (err) {
            alert(isZH ? "移除失敗" : "Failed");
        }
    }
}



document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);

    const deepPage = params.get('page');



    if (deepPage) {

        console.log('[DeepLink] Detected cold start with page:', deepPage);

        const payload = { data: { type: deepPage, id: params.get('id') || params.get('room') } };

        handleDeepLink(payload);

    } else {

        render();
        // Trigger Global Hydration after initial render
        window.refreshUserProfile();
    }

});

// =====================================
// === GLOBAL NOTIFICATION POLLING ===
// =====================================

// --- DEEP LINK HANDLER (BluePrint Item 3: Notification Action Contract) ---
window.handleDeepLink = (data) => {
    if (!data) return;
    console.log("=== ISI DATA NOTIFIKASI ===", data);
    
    // Unified Mapping for both old (type/id) and new (actionType/targetId) formats
    const type = data.actionType || data.type;
    const id = data.targetId || data.id || data.roomId;
    const meta = data.metadata || (typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload) || data || {};

    if (data.notifId) (window.api || api).fetch(`/api/v1/notifications/${data.notifId}/mark-as-read`, { method: 'POST' }).catch(console.error);

    switch (type) {
        case 'OPEN_REVIEW_MODAL':
            if (window.showReviewApplicationModal) {
                const appId = data.id || meta.id || data.aggregate_id;
                const postId = data.targetId || meta.event_id || meta.post_id || data.event_id || "";
                const applicantEmail = meta.user_email || data.user_email || meta.applicant_email;
                const teamName = meta.event_title || meta.teamName || 'Event';
                const category = meta.event_type || meta.category || 'sports';
                window.showReviewApplicationModal(appId, postId, applicantEmail, teamName, category, meta);
            }
            break;
        case 'NAVIGATE_TO_EVENT_DETAIL':
            window.navigateTo('event-detail', { id: id });
            break;
        case 'chat':
        case 'MESSAGES':
            window.navigateTo(`messages?room=${id}`);
            break;
        case 'support_appeal':
            const userEmail = localStorage.getItem('userEmail');
            const prefill = meta?.appealTemplate || I18n.t('messages.prefill.support');
            // Support room lookup logic
            const rooms = (typeof MockStore !== 'undefined' ? MockStore.getChatRooms(userEmail) : []);
            let supportRoom = rooms.find(r => r.roomType === 'support');
            if (supportRoom) {
                window.navigateTo(`messages?room=${supportRoom.id}&prefill=${encodeURIComponent(prefill)}`);
            } else {
                window.navigateTo('profile'); // Fallback
            }
            break;
        case 'violation':
            window.navigateTo('profile');
            break;
        case 'ACCEPTED':
        case 'REJECTED':
            window.navigateTo('activities');
            break;
        case 'SHOW_TOAST':
            notifications.info(data.message || "Update received");
            break;
        default:
            console.log("[DeepLink] Unhandled type:", type);
    }
};

async function syncNotifications() {
    if (document.visibilityState !== 'visible') return;

    const userProfileStr = localStorage.getItem('userProfile');
    if (!userProfileStr) return;

    try {
        const u = JSON.parse(userProfileStr);
        const safeUserEmail = localStorage.getItem('userEmail') || u.email || u.id; // Jaring Pengaman!
        const data = await (window.api || api).fetch(`/api/v1/notifications?user_email=${encodeURIComponent(safeUserEmail)}&limit=5&unread_only=true`, { idempotency: false });

        if (data.success && data.data.list && data.data.list.length > 0) {
            const latestNotifs = data.data.list;
            const lastId = localStorage.getItem('last_notif_id');
            const unreadCount = latestNotifs.filter(n => !n.is_read).length;

            // Update badge regardless of toast logic
            if (window.checkNotificationBadge) window.checkNotificationBadge();

            // Detect NEW unread notifications to show toast
            const newest = latestNotifs[0];
            if (!newest.is_read && newest.id !== lastId) {
                const isInitialSync = typeof window._hasInitialSyncCompleted === 'undefined';
                window._hasInitialSyncCompleted = true;

                localStorage.setItem('last_notif_id', newest.id);

                const meta = typeof newest.metadata === 'string' ? JSON.parse(newest.metadata) : newest.metadata;
                const actionMeta = typeof newest.action_metadata === 'string' ? JSON.parse(newest.action_metadata) : newest.action_metadata;

                const isZH = (localStorage.getItem('language') || '').includes('zh') || true;
                const eventName = meta?.event_title ? (isZH ? `「${meta.event_title}」` : ` "${meta.event_title}"`) : '';

                let title = "Notification";
                let msg = "";

                if (newest.type === 'join_request') {
                    title = isZH ? "活動申請 / Join Request" : "Join Request";
                    msg = isZH ? `🔔 新申請：${meta?.snapshot_display_name || '某人'} 申請加入${eventName}`
                        : `🔔 New join request received!`;
                } else if (newest.type === 'NEW_EVENT') {
                    title = isZH ? "新活動 / New Event" : "New Event";
                    msg = isZH ? `🚀 我們有新的活動${eventName}，快來查看！`
                        : `🚀 A new event has been created!`;
                } else if (newest.type === 'ACCEPTED') {
                    title = isZH ? "申請通過 / Accepted" : "Accepted";
                    msg = isZH ? `🎉 您對 ${eventName} 的加入申請已獲批准！`
                        : `🎉 Your join request was approved!`;
                } else if (newest.type === 'REJECTED') {
                    title = isZH ? "申請婉拒 / Rejected" : "Rejected";
                    msg = isZH ? `❌ 您對 ${eventName} 的加入申請已被婉拒。`
                        : `❌ Your join request was declined.`;
                } else if (newest.type === 'chat_message') {
                    title = isZH ? "新訊息 / New Message" : "New Message";
                    const sender = meta?.sender_name || (isZH ? '有人' : 'Someone');
                    const evtTitle = meta?.event_title || (isZH ? '活動' : 'Event');
                    const snippet = meta?.message || '';
                    msg = isZH 
                        ? `💬 ${sender} 在 "${evtTitle}" 中：${snippet}`
                        : `💬 ${sender} in "${evtTitle}": ${snippet}`;
                    
                    // Inject deep link data for handleDeepLink
                    newest.actionType = 'chat';
                    newest.targetId = meta?.room_id;
                } else {
                    title = isZH ? "系統通知 / System Update" : "System Update";
                    msg = isZH ? `🔔 您有一則新通知` : `🔔 You have a new notification`;
                }

                // Strictly ONLY show banner for real-time join_requests or chat_messages. DO NOT pop up on initial load.
                if (!isInitialSync && (newest.type === 'join_request' || newest.type === 'chat_message')) {
                    // Show the toast banner immediately
                    notifications.showNativeBanner({
                        title: title,
                        body: msg,
                        notifId: newest.id, // Explicitly pass DB ID
                        data: { ...newest, metadata: meta, action_metadata: actionMeta }
                    });
                }

                // Mark as read immediately on fetch so it doesn't haunt the user on next login
                (window.api || api).fetch(`/api/v1/notifications/${newest.id}/mark-as-read`, { method: 'POST' }).catch(console.error);
            }

            // Auto-refresh disabled to save DB quota
        }
    } catch (e) {
        console.warn("[Resilience] Syncing paused:", e);
    }
}

let notificationPollInterval;
const POLL_RATE = 60000; // Increased to 60s to save DB quota (Usage Quota Exhausted fix)

function startGlobalPolling() {
    if (notificationPollInterval) clearInterval(notificationPollInterval);
    notificationPollInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            syncNotifications();
        }
    }, POLL_RATE);
}

// BluePrint Item 1: Client Consistency Rule (Manual/Focus Sync)
window.addEventListener('focus', () => {
    if (document.visibilityState === 'visible') {
        console.log("[Resilience] Window Focused: Triggering reconciliation...");
        syncNotifications();
        // Removed automatic window.refreshHome() to save quota. User must refresh manually.
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        syncNotifications();
        startGlobalPolling();
    } else {
        if (notificationPollInterval) clearInterval(notificationPollInterval);
        console.log('[System] Tab is hidden. Background polling stopped.');
    }
});

if (localStorage.getItem('userProfile')) {
    startGlobalPolling();
}

// 🌏 Listen for URL Hash Changes for Deep Linking
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (hash && state.isLoggedIn) {
        window.navigateTo(hash);
    }
});

// --- Starbucks Promotional Pop-up (Gen Z Aesthetic Implementation) ---
(function() {
    // 1. Check if user has opted out via localStorage
    if (localStorage.getItem('hideStarbucksPromo') === 'true') return;

    const initStarbucksPromo = () => {
        // Prevent multiple instances if script runs twice
        if (document.getElementById('starbucks-promo-overlay')) return;

        // 2. Inject Premium Scoped Styles
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&display=swap');

            #starbucks-promo-overlay {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0, 40, 26, 0.75); /* Deep green tinted overlay */
                backdrop-filter: blur(10px);
                display: flex; align-items: center; justify-content: center;
                z-index: 2147483647;
                font-family: 'Outfit', 'Noto Sans TC', sans-serif;
                padding: 16px; box-sizing: border-box;
            }

            #starbucks-promo-modal {
                background: #FFFDF9; /* Light Cream Background */
                width: 90%; max-width: 380px;
                max-height: 85vh; overflow-y: auto;
                padding: clamp(24px, 8vw, 40px) clamp(16px, 5vw, 24px) 24px;
                border-radius: 32px;
                position: relative;
                box-shadow: 0 40px 100px rgba(0,0,0,0.6);
                text-align: center;
                border: 5px solid #00704A; /* Starbucks Green */
                animation: promoBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            @keyframes promoBounceIn {
                0% { transform: scale(0.4) translateY(100px); opacity: 0; }
                100% { transform: scale(1) translateY(0); opacity: 1; }
            }

            #starbucks-promo-emoji {
                font-size: clamp(2rem, 10vw, 3.5rem); 
                display: block; margin-bottom: 12px;
                animation: promoFloat 3s ease-in-out infinite;
                filter: drop-shadow(0 10px 15px rgba(0,0,0,0.15));
            }

            @keyframes promoFloat {
                0%, 100% { transform: translateY(0) rotate(-3deg); }
                50% { transform: translateY(-20px) rotate(3deg); }
            }

            #starbucks-promo-title {
                color: #00704A; font-weight: 900; 
                font-size: clamp(1.3rem, 7vw, 1.8rem);
                margin: 0; line-height: 1.1; letter-spacing: -1px;
            }

            #starbucks-promo-subtitle {
                color: #888; 
                font-size: clamp(0.75rem, 3vw, 0.9rem);
                font-weight: 700;
                margin-top: 4px; margin-bottom: clamp(20px, 6vw, 30px);
                text-transform: uppercase; letter-spacing: 1px;
            }

            .promo-sticker-card {
                background: #FFFFFF; border-radius: 28px; 
                padding: clamp(14px, 4vw, 20px);
                margin-bottom: clamp(14px, 4vw, 20px); 
                border: 4px solid #00704A;
                box-shadow: 8px 8px 0px #00704A; transition: all 0.2s ease;
            }

            .sticker-host { transform: rotate(1.5deg); }
            .sticker-join { transform: rotate(-1.5deg); }

            .promo-card-cn {
                font-weight: 900; 
                font-size: clamp(1.2rem, 6vw, 1.6rem);
                color: #e65100; /* Vibrant Orange */
                display: block; margin-bottom: 4px;
            }

            .promo-card-en {
                font-weight: 700; 
                font-size: clamp(0.7rem, 2.5vw, 0.85rem);
                color: #888; /* Visually secondary English */
                display: block;
            }

            #starbucks-promo-deadline {
                font-weight: 900; color: #FFF; background: #333;
                margin: 10px 0 clamp(20px, 6vw, 30px); 
                font-size: clamp(0.85rem, 3vw, 1rem); 
                display: inline-block;
                padding: 8px 24px; border-radius: 50px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }

            #starbucks-promo-cta {
                display: block; background: #e65100; color: white !important;
                text-decoration: none; font-weight: 900; 
                font-size: clamp(1.1rem, 5vw, 1.4rem);
                padding: clamp(18px, 5vw, 24px); 
                border-radius: 20px; margin-bottom: 30px;
                box-shadow: 0 15px 30px rgba(230, 81, 0, 0.4);
                animation: promoPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                transition: transform 0.2s, filter 0.2s;
            }

            #starbucks-promo-cta:hover { filter: brightness(1.1); }
            #starbucks-promo-cta:active { transform: scale(0.96); }

            @keyframes promoPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            #starbucks-promo-footer {
                display: flex; flex-direction: column; align-items: center; gap: 20px;
                margin-top: 10px; padding-top: clamp(20px, 6vw, 25px); 
                border-top: 3px dashed #E0E0E0;
            }

            .promo-footer-row { display: flex; width: 100%; justify-content: space-between; align-items: center; }

            .promo-checkbox-label {
                display: flex; align-items: center; gap: 10px;
                font-size: clamp(0.8rem, 3vw, 0.95rem); 
                color: #888; cursor: pointer;
                font-weight: 700; user-select: none;
            }

            .promo-checkbox-label input { width: 20px; height: 20px; accent-color: #00704A; cursor: pointer; }

            #starbucks-promo-close-btn {
                background: #F0F0F0; border: none; 
                padding: 10px clamp(16px, 5vw, 28px);
                border-radius: 16px; font-weight: 900; color: #555;
                cursor: pointer; transition: all 0.2s; 
                font-size: clamp(0.8rem, 3vw, 0.95rem);
            }

            #starbucks-promo-close-btn:hover { background: #E5E5E5; color: #222; }
        `;
        document.head.appendChild(style);

        // 3. Inject Modal HTML
        const modalContainer = document.createElement('div');
        modalContainer.id = 'starbucks-promo-overlay';
        modalContainer.innerHTML = `
            <div id="starbucks-promo-modal">
                <span id="starbucks-promo-emoji">🎁</span>
                <h1 id="starbucks-promo-title">星巴克請你喝！</h1>
                <div id="starbucks-promo-subtitle">JoinUp! Exclusive Giveaway</div>
                
                <div class="promo-sticker-card sticker-host">
                    <span class="promo-card-cn">發起活動 +2 次</span>
                    <span class="promo-card-en">Host an event = 2 Entries</span>
                </div>

                <div class="promo-sticker-card sticker-join">
                    <span class="promo-card-cn">參加活動 +1 次</span>
                    <span class="promo-card-en">Join an event = 1 Entry</span>
                </div>

                <div id="starbucks-promo-deadline">⏰ 截止: 05/07 12:00 PM</div>

                <a href="https://reurl.cc/O6YKYX" target="_blank" id="starbucks-promo-cta">立即前往參加抽獎！</a>

                <div id="starbucks-promo-footer">
                    <div class="promo-footer-row">
                        <label class="promo-checkbox-label">
                            <input type="checkbox" id="starbucks-promo-hide-checkbox">
                            <span>不再顯示 (Don't show again)</span>
                        </label>
                        <button id="starbucks-promo-close-btn">關閉 Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalContainer);

        // 4. Functional Logic
        const closeBtn = document.getElementById('starbucks-promo-close-btn');
        const hideCheckbox = document.getElementById('starbucks-promo-hide-checkbox');

        const closeModal = () => {
            if (hideCheckbox.checked) {
                localStorage.setItem('hideStarbucksPromo', 'true');
            }
            modalContainer.remove();
        };

        closeBtn.addEventListener('click', closeModal);
        modalContainer.addEventListener('click', (e) => {
            if (e.target.id === 'starbucks-promo-overlay') closeModal();
        });
    };

    // 5. Trigger on DOMContentLoaded safely
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStarbucksPromo);
    } else {
        initStarbucksPromo();
    }
})();


