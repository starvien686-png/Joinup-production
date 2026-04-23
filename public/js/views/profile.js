import { I18n } from '../services/i18n.js';

export const renderProfile = () => {
    const app = document.getElementById('app');
    const userEmail = localStorage.getItem('userEmail');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    // 1. ROUTE GUARD
    if (!userEmail || !isLoggedIn) {
        console.warn('[Profile] No session found, redirecting to login...');
        window.location.hash = '#login';
        return;
    }

    // 2. INITIAL DATA (LOCAL STORAGE)
    const userProfileStr = localStorage.getItem('userProfile');
    const user = userProfileStr ? JSON.parse(userProfileStr) : null;

    const renderContent = (userData) => {
        if (!userData) {
            // Skeleton state if somehow localStorage is empty
            app.innerHTML = `<div class="container fade-in"><div class="card skeleton" style="height: 200px; margin-top: 2rem;"></div></div>`;
            return;
        }

        const avatarStyle = userData.profile_pic || userData.photoURL
            ? `background-image: url('${userData.profile_pic || userData.photoURL}'); background-size: cover; background-position: center; color: transparent;`
            : `background: #E3F2FD; color: #333;`;

        app.innerHTML = `
            <div class="container fade-in" style="padding-bottom: 90px;">
                <header style="margin-bottom: 2rem;">
                    <h2 style="margin: 0;">👤 ${I18n.t('profile.title')}</h2>
                </header>

                <div class="card" style="text-align: center; margin-bottom: 2rem;">
                    <div id="profile-avatar-display" style="width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); ${avatarStyle}">
                        ${(userData.profile_pic || userData.photoURL) ? '' : '👤'}
                    </div>
                    <h2 id="profile-username" style="margin: 0; color: var(--text-main); display: flex; align-items: center; justify-content: center; gap: 8px;">
                        ${userData.username || userData.displayName || '...'}
                        ${userData.is_admin ? `<span style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; font-size: 0.7rem; padding: 4px 10px; border-radius: 6px; font-weight: 900; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🛡️ ADMIN</span>` : ''}
                    </h2>
                    <p id="profile-email-display" style="color: #666; margin: 5px 0 0;">${userData.email}</p>
                    
                    <div style="margin-top: 1.5rem; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                        <div style="padding: 0.5rem 1rem; background: #E8F5E9; color: #2E7D32; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                            ✨ ${I18n.t('profile.credit_points')}：<span id="profile-credit-points">${userData.credit_points || 0}</span>
                        </div>
                        <div style="padding: 0.5rem 1rem; background: #FFEBEE; color: #C62828; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                            🚫 ${I18n.t('profile.violation_points')}：<span id="profile-violation-count">${userData.violation_points || 0}</span>
                        </div>

                    </div>
                </div>

                <div class="list-wrapper">
                    <button class="btn" style="width: 100%; margin-bottom: 1rem; background: white; color: #333; border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;" onclick="window.navigateTo('settings')">
                        <span>⚙️ ${I18n.t('profile.btn.settings')}</span>
                        <span>></span>
                    </button>
                    <button class="btn" style="width: 100%; margin-bottom: 1rem; background: white; color: #C62828; border: 1px solid #FFCDD2; display: flex; justify-content: space-between; align-items: center;" onclick="window.open('https://forms.gle/9yHV6z8gfPagaG5s8', '_blank')">
                        <span>⚠️ ${I18n.t('profile.btn.report_issue')}</span>
                        <span>></span>
                    </button>
                    <button class="btn" style="width: 100%; margin-bottom: 1rem; background: white; color: #E1306C; border: 1px solid #FDCB58; display: flex; justify-content: space-between; align-items: center;" onclick="window.open('https://www.instagram.com/joinup_ncnu?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', '_blank')">
                        <span>📸 ${I18n.t('profile.btn.instagram')}</span>
                        <span>></span>
                    </button>
                </div>

                <div style="margin-top: 3rem; text-align: center;">
                     <button onclick="window.navigateTo('admin')" style="background: none; border: none; font-size: 0.8rem; color: #ccc; cursor: pointer; text-decoration: underline;">
                        ${I18n.t('profile.btn.admin')}
                    </button>
                    <button onclick="localStorage.removeItem('userProfile'); localStorage.removeItem('isLoggedIn'); localStorage.removeItem('userEmail'); window.location.reload();" style="display: block; width: 100%; margin-top: 1rem; background: #FFEBEE; color: #C62828; border: none; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        ${I18n.t('profile.btn.logout')}
                    </button>
                </div>
            </div>

            <!-- Bottom Navigation -->
            <nav class="bottom-nav">
                <a href="#" class="nav-item" onclick="window.navigateTo('home')">
                    <span class="nav-icon">🏠</span>
                    <span>${I18n.t('nav.home')}</span>
                </a>
                <a href="#" class="nav-item" onclick="window.navigateTo('my-activities')">
                    <span class="nav-icon">📋</span>
                    <span>${I18n.t('nav.activities')}</span>
                </a>
                <a href="#" class="nav-item" onclick="window.navigateTo('messages')">
                    <span class="nav-icon">💬</span>
                    <span>${I18n.t('nav.messages')}</span>
                </a>
                <a href="#" class="nav-item active">
                    <span class="nav-icon">👤</span>
                    <span>${I18n.t('nav.profile')}</span>
                </a>
            </nav>
        `;
    };

    renderContent(user);

    // 3. LISTEN FOR GLOBAL UPDATES
    const handleProfileUpdate = (e) => {
        const freshUser = e.detail;
        if (!freshUser) return;
        
        const nameEl = document.getElementById('profile-username');
        const cpEl = document.getElementById('profile-credit-points');
        const vcEl = document.getElementById('profile-violation-count');
        const avatarEl = document.getElementById('profile-avatar-display');

        if (nameEl) nameEl.innerText = freshUser.username || freshUser.displayName || '';
        if (cpEl) cpEl.innerText = freshUser.credit_points ?? freshUser.creditPoints ?? 0;
        if (vcEl) vcEl.innerText = freshUser.violation_points ?? freshUser.violationCount ?? 0;
        if (avatarEl) {
            if (freshUser.profile_pic) {
                avatarEl.style.backgroundImage = `url('${freshUser.profile_pic}')`;
                avatarEl.style.backgroundSize = 'cover';
                avatarEl.style.backgroundPosition = 'center';
                avatarEl.style.color = 'transparent';
                avatarEl.innerText = '';
            }
        }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    
    // Cleanup listener when navigating away (simple SPA strategy)
    const originalNavigate = window.navigateTo;
    window.navigateTo = function() {
        window.removeEventListener('userProfileUpdated', handleProfileUpdate);
        window.navigateTo = originalNavigate; 
        return originalNavigate.apply(this, arguments);
    };

    // Trigger a refresh if data is old or missing
    if (!user || !user.username) {
        window.refreshUserProfile();
    }
};
