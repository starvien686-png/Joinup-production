import { I18n } from '../services/i18n.js';
import { notifications } from '../services/notification.js';

// --- MESIN PENDAFTARAN STUDY ---
window.StudyAppEngine = {
    saveApp: (appData) => {
        const apps = JSON.parse(localStorage.getItem('joinup_study_apps') || '[]');
        appData.id = Date.now().toString();
        apps.push(appData);
        localStorage.setItem('joinup_study_apps', JSON.stringify(apps));
        return appData.id;
    },
    getApps: (postId) => {
        const apps = JSON.parse(localStorage.getItem('joinup_study_apps') || '[]');
        return apps.filter(a => String(a.postId) === String(postId));
    },
    updateApp: (appId, status) => {
        const apps = JSON.parse(localStorage.getItem('joinup_study_apps') || '[]');
        const index = apps.findIndex(a => String(a.id) === String(appId));
        if (index > -1) {
            apps[index].status = status;
            localStorage.setItem('joinup_study_apps', JSON.stringify(apps));
        }
    }
};

export const renderStudy = () => {
    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');

    if (!userProfileStr) {
        alert(I18n.t('auth.err.login_required'));
        window.navigateTo('home');
        return;
    }

    const user = JSON.parse(userProfileStr);
    let currentState = 'landing';

    // --- VARIABEL FILTER STUDY ---
    let activeFilters = {
        searchQuery: '',
        eventType: null,
        dateRange: null,
        peopleCount: null
    };

    const renderLanding = () => {
        return `
            <div class="container fade-in" style="height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <span style="font-size: 3.5rem;">📚</span>
                    <h1 style="color: #FFB300; margin-top: 1rem;">${I18n.t('study.title')}</h1>
                    <p style="color: var(--text-secondary);">${I18n.t('study.subtitle')}</p>
                </div>

                <div style="display: grid; gap: 1rem;">
                    <button id="btn-role-host" class="role-card" style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: none; border-left: 4px solid #FF8C00; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; transition: transform 0.2s;">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">✍️</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: #333;">${I18n.t('study.role.host')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: #666;">${I18n.t('study.role.host_desc')}</p>
                        </div>
                    </button>

                    <button id="btn-role-partner" class="role-card" style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: none; border-left: 4px solid #FFD600; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; transition: transform 0.2s;">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">🔍</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: #333;">${I18n.t('study.role.join')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: #666;">${I18n.t('study.role.join_desc')}</p>
                        </div>
                    </button>

                    <button id="btn-manage" class="btn" style="background: linear-gradient(135deg, #FFD600, #FF6D00); color: white; margin-top: 1rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 109, 0, 0.3); transition: transform 0.2s;">
                        ⚙️ ${I18n.t('common.manage')}
                    </button>
                </div>
                
                <button onclick="window.navigateTo('home')" style="position: absolute; top: 1rem; left: 1rem; background: none; border: none; font-size: 1.2rem; cursor: pointer; font-weight: bold; color: #555;">
                    ⬅️ ${I18n.t('common.back')}
                </button>
            </div>
        `;
    };

    const renderCreateForm = () => {
        const isZH = isAppZH();
        return `
            <div class="container fade-in" style="padding-bottom: 3rem;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2 style="color: #FF9800;">${I18n.t('study.create.title')}</h2>
                </header>

                <form id="createStudyForm" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                    
                    <h3 style="margin-top: 0; margin-bottom: 0.5rem; color: #FF9800; border-bottom: 2px solid #FFE0B2; padding-bottom: 0.5rem; font-size: 1.1rem;">📖 ${I18n.t('common.description')}</h3>
                    <div style="color: #888888; font-size: 11px; text-align: center; margin-bottom: 1.5rem;">${I18n.t('common.financial_disclaimer')}</div>
                    
                    <div class="input-group">
                        <label>${I18n.t('study.label.title')} *</label>
                        <input type="text" id="stTitle" placeholder="${I18n.t('study.placeholder.title')}" required>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('study.label.type')} *</label>
                        <select id="stType" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd;" required>
                            <option value="Study Group">📚 ${I18n.t('study.type.self_study')}</option>
                            <option value="Midterm/Final Prep">📝 ${I18n.t('study.type.midterm')}</option>
                            <option value="Language Exchange">🗣️ ${I18n.t('study.type.language')}</option>
                            <option value="Peer Tutoring">🎓 ${I18n.t('study.type.tutoring')}</option>
                            <option value="Skill Exchange">🔄 ${I18n.t('study.type.other')}</option>
                        </select>
                    </div>
                    
                    <div class="input-group">
                        <label>${I18n.t('study.label.content')} *</label>
                        <input type="text" id="stSubject" placeholder="${I18n.t('study.placeholder.subject')}" required>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('study.label.location')} *</label>
                        <select id="stLocation" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd;" required>
                            <option value="暨大圖書館">🏛️ ${I18n.t('study.loc.lib')}</option>
                            <option value="暨大學生活動中心">🏢 ${I18n.t('study.loc.lounge')}</option>
                            <option value="路易莎咖啡(暨南大學門市)">☕ ${I18n.t('study.loc.louisa')}</option>
                            <option value="線上會議 (Google Meet/Teams)">💻 ${I18n.t('common.other')}</option>
                            <option value="自訂">📍 ${I18n.t('common.custom')}</option>
                        </select>
                        <input type="text" id="stCustomLoc" style="margin-top: 0.5rem; width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd; display: none;" placeholder="${I18n.t('common.location')}...">
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('study.label.people')} *</label>
                        <input type="number" id="stPeople" min="1" max="20" value="4" required>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${I18n.t('study.label.time')} *</label>
                            <input type="datetime-local" id="stTime" required>
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('study.label.deadline')} *</label>
                            <input type="datetime-local" id="stDeadline" required>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${I18n.t('study.label.host')} *</label>
                            <input type="text" value="${user.displayName || user.name || ''}" readonly style="background: #f5f5f5;">
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('study.label.dept')} *</label>
                            <input type="text" value="${user.department || user.major || ''}" readonly style="background: #f5f5f5;">
                        </div>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('common.description')}</label>
                        <textarea id="stNotes" rows="3" placeholder="${I18n.t('study.placeholder.desc')}" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd;"></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 12px; font-size: 1.1rem; border-radius: 8px; background: #FFB300; border: none; font-weight: bold; color: white; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 179, 0, 0.3);">
                        ${I18n.t('common.submit')}
                    </button>
                </form>
            </div>
        `;
    };

    // --- POPUP FILTER PANEL (STUDY VERSION) ---
    const renderFilterPanel = () => {
        const categories = [
            { id: 'Study Group', label: I18n.t('study.type.self_study') },
            { id: 'Midterm/Final Prep', label: I18n.t('study.type.midterm') },
            { id: 'Language Exchange', label: I18n.t('study.type.language') },
            { id: 'Peer Tutoring', label: I18n.t('study.type.tutoring') },
            { id: 'Skill Exchange', label: I18n.t('study.type.other') }
        ];

        let catHtml = categories.map(c => {
            const isActive = activeFilters.eventType === c.id;
            return `<button class="filter-option" data-filter="eventType" data-value="${c.id}" style="padding: 0.6rem 1rem; border: 1px solid ${isActive ? '#FFB300' : '#ddd'}; border-radius: 8px; background: ${isActive ? '#FFF8E1' : 'white'}; color: ${isActive ? '#FF8C00' : '#555'}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer;">${c.label}</button>`;
        }).join('');

        return `
            <div id="st-filter-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: end; z-index: 1000;">
                <div style="background: white; width: 100%; border-radius: 16px 16px 0 0; padding: 1.5rem; max-height: 85vh; overflow-y: auto; animation: slideUp 0.3s ease-out;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                        <h3 style="color: #FFB300; margin: 0;">${I18n.t('outing.filter.title')}</h3>
                        <button onclick="window.closeStudyFilter()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #333;">×</button>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: #333;">${I18n.t('outing.label.cat')}</label>
                        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">${catHtml}</div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: #333;">${I18n.t('common.date')}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="filter-option" data-filter="dateRange" data-value="today" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.dateRange === 'today' ? '#FFB300' : '#ddd'}; border-radius: 8px; background: ${activeFilters.dateRange === 'today' ? '#FFF8E1' : 'white'}; color: ${activeFilters.dateRange === 'today' ? '#FF8C00' : '#555'}; font-weight: ${activeFilters.dateRange === 'today' ? 'bold' : 'normal'}; cursor: pointer;">${I18n.t('outing.filter.date_today')}</button>
                            <button class="filter-option" data-filter="dateRange" data-value="week" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.dateRange === 'week' ? '#FFB300' : '#ddd'}; border-radius: 8px; background: ${activeFilters.dateRange === 'week' ? '#FFF8E1' : 'white'}; color: ${activeFilters.dateRange === 'week' ? '#FF8C00' : '#555'}; font-weight: ${activeFilters.dateRange === 'week' ? 'bold' : 'normal'}; cursor: pointer;">${I18n.t('outing.filter.date_week')}</button>
                            <button class="filter-option" data-filter="dateRange" data-value="month" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.dateRange === 'month' ? '#FFB300' : '#ddd'}; border-radius: 8px; background: ${activeFilters.dateRange === 'month' ? '#FFF8E1' : 'white'}; color: ${activeFilters.dateRange === 'month' ? '#FF8C00' : '#555'}; font-weight: ${activeFilters.dateRange === 'month' ? 'bold' : 'normal'}; cursor: pointer;">${I18n.t('outing.filter.date_month')}</button>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: #333;">${I18n.t('study.label.people')}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            ${[5, 10, 20].map(num => `
                                <button class="filter-option" data-filter="peopleCount" data-value="${num}" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.peopleCount === num ? '#FFB300' : '#ddd'}; border-radius: 8px; background: ${activeFilters.peopleCount === num ? '#FFF8E1' : 'white'}; color: ${activeFilters.peopleCount === num ? '#FF8C00' : '#555'}; font-weight: ${activeFilters.peopleCount === num ? 'bold' : 'normal'}; cursor: pointer;">≤ ${num} ${I18n.t('common.person')}</button>
                            `).join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button onclick="window.resetStudyFilters()" class="btn" style="flex: 1; background: #f5f5f5; color: #333; border: 1px solid #ddd; padding: 12px; border-radius: 8px; font-weight: bold;">${I18n.t('common.clear')}</button>
                        <button onclick="window.applyStudyFilters()" class="btn btn-primary" style="flex: 2; background: #FFB300; border: none; color: white; padding: 12px; border-radius: 8px; font-weight: bold;">${I18n.t('common.confirm')}</button>
                    </div>
                </div>
            </div>
            <style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
        `;
    };

    const renderList = async () => {
        let contentHtml = `<div style="text-align: center; padding: 2rem; color: #888;">⏳ ${I18n.t('common.loading')}</div>`;

        // Ngitung berapa filter yang aktif
        const activeFilterCount = [
            activeFilters.eventType,
            activeFilters.dateRange,
            activeFilters.peopleCount
        ].filter(Boolean).length;

        try {
            const response = await fetch('/studies');
            const dbPosts = await response.json();
            const allUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');

            let availablePosts = dbPosts.filter(p => {
                if (p.status === 'cancelled' || p.status === 'success' || p.status === 'expired' || p.status === 'full') return false;

                const dTime = new Date(p.deadline || p.event_time);
                if (dTime < new Date()) return false;

                const apps = window.StudyAppEngine.getApps(p.id) || [];
                const acceptedApps = apps.filter(a => a.status === 'accepted');
                if (acceptedApps.length >= p.people_needed) return false;

                if (p.people_needed !== undefined && p.people_needed <= 0) return false;

                return true;
            });

            // --- PROSES FILTER & SEARCH ---
            if (activeFilters.searchQuery) {
                const q = activeFilters.searchQuery.toLowerCase();
                availablePosts = availablePosts.filter(p => p.title.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q) || p.location.toLowerCase().includes(q));
            }
            if (activeFilters.eventType) {
                availablePosts = availablePosts.filter(p => p.event_type === activeFilters.eventType);
            }
            if (activeFilters.peopleCount) {
                availablePosts = availablePosts.filter(p => p.people_needed <= activeFilters.peopleCount);
            }
            if (activeFilters.dateRange) {
                const targetDate = new Date();
                if (activeFilters.dateRange === 'today') {
                    targetDate.setHours(23, 59, 59, 999);
                    availablePosts = availablePosts.filter(p => new Date(p.event_time) <= targetDate);
                } else if (activeFilters.dateRange === 'week') {
                    targetDate.setDate(targetDate.getDate() + 7);
                    availablePosts = availablePosts.filter(p => new Date(p.event_time) <= targetDate);
                } else if (activeFilters.dateRange === 'month') {
                    targetDate.setMonth(targetDate.getMonth() + 1);
                    availablePosts = availablePosts.filter(p => new Date(p.event_time) <= targetDate);
                }
            }

            if (availablePosts.length > 0) {
                contentHtml = availablePosts.map(p => {
                    const dTime = new Date(p.event_time);
                    const timeStr = dTime.toLocaleString();

                    const isHost = (p.host_email === user.email);

                    const apps = window.StudyAppEngine.getApps(p.id) || [];
                    const acceptedApps = apps.filter(a => a.status === 'accepted');
                    const participantCount = acceptedApps.length;
                    const isFull = participantCount >= p.people_needed;

                    let hostData = null;
                    if (window.MockStore && window.MockStore.getUser) hostData = window.MockStore.getUser(p.host_email);
                    if (!hostData) hostData = allUsers.find(u => u.email === p.host_email);

                    const hostAvatar = hostData?.profile_pic || hostData?.profilePic || hostData?.avatar || hostData?.picture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

                    return `
                        <div class="card" onclick="window.showStudyDetail('${p.id}')" style="cursor: pointer; ${isFull ? 'opacity: 0.7;' : ''} margin-bottom: 1.5rem; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #eee; padding: 1.2rem; transition: transform 0.2s;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                <div style="background: #FFF3E0; color: #FF9800; padding: 4px 10px; border-radius: 15px; font-size: 0.75rem; font-weight: bold;">
                                    ${p.event_type}
                                </div>
                                <div style="font-size: 0.8rem; color: #999;">
                                    📅 ${new Date(p.deadline).toLocaleDateString()}
                                </div>
                            </div>
                            
                            <h3 style="margin: 0 0 10px 0; font-size: 1.2rem; color: #333;">${p.title}</h3>
                            <div style="font-size: 0.95rem; color: #1976D2; font-weight: bold; margin-bottom: 15px;">📚 ${p.subject}</div>

                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-size: 0.85rem; color: #666;">
                                <img src="${hostAvatar}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                                <span>${I18n.t('common.host')}: <strong>${p.host_name}</strong> (${p.host_dept})</span>
                            </div>

                            <div style="background: #f9f9f9; padding: 10px; border-radius: 8px; font-size: 0.85rem; color: #555; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div><strong>🕒 ${I18n.t('common.time')}:</strong> <br>${timeStr}</div>
                                <div><strong>📍 ${I18n.t('common.location')}:</strong> <br>${p.location}</div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <span style="font-size: 0.85rem; color: #666;"><strong>👥 ${I18n.t('study.label.people')}:</strong> <span style="color:#FF9800; font-weight:bold;">${participantCount} / ${p.people_needed}</span></span>
                                ${isFull ? `<span style="font-size: 0.8rem; color: #f57c00; background: #fff3e0; padding: 4px 8px; border-radius: 10px;">${I18n.t('common.full')}</span>` : ''}
                            </div>

                            ${isHost ? `
                            <button class="btn" onclick="event.stopPropagation(); window.openGroupChat('${p.id}');">💬 ${I18n.t('common.chat')}</button>
                            ` : !isFull ? `
                            <button class="btn" onclick="event.stopPropagation(); window.openStudyJoinForm('${p.id}', '${p.title}')" style="width: 100%; padding: 0.7rem; font-weight: bold; background: linear-gradient(135deg, #FFB300, #FF9800); border: none; color: white; border-radius: 8px; cursor: pointer;">${I18n.t('study.action.join')}</button>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            } else {
                contentHtml = `
                    <div style="text-align: center; padding: 3rem 1rem; color: #888;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                        <p>${I18n.t('outing.filter.no_match')}</p>
                        <button onclick="window.resetStudyFilters()" style="margin-top: 1rem; background: #FFB300; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">${I18n.t('outing.filter.clear')}</button>
                    </div>
                `;
            }
        } catch (error) {
            contentHtml = `<div style="text-align: center; padding: 2rem; color: red;">Error connecting to server.</div>`;
        }

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center;">
                        <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                        <h2 style="margin: 0; color: #FFB300; font-size: 1.3rem;">${I18n.t('outing.list.title')}</h2>
                    </div>
                    
                    <button id="btn-st-filter" style="background: #eee; border: 1px solid #ccc; padding: 6px 15px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 5px; position: relative;">
                        🔍 ${I18n.t('common.filter')}
                        ${activeFilterCount > 0 ? `<span style="position: absolute; top: -5px; right: -5px; background: #F44336; color: white; font-size: 0.6rem; padding: 2px 6px; border-radius: 10px; font-weight: bold;">${activeFilterCount}</span>` : ''}
                    </button>
                </header>

                <div style="display: flex; gap: 10px; margin-bottom: 1.5rem;">
                    <div style="flex: 1; position: relative;">
                        <input type="text" id="stSearchInput" placeholder="${I18n.t('common.search')}..." value="${activeFilters.searchQuery}" style="width: 100%; padding: 12px 20px; border-radius: 30px; border: 1px solid #ddd; outline: none; padding-right: 40px; font-size: 0.95rem;">
                        <span id="btn-st-search" style="position: absolute; right: 15px; top: 12px; cursor: pointer;">🔍</span>
                    </div>
                </div>

                <div class="post-list">
                    ${contentHtml}
                </div>
            </div>
        `;
    };

    const renderManage = async () => {
        let myPosts = [];
        try {
            const response = await fetch(`/my-studies/${user.email}`);
            myPosts = await response.json();
        } catch (error) { }

        const isZH = isAppZH();
        const txtManageTitle = t('common.manage', '管理我的活動', 'Manage My Events');

        const postsHtmlArray = await Promise.all(myPosts.map(async p => {
            let pendingApps = [];
            let acceptedApps = [];

            // 1. Fetch from Server (Source of Truth)
            try {
                const data = await api.fetch(`/api/v1/host/participants?event_type=study&event_id=${p.id}&host_email=${user.email}`, { idempotency: false });
                if (data.success && data.data) {
                    pendingApps = data.data.filter(a => a.status === 'pending');
                    acceptedApps = data.data.filter(a => a.status === 'approved' || a.status === 'accepted');
                }
            } catch (e) { console.warn("Failed to fetch server participants.", e); }

            // 2. Legacy Fallback
            if (pendingApps.length === 0 && acceptedApps.length === 0) {
                const legacyApps = window.StudyAppEngine.getApps(p.id) || [];
                pendingApps = legacyApps.filter(a => a.status === 'pending');
                acceptedApps = legacyApps.filter(a => a.status === 'accepted');
            }

            const participantCount = acceptedApps.length;

            let statusColor = '#333', statusIcon = '⚪', statusText = p.status;
            switch (p.status) {
                case 'open': statusColor = '#4CAF50'; statusIcon = '🟢'; statusText = I18n.t('study.status.open'); break;
                case 'paused': statusColor = '#ff9800'; statusIcon = '⏸️'; statusText = I18n.t('outing.status.paused'); break;
                case 'success': statusColor = '#2196f3'; statusIcon = '🎉'; statusText = I18n.t('common.success'); break;
                case 'cancelled': statusColor = '#f44336'; statusIcon = '✗'; statusText = I18n.t('common.cancel'); break;
            }
            const statusBadge = `<span style="font-size: 0.8rem; color: ${statusColor}; border: 1px solid ${statusColor}; padding: 4px 10px; border-radius: 20px; font-weight: bold;">${statusIcon} ${statusText}</span>`;

            let appsHtml = '';
            if (pendingApps.length > 0) {
                appsHtml += `<div style="font-size: 0.85rem; font-weight: bold; color: #FF9800; margin-top: 15px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #FFE0B2;">⏳ ${I18n.t('housing.status.pending_confirm')}:</div>`;
                appsHtml += pendingApps.map(app => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee;">
                        <span style="font-size: 0.9rem; color: #333; font-weight: bold;">${app.snapshot_display_name || app.applicantName}</span>
                        <button onclick="window.showReviewApplicationModal('${app.id}', '${p.id}', '${app.user_email || app.user_id || app.applicantId}', '${p.title.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', 'study', null)" style="background: #2196F3; color: white; border: none; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: bold;">👤 ${I18n.t('common.view_details')}</button>
                    </div>
                `).join('');
            }

            if (acceptedApps.length > 0) {
                appsHtml += `<div style="font-size: 0.85rem; font-weight: bold; color: #4caf50; margin-top: 15px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #c8e6c9;">✅ ${I18n.t('outing.status.joined')}:</div>`;
                appsHtml += acceptedApps.map(app => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee;">
                        <span style="font-size: 0.9rem; color: #333; font-weight: bold;">${app.snapshot_display_name || app.applicantName}</span>
                        <span style="font-size: 0.8rem; color: #4caf50; font-weight: bold;">✓ ${I18n.t('outing.status.joined')}</span>
                    </div>
                `).join('');
            }
            if (!appsHtml) appsHtml = `<div style="text-align: center; color: #999; padding: 10px; font-size: 0.9rem;">${I18n.t('common.no_data')}</div>`;

            const dTime = new Date(p.event_time);
            const dateStr = dTime.toLocaleDateString();

            return `
                <div class="card" style="${p.status === 'cancelled' ? 'opacity: 0.6;' : ''} margin-bottom: 1.5rem; border-radius: 12px; background: white; padding: 20px; border: 1px solid #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0; font-size: 1.2rem; color: #333;">${p.title}</h3>
                        ${statusBadge}
                    </div>
                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 20px;">🗓️ ${dateStr}</div>
                    
                    <div style="background: #fdfdfd; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-weight: bold; color: #333; font-size: 0.95rem; margin-bottom: 10px;">👥 ${I18n.t('common.participants')} (${participantCount}/${p.people_needed})</div>
                        ${appsHtml}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button onclick="window.navigateTo('messages?room=study_${p.id}')" style="width: 100%; padding: 12px; border-radius: 8px; background: #1976D2; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">💬 ${I18n.t('common.enter_chat')}</button>
                        ${p.status === 'open' ? `
                            <button onclick="window.updateStudyStatus('${p.id}', 'paused')" style="width: 100%; padding: 12px; border-radius: 8px; background: #FF9800; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">⏸️ ${I18n.t('common.pause')}</button>
                            <button onclick="window.updateStudyStatus('${p.id}', 'success')" style="width: 100%; padding: 12px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">✓ ${I18n.t('common.success')}</button>
                            <button onclick="window.updateStudyStatus('${p.id}', 'cancelled')" style="width: 100%; padding: 12px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">${I18n.t('common.cancel')}</button>
                        ` : p.status === 'paused' ? `
                            <button onclick="window.updateStudyStatus('${p.id}', 'open')" style="width: 100%; padding: 12px; border-radius: 8px; background: #4CAF50; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">▶️ ${I18n.t('common.resume')}</button>
                            <button onclick="window.updateStudyStatus('${p.id}', 'success')" style="width: 100%; padding: 12px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">✓ ${I18n.t('common.success')}</button>
                            <button onclick="window.updateStudyStatus('${p.id}', 'cancelled')" style="width: 100%; padding: 12px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">${I18n.t('common.cancel')}</button>
                        ` : ''}
                        <button onclick="window.deletePost('${p.id}', 'study')" style="width: 100%; padding: 12px; border-radius: 8px; background: #333; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; margin-top: 5px;">🗑️ ${I18n.t('common.delete')}</button>
                    </div>
                </div>
            `;
        }));

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2>⚙️ ${I18n.t('common.manage')}</h2>
                </header>

                ${myPosts.length > 0 ? `<section style="margin-bottom: 2rem;">${postsHtmlArray.join('')}</section>` : `<div style="text-align: center; padding: 3rem 1rem; color: #888;">📝 <br>${I18n.t('common.no_data')}</div>`}
            </div>
        `;
    };

    const updateView = async () => {
        if (currentState === 'landing') { app.innerHTML = renderLanding(); bindLandingListeners(); }
        else if (currentState === 'create') { app.innerHTML = renderCreateForm(); bindCreateListeners(); }
        else if (currentState === 'list') { app.innerHTML = await renderList(); bindListListeners(); }
        else if (currentState === 'manage') { app.innerHTML = await renderManage(); bindManageListeners(); }
    };

    const bindLandingListeners = () => {
        document.getElementById('btn-role-host')?.addEventListener('click', () => { currentState = 'create'; updateView(); });
        document.getElementById('btn-role-partner')?.addEventListener('click', () => { currentState = 'list'; updateView(); });
        document.getElementById('btn-manage')?.addEventListener('click', () => { currentState = 'manage'; updateView(); });
    };

    const bindCreateListeners = () => {
        document.querySelector('.btn-back')?.addEventListener('click', () => { currentState = 'landing'; updateView(); });

        const locSelect = document.getElementById('stLocation');
        const customLocInput = document.getElementById('stCustomLoc');
        locSelect?.addEventListener('change', () => {
            if (locSelect.value === '自訂') {
                customLocInput.style.display = 'block';
                customLocInput.required = true;
            } else {
                customLocInput.style.display = 'none';
                customLocInput.required = false;
            }
        });

        document.getElementById('createStudyForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            const oriText = btnSubmit.innerText;
            btnSubmit.innerText = "⏳..."; btnSubmit.disabled = true;

            const isZH = isAppZH();
            try {
                const rawTime = document.getElementById('stTime').value;
                const formattedTime = rawTime ? rawTime.replace('T', ' ') + ':00' : null;

                const rawDeadline = document.getElementById('stDeadline').value;
                const formattedDeadline = rawDeadline ? rawDeadline.replace('T', ' ') + ':00' : null;

                const location = locSelect.value === '自訂' ? customLocInput.value : locSelect.value;

                const response = await fetch('/create-study', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        host_email: user.email,
                        host_name: user.displayName || user.name,
                        host_dept: user.department || user.major || 'Student',
                        title: document.getElementById('stTitle').value,
                        event_type: document.getElementById('stType').value,
                        subject: document.getElementById('stSubject').value,
                        location: location,
                        people_needed: parseInt(document.getElementById('stPeople').value),
                        event_time: formattedTime,
                        deadline: formattedDeadline,
                        description: document.getElementById('stNotes').value || ''
                    })
                });

                if (response.ok) {
                    if (window.refreshUserProfile) await window.refreshUserProfile();
                    alert(isZH ? "發佈成功！ 🎉" : "Success! 🎉");
                    currentState = 'manage';
                    updateView();
                } else { alert("Database Error."); }
            } catch (err) { alert("Connection failed."); }
            finally { btnSubmit.innerText = oriText; btnSubmit.disabled = false; }
        });
    };

    const bindListListeners = () => {
        document.querySelector('.btn-back')?.addEventListener('click', () => { currentState = 'landing'; updateView(); });

        document.getElementById('btn-st-filter')?.addEventListener('click', () => {
            const existingOverlay = document.getElementById('st-filter-overlay');
            if (existingOverlay) existingOverlay.remove();
            app.insertAdjacentHTML('beforeend', renderFilterPanel());
            bindFilterOptions();
        });

        const searchInput = document.getElementById('stSearchInput');
        const triggerSearch = () => {
            activeFilters.searchQuery = searchInput.value;
            updateView();
        };
        document.getElementById('btn-st-search')?.addEventListener('click', triggerSearch);
        searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') triggerSearch(); });
    };

    const bindFilterOptions = () => {
        document.querySelectorAll('.filter-option').forEach(btn => {
            btn.addEventListener('click', function () {
                const filterType = this.getAttribute('data-filter');
                const value = this.getAttribute('data-value');

                if (activeFilters[filterType] === value || (filterType === 'peopleCount' && activeFilters[filterType] === parseInt(value))) {
                    activeFilters[filterType] = null;
                } else {
                    activeFilters[filterType] = filterType === 'peopleCount' ? parseInt(value) : value;
                }
                const filterOverlay = document.getElementById('st-filter-overlay');
                if (filterOverlay) {
                    filterOverlay.outerHTML = renderFilterPanel();
                    bindFilterOptions();
                }
            });
        });
    };

    window.closeStudyFilter = () => {
        const overlay = document.getElementById('st-filter-overlay');
        if (overlay) overlay.remove();
    };

    window.resetStudyFilters = () => {
        activeFilters = { searchQuery: '', eventType: null, dateRange: null, peopleCount: null };
        window.closeStudyFilter();
        updateView();
    };

    window.applyStudyFilters = () => {
        window.closeStudyFilter();
        updateView();
    };

    const bindManageListeners = () => {
        document.querySelector('.btn-back')?.addEventListener('click', () => { currentState = 'landing'; updateView(); });
    };

    // --- POP-UP JOIN CONFIRMATION ---
    window.openStudyJoinForm = async (postId, teamName) => {
        const isZH = isAppZH();
        const msgConfirm = isZH ? '確認申請加入' : 'Confirm Request';
        const msgDesc = isZH ? `您確定要申請加入 <strong>${teamName}</strong> 嗎？` : `Request to join <strong>${teamName}</strong>?`;

        const formHtml = `
            <div id="join-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);">
                <div style="background: white; width: 85%; max-width: 350px; border-radius: 16px; padding: 2rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: scaleIn 0.2s ease-out;">
                    <h3 style="margin: 0 0 1rem 0; color: #333;">${I18n.t('study.action.join')}</h3>
                    <p style="color: #666; margin-bottom: 1.5rem; line-height: 1.5;">${I18n.t('common.confirm_join_prefix')} <strong>${teamName}</strong> ${I18n.t('common.confirm_join_suffix')}</p>
                    <div style="display: flex; gap: 1rem;">
                        <button onclick="document.getElementById('join-overlay').remove()" class="btn" style="flex: 1; padding: 0.8rem; background: #eee; color: #555; border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                            ${I18n.t('common.cancel')}
                        </button>
                        <button id="btn-confirm-join" class="btn btn-primary" style="flex: 1; padding: 0.8rem; background: linear-gradient(135deg, #FFB300, #FF9800); color: white; border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                            ${I18n.t('common.submit')}
                        </button>
                    </div>
                </div>
            </div>
            <style>@keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }</style>
        `;
        document.body.insertAdjacentHTML('beforeend', formHtml);

        document.getElementById('btn-confirm-join').onclick = async () => {
            const userProfile = JSON.parse(localStorage.getItem('userProfile'));
            const btnSubmit = document.getElementById('btn-confirm-join');
            btnSubmit.disabled = true;
            btnSubmit.innerText = "...";

            try {
                // 1. Fetch Backend API (Source of Truth)
                const result = await api.fetch('/api/v1/join', {
                    method: 'POST',
                    body: { event_type: 'study', event_id: postId, user_email: userProfile.email }
                });

                if (result.success) {
                    // 2. Legacy Local Fallback
                    window.StudyAppEngine.saveApp({
                        postId: postId,
                        applicantId: userProfile.email,
                        applicantName: userProfile.displayName || userProfile.name || 'Student',
                        applicantDept: userProfile.department || '',
                        status: 'pending'
                    });

                     alert(I18n.t('common.alert.sent_success'));
                    document.getElementById('join-overlay').remove();
                } else {
                    alert(I18n.t('common.alert.error_occurred') + ": " + (result.message || "Unknown error"));
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = I18n.t('common.submit');
                }
            } catch (e) {
                console.error("Join Request Error:", e);
                alert(I18n.t('common.alert.error_occurred'));
                btnSubmit.disabled = false;
                btnSubmit.innerText = I18n.t('common.submit');
            }
        };
    };

    window.updateStudyStatus = async (postId, newStatus) => {
        if (newStatus === 'cancelled') {
            if (!confirm(I18n.t('common.alert.confirm_cancel_penalty'))) return;
        } else {
            if (!confirm(I18n.t('common.alert.confirm_action'))) return;
        }
        try {
            const response = await fetch(`/update-study-status/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                if (window.refreshUserProfile) await window.refreshUserProfile();
                updateView();
            }
        } catch (error) { }
    };


    // --- POPUP DETAIL STUDY ---
    window.showStudyDetail = async (id) => {
        try {
            const response = await fetch('/studies');
            const data = await response.json();
            const p = data.find(item => String(item.id) === String(id));
            if (!p) return;

            const existingOverlay = document.getElementById('study-detail-overlay');
            if (existingOverlay) existingOverlay.remove();

            const isZH = isAppZH();
            const dTime = new Date(p.event_time);
            const timeStr = isZH
                ? `${dTime.getFullYear()}-${(dTime.getMonth() + 1).toString().padStart(2, '0')}-${dTime.getDate().toString().padStart(2, '0')} ${dTime.getHours().toString().padStart(2, '0')}:${dTime.getMinutes().toString().padStart(2, '0')}`
                : `${dTime.toLocaleDateString()} ${dTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

            const modalHtml = `
                <div id="study-detail-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; justify-content: center; z-index: 100000; animation: fadeIn 0.3s;">
                    <div style="background: white; width: 100%; max-width: 600px; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 25px; overflow-y: auto; position: relative; animation: slideUp 0.3s ease;">
                        <button onclick="document.getElementById('study-detail-overlay').remove()" style="position: absolute; top: 15px; right: 15px; background: #eee; border: none; width: 30px; height: 30px; border-radius: 50%; font-weight: bold; cursor: pointer; color: #555;">X</button>
                        
                        <div style="display: inline-block;                         <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; border: 1px solid #eee; margin-bottom: 20px;">
                            <div style="margin-bottom: 10px;"><strong>📍 ${I18n.t('common.location')}:</strong> ${p.location}</div>
                            <div style="margin-bottom: 10px;"><strong>🕒 ${I18n.t('common.time')}:</strong> ${timeStr}</div>
                            <div><strong>👥 ${I18n.t('study.label.people')}:</strong> <span style="color:#FF9800; font-weight:bold;">${p.people_needed}</span></div>
                        </div>

                        <div style="background: #FFF9C4; border: 1px solid #FFE0B2; border-radius: 12px; padding: 15px;">
                            <div style="font-size: 0.8rem; color: #E65100; font-weight: bold; margin-bottom: 5px;">📝 ${I18n.t('common.description')}</div>
                            <div style="color: #444; line-height: 1.5;">${p.description || I18n.t('common.none')}</div>
                        </div>
tyle="color:#FF9800; font-weight:bold;">${p.people_needed}</span></div>
                        </div>

                        <div style="background: #FFF9C4; border: 1px solid #FFE0B2; border-radius: 12px; padding: 15px;">
                            <div style="font-size: 0.8rem; color: #E65100; font-weight: bold; margin-bottom: 5px;">📝 ${isZH ? '備註說明' : 'Notes'}</div>
                            <div style="color: #444; line-height: 1.5;">${p.description || (isZH ? '無' : 'None')}</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (e) { console.error(e); }
    };

    window.setState = (state, role) => {
        currentState = state;
        updateView();
    };

    // Taruh di bagian bawah file carpool.js dan study.js
    window.openGroupChat = (activityId) => {
        const userProfileStr = localStorage.getItem('userProfile');
        if (!userProfileStr) {
            alert(I18n.t('auth.err.login_required') || "Please login first!");
            return;
        }
        // Ini kodingan ajaib yang melempar user ke messages.js
        window.navigateTo(`messages?room=study_${activityId}`);
    };

    updateView();
};

window.showReviewStudyAppModal = (appId, postId, applicantEmail, teamName) => {
    window.showReviewApplicationModal(appId, postId, applicantEmail, teamName, 'study');
};
