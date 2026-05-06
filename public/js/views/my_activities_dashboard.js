import { I18n } from '../services/i18n.js';
import api from '../utils/api.js';

export const renderMyActivitiesDashboard = async () => {
    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');
    const user = userProfileStr ? JSON.parse(userProfileStr) : null;

    if (!user || !user.email) {
        alert(I18n.t('auth.err.login_required'));
        window.navigateTo('home');
        return;
    }

    let allActivities = [];
    let filteredActivities = [];
    let currentFilter = 'all';
    let activeTab = 'ongoing'; // 'ongoing', 'hosted', or 'joined'

    const fetchActivities = async () => {
        try {
            const res = await api.fetch(`/api/v1/my-activities?email=${encodeURIComponent(user.email)}`, { idempotency: false });
            if (res.success) {
                allActivities = res.data || [];
                console.log("Dashboard Data (Raw):", allActivities);
                applyFilter(currentFilter, activeTab);
            }
        } catch (err) {
            console.error('Failed to fetch my activities:', err);
        }
    };

    const applyFilter = (filter, tab) => {
        currentFilter = filter || 'all';
        activeTab = tab || activeTab;
        
        // 1. Filter by role (host vs participant) or Ongoing status
        let tabFiltered;
        if (activeTab === 'ongoing') {
            const now = new Date();
            tabFiltered = allActivities.filter(a => {
                const isOngoingStatus = ['open', 'full', 'paused'].includes(a.status);
                const eventTime = new Date(a.unified_event_time || a.created_at);
                return isOngoingStatus && eventTime > now;
            });
            // Sort by unified_event_time ASC (soonest first)
            tabFiltered.sort((a, b) => {
                const timeA = new Date(a.unified_event_time || 0);
                const timeB = new Date(b.unified_event_time || 0);
                return timeA - timeB;
            });
        } else {
            tabFiltered = user.email === 'ncnujoinupadmin@gmail.com' ? allActivities : allActivities.filter(a => a.user_role === (activeTab === 'hosted' ? 'host' : 'participant'));
        }

        // 2. Filter by category
        if (currentFilter === 'all') {
            filteredActivities = tabFiltered;
        } else {
            const filterMap = {
                'skill': 'sports',
                'carpool': 'carpool',
                'study': 'study',
                'hangout': 'hangout',
                'housing': 'housing'
            };
            const targetCategory = filterMap[currentFilter] || currentFilter;
            filteredActivities = tabFiltered.filter(a => a.category === targetCategory);
        }
        render();
    };

    const getIconAndColor = (cat) => {
        const map = {
            'sports': { icon: '🏅', color: '#FF7043' },
            'carpool': { icon: '🚗', color: '#42A5F5' },
            'housing': { icon: '🏠', color: '#FFCA28' },
            'study': { icon: '📚', color: '#66BB6A' },
            'hangout': { icon: '🎡', color: '#EC407A' }
        };
        return map[cat] || { icon: '📅', color: '#666' };
    };

    const render = () => {
        const filters = [
            { id: 'all', label: I18n.t('common.all') || '全部' },
            { id: 'carpool', label: I18n.t('home.cat.carpool') || '共乘' },
            { id: 'study', label: I18n.t('home.cat.study') || '讀書' },
            { id: 'skill', label: I18n.t('home.cat.sports') || '運動' },
            { id: 'hangout', label: I18n.t('home.cat.travel') || '揪團' },
            { id: 'housing', label: I18n.t('home.cat.groupbuy') || '租屋' }
        ];

        const isZH = (localStorage.getItem('app_language') || localStorage.getItem('language') || 'zh-TW').includes('zh');
        const tabsHtml = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); background: var(--bg-body); border-radius: 12px; padding: 4px; margin-bottom: 15px; border: 1px solid var(--border-color); gap: 4px;">
                <button onclick="window.setDashboardTab('ongoing')" style="padding: 10px 2px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; transition: all 0.2s; background: ${activeTab === 'ongoing' ? 'white' : 'transparent'}; color: ${activeTab === 'ongoing' ? 'var(--primary-light)' : 'var(--text-secondary)'}; box-shadow: ${activeTab === 'ongoing' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'}; font-size: 0.85rem;">
                    ${isZH ? '進行中' : 'Ongoing'}
                </button>
                <button onclick="window.setDashboardTab('hosted')" style="padding: 10px 2px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; transition: all 0.2s; background: ${activeTab === 'hosted' ? 'white' : 'transparent'}; color: ${activeTab === 'hosted' ? 'var(--primary-light)' : 'var(--text-secondary)'}; box-shadow: ${activeTab === 'hosted' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'}; font-size: 0.85rem;">
                    ${isZH ? '我發起的' : 'Initiated'}
                </button>
                <button onclick="window.setDashboardTab('joined')" style="padding: 10px 2px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; transition: all 0.2s; background: ${activeTab === 'joined' ? 'white' : 'transparent'}; color: ${activeTab === 'joined' ? 'var(--primary-light)' : 'var(--text-secondary)'}; box-shadow: ${activeTab === 'joined' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'}; font-size: 0.85rem;">
                    ${isZH ? '我參與的' : 'Joined'}
                </button>
            </div>
        `;

        const filterHtml = `
            <div class="filter-bar" style="display: flex; gap: 8px; overflow-x: auto; padding: 5px 0 15px 0; margin-bottom: 0; scrollbar-width: none; -ms-overflow-style: none;">
                ${filters.map(f => `
                    <button 
                        onclick="window.applyDashboardFilter('${f.id}')"
                        style="padding: 6px 16px; border-radius: 20px; border: 1px solid ${currentFilter === f.id ? 'var(--primary-light)' : 'var(--border-color)'}; 
                                background: ${currentFilter === f.id ? 'var(--primary-light)' : 'var(--bg-card)'}; 
                                color: ${currentFilter === f.id ? 'white' : 'var(--text-secondary)'}; 
                                white-space: nowrap; cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: all 0.2s;"
                    >
                        ${f.label}
                    </button>
                `).join('')}
            </div>
            <style>.filter-bar::-webkit-scrollbar { display: none; }</style>
        `;

        const listHtml = filteredActivities.length > 0 ? filteredActivities.map(p => {
            const { icon, color } = getIconAndColor(p.category);
            const labelName = I18n.t(`home.cat.${p.category === 'sports' ? 'sports' : (p.category === 'hangout' ? 'travel' : (p.category === 'housing' ? 'groupbuy' : p.category))}`);
            const date = new Date(p.unified_event_time || p.created_at || Date.now());
            const dateStr = date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            const isHost = p.user_role === 'host';
            let statusBadge = '';
            if (p.status === 'open') statusBadge = `<span style="font-size: 0.7rem; color: #4CAF50; border: 1px solid #4CAF50; padding: 2px 6px; border-radius: 4px;">🟢 ${isZH ? '招募中' : 'Recruiting'}</span>`;
            else if (p.status === 'full') statusBadge = `<span style="font-size: 0.7rem; color: #f44336; border: 1px solid #4CAF50; padding: 2px 6px; border-radius: 4px;">🔴 ${isZH ? '額滿' : 'Full'}</span>`;
            else if (p.status === 'paused') statusBadge = `<span style="font-size: 0.7rem; color: #ff9800; border: 1px solid #ff9800; padding: 2px 6px; border-radius: 4px;">⏸️ ${isZH ? '暫停' : 'Paused'}</span>`;
            else if (p.status === 'success') statusBadge = `<span style="font-size: 0.7rem; color: #2196f3; border: 1px solid #2196f3; padding: 2px 6px; border-radius: 4px;">🎉 ${isZH ? '已成案' : 'Success'}</span>`;
            else if (p.status === 'cancelled') statusBadge = `<span style="font-size: 0.7rem; color: #9e9e9e; border: 1px solid #9e9e9e; padding: 2px 6px; border-radius: 4px;">✗ ${isZH ? '已取消' : 'Cancelled'}</span>`;

            let manageButtons = '';
            if (isHost) {
                if (p.status === 'open' || p.status === 'full') {
                    manageButtons = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                            <button onclick="window.pauseDashboardActivity('${p.id}', '${p.category}')" style="padding: 8px; border-radius: 8px; background: #FF9800; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 0.85rem;">⏸️ ${isZH ? '暫停' : 'Pause'}</button>
                            <button onclick="window.successDashboardActivity('${p.id}', '${p.category}')" style="padding: 8px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 0.85rem;">🎉 ${isZH ? '成案' : 'Success'}</button>
                            <button onclick="window.cancelDashboardActivity('${p.id}', '${p.category}')" style="padding: 8px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 0.85rem; grid-column: span 2;">❌ ${isZH ? '取消活動' : 'Cancel Activity'}</button>
                        </div>
                    `;
                } else if (p.status === 'paused') {
                    manageButtons = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                            <button onclick="window.resumeDashboardActivity('${p.id}', '${p.category}')" style="padding: 8px; border-radius: 8px; background: #4CAF50; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 0.85rem;">▶️ ${isZH ? '繼續' : 'Resume'}</button>
                            <button onclick="window.successDashboardActivity('${p.id}', '${p.category}')" style="padding: 8px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 0.85rem;">🎉 ${isZH ? '成案' : 'Success'}</button>
                            <button onclick="window.cancelDashboardActivity('${p.id}', '${p.category}')" style="padding: 8px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 0.85rem; grid-column: span 2;">❌ ${isZH ? '取消活動' : 'Cancel Activity'}</button>
                        </div>
                    `;
                }
            }

            return `
                <div class="card" style="position: relative; margin-bottom: 1.2rem; padding: 18px; cursor: default; background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); ${p.status === 'cancelled' ? 'opacity: 0.6;' : ''}">
                    ${isHost && p.status !== 'cancelled' && p.status !== 'success' ? `
                        <button onclick="window.cancelDashboardActivity('${p.id}', '${p.category}')" 
                                style="position: absolute; top: 12px; right: 12px; background: #fee2e2; color: #ef4444; border: none; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; transition: all 0.2s; z-index: 10;"
                                onmouseover="this.style.background='#fecaca'" 
                                onmouseout="this.style.background='#fee2e2'"
                                title="${isZH ? '取消活動' : 'Cancel Activity'}">
                            ✕
                        </button>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <span style="font-size: 0.75rem; background: ${color}15; color: ${color}; padding: 3px 10px; border-radius: 20px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                            ${icon} ${labelName}
                        </span>
                        <div style="display: flex; align-items: center; gap: 6px;">
                             ${statusBadge}
                             <span style="font-size: 0.8rem; color: #2E7D32; font-weight: bold; background: #E8F5E9; padding: 2px 8px; border-radius: 10px;">
                                 👥 ${Math.max(1, parseInt(p.approvedCount) || 0)} / ${p.people_needed || 0}
                             </span>
                        </div>
                    </div>
                    <h3 style="margin: 0 0 10px 0; font-size: 1.15rem; color: var(--text-primary); text-align: left;">${p.title}</h3>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 8px; background: var(--bg-body); border-radius: 10px; border: 1px solid var(--border-color);">
                        <img src="${p.profile_pic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="flex: 1; min-width: 0; text-align: left;">
                            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 4px;">
                                ${p.host_full_name || p.host_name || 'Host'}
                                ${p.host_email === 'ncnujoinupadmin@gmail.com' ? `<span style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; font-size: 0.6rem; padding: 1px 5px; border-radius: 4px; font-weight: 900; line-height: 1;">🛡️ ADMIN</span>` : ''}
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-secondary);">🎓 ${p.host_dept || ''}</div>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${dateStr}</div>
                    </div>

                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; text-align: left;">
                        <div>📍 ${p.unified_location || 'NCNU'}</div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.navigateTo('messages?room=${p.category}_${p.id}')" style="flex: 1.5; padding: 12px; border-radius: 12px; background: linear-gradient(135deg, #42A5F5, #1976D2); border: none; color: white; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px rgba(25, 118, 210, 0.2); transition: transform 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            💬 ${isZH ? '進入聊天室' : 'Enter Chat Room'}
                        </button>
                        ${isHost ? `
                        <button onclick="window.manageParticipantsDashboard('${p.id}', '${p.category}', '${p.title.replace(/'/g, "\\'")}')" style="flex: 1; padding: 12px; border-radius: 12px; background: white; color: #1976D2; border: 1.5px solid #1976D2; font-weight: bold; cursor: pointer; transition: all 0.2s; font-size: 0.9rem;">
                            ⚙️ 管理 / Manage
                        </button>
                        ` : ''}
                    </div>

                    ${manageButtons}
                </div>
            `;
        }).join('') : `<div style="text-align: center; color: var(--text-secondary); margin-top: 3rem;">${I18n.t('common.no_data') || '目前沒有活動'}</div>`;

        app.innerHTML = `
            <div class="container fade-in" style="padding-bottom: 80px; text-align: center;">
                <header style="margin-bottom: 1rem; display: flex; align-items: center; justify-content: flex-start;">
                    <button onclick="window.navigateTo('home')" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer; color: var(--text-primary);">⬅️</button>
                    <h2 style="margin: 0; font-size: 1.5rem; color: var(--text-primary); font-weight: 700;">${I18n.t('home.cat.activity') || '活動'}</h2>
                </header>
                ${tabsHtml}
                ${filterHtml}
                <div class="activity-list">${listHtml}</div>
            </div>
            ${renderBottomNav('activities')}
            <style>
                .cancel-feedback-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10001; backdrop-filter: blur(4px); }
                .cancel-feedback-modal { background: white; width: 90%; max-width: 380px; border-radius: 20px; padding: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: cancelModalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); position: relative; }
                @keyframes cancelModalIn { from { transform: scale(0.8) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                .cancel-warning-badge { background: #fee2e2; color: #ef4444; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; width: fit-content; margin: 0 auto 1rem; }
                .modal-subtitle { color: #6b7280; font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem; }
                .cancel-reason-group { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; text-align: left; }
                .cancel-reason-group label { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
                .cancel-reason-group label:has(input:checked) { background: #fef2f2; border-color: #ef4444; }
                .cancel-detail-textarea { width: 100%; height: 80px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; font-size: 0.9rem; resize: none; margin-bottom: 1.5rem; outline: none; }
                .cancel-submit-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s; background: #ef4444; color: white; }
                .cancel-submit-btn:disabled { background: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
            </style>
        `;
    };

    window.setDashboardTab = (tab) => {
        applyFilter(currentFilter, tab);
    };

    window.applyDashboardFilter = (filter) => {
        applyFilter(filter, activeTab);
    };

    // Generic Status Updater
    const updateDashboardActivityStatus = async (postId, category, newStatus) => {
        const endpointMap = {
            'sports': `/update-activity-status/${postId}`,
            'carpool': `/carpools/${postId}/status`,
            'study': `/update-study-status/${postId}`,
            'hangout': `/update-hangout-status/${postId}`,
            'housing': `/update-housing-status/${postId}`
        };

        const endpoint = endpointMap[category];
        if (!endpoint) {
            console.error('Unknown category for status update:', category);
            return;
        }

        try {
            const method = category === 'carpool' ? 'PATCH' : 'PUT';
            const response = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                if (window.refreshUserProfile) await window.refreshUserProfile();
                await fetchActivities();
            } else {
                alert('Update failed.');
            }
        } catch (error) {
            console.error('API Error:', error);
            alert('Connection error.');
        }
    };

    window.pauseDashboardActivity = (postId, category) => {
        const isZH = (localStorage.getItem('app_language') || localStorage.getItem('language') || 'zh-TW').includes('zh');
        if (confirm(isZH ? '確定要暫停招募嗎？' : 'Are you sure you want to pause recruitment?')) {
            updateDashboardActivityStatus(postId, category, 'paused');
        }
    };

    window.resumeDashboardActivity = (postId, category) => {
        const isZH = (localStorage.getItem('app_language') || localStorage.getItem('language') || 'zh-TW').includes('zh');
        if (confirm(isZH ? '確定要繼續招募嗎？' : 'Are you sure you want to resume recruitment?')) {
            updateDashboardActivityStatus(postId, category, 'open');
        }
    };

    window.successDashboardActivity = (postId, category) => {
        const isZH = (localStorage.getItem('app_language') || localStorage.getItem('language') || 'zh-TW').includes('zh');
        if (confirm(isZH ? '恭喜成案！確定要標記為已成案嗎？' : 'Congratulations! Mark this activity as success?')) {
            updateDashboardActivityStatus(postId, category, 'success');
        }
    };

    window.cancelDashboardActivity = async (postId, category) => {
        const isZH = (localStorage.getItem('app_language') || localStorage.getItem('language') || 'zh-TW').includes('zh');
        
        const executeCancel = () => updateDashboardActivityStatus(postId, category, 'cancelled');

        // Penalty Modal
        const existingModal = document.getElementById('cancel-feedback-overlay');
        if (existingModal) existingModal.remove();

        const reasons = [
            { value: 'schedule_conflict', label: isZH ? '🗓️ 時間衝突 / 有其他安排' : '🗓️ Schedule Conflict' },
            { value: 'not_enough_people', label: isZH ? '👥 人數不足 / 沒人報名' : '👥 Not Enough People' },
            { value: 'wrong_info', label: isZH ? '📝 發佈資訊有誤' : '📝 Wrong Information' },
            { value: 'personal_reason', label: isZH ? '🙋 個人原因' : '🙋 Personal Reason' },
            { value: 'other', label: isZH ? '💬 其他原因' : '💬 Other Reasons' }
        ];

        const reasonRadios = reasons.map(r => `<label><input type="radio" name="cancel-reason" value="${r.value}"><span>${r.label}</span></label>`).join('');

        const modalHtml = `
            <div class="cancel-feedback-overlay" id="cancel-feedback-overlay">
                <div class="cancel-feedback-modal">
                    <div class="cancel-warning-badge">${isZH ? '⚠️ 取消前必填' : '⚠️ Required before cancel'}</div>
                    <h3>${isZH ? '為什麼要取消此活動？' : 'Why are you canceling?'}</h3>
                    <p class="modal-subtitle">${isZH ? '請告訴我們取消原因。取消已有已核准參與者的活動，或在活動開始前最後 2 小時內取消，將扣除 2 點信用積分。' : 'Please tell us the reason. Canceling an event with approved participants or within 2 hours of the start time will result in a 2-point credit penalty.'}</p>
                    <div class="cancel-reason-group" id="cancel-reason-group">${reasonRadios}</div>
                    <textarea class="cancel-detail-textarea" id="cancel-detail-text" placeholder="${isZH ? '補充說明（選填）...' : 'Additional details (optional)...'}"></textarea>
                    <button class="cancel-submit-btn" id="cancel-submit-btn" disabled>❌ ${isZH ? '確認取消並送出' : 'Confirm Cancel & Submit'}</button>
                    <button onclick="document.getElementById('cancel-feedback-overlay').remove()" style="margin-top: 10px; background: none; border: none; color: #999; cursor: pointer; text-decoration: underline; width: 100%;">${isZH ? '暫不取消' : 'Don\'t cancel yet'}</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const overlay = document.getElementById('cancel-feedback-overlay');
        const submitBtn = document.getElementById('cancel-submit-btn');

        document.getElementById('cancel-reason-group').addEventListener('change', () => {
            submitBtn.disabled = !document.querySelector('input[name="cancel-reason"]:checked');
        });

        submitBtn.addEventListener('click', async () => {
            const selected = document.querySelector('input[name="cancel-reason"]:checked');
            if (!selected) return;
            submitBtn.disabled = true;
            submitBtn.textContent = isZH ? '⏳ 處理中...' : '⏳ Processing...';
            try {
                await api.fetch('/api/v1/cancellation-feedback', {
                    method: 'POST',
                    body: {
                        event_id: postId,
                        event_category: category,
                        user_email: user.email,
                        action_type: 'cancel',
                        reason: selected.value,
                        detail: document.getElementById('cancel-detail-text').value || ''
                    }
                });
                executeCancel();
            } catch (err) {
                console.error(err);
                alert('Cancellation failed.');
            } finally {
                overlay.remove();
            }
        });
    };

    window.manageParticipantsDashboard = async (postId, category, title) => {
        const modalId = 'manage-participants-overlay';
        if (document.getElementById(modalId)) return;

        const isZH = (localStorage.getItem('app_language') || localStorage.getItem('language') || 'zh-TW').includes('zh');
        
        // 1. Create Modal
        const overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.className = 'cancel-feedback-overlay'; // Reuse existing styles
        overlay.innerHTML = `
            <div class="cancel-feedback-modal" style="max-width: 450px; text-align: left; padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; border-bottom: 2px solid var(--border-color); padding-bottom: 10px;">
                    <h3 style="margin: 0; color: var(--text-primary);">👥 ${isZH ? '管理成員' : 'Manage Participants'}</h3>
                    <button onclick="document.getElementById('${modalId}').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; background: var(--bg-body); padding: 8px 12px; border-radius: 8px;">
                    📌 ${title}
                </div>
                <div id="participant-list-container" style="min-height: 200px; max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
                    <div style="text-align: center; margin-top: 2rem;">⏳ ${isZH ? '載入中...' : 'Loading...'}</div>
                </div>
                <button onclick="document.getElementById('${modalId}').remove()" style="width: 100%; margin-top: 1.5rem; padding: 12px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font-weight: bold; cursor: pointer;">
                    ${isZH ? '關閉' : 'Close'}
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        // 2. Fetch Participants
        try {
            const res = await api.fetch(`/api/v1/host/participants?event_type=${category}&event_id=${postId}&host_email=${encodeURIComponent(user.email)}`, { idempotency: false });
            const listContainer = document.getElementById('participant-list-container');
            
            if (res.success && res.data) {
                // Filter out host and keep only approved/accepted
                const approvedOnes = res.data.filter(p => (p.status === 'approved' || p.status === 'accepted') && p.user_email.toLowerCase() !== user.email.toLowerCase());
                
                if (approvedOnes.length === 0) {
                    listContainer.innerHTML = `<div style="text-align: center; color: #999; margin-top: 2rem;">${isZH ? '目前沒有已核准的參與者' : 'No approved participants yet.'}</div>`;
                } else {
                    listContainer.innerHTML = approvedOnes.map(p => {
                        const avatar = p.snapshot_avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                        return `
                            <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px;">
                                <img src="${avatar}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: var(--shadow-sm);">
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px;">
                                        ${p.snapshot_full_name || p.snapshot_display_name || 'Member'}
                                        ${p.user_email === 'ncnujoinupadmin@gmail.com' ? `<span style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 900; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">🛡️ ADMIN</span>` : ''}
                                    </div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${p.user_email}</div>
                                </div>
                                <button onclick="window.removeParticipantFromDashboard('${p.id}', '${postId}', '${category}', '${p.user_email}', '${p.snapshot_display_name?.replace(/'/g, "\\'") || 'Member'}')" 
                                        style="padding: 6px 12px; border-radius: 8px; background: #FFF5F5; color: #F44336; border: 1px solid #FFCDD2; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                                    ${isZH ? '移除' : 'Remove'}
                                </button>
                            </div>
                        `;
                    }).join('');
                }
            } else {
                listContainer.innerHTML = `<div style="text-align: center; color: #f44336; margin-top: 2rem;">❌ ${isZH ? '載入失敗' : 'Load failed'}</div>`;
            }
        } catch (err) {
            console.error('Failed to load participants:', err);
            document.getElementById('participant-list-container').innerHTML = `<div style="text-align: center; color: #f44336; margin-top: 2rem;">❌ Error</div>`;
        }
    };

    window.removeParticipantFromDashboard = async (rowId, postId, category, email, name) => {
        const isZH = (localStorage.getItem('app_language') || localStorage.getItem('language') || 'zh-TW').includes('zh');
        const msg = isZH ? `確定要將 ${name} 從此活動中移除嗎？` : `Are you sure you want to remove ${name} from this activity?`;
        
        if (!confirm(msg)) return;

        try {
            const res = await api.fetch('/api/v1/join/reject', {
                method: 'POST',
                body: {
                    event_type: category,
                    event_id: postId,
                    participant_id: rowId,
                    target_user_email: email,
                    host_email: user.email
                }
            });

            if (res.success) {
                alert(isZH ? '已成功移除！' : 'Removed successfully!');
                // Refresh modal and dashboard
                document.getElementById('manage-participants-overlay')?.remove();
                if (window.refreshUserProfile) await window.refreshUserProfile();
                await fetchActivities();
                // Re-open modal to show updated list
                const activity = allActivities.find(a => String(a.id) === String(postId) && a.category === category);
                if (activity) {
                    window.manageParticipantsDashboard(postId, category, activity.title);
                }
            } else {
                alert(res.message || 'Removal failed.');
            }
        } catch (err) {
            console.error('Failed to remove participant:', err);
            alert('Connection error.');
        }
    };

    render();
    fetchActivities();
};

const renderBottomNav = (activeTab) => {
    return `
        <nav class="bottom-nav" style="position: fixed; bottom: 0; left: 0; width: 100%; background: var(--bg-card); display: flex; justify-content: space-around; padding: 10px 0; border-top: 1px solid var(--border-color); z-index: 1000; box-shadow: 0 -2px 10px rgba(0,0,0,0.05);">
            <div class="nav-item ${activeTab === 'home' ? 'active' : ''}" onclick="window.navigateTo('home')" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; color: ${activeTab === 'home' ? 'var(--primary-light)' : 'var(--text-secondary)'};">
                <span style="font-size: 1.2rem;">🏠</span>
                <span style="font-size: 0.7rem; margin-top: 2px;">${I18n.t('nav.home')}</span>
            </div>
            <div class="nav-item ${activeTab === 'activities' ? 'active' : ''}" onclick="window.navigateTo('my-activities')" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; color: ${activeTab === 'activities' ? 'var(--primary-light)' : 'var(--text-secondary)'};">
                <span style="font-size: 1.2rem;">📋</span>
                <span style="font-size: 0.7rem; margin-top: 2px;">${I18n.t('home.cat.activity') || '活動'}</span>
            </div>
            <div class="nav-item ${activeTab === 'messages' ? 'active' : ''}" onclick="window.navigateTo('messages')" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; color: ${activeTab === 'messages' ? 'var(--primary-light)' : 'var(--text-secondary)'};">
                <div style="position: relative;">
                    <span style="font-size: 1.2rem;">💬</span>
                    <span id="nav-unread-dot" style="display: none; position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; background: #ff4d4f; border-radius: 50%; border: 1px solid #fff;"></span>
                </div>
                <span style="font-size: 0.7rem; margin-top: 2px;">${I18n.t('nav.messages')}</span>
            </div>
            <div class="nav-item ${activeTab === 'profile' ? 'active' : ''}" onclick="window.navigateTo('profile')" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; color: ${activeTab === 'profile' ? 'var(--primary-light)' : 'var(--text-secondary)'};">
                <span style="font-size: 1.2rem;">👤</span>
                <span style="font-size: 0.7rem; margin-top: 2px;">${I18n.t('nav.profile')}</span>
            </div>
        </nav>
    `;
};
