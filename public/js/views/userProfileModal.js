import { MockStore } from '../models/mockStore.js?v=20';
import { I18n } from '../services/i18n.js';

export const showUserProfile = (userId) => {
    const user = MockStore.getUser(userId);

    if (!user) {
        alert(I18n.t('common.error'));
        return;
    }

    const overlayId = 'user-profile-overlay';
    const existingOverlay = document.getElementById(overlayId);
    if (existingOverlay) existingOverlay.remove();

    const renderModal = () => {
        // Fallback or default values
        const avatar = user.photoURL
            ? `<div style="width: 80px; height: 80px; border-radius: 50%; background-image: url('${user.photoURL}'); background-size: cover; background-position: center;"></div>`
            : `<div style="width: 80px; height: 80px; border-radius: 50%; background: #E3F2FD; color: #1565C0; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold;">${(user.displayName || user.email)[0].toUpperCase()}</div>`;

        return `
            <div id="${overlayId}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;">
                <div class="fade-in" style="background: white; width: 90%; max-width: 400px; border-radius: 16px; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.2); text-align: center; position: relative;">
                    <button onclick="document.getElementById('${overlayId}').remove()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;">&times;</button>
                    
                    <div style="display: flex; justify-content: center; margin-bottom: 1rem;">
                        ${avatar}
                    </div>

                    <h2 style="margin: 0.5rem 0 0.2rem 0;">${user.full_name || user.displayName || 'User'}</h2>
                    <p style="color: var(--text-secondary); margin: 0 0 1.5rem 0; font-size: 0.9rem;">${user.nickname ? `(${user.nickname})` : ''}</p>

                    <div style="text-align: left; background: #f9f9f9; padding: 1.5rem; border-radius: 12px;">
                        
                        <div style="margin-bottom: 1rem;">
                            <label style="font-size: 0.85rem; color: #666; display: block; margin-bottom: 0.2rem;">${I18n.t('profile.label.email')}</label>
                            <div style="font-weight: bold; font-size: 1rem; word-break: break-all;">${user.email || '-'}</div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div>
                                <label style="font-size: 0.85rem; color: #666; display: block; margin-bottom: 0.2rem;">${I18n.t('profile.label.gender')}</label>
                                <div style="font-weight: bold; font-size: 1rem;">${user.gender || '-'}</div>
                            </div>
                            <div>
                                <label style="font-size: 0.85rem; color: #666; display: block; margin-bottom: 0.2rem;">${I18n.t('profile.label.grade')}</label>
                                <div style="font-weight: bold; font-size: 1rem;">${user.year || user.role || '-'}</div>
                            </div>
                        </div>

                        <div style="margin-bottom: 1rem;">
                            <label style="font-size: 0.85rem; color: #666; display: block; margin-bottom: 0.2rem;">${I18n.t('reg.major_label')}</label>
                            <div style="font-weight: bold; font-size: 1rem;">${user.department || '-'}</div>
                        </div>

                        <div>
                            <label style="font-size: 0.85rem; color: #666; display: block; margin-bottom: 0.2rem;">${I18n.t('profile.hobbies')}</label>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${(user.hobbies || (user.interests ? user.interests.split(/[,，]/) : []) || []).map(h => `<span style="background: #E3F2FD; color: #1565C0; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem;">${h.trim()}</span>`).join('') || '<span style="color: #999;">-</span>'}
                            </div>
                        </div>
                    </div>
                    
                    ${user.bio ? `
                    <div style="margin-top: 1.5rem; text-align: left;">
                        <label style="font-size: 0.85rem; color: #666; display: block; margin-bottom: 0.2rem;">${I18n.t('profile.label.bio')}</label>
                        <p style="margin: 0; color: #333; line-height: 1.5;">${user.bio}</p>
                    </div>
                    ` : ''}

                    <div style="margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem;">
                        <button class="btn" style="width: 100%; background: white; color: #d32f2f; border: 1px solid #ffcdd2; display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 12px; font-weight: bold; font-size: 0.9rem; transition: background 0.2s;" onclick="window.open('https://forms.gle/9yHV6z8gfPagaG5s8', '_blank')">
                            <span>⚠️ ${I18n.t('profile.btn.report_issue')}</span>
                            <span style="font-size: 1.2rem;">›</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    };

    document.body.insertAdjacentHTML('beforeend', renderModal());
};
