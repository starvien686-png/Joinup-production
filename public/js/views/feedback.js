import { MockStore } from '../models/mockStore.js';

export const openFeedbackModal = (context = {}) => {
    // context = { targetId, targetType, defaultType }
    // defaultType: 'bug', 'violation', 'suggestion'

    const userProfileStr = localStorage.getItem('userProfile');
    if (!userProfileStr) {
        alert(I18n.t('profile.alert.login_first'));
        return;
    }
    const user = JSON.parse(userProfileStr);

    const overlayId = 'feedback-overlay';
    const existingOverlay = document.getElementById(overlayId);
    if (existingOverlay) existingOverlay.remove();

    const renderModal = () => {
        return `
            <div id="${overlayId}" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;">
                <div class="feedback-modal fade-in" style="background: white; width: 90%; max-width: 500px; border-radius: 12px; padding: 1.5rem; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0;">${I18n.t('feedback.title')}</h3>
                        <button id="btn-close-feedback" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                    </div>

                    <form id="feedbackForm">
                        <input type="hidden" id="targetId" value="${context.targetId || ''}">
                        <input type="hidden" id="targetType" value="${context.targetType || 'system'}">

                        <div class="input-group" style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">${I18n.t('feedback.label.type')}</label>
                            <select id="reportType" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd;" required>
                                <option value="suggestion" ${context.defaultType === 'suggestion' ? 'selected' : ''}>${I18n.t('feedback.type.suggestion')}</option>
                                <option value="bug" ${context.defaultType === 'bug' ? 'selected' : ''}>${I18n.t('feedback.type.bug')}</option>
                                <option value="spam" ${context.defaultType === 'spam' ? 'selected' : ''}>${I18n.t('feedback.type.spam')}</option>
                                <option value="harassment" ${context.defaultType === 'harassment' ? 'selected' : ''}>${I18n.t('feedback.type.harassment')}</option>
                                <option value="inappropriate" ${context.defaultType === 'inappropriate' ? 'selected' : ''}>${I18n.t('feedback.type.inappropriate')}</option>
                                <option value="fraud" ${context.defaultType === 'fraud' ? 'selected' : ''}>${I18n.t('feedback.type.fraud')}</option>
                                <option value="violation" ${context.defaultType === 'violation' ? 'selected' : ''}>${I18n.t('feedback.type.violation')}</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 1rem; padding: 0.8rem; background: #FFF3E0; border-radius: 8px; font-size: 0.9rem; color: #E65100; border: 1px solid #FFE0B2;">
                            <strong>${I18n.t('feedback.label.target')}</strong> ${context.targetType === 'post' ? I18n.t('feedback.label.target_post') : I18n.t('feedback.label.target_user')} [ ${context.targetId} ]
                        </div>

                        <div class="input-group" style="margin-bottom: 1rem; padding: 1rem; background: #e3f2fd; border-radius: 8px; border: 1px solid #90caf9;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #1565C0;">${I18n.t('feedback.label.meet')}</label>
                            <div style="display: flex; gap: 1rem;">
                                <label style="display: flex; align-items: center; cursor: pointer;">
                                    <input type="radio" name="meetStatus" value="yes" required style="margin-right: 0.5rem;">
                                    <span style="font-weight: bold; color: #2e7d32;">Yes (${I18n.t('common.success')})</span>
                                </label>
                                <label style="display: flex; align-items: center; cursor: pointer;">
                                    <input type="radio" name="meetStatus" value="no" required style="margin-right: 0.5rem;">
                                    <span style="font-weight: bold; color: #c62828;">No (${I18n.t('common.error')})</span>
                                </label>
                            </div>
                        </div>

                        <div class="input-group" style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">${I18n.t('feedback.label.desc')}</label>
                            <textarea id="description" rows="5" placeholder="${I18n.t('feedback.placeholder.desc')}" required style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd;"></textarea>
                        </div>

                        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                            <button type="button" id="btn-cancel-feedback" class="btn" style="flex: 1; background: #eee; color: #333; padding: 0.8rem; border-radius: 8px; border: none; cursor: pointer;">${I18n.t('common.cancel')}</button>
                            <button type="submit" class="btn btn-primary" style="flex: 2; background: var(--primary-color, #1976D2); color: white; padding: 0.8rem; border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">${I18n.t('common.submit')}</button>
                        </div>
                    </form>
                </div>
            </div>
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .fade-in { animation: fadeIn 0.2s ease-out; }
            </style>
        `;
    };

    document.body.insertAdjacentHTML('beforeend', renderModal());

    const close = () => {
        const el = document.getElementById(overlayId);
        if (el) el.remove();
    };

    document.getElementById('btn-close-feedback').addEventListener('click', close);
    document.getElementById('btn-cancel-feedback').addEventListener('click', close);

    document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const targetType = document.getElementById('targetType').value;
        const targetId = document.getElementById('targetId').value;
        const meetStatus = document.querySelector('input[name="meetStatus"]:checked')?.value;

        // If it's a post review (legacy logic for star rating, if any)
        if (targetType === 'post' && meetStatus) {
            // ... original logic if needed, but the requirements ask for specialized reporting
        }

        const reportData = {
            type: document.getElementById('reportType').value,
            description: document.getElementById('description').value,
            targetId: targetId,
            targetType: targetType,
            reporterId: user.email,
            reporterName: user.displayName,
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        await MockStore.createReport(reportData);
        alert(I18n.t('feedback.alert.success'));

        close();
    });
};
