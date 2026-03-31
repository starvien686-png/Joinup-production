import { notifications } from './services/notification.js';



window.notifications = notifications;

import { renderRegister } from './views/register.js?v=16';

import { renderHome } from './views/home.js?v=17';

import { openFeedbackModal } from './views/feedback.js?v=16';

import { showUserProfile } from './views/userProfileModal.js?v=1';

import { MockStore } from './models/mockStore.js?v=21';



import { openRatingModal, checkPendingFeedback } from './views/rating.js?v=5';



window.showUserProfile = showUserProfile;

window.openRatingModal = openRatingModal;



const app = document.getElementById('app');



const state = {

    isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',

    userEmail: localStorage.getItem('userEmail') || '',

    onLoggedIn: () => { }

};



const render = () => {

    if (state.isLoggedIn) {

        const user = MockStore.getUser(state.userEmail);



        // 👇 PELATUK AUTO-FEEDBACK 👇

        const userProfile = JSON.parse(localStorage.getItem('userProfile'));

        if (userProfile) checkPendingFeedback(userProfile);

        // 👆 ======================= 👆



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

        renderHome();

    }

};



window.navigateTo = (viewName) => {

    if (viewName === 'home') {

        state.isLoggedIn = true;

        renderHome();

    } else if (viewName === 'register') {

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

window.refreshUserProfile = async () => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;
    try {
        const response = await fetch(`/api/v1/profile-user?email=${userEmail}`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const user = data[0];
                const updatedProfile = {
                    username: user.username,
                    email: user.email,
                    major: user.major,
                    study_year: user.study_year,
                    role: user.role,
                    bio: user.bio,
                    hobby: user.hobby,
                    profile_pic: user.profile_pic,
                    credit_points: user.credit_points
                };
                localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
                window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updatedProfile }));
            }
        }
    } catch (e) {
        console.error('Failed to refresh profile:', e);
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
    } catch (e) {
        const lite = { ...user, profile_pic: '', photoURL: '' };
        localStorage.setItem('userProfile', JSON.stringify(lite));
    }

    state.isLoggedIn = true;

    state.user = user;

    state.onLoggedIn(user);

    render();

    setTimeout(window.checkNotificationBadge, 500);

};



window.handleDeepLink = (payload) => {

    const { type, id, metadata } = payload;

    if (payload.notifId) MockStore.trackNotificationStatus(payload.notifId, 'opened');



    if (type === 'support_appeal') {

        const userEmail = localStorage.getItem('userEmail');

        let rooms = MockStore.getChatRooms(userEmail);

        let supportRoom = rooms.find(r => r.roomType === 'support');

        if (!supportRoom) {

            supportRoom = MockStore.createChatRoom({

                postId: 'None', applicationId: 'None',

                participants: [{ id: userEmail, role: 'user' }, { id: 'support', role: 'support' }],

                roomType: 'support'

            });

        }

        const prefill = metadata?.appealTemplate || I18n.t('messages.prefill.support');

        window.navigateTo(`messages?room=${supportRoom.id}&prefill=${encodeURIComponent(prefill)}`);

    } else if (type === 'chat') {

        window.navigateTo(`messages?room=${id}`);

    } else if (type === 'violation') { window.navigateTo('profile'); }

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
            const res = await api.fetch(`/api/v1/notifications?user_email=${encodeURIComponent(safeUserEmail)}&limit=20`, { idempotency: false });

            if (res.success && res.data && res.data.list) {
                personalNotifications = res.data.list.map(n => {
                    const meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {});
                    let msg = isZH ? '系統通知' : 'System Notification';
                    let link = '';
                    let iconType = 'info';

                    // Ubah format data dari Database jadi tampilan UI
                    if (n.type === 'join_request') {
                        const evtName = meta.event_title || '活動';
                        const sender = meta.snapshot_display_name || '有人';
                        msg = isZH ? `🔔 新申請：${sender} 申請加入 "${evtName}"` : `🔔 New request: ${sender} wants to join "${evtName}"`;

                        // Link Sakti buat buka Modal Accept/Decline!
                        const category = meta.event_type || 'sports';
                        const postId = meta.targetId || meta.event_id || '';
                        link = `action:review_${category}_app:${n.id}:${postId}:${meta.user_email}:${encodeURIComponent(evtName)}`;
                        iconType = 'action';

                    } else if (n.type === 'join_approved') {
                        msg = isZH ? `✅ 恭喜！您申請的活動已獲批准！` : `✅ Congrats! Your event join request was approved!`;
                        link = `messages?room=${meta.event_type}_${meta.event_id}`;
                        iconType = 'success';
                    } else if (n.type === 'join_rejected') {
                        msg = isZH ? `❌ 抱歉，您的活動申請已被婉拒。` : `❌ Sorry, your event join request was declined.`;
                        iconType = 'info';
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
            }
        } catch (err) {
            console.error("Gagal narik notifikasi dari server:", err);
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
            const isAction = n.type === 'action';
            const icon = isAction ? '⚡' : (n.type === 'success' ? '🎉' : '🔔');
            const bgStyle = isAction ? 'background: #FFF3E0; border-left: 4px solid #FF9800;' : (n.type === 'success' ? 'background: #E8F5E9; border-left: 4px solid #4CAF50;' : '');

            return `
            <div class="notification-item ${n.isRead ? 'read' : 'unread'}" onclick="window.handleNotificationClick('${n.link}')" style="cursor: pointer; ${bgStyle}">
                <div class="notif-icon">${icon}</div>
                <div class="notif-content">
                    <div class="notif-msg" style="${isAction ? 'font-weight: bold; color: #E65100;' : ''}">${n.message}</div>
                    <div class="notif-time">${new Date(n.createdAt).toLocaleString()}</div>
                </div>
                ${n.link ? '<div class="notif-arrow">›</div>' : ''}
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
                <div class="notif-section">
                    <h3>${txtPersonal}</h3>
                    <div class="notif-list">${renderPersonal()}</div>
                </div>
                <hr style="margin: 1rem 0; border: 0; border-top: 1px solid #eee;">
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

        } else { window.location.href = link; }

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

    // --- PERBAIKAN 3: Jalur Foto Profil (Tambahkan /uploads/) ---
    let avatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; // Default
    if (realUserData?.profile_pic) {
        // Jika sudah ada 'http', pakai langsung. Jika belum, tambah /uploads/
        avatar = realUserData.profile_pic.startsWith('http')
            ? realUserData.profile_pic
            : `/uploads/${realUserData.profile_pic}`;
    }

    const displayTeamName = teamName || (isZH ? '活動' : 'Event');

    const modalHtml = `
        <div id="${overlayId}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100000; backdrop-filter: blur(8px);">
            <div style="background: white; width: 92%; max-width: 380px; border-radius: 24px; padding: 2rem; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <span style="font-size: 0.75rem; font-weight: bold; color: #FF9800; background: #FFF3E0; padding: 4px 12px; border-radius: 12px; text-transform: uppercase;">${category || 'Activity'}</span>
                    <button onclick="document.getElementById('${overlayId}').remove()" style="background: #f5f5f5; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer;">×</button>
                </div>

                <img src="${avatar}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid white; box-shadow: 0 8px 20px rgba(0,0,0,0.15); margin-bottom: 15px;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">

                <h4 style="margin: 0; font-size: 1.4rem; color: #1a1a1a;">${applicantName}</h4>
                <div style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">
                    🎓 ${applicantDept} ${studyYear ? `| ${studyYear}` : ''}
                </div>

                <div style="background: #fafafa; padding: 16px; border-radius: 16px; margin-bottom: 1.5rem; text-align: left;">
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 0.7rem; color: #999; font-weight: bold; text-transform: uppercase;">${txtHobbyLabel}</label>
                        <div style="font-size: 0.9rem; color: #333;">${hobby}</div>
                    </div>
                    <div>
                        <label style="font-size: 0.7rem; color: #999; font-weight: bold; text-transform: uppercase;">${txtBioLabel}</label>
                        <div style="font-size: 0.9rem; color: #444; font-style: italic;">"${bio}"</div>
                    </div>
                </div>

                <div style="font-size: 0.85rem; color: #666; margin-bottom: 1.5rem; padding: 10px; background: #f0f7ff; border-radius: 12px;">
                    ${txtApplyFor} <strong style="color: #1976D2;">${displayTeamName}</strong>
                </div>

                <div style="display: flex; gap: 1rem;">
                    <button onclick="window.handleReviewAction('reject', '${appId}', '${postId}', '${applicantEmail}', '${teamName}', '${category}')" style="flex: 1; padding: 1rem; background: #fff; color: #F44336; border: 2px solid #F44336; border-radius: 14px; cursor: pointer; font-weight: bold;">Reject</button>
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

    // Tarik email host dengan aman
    const safeHostEmail = localStorage.getItem('userEmail');

    // ALERT 1: Sesi habis / Belum Login (Bilingual)
    if (!safeHostEmail) {
        alert(isZH ? "登入超時，請重新登入！" : "Login session expired, please login again!");
        return;
    }

    try {
        const endpoint = action === 'accept' ? '/api/v1/join/approve' : '/api/v1/join/reject';

        await api.fetch(endpoint, {
            method: 'POST',
            body: {
                event_type: category || 'study',
                event_id: postId,
                // Jaring pengaman biar ga kena Error 400 Missing Fields
                participant_id: appId && appId !== 'undefined' ? appId : 0,
                target_user_email: applicantEmail,
                host_email: safeHostEmail
            }
        });

        // Sukses! Tutup pop up
        document.getElementById('review-app-overlay')?.remove();

        // ALERT 2: Sukses Diterima / Ditolak (Bilingual)
        alert(action === 'accept' ? (isZH ? "已接受！ ✓" : "Accepted! ✓") : (isZH ? "已拒絕 ✗" : "Declined ✗"));

        // Refresh webnya biar status update
        window.location.reload();

    } catch (err) {
        console.error("Gagal Review:", err);

        // ALERT 3: Error / Gagal (Bilingual)
        // Kalau error dari server kosong, kita kasih pesan default yang ramah
        const errorMsg = err.message || (isZH ? "請確認您是否為此活動的發起人！" : "Please make sure you are the host of this event!");
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



window.checkNotificationBadge = () => {

    const userProfileStr = localStorage.getItem('userProfile');

    if (!userProfileStr) return;

    const user = JSON.parse(userProfileStr);



    const countMock = MockStore.getGlobalUnreadCount ? MockStore.getGlobalUnreadCount(user.email) : 0;

    const localNotifs = JSON.parse(localStorage.getItem(`joinup_notifs_${user.email}`) || '[]');

    const countLocal = localNotifs.filter(n => !n.isRead).length;

    const count = countMock + countLocal;



    const badge = document.querySelector('.notification-badge-dot');

    if (badge) {

        if (count > 0) {

            badge.style.display = 'flex';

            badge.textContent = count > 9 ? '9+' : count;

            badge.style.alignItems = 'center';

            badge.style.justifyContent = 'center';

            badge.style.color = 'white';

            badge.style.fontSize = '10px';

        } else { badge.style.display = 'none'; }

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

            <div style="background: white; width: 100%; max-width: 600px; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 25px; overflow-y: auto; box-shadow: 0 -5px 15px rgba(0,0,0,0.2); position: relative; animation: slideUp 0.3s ease;">

                <button onclick="document.getElementById('event-detail-overlay').remove()" style="position: absolute; top: 15px; right: 15px; background: #eee; border: none; width: 30px; height: 30px; border-radius: 50%; font-weight: bold; cursor: pointer; color: #555; z-index: 10;">X</button>

               

                <div style="display: inline-block; padding: 5px 12px; background: #FFF3E0; color: #E65100; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">

                    ${data.category || 'Event'}

                </div>

                <h2 style="margin: 0 0 20px 0; color: #333; font-size: 1.5rem;">${data.title}</h2>

               

                <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px; border: 1px solid #eee; margin-bottom: 20px;">

                    <img src="${hostAvatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd;">

                    <div>

                        <div style="font-weight: bold; font-size: 1.1rem; color: #333;">${data.host_name || 'Host'}</div>

                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 4px;">🎓 ${data.host_dept || '-'} (Year ${data.study_year || '-'})</div>

                        ${data.hobby ? `<div style="font-size: 0.8rem; color: #007BFF; margin-top: 4px;">🎯 ${txtHobby}: ${data.hobby}</div>` : ''}

                    </div>

                </div>



                <div style="background: white; border: 1px solid #ddd; border-radius: 12px; padding: 15px; margin-bottom: 20px; font-size: 0.95rem; color: #444; line-height: 1.6;">

                    ${translatedSportType ? `<div style="margin-bottom: 8px;"><strong>🏷️ ${txtType}:</strong> ${translatedSportType}</div>` : ''}

                    <div style="margin-bottom: 8px;"><strong>🕒 ${txtEventTime}:</strong> ${formatDate(data.event_time)}</div>

                    <div style="margin-bottom: 8px;"><strong>⏳ ${txtDeadline}:</strong> ${formatDate(data.deadline)}</div>

                    <div style="margin-bottom: 8px;"><strong>👥 ${txtQuota}:</strong> <span style="color: #E65100; font-weight: bold;">${data.people_needed} ${txtPeople}</span></div>

                </div>



                <div style="margin-bottom: 20px;">

                    <h3 style="margin: 0 0 10px 0; font-size: 1.1rem;">📍 ${txtLocation}: ${translatedLocation || data.location}</h3>

                    <div style="width: 100%; height: 200px; border-radius: 12px; overflow: hidden; border: 1px solid #ddd; background: #eee;">

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

    const chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');

    const room = chatRooms.find(r => String(r.id) === String(roomId));



    if (!room) return alert("Ruang obrolan tidak ditemukan!/Chat room not found!");



    const currentUserStr = localStorage.getItem('userProfile');

    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};



    const hostParticipant = room.participants.find(p => p.role === 'host');

    const isHost = hostParticipant && hostParticipant.id === currentUser.email;



    const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';

    const isZH = currentLang.toLowerCase().includes('zh');



    if (!isHost) {

        return alert(isZH ? "只有發起人可以移除成員！" : "Only the Host can remove members!");

    }



    const members = room.participants.filter(p => p.id !== currentUser.email);



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

                <span style="font-weight: bold; color: #333;">${m.name || m.id}</span>

                <button onclick="window.executeKickMember('${roomId}', '${m.id}', '${m.name || m.id}')" style="background: #F44336; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">${txtKick}</button>

            </div>

        `).join('');

    } else {

        membersHtml = `<p style="text-align: center; color: #888;">${txtNoMember}</p>`;

    }



    overlay.innerHTML = `

        <div style="background: white; width: 90%; max-width: 400px; border-radius: 16px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">

            <h3 style="margin: 0 0 15px 0; color: #333; text-align: center;">🛡️ ${txtTitle}</h3>

            <div style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">

                ${membersHtml}

            </div>

            <button onclick="document.getElementById('kick-member-overlay').remove()" style="width: 100%; padding: 12px; background: #eee; color: #333; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">${txtClose}</button>

        </div>

    `;



    document.body.appendChild(overlay);

};



window.executeKickMember = (roomId, memberEmail, memberName) => {

    const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';

    const isZH = currentLang.toLowerCase().includes('zh');

    const msgConfirm = isZH ? `確定要將 ${memberName} 移出聊天室嗎？` : `Are you sure you want to remove ${memberName}?`;



    if (confirm(msgConfirm)) {

        let chatRooms = JSON.parse(localStorage.getItem('chatRooms') || '[]');

        const roomIndex = chatRooms.findIndex(r => String(r.id) === String(roomId));

        if (roomIndex > -1) {

            chatRooms[roomIndex].participants = chatRooms[roomIndex].participants.filter(p => p.id !== memberEmail);

            localStorage.setItem('chatRooms', JSON.stringify(chatRooms));

        }



        if (window.sendAppNotification) {

            window.sendAppNotification(memberEmail, 'info', isZH ? `⚠️ 您已被發起人移出聊天室。` : `⚠️ You have been removed from the chat room by the Host.`, '');

        }



        alert(isZH ? "已成功移除！" : "Member removed successfully!");

        document.getElementById('kick-member-overlay').remove();



        if (window.location.hash.includes('messages')) {

            window.location.reload();

        }

    }

};



document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);

    const deepPage = params.get('page');



    if (deepPage) {

        console.log('[DeepLink] Detected cold start with page:', deepPage);

        const payload = { data: { type: deepPage, id: params.get('id') || params.get('room') } };

        handleDeepLink(payload);

    } else {

        render();

    }

});

// =====================================
// === GLOBAL NOTIFICATION POLLING ===
// =====================================
// UX Resilience Strategy: Background polling checks every 15s using Page Visibility API 
// to gracefully sync Eventual Consistency Side-Effects (like join approvals) from Outbox.
import api from './utils/api.js';

// --- DEEP LINK HANDLER (BluePrint Item 3: Notification Action Contract) ---
window.handleDeepLink = (data) => {
    if (!data) return;
    const { actionType, targetId } = data;

    switch (actionType) {
        case 'OPEN_REVIEW_MODAL':
            if (window.showReviewApplicationModal) {
                // If data has full metadata (from background fetch), use it
                const meta = data.metadata || (typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload) || data || {};
                const appId = data.id || meta.id || data.aggregate_id;
                const postId = data.targetId || meta.event_id || data.aggregate_id;
                const applicantEmail = meta.user_email || data.user_email || meta.applicant_email;
                const teamName = meta.event_title || meta.teamName || 'Event';
                const category = meta.event_type || meta.category || 'sports';

                window.showReviewApplicationModal(appId, postId, applicantEmail, teamName, category, meta);
            }
            break;
        case 'NAVIGATE_TO_EVENT_DETAIL':
            window.navigateTo('event-detail', { id: targetId });
            break;
        case 'SHOW_TOAST':
            notifications.info(data.message || "Update received");
            break;
    }
};

async function syncNotifications() {
    if (document.visibilityState !== 'visible') return;

    const userProfileStr = localStorage.getItem('userProfile');
    if (!userProfileStr) return;

    try {
        const u = JSON.parse(userProfileStr);
        const safeUserEmail = localStorage.getItem('userEmail') || u.email || u.id; // Jaring Pengaman!
        const data = await api.fetch(`/api/v1/notifications?user_email=${encodeURIComponent(safeUserEmail)}&limit=5`, { idempotency: false });

        if (data.success && data.data.list && data.data.list.length > 0) {
            const latestNotifs = data.data.list;
            const lastId = localStorage.getItem('last_notif_id');
            const unreadCount = latestNotifs.filter(n => !n.is_read).length;

            // Update badge regardless of toast logic
            if (window.checkNotificationBadge) window.checkNotificationBadge();

            // Detect NEW unread notifications to show toast
            const newest = latestNotifs[0];
            if (!newest.is_read && newest.id !== lastId) {
                localStorage.setItem('last_notif_id', newest.id);

                const meta = typeof newest.metadata === 'string' ? JSON.parse(newest.metadata) : newest.metadata;
                const actionMeta = typeof newest.action_metadata === 'string' ? JSON.parse(newest.action_metadata) : newest.action_metadata;

                const isZH = (localStorage.getItem('language') || '').includes('zh') || true;
                const eventName = meta?.event_title ? (isZH ? `「${meta.event_title}」` : ` "${meta.event_title}"`) : '';
                const msg = isZH ? `🔔 新申請：${meta?.snapshot_display_name || '某人'} 申請加入${eventName}`
                    : `🔔 New join request from ${meta?.snapshot_display_name || 'someone'} for${eventName}`;

                // Show the toast banner immediately
                notifications.showNativeBanner({
                    title: isZH ? "活動申請 / Join Request" : "Join Request",
                    body: msg,
                    data: { ...newest, metadata: meta, action_metadata: actionMeta }
                });
            }

            if (window.currentView === 'home' && window.refreshHome) {
                window.refreshHome();
            }
        }
    } catch (e) {
        console.warn("[Resilience] Syncing paused:", e);
    }
}

let notificationPollInterval;
const POLL_RATE = 12000; // 12s polling for active sessions

function startGlobalPolling() {
    if (notificationPollInterval) clearInterval(notificationPollInterval);
    notificationPollInterval = setInterval(syncNotifications, POLL_RATE);
}

// BluePrint Item 1: Client Consistency Rule (Focus Re-fetch)
window.addEventListener('focus', () => {
    console.log("[Resilience] Window Focused: Triggering reconciliation...");
    syncNotifications();
    if (window.currentView === 'home' && window.refreshHome) {
        window.refreshHome();
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        syncNotifications();
        startGlobalPolling();
    } else {
        if (notificationPollInterval) clearInterval(notificationPollInterval);
    }
});

if (localStorage.getItem('userProfile')) {
    startGlobalPolling();
}
