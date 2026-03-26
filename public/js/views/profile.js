import { I18n } from '../services/i18n.js';

export const renderProfile = () => {
    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');
    const user = userProfileStr ? JSON.parse(userProfileStr) : {
        displayName: I18n.t('profile.guest'),
        email: I18n.t('profile.not_logged_in'),
        department: 'N/A',
        successMatches: 0
    };



    const avatarStyle = user.photoURL
        ? `background-image: url('${user.photoURL}'); background-size: cover; background-position: center; color: transparent;`
        : `background: #E3F2FD; color: #333;`;

    app.innerHTML = `
        <div class="container fade-in" style="padding-bottom: 90px;">
            <header style="margin-bottom: 2rem;">
                <h2 style="margin: 0;">👤 ${I18n.t('profile.title')}</h2>
            </header>

            <div class="card" style="text-align: center; margin-bottom: 2rem;">
                
                <div id="profile-avatar-display" style="width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); ${avatarStyle}">
                    ${user.photoURL ? '' : '👤'}
                </div>
                <p style="color: #666; margin: 0;">${user.displayName || 'N/A'}</p>
                <div style="margin-top: 1rem; display: inline-block; padding: 0.5rem 1rem; background: #E8F5E9; color: #2E7D32; border-radius: 20px; font-size: 0.9rem;">
                    ✨ ${I18n.t('profile.credit_points')}：${user.credit_points !== undefined ? user.credit_points : 0}
                </div>
                <div style="margin-top: 1rem; display: inline-block; padding: 0.5rem 1rem; background: #FFEBEE; color: #C62828; border-radius: 20px; font-size: 0.9rem; margin-left: 0.5rem;">
                    🚫 ${I18n.t('profile.violation_count')}：${user.violationCount || 0}
                </div>
            </div>

            <div class="list-wrapper">
                <button id="asset-delivery-btn" class="btn" style="width: 100%; margin-bottom: 1rem; background: white; color: #333; border: 1px solid #ddd; display: none; justify-content: space-between; align-items: center;" onclick="window.navigateTo('asset-delivery')">
                    <span>📦 ${I18n.t('profile.btn.asset')}</span>
                    <span>></span>
                </button>
                <button class="btn" style="width: 100%; margin-bottom: 1rem; background: white; color: #333; border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;" onclick="window.navigateTo('settings')">
                    <span>⚙️ ${I18n.t('profile.btn.settings')}</span>
                    <span>></span>
                </button>
                <button class="btn" style="width: 100%; margin-bottom: 1rem; background: white; color: #333; border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;" onclick="window.navigateTo('contact')">
                    <span>❓ ${I18n.t('profile.btn.help')}</span>
                    <span>></span>
                </button>
                <button class="btn" style="width: 100%; margin-bottom: 1rem; background: white; color: #C62828; border: 1px solid #FFCDD2; display: flex; justify-content: space-between; align-items: center;" onclick="window.reportCurrentTarget('${user.email}', 'user')">
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
                <button onclick="if(confirm('${I18n.t('profile.confirm.clear_cache')}')){ localStorage.setItem('joinup_messages_manual_test_v1', '[]'); alert('${I18n.t('profile.alert.cache_cleared')}'); window.location.reload(); }" style="display: block; width: 100%; margin-top: 1rem; background: #FFF3E0; color: #E65100; border: none; padding: 1rem; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    🗑️ ${I18n.t('profile.btn.clear_cache')}
                </button>
                <button onclick="localStorage.removeItem('userProfile'); localStorage.removeItem('isLoggedIn'); localStorage.removeItem('userEmail'); window.location.reload();" style="display: block; width: 100%; margin-top: 1rem; background: #FFEBEE; color: #C62828; border: none; padding: 1rem; border-radius: 8px; cursor: pointer;">
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
