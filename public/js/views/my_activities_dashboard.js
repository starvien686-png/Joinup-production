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

    const fetchActivities = async () => {
        try {
            const res = await api.fetch(`/api/v1/my-activities?email=${encodeURIComponent(user.email)}`, { idempotency: false });
            if (res.success) {
                allActivities = res.data || [];
                applyFilter(currentFilter);
            }
        } catch (err) {
            console.error('Failed to fetch my activities:', err);
        }
    };

    const applyFilter = (filter) => {
        currentFilter = filter;
        if (filter === 'all') {
            filteredActivities = allActivities;
        } else {
            // Mapping UI filter groups to backend category strings
            // Skill -> sports, Hangout -> hangout, Housing -> housing
            const filterMap = {
                'skill': 'sports',
                'carpool': 'carpool',
                'study': 'study',
                'hangout': 'hangout',
                'housing': 'housing'
            };
            const targetCategory = filterMap[filter] || filter;
            filteredActivities = allActivities.filter(a => a.category === targetCategory);
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

        const filterHtml = `
            <div class="filter-bar" style="display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; margin-bottom: 15px; scrollbar-width: none; -ms-overflow-style: none;">
                ${filters.map(f => `
                    <button 
                        onclick="window.applyDashboardFilter('${f.id}')"
                        style="padding: 6px 16px; border-radius: 20px; border: 1px solid ${currentFilter === f.id ? 'var(--primary-light)' : 'var(--border-color)'}; 
                               background: ${currentFilter === f.id ? 'var(--primary-light)' : 'var(--bg-card)'}; 
                               color: ${currentFilter === f.id ? 'white' : 'var(--text-secondary)'}; 
                               white-space: nowrap; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s;"
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

            return `
                <div class="card" style="margin-bottom: 1.2rem; padding: 18px; cursor: default; background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <span style="font-size: 0.75rem; background: ${color}15; color: ${color}; padding: 3px 10px; border-radius: 20px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                            ${icon} ${labelName}
                        </span>
                        <div style="display: flex; align-items: center; gap: 10px;">
                             <span style="font-size: 0.8rem; color: #2E7D32; font-weight: bold; background: #E8F5E9; padding: 2px 8px; border-radius: 10px;">
                                 👥 ${Math.max(1, parseInt(p.approvedCount) || 0)} / ${p.people_needed || 0}
                             </span>
                            <span style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</span>
                        </div>
                    </div>
                    <h3 style="margin: 0 0 10px 0; font-size: 1.15rem; color: var(--text-primary); text-align: left;">${p.title}</h3>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 8px; background: var(--bg-body); border-radius: 10px; border: 1px solid var(--border-color);">
                        <img src="${p.profile_pic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="flex: 1; min-width: 0; text-align: left;">
                            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${p.host_name || 'Host'}</div>
                            <div style="font-size: 0.7rem; color: var(--text-secondary);">🎓 ${p.host_dept || ''}</div>
                        </div>
                    </div>

                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; text-align: left;">
                        <div>📍 ${p.unified_location || 'NCNU'}</div>
                    </div>

                    <button onclick="window.navigateTo('messages?room=${p.category}_${p.id}')" style="width:100%; margin-top:5px; padding:10px; border-radius:8px; background:linear-gradient(135deg, #42A5F5, #1976D2); border:none; color:white; font-weight:bold; cursor:pointer; box-shadow: 0 4px 6px rgba(25, 118, 210, 0.2); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        💬 ${I18n.t('sports.action.join_chat') || '進入聊天室'}
                    </button>
                </div>
            `;
        }).join('') : `<div style="text-align: center; color: var(--text-secondary); margin-top: 3rem;">${I18n.t('common.no_data') || '目前沒有參加中的活動'}</div>`;

        app.innerHTML = `
            <div class="container fade-in" style="padding-bottom: 80px; text-align: center;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: flex-start;">
                    <button onclick="window.navigateTo('home')" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer; color: var(--text-primary);">⬅️</button>
                    <h2 style="margin: 0; font-size: 1.5rem; color: var(--text-primary); font-weight: 700;">${I18n.t('home.cat.activity') || '活動'}</h2>
                </header>
                ${filterHtml}
                <div class="activity-list">${listHtml}</div>
            </div>
            ${renderBottomNav('activities')}
        `;
    };

    window.applyDashboardFilter = (filter) => {
        applyFilter(filter);
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
