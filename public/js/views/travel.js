import { I18n } from '../services/i18n.js';

// --- MESIN PENDAFTARAN HANGOUT ---
window.HangoutAppEngine = {
    saveApp: (appData) => {
        const apps = JSON.parse(localStorage.getItem('joinup_hangout_apps') || '[]');
        appData.id = Date.now().toString();
        apps.push(appData);
        localStorage.setItem('joinup_hangout_apps', JSON.stringify(apps));
        return appData.id;
    },
    getApps: (postId) => {
        const apps = JSON.parse(localStorage.getItem('joinup_hangout_apps') || '[]');
        return apps.filter(a => String(a.postId) === String(postId));
    },
    updateApp: (appId, status) => {
        const apps = JSON.parse(localStorage.getItem('joinup_hangout_apps') || '[]');
        const index = apps.findIndex(a => String(a.id) === String(appId));
        if (index > -1) {
            apps[index].status = status;
            localStorage.setItem('joinup_hangout_apps', JSON.stringify(apps));
        }
    }
};


// --- SENSOR BAHASA ULTIMATE ---
const isAppZH = () => {
    try {
        const langObj = (window.I18n?.locale || window.I18n?.language || '').toLowerCase();
        if (langObj.includes('en')) return false;
        if (langObj.includes('zh')) return true;
    } catch (e) { }
    const ls = (localStorage.getItem('language') || localStorage.getItem('lang') || localStorage.getItem('i18nextLng') || 'zh-TW').toLowerCase();
    if (ls.includes('en')) return false;
    return true;
};

const t = (key, zhText, enText) => {
    try {
        if (typeof window.I18n !== 'undefined' && typeof window.I18n.t === 'function') {
            const trans = window.I18n.t(key);
            if (trans && trans !== key && trans.trim() !== '') return trans;
        }
    } catch (e) { }
    return isAppZH() ? zhText : enText;
};

// --- MESIN PENDAFTARAN HANG OUT ---
window.HangoutAppEngine = {
    saveApp: (appData) => {
        const apps = JSON.parse(localStorage.getItem('joinup_hangout_apps') || '[]');
        appData.id = Date.now().toString();
        apps.push(appData);
        localStorage.setItem('joinup_hangout_apps', JSON.stringify(apps));
        return appData.id;
    },
    getApps: (postId) => {
        const apps = JSON.parse(localStorage.getItem('joinup_hangout_apps') || '[]');
        return apps.filter(a => String(a.postId) === String(postId));
    },
    updateApp: (appId, status) => {
        const apps = JSON.parse(localStorage.getItem('joinup_hangout_apps') || '[]');
        const index = apps.findIndex(a => String(a.id) === String(appId));
        if (index > -1) {
            apps[index].status = status;
            localStorage.setItem('joinup_hangout_apps', JSON.stringify(apps));
        }
    }
};

export const renderTravel = () => {
    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');

    if (!userProfileStr) {
        alert(t('auth.req', '請先登入！', 'Please login first!'));
        window.navigateTo('home');
        return;
    }

    const user = JSON.parse(userProfileStr);
    let currentState = 'landing';

    let activeFilters = {
        searchQuery: '',
        category: null,
        dateRange: null,
        peopleCount: null
    };

    const renderLanding = () => {
        return `
            <div class="container fade-in" style="height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <span style="font-size: 3.5rem;">🎉</span>
                    <h1 style="color: #FF9800; margin-top: 1rem;">${t('ho.title', '揪團/交友', 'Hang Out')}</h1>
                    <p style="color: var(--text-secondary);">${t('ho.sub', '看電影、吃飯、夜衝，尋找志同道合的夥伴！', 'Movies, dining, night rides, find your crew!')}</p>
                </div>

                <div style="display: grid; gap: 1rem;">
                    <button id="btn-role-host" class="role-card" style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: none; border-left: 4px solid #FF8C00; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; transition: transform 0.2s;">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">🥳</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: var(--text-primary);">${I18n.t('outing.role.host')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${I18n.t('outing.role.host_desc')}</p>
                        </div>
                    </button>

                    <button id="btn-role-partner" class="role-card" style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: none; border-left: 4px solid #FFD600; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; transition: transform 0.2s;">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">🔍</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: var(--text-primary);">${I18n.t('outing.role.join')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${I18n.t('outing.role.join_desc')}</p>
                        </div>
                    </button>

                    <button id="btn-manage" class="btn" style="background: linear-gradient(135deg, #FFD600, #FF6D00); color: white; margin-top: 1rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 109, 0, 0.3); transition: transform 0.2s;">
                        ⚙️ ${t('common.manage', '管理我的活動', 'Manage My Activities')}
                    </button>
                </div>
                
                <button onclick="window.navigateTo('home')" style="position: absolute; top: 1rem; left: 1rem; background: none; border: none; font-size: 1.2rem; cursor: pointer; font-weight: bold; color: var(--text-secondary);">
                    ⬅️ ${t('common.back', '返回', 'Back')}
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
                    <h2 style="color: #FF9800;">${t('ho.create.title', '創建活動', 'Create Activity')}</h2>
                </header>

                <form id="createHangoutForm" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 20px; border-radius: 12px; box-shadow: var(--shadow-sm);">
                    
                    <h3 style="margin-top: 0; margin-bottom: 0.5rem; color: #FF9800; border-bottom: 2px solid #FFE0B2; padding-bottom: 0.5rem; font-size: 1.1rem;">📋 ${t('ho.desc_head', '詳細說明', 'Description')}</h3>
                    <div style="color: #888; font-size: 12px; text-align: center; margin-bottom: 1.5rem;">此平台不負責任何金錢問題<br>(This platform is not responsible for any financial issues)</div>
                    
                    <div class="input-group">
                        <label>${t('ho.topic', '活動標題 *', 'Activity Title *')}</label>
                        <input type="text" id="hoTitle" placeholder="${t('ho.ph.topic', '例如：週末夜衝看日出', 'e.g. Weekend night ride for sunrise')}" required>
                    </div>

                    <div class="input-group">
                        <label>${t('ho.cat', '活動類別 *', 'Category *')}</label>
                        <select id="hoCategory" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);" required>
                            <option value="" disabled selected>請選擇...</option>
                            <option value="Food">🍽️ ${isZH ? '聚餐/美食' : 'Food/Dining'}</option>
                            <option value="Outdoor">🏕️ ${isZH ? '戶外/踏青' : 'Outdoor/Nature'}</option>
                            <option value="Arts">🎨 ${isZH ? '藝文/展覽' : 'Arts/Exhibitions'}</option>
                            <option value="Entertainment">🍿 ${isZH ? '娛樂/電影' : 'Entertainment/Movies'}</option>
                            <option value="Shopping">🛍️ ${isZH ? '逛街/購物' : 'Shopping'}</option>
                            <option value="Nightlife">🍻 ${isZH ? '夜生活/酒吧' : 'Nightlife/Bar'}</option>
                            <option value="Other">✨ ${isZH ? '其他' : 'Other'}</option>
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${t('ho.realname', '真實姓名 *', 'Real Name *')}</label>
                            <input type="text" id="hoName" value="${user.displayName || user.name || ''}" required>
                        </div>
                        <div class="input-group">
                            <label>${t('ho.dept', '系所 *', 'Department *')}</label>
                            <input type="text" id="hoDept" value="${user.department || user.major || ''}" placeholder="${isZH ? '例如：資工系三年級' : 'e.g. CS Year 3'}" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>${t('ho.people', '需要人數 *', 'People Needed *')}</label>
                        <input type="number" id="hoPeople" min="1" max="50" value="4" required>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${t('ho.time', '時間 *', 'Time *')}</label>
                            <input type="datetime-local" id="hoTime" required>
                        </div>
                        <div class="input-group">
                            <label>${t('ho.deadline', '報名截止 *', 'Deadline *')}</label>
                            <input type="datetime-local" id="hoDeadline" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>${t('ho.meet', '身分 *', 'Meeting Location*')}</label>
                        <select id="hoMeetLoc" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);" required>
                            <option value="" disabled selected>請選擇...</option>
                            <option value="暨大圖書館">🏛️ ${isZH ? '暨大圖書館' : 'NCNU Library'}</option>
                            <option value="學生活動中心">🏢 ${isZH ? '學生活動中心' : 'Student Activity Center'}</option>
                            <option value="暨大正門">🚪 ${isZH ? '暨大正門' : 'NCNU Main Gate'}</option>
                            <option value="暨大女宿">👩‍🎓 ${isZH ? '暨大女宿' : 'NCNU Female Dormitory'}</option>
                            <option value="暨大男宿">👨‍🎓 ${isZH ? '暨大男宿' : 'NCNU Male Dormitory'}</option>
                            <option value="暨大全家">🏪 ${isZH ? '暨大全家' : 'NCNU Family Mart'}</option>
                            <option value="埔里車站">🚌 ${isZH ? '埔里車站' : 'Puli Station'}</option>
                            <option value="自訂">📍 ${isZH ? '自訂' : 'Custom'}</option>
                        </select>
                        <input type="text" id="hoMeetLocCustom" style="margin-top: 0.5rem; width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); display: none;" placeholder="${isZH ? '請輸入集合地點...' : 'Enter meeting location...'}">
                    </div>

                    <div class="input-group">
                        <label>${t('ho.dest', '活動目的地 *', 'Destination *')}</label>
                        <select id="hoDestLoc" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);" required>
                            <option value="" disabled selected>請選擇...</option>
                            <option value="埔里市區">🏙️ ${isZH ? '埔里市區' : 'Puli Town'}</option>
                            <option value="台中市區">🌆 ${isZH ? '台中市區' : 'Taichung City'}</option>
                            <option value="日月潭">🏞️ ${isZH ? '日月潭' : 'Sun Moon Lake'}</option>
                            <option value="合歡山">⛰️ ${isZH ? '合歡山' : 'Hehuan Mountain'}</option>
                            <option value="自訂">📍 ${isZH ? '自訂' : 'Custom'}</option>
                        </select>
                        <input type="text" id="hoDestLocCustom" style="margin-top: 0.5rem; width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); display: none;" placeholder="${isZH ? '請輸入目的地...' : 'Enter destination...'}">
                    </div>

                    <div class="input-group">
                        <label>${t('ho.notes', '詳細說明', 'Details / Notes')}</label>
                        <textarea id="hoDesc" rows="4" placeholder="${isZH ? '說明活動內容、注意事項等...' : 'Explain the activity details, things to note...'}" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);"></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 12px; font-size: 1.1rem; border-radius: 8px; background: #FF9800; border: none; font-weight: bold; color: white; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 152, 0, 0.3);">
                        ${t('common.submit', '發佈活動', 'Publish Activity')}
                    </button>
                </form>
            </div>
        `;
    };

    const renderFilterPanel = () => {
        const isZH = isAppZH();
        const txtFilterTitle = isZH ? '篩選活動' : 'Filter Activities';
        const txtCat = isZH ? '類別' : 'Category';
        const txtDate = isZH ? '日期' : 'Date';
        const txtPeople = isZH ? '需要人數' : 'People Needed';
        const txtClear = isZH ? '清除篩選' : 'Clear Filters';
        const txtConfirm = isZH ? '確認' : 'Confirm';

        const categories = [
            { id: 'Food', label: isZH ? '聚餐/美食' : 'Food/Dining' },
            { id: 'Outdoor', label: isZH ? '戶外/踏青' : 'Outdoor' },
            { id: 'Arts', label: isZH ? '藝文/展覽' : 'Arts' },
            { id: 'Entertainment', label: isZH ? '娛樂/電影' : 'Entertainment' },
            { id: 'Shopping', label: isZH ? '逛街/購物' : 'Shopping' },
            { id: 'Nightlife', label: isZH ? '夜生活/酒吧' : 'Nightlife' },
            { id: 'Other', label: isZH ? '其他' : 'Other' }
        ];

        let catHtml = categories.map(c => {
            const isActive = activeFilters.category === c.id;
            return `<button class="filter-option" data-filter="category" data-value="${c.id}" style="padding: 0.6rem 1rem; border: 1px solid ${isActive ? '#FF9800' : 'var(--border-color)'}; border-radius: 8px; background: ${isActive ? '#FFF3E0' : 'var(--bg-card)'}; color: ${isActive ? '#E65100' : 'var(--text-secondary)'}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer;">${c.label}</button>`;
        }).join('');

        return `
            <div id="ho-filter-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: end; z-index: 1000;">
                <div style="background: var(--bg-card); width: 100%; border-radius: 16px 16px 0 0; padding: 1.5rem; max-height: 85vh; overflow-y: auto; animation: slideUp 0.3s ease-out; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                        <h3 style="color: #FF9800; margin: 0;">${txtFilterTitle}</h3>
                        <button onclick="window.closeHangoutFilter()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-primary);">×</button>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: #333;">${txtCat}</label>
                        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">${catHtml}</div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: var(--text-primary);">${txtDate}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="filter-option" data-filter="dateRange" data-value="today" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.dateRange === 'today' ? '#FF9800' : 'var(--border-color)'}; border-radius: 8px; background: ${activeFilters.dateRange === 'today' ? '#FFF3E0' : 'var(--bg-card)'}; color: ${activeFilters.dateRange === 'today' ? '#E65100' : 'var(--text-secondary)'}; font-weight: ${activeFilters.dateRange === 'today' ? 'bold' : 'normal'}; cursor: pointer;">${isZH ? '今天' : 'Today'}</button>
                            <button class="filter-option" data-filter="dateRange" data-value="week" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.dateRange === 'week' ? '#FF9800' : 'var(--border-color)'}; border-radius: 8px; background: ${activeFilters.dateRange === 'week' ? '#FFF3E0' : 'var(--bg-card)'}; color: ${activeFilters.dateRange === 'week' ? '#E65100' : 'var(--text-secondary)'}; font-weight: ${activeFilters.dateRange === 'week' ? 'bold' : 'normal'}; cursor: pointer;">${isZH ? '一週內' : 'Within 1 Week'}</button>
                            <button class="filter-option" data-filter="dateRange" data-value="month" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.dateRange === 'month' ? '#FF9800' : 'var(--border-color)'}; border-radius: 8px; background: ${activeFilters.dateRange === 'month' ? '#FFF3E0' : 'var(--bg-card)'}; color: ${activeFilters.dateRange === 'month' ? '#E65100' : 'var(--text-secondary)'}; font-weight: ${activeFilters.dateRange === 'month' ? 'bold' : 'normal'}; cursor: pointer;">${isZH ? '一個月內' : 'Within 1 Month'}</button>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: var(--text-primary);">${txtPeople}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            ${[2, 4, 6, 8].map(num => `
    <button class="filter-option" data-filter="peopleCount" data-value="${num}" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.peopleCount === num ? '#FF9800' : 'var(--border-color)'}; border-radius: 8px; background: ${activeFilters.peopleCount === num ? '#FFF3E0' : 'var(--bg-card)'}; color: ${activeFilters.peopleCount === num ? '#E65100' : 'var(--text-secondary)'}; font-weight: ${activeFilters.peopleCount === num ? 'bold' : 'normal'}; cursor: pointer;">
        ≤ ${num} ${isZH ? '人' : ''}
    </button>
`).join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button onclick="window.resetHangoutFilters()" class="btn" style="flex: 1; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; font-weight: bold;">${txtClear}</button>
                        <button onclick="window.applyHangoutFilters()" class="btn btn-primary" style="flex: 2; background: #FF9800; border: none; color: white; padding: 12px; border-radius: 8px; font-weight: bold;">${txtConfirm}</button>
                    </div>
                </div>
            </div>
            <style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
        `;
    };

    const renderList = async () => {
        const isZH = isAppZH();
        const txtTitle = isZH ? '尋找活動' : 'Activity List';
        const txtNoData = isZH ? '目前沒有活動。' : 'No matching activities found.';

        let contentHtml = `<div style="text-align: center; padding: 2rem; color: #888;">⏳ ${t('common.loading', '載入中...', 'Loading...')}</div>`;

        const activeFilterCount = [
            activeFilters.category,
            activeFilters.dateRange,
            activeFilters.peopleCount
        ].filter(Boolean).length;

        try {
            const response = await fetch('/hangouts');
            const dbPosts = await response.json();
            const allUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');

            let availablePosts = dbPosts.filter(p => {
                if (p.status === 'cancelled' || p.status === 'success' || p.status === 'expired' || p.status === 'full') return false;

                const dTime = new Date(p.deadline || p.event_time);
                if (dTime < new Date()) return false;

                const apps = window.HangoutAppEngine.getApps(p.id) || [];
                const acceptedApps = apps.filter(a => a.status === 'accepted');
                if (acceptedApps.length >= p.people_needed) return false;

                if (p.people_needed !== undefined && p.people_needed <= 0) return false;

                return true;
            });

            // --- FILTER & SEARCH ---
            if (activeFilters.searchQuery) {
                const q = activeFilters.searchQuery.toLowerCase();
                availablePosts = availablePosts.filter(p => p.title.toLowerCase().includes(q) || p.destination.toLowerCase().includes(q));
            }
            if (activeFilters.category) {
                availablePosts = availablePosts.filter(p => p.category === activeFilters.category);
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
                    const timeStr = isZH
                        ? `${dTime.getFullYear()}-${(dTime.getMonth() + 1).toString().padStart(2, '0')}-${dTime.getDate().toString().padStart(2, '0')} ${dTime.getHours().toString().padStart(2, '0')}:${dTime.getMinutes().toString().padStart(2, '0')}`
                        : `${(dTime.getMonth() + 1).toString().padStart(2, '0')}/${dTime.getDate().toString().padStart(2, '0')}/${dTime.getFullYear()} ${dTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

                    const isHost = (p.host_email === user.email);
                    const apps = window.HangoutAppEngine.getApps(p.id) || [];
                    const acceptedApps = apps.filter(a => a.status === 'accepted');
                    const participantCount = acceptedApps.length;
                    const isFull = participantCount >= p.people_needed;

                    let hostData = null;
                    if (window.MockStore && window.MockStore.getUser) hostData = window.MockStore.getUser(p.host_email);
                    if (!hostData) hostData = allUsers.find(u => u.email === p.host_email);

                    const hostAvatar = hostData?.profile_pic || hostData?.profilePic || hostData?.avatar || hostData?.picture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

                    let catIcon = '✨';
                    if (p.category === 'Food') catIcon = '🍽️';
                    else if (p.category === 'Outdoor') catIcon = '🏕️';
                    else if (p.category === 'Arts') catIcon = '🎨';
                    else if (p.category === 'Entertainment') catIcon = '🍿';
                    else if (p.category === 'Shopping') catIcon = '🛍️';
                    else if (p.category === 'Sports') catIcon = '🏃';
                    else if (p.category === 'Nightlife') catIcon = '🍻';

                    let catLabel = p.category;
                    if (isZH) {
                        if (p.category === 'Food') catLabel = '聚餐/美食';
                        else if (p.category === 'Outdoor') catLabel = '戶外/踏青';
                        else if (p.category === 'Arts') catLabel = '藝文/展覽';
                        else if (p.category === 'Entertainment') catLabel = '娛樂/電影';
                        else if (p.category === 'Shopping') catLabel = '逛街/購物';
                        else if (p.category === 'Nightlife') catLabel = '夜生活/酒吧';
                        else if (p.category === 'Other') catLabel = '其他';
                    }

                    return `
                        <div class="card" onclick="window.showHangoutDetail('${p.id}')" style="cursor: pointer; ${isFull ? 'opacity: 0.7;' : ''} margin-bottom: 1.5rem; border-radius: 12px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); padding: 1.2rem; transition: transform 0.2s; background: var(--bg-card);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                <div style="background: #FFF3E0; color: #FF9800; padding: 4px 10px; border-radius: 15px; font-size: 0.75rem; font-weight: bold;">
                                    ${catIcon} ${catLabel}
                                </div>
                                <div style="font-size: 0.8rem; color: #999;">
                                    📅 ${new Date(p.deadline).toLocaleDateString()}
                                </div>
                            </div>
                            
                            <h3 style="margin: 0 0 10px 0; font-size: 1.2rem; color: var(--text-primary);">${p.title}</h3>
                            <div style="font-size: 0.95rem; color: #1976D2; font-weight: bold; margin-bottom: 15px;">📍 ${p.destination}</div>

                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-size: 0.85rem; color: var(--text-secondary);">
                                <img src="${hostAvatar}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                                <span>${t('common.host', '發起人', 'Host')}: <strong style="color: var(--text-primary);">${p.host_name}</strong> (${p.host_dept})</span>
                            </div>

                            <div style="background: var(--bg-secondary); padding: 10px; border-radius: 8px; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px; display: grid; grid-template-columns: 1fr; gap: 5px;">
                                <div><strong>🕒 ${isZH ? '時間' : 'Time'}:</strong> ${timeStr}</div>
                                <div><strong>🤝 ${isZH ? '身分' : 'Meet'}:</strong> ${p.meeting_location}</div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <span style="font-size: 0.85rem; color: #666;"><strong>👥 ${isZH ? '人數' : 'People'}:</strong> <span style="color:#FF9800; font-weight:bold;">${participantCount} / ${p.people_needed}</span></span>
                                ${isFull ? `<span style="font-size: 0.8rem; color: #f57c00; background: #fff3e0; padding: 4px 8px; border-radius: 10px;">${t('common.full', '額滿', 'Full')}</span>` : ''}
                            </div>

                            ${isHost ? `
                            <button class="btn" onclick="event.stopPropagation(); window.openHangoutChat('${p.id}', '${p.title}', '${p.host_email}')" style="width: 100%; padding: 0.7rem; font-weight: bold; background: linear-gradient(135deg, #42A5F5, #1976D2); border: none; color: white; border-radius: 8px; cursor: pointer;">💬 ${isZH ? '進入聊天室' : 'Enter Chat Room'}</button>
                            ` : !isFull ? `
                            <button class="btn" onclick="event.stopPropagation(); window.openHangoutJoinForm('${p.id}', '${p.title}')" style="width: 100%; padding: 0.7rem; font-weight: bold; background: linear-gradient(135deg, #FFB300, #FF9800); border: none; color: white; border-radius: 8px; cursor: pointer;">${isZH ? '報名參加' : 'Join Event'}</button>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            } else {
                contentHtml = `
                    <div style="text-align: center; padding: 3rem 1rem; color: #888;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                        <p>${txtNoData}</p>
                        <button onclick="window.resetHangoutFilters()" style="margin-top: 1rem; background: #FF9800; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">${isZH ? '清除篩選' : 'Clear Filters'}</button>
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
                        <h2 style="margin: 0; color: #FF9800; font-size: 1.3rem;">${txtTitle}</h2>
                    </div>
                    
                    <button id="btn-ho-filter" style="background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 15px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 5px; position: relative;">
                        🔍 ${isZH ? '篩選' : 'Filter'}
                        ${activeFilterCount > 0 ? `<span style="position: absolute; top: -5px; right: -5px; background: #F44336; color: white; font-size: 0.6rem; padding: 2px 6px; border-radius: 10px; font-weight: bold;">${activeFilterCount}</span>` : ''}
                    </button>
                </header>

                <div style="display: flex; gap: 10px; margin-bottom: 1.5rem;">
                    <div style="flex: 1; position: relative;">
                        <input type="text" id="hoSearchInput" placeholder="${isZH ? '搜尋活動標題或目的地...' : 'Search titles or destinations...'}" value="${activeFilters.searchQuery}" style="width: 100%; padding: 12px 20px; border-radius: 30px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); outline: none; padding-right: 40px; font-size: 0.95rem;">
                        <span id="btn-ho-search" style="position: absolute; right: 15px; top: 12px; cursor: pointer;">🔍</span>
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
            const response = await fetch(`/my-hangouts/${user.email}`);
            myPosts = await response.json();
        } catch (error) { }

        const isZH = isAppZH();
        const txtManageTitle = t('common.manage', '管理我的活動', 'Manage My Events');

        const postsHtmlArray = await Promise.all(myPosts.map(async p => {
            let pendingApps = [];
            let acceptedApps = [];

            // 1. Fetch from Server (Source of Truth)
            try {
                const data = await api.fetch(`/api/v1/host/participants?event_type=hangout&event_id=${p.id}&host_email=${user.email}`, { idempotency: false });
                if (data.success && data.data) {
                    pendingApps = data.data.filter(a => a.status === 'pending');
                    acceptedApps = data.data.filter(a => a.status === 'approved' || a.status === 'accepted');
                }
            } catch (e) { console.warn("Failed to fetch server participants.", e); }

            // 2. Legacy Fallback
            if (pendingApps.length === 0 && acceptedApps.length === 0) {
                const legacyApps = window.HangoutAppEngine.getApps(p.id) || [];
                pendingApps = legacyApps.filter(a => a.status === 'pending');
                acceptedApps = legacyApps.filter(a => a.status === 'accepted');
            }

            const participantCount = acceptedApps.length;

            let statusColor = '#9e9e9e';
            let statusIcon = '';
            let statusText = p.status;

            switch (p.status) {
                case 'open': statusColor = '#4CAF50'; statusIcon = '🟢'; statusText = isZH ? '招募中' : 'Open'; break;
                case 'paused': statusColor = '#ff9800'; statusIcon = '⏸️'; statusText = isZH ? '暫停' : 'Paused'; break;
                case 'success': statusColor = '#2196f3'; statusIcon = '🎉'; statusText = isZH ? '已成案' : 'Success'; break;
                case 'cancelled': statusColor = '#f44336'; statusIcon = '✗'; statusText = isZH ? '已取消' : 'Cancelled'; break;
            }
            const statusBadge = `<span style="font-size: 0.8rem; color: ${statusColor}; border: 1px solid ${statusColor}; padding: 4px 10px; border-radius: 20px; font-weight: bold;">${statusIcon} ${statusText}</span>`;

            let appsHtml = '';
            if (pendingApps.length > 0) {
                appsHtml += `<div style="font-size: 0.85rem; font-weight: bold; color: #FF9800; margin-top: 15px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #FFE0B2;">⏳ ${isZH ? '待確認' : 'Pending Confirmation'}:</div>`;
                appsHtml += pendingApps.map(app => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="font-size: 0.9rem; color: var(--text-primary); font-weight: bold;">${app.snapshot_display_name || app.applicantName}</span>
                        <button onclick="window.showReviewApplicationModal('${app.id}', '${p.id}', '${app.user_email || app.user_id || app.applicantId}', '${p.title.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', 'hangout', null)" style="background: #2196F3; color: white; border: none; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: bold;">👤 ${isZH ? '查看申請' : 'Review'}</button>
                    </div>
                `).join('');
            }

            if (acceptedApps.length > 0) {
                appsHtml += `<div style="font-size: 0.85rem; font-weight: bold; color: #4caf50; margin-top: 15px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #c8e6c9;">✅ ${isZH ? '已加入' : 'Joined'}:</div>`;
                appsHtml += acceptedApps.map(app => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border-color);">
                        <span style="font-size: 0.9rem; color: var(--text-primary); font-weight: bold;">${app.snapshot_display_name || app.applicantName}</span>
                        <span style="font-size: 0.8rem; color: #4caf50; font-weight: bold;">✓ ${isZH ? '已加入' : 'Joined'}</span>
                    </div>
                `).join('');
            }
            if (!appsHtml) appsHtml = `<div style="text-align: center; color: #999; padding: 10px; font-size: 0.9rem;">${isZH ? '目前沒有申請' : 'No applications yet.'}</div>`;

            const dTime = new Date(p.event_time);
            const dateStr = isZH ? `${dTime.getFullYear()}/${(dTime.getMonth() + 1)}/${dTime.getDate()}` : `${(dTime.getMonth() + 1)}/${dTime.getDate()}/${dTime.getFullYear()}`;

            // --- ACTION BUTTONS (Memanjang / Stacking) ---
            const chatAction = `window.navigateTo('messages?room=hangout_${p.id}')`;
            let actionButtonsHtml = `<button onclick="${chatAction}" style="width: 100%; padding: 12px; border-radius: 8px; background: #1976D2; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">💬 ${isZH ? '進入聊天室' : 'Enter Chat Room'}</button>`;

            if (p.status === 'open') {
                actionButtonsHtml += `
                    <button onclick="window.updateHangoutStatus('${p.id}', 'success')" style="width: 100%; padding: 12px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">✓ ${t('common.success', '成案', 'Success')}</button>
                    <button onclick="window.updateHangoutStatus('${p.id}', 'paused')" style="width: 100%; padding: 12px; border-radius: 8px; background: #FF9800; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">⏸️ ${isZH ? '暫停招募' : 'Pause Recruiting'}</button>
                    <button onclick="window.updateHangoutStatus('${p.id}', 'cancelled')" style="width: 100%; padding: 12px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">✗ ${t('common.cancel', '取消', 'Cancel')}</button>
                `;
            } else if (p.status === 'paused') {
                actionButtonsHtml += `
                    <button onclick="window.updateHangoutStatus('${p.id}', 'success')" style="width: 100%; padding: 12px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">✓ ${t('common.success', '成案', 'Success')}</button>
                    <button onclick="window.updateHangoutStatus('${p.id}', 'open')" style="width: 100%; padding: 12px; border-radius: 8px; background: #4CAF50; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">▶️ ${isZH ? '繼續招募' : 'Resume Recruiting'}</button>
                    <button onclick="window.updateHangoutStatus('${p.id}', 'cancelled')" style="width: 100%; padding: 12px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">✗ ${t('common.cancel', '取消', 'Cancel')}</button>
                `;
            }
            actionButtonsHtml += `<button onclick="window.deletePost('${p.id}', 'hangout')" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); font-weight: bold; cursor: pointer; font-size: 1rem; margin-top: 5px;">${isZH ? '🗑️ 刪除' : '🗑️ Delete'}</button>`;

            return `
                <div class="card" style="${p.status === 'cancelled' ? 'opacity: 0.6;' : ''} margin-bottom: 1.5rem; border-radius: 12px; background: var(--bg-card); padding: 20px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-primary);">${p.title}</h3>
                        ${statusBadge}
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 20px;">🗓️ ${dateStr} | 📍 ${p.destination}</div>
                    
                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-weight: bold; color: var(--text-primary); font-size: 0.95rem; margin-bottom: 10px;">👥 ${isZH ? '成員名單' : 'Members'} (${participantCount}/${p.people_needed})</div>
                        ${appsHtml}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${actionButtonsHtml}
                    </div>
                </div>
            `;
        }));

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" onclick="currentState='landing'; updateView();" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2>⚙️ ${txtManageTitle}</h2>
                </header>

                ${myPosts.length > 0 ? `<section style="margin-bottom: 2rem;">${postsHtmlArray.join('')}</section>` : `<div style="text-align: center; padding: 3rem 1rem; color: #888;">📝 <br>${isZH ? '尚未建立活動。' : 'No events created.'}</div>`}
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

        const locSelect = document.getElementById('hoMeetLoc');
        const customLocInput = document.getElementById('hoMeetLocCustom');
        locSelect?.addEventListener('change', () => {
            if (locSelect.value === '自訂') { customLocInput.style.display = 'block'; customLocInput.required = true; }
            else { customLocInput.style.display = 'none'; customLocInput.required = false; }
        });

        const destSelect = document.getElementById('hoDestLoc');
        const customDestInput = document.getElementById('hoDestLocCustom');
        destSelect?.addEventListener('change', () => {
            if (destSelect.value === '自訂') { customDestInput.style.display = 'block'; customDestInput.required = true; }
            else { customDestInput.style.display = 'none'; customDestInput.required = false; }
        });

        document.getElementById('createHangoutForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            const oriText = btnSubmit.innerText;
            btnSubmit.innerText = "⏳..."; btnSubmit.disabled = true;

            const isZH = isAppZH();
            try {
                const rawTime = document.getElementById('hoTime').value;
                const formattedTime = rawTime ? rawTime.replace('T', ' ') + ':00' : null;

                const rawDeadline = document.getElementById('hoDeadline').value;
                const formattedDeadline = rawDeadline ? rawDeadline.replace('T', ' ') + ':00' : null;

                const location = locSelect.value === '自訂' ? customLocInput.value : locSelect.value;
                const destination = destSelect.value === '自訂' ? customDestInput.value : destSelect.value;

                const response = await fetch('/create-hangout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        host_email: user.email,
                        title: document.getElementById('hoTitle').value,
                        category: document.getElementById('hoCategory').value,
                        host_name: document.getElementById('hoName').value,
                        host_dept: document.getElementById('hoDept').value,
                        people_needed: parseInt(document.getElementById('hoPeople').value),
                        event_time: formattedTime,
                        deadline: formattedDeadline,
                        meeting_location: location,
                        destination: destination,
                        description: document.getElementById('hoDesc').value || ''
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

        document.getElementById('btn-ho-filter')?.addEventListener('click', () => {
            const existingOverlay = document.getElementById('ho-filter-overlay');
            if (existingOverlay) existingOverlay.remove();
            app.insertAdjacentHTML('beforeend', renderFilterPanel());
            bindFilterOptions();
        });

        const searchInput = document.getElementById('hoSearchInput');
        const triggerSearch = () => {
            activeFilters.searchQuery = searchInput.value;
            updateView();
        };
        document.getElementById('btn-ho-search')?.addEventListener('click', triggerSearch);
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
                const filterOverlay = document.getElementById('ho-filter-overlay');
                if (filterOverlay) {
                    filterOverlay.outerHTML = renderFilterPanel();
                    bindFilterOptions();
                }
            });
        });
    };

    window.closeHangoutFilter = () => {
        const overlay = document.getElementById('ho-filter-overlay');
        if (overlay) overlay.remove();
    };

    window.resetHangoutFilters = () => {
        activeFilters = { searchQuery: '', category: null, dateRange: null, peopleCount: null };
        window.closeHangoutFilter();
        updateView();
    };

    window.applyHangoutFilters = () => {
        window.closeHangoutFilter();
        updateView();
    };

    const bindManageListeners = () => {
        document.querySelector('.btn-back')?.addEventListener('click', () => { currentState = 'landing'; updateView(); });
    };

    // --- POP-UP JOIN CONFIRMATION ---
    window.openHangoutJoinForm = async (postId, teamName) => {
        const isZH = isAppZH();
        const msgConfirm = isZH ? '確認報名參加' : 'Confirm Request';
        const msgDesc = isZH ? `您確定要報名參加 <strong>${teamName}</strong> 嗎？` : `Request to join <strong>${teamName}</strong>?`;

        const formHtml = `
            <div id="join-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);">
                <div style="background: var(--bg-card); width: 85%; max-width: 350px; border-radius: 16px; padding: 2rem; text-align: center; box-shadow: var(--shadow-lg); animation: scaleIn 0.2s ease-out; border: 1px solid var(--border-color);">
                    <h3 style="margin: 0 0 1rem 0; color: var(--text-primary);">${msgConfirm}</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.5;">${msgDesc}</p>
                    <div style="display: flex; gap: 1rem;">
                        <button onclick="document.getElementById('join-overlay').remove()" class="btn" style="flex: 1; padding: 0.8rem; background: var(--bg-secondary); color: var(--text-secondary); border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                            ${t('common.cancel', '取消', 'Cancel')}
                        </button>
                        <button id="btn-confirm-join" class="btn btn-primary" style="flex: 1; padding: 0.8rem; background: linear-gradient(135deg, #FFB300, #FF9800); color: white; border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                            ${t('common.submit', '確認送出', 'Submit')}
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
                    body: { event_type: 'hangout', event_id: postId, user_email: userProfile.email }
                });

                if (result.success) {
                    // 2. Legacy Local Fallback
                    window.HangoutAppEngine.saveApp({
                        postId: postId,
                        applicantId: userProfile.email,
                        applicantName: userProfile.displayName || userProfile.name || 'Friend',
                        applicantDept: userProfile.department || '',
                        status: 'pending'
                    });

                    alert(isZH ? '報名成功！請等待發起人確認。' : 'Request sent!');
                    document.getElementById('join-overlay').remove();
                    updateView();
                } else {
                    alert(isZH ? ("申請失敗：" + (result.message || "未知錯誤")) : ("Request failed: " + (result.message || "Unknown error")));
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = t('common.submit', '確認送出', 'Submit');
                }
            } catch (e) {
                console.error("Join Request Error:", e);
                alert(isZH ? "伺服器連線失敗。" : "Server connection failed.");
                btnSubmit.disabled = false;
                btnSubmit.innerText = t('common.submit', '確認送出', 'Submit');
            }
        };
    };

    window.updateHangoutStatus = async (postId, newStatus) => {
        const isZH = isAppZH();
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');

        const executeUpdate = async () => {
            const response = await fetch(`/update-hangout-status/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                if (window.refreshUserProfile) await window.refreshUserProfile();
                updateView();
            }
        };

        // Non-cancel: simple confirm
        if (newStatus !== 'cancelled') {
            if (!confirm(isZH ? "確定要執行此操作嗎？" : "Are you sure?")) return;
            try { await executeUpdate(); } catch (e) { }
            return;
        }

        // Cancel: check grace period
        let createdAt = null;
        try {
            const res = await fetch(`/hangouts`);
            const data = await res.json();
            const found = data.find(item => String(item.id) === String(postId));
            createdAt = found ? found.created_at : null;
        } catch (e) { console.warn('Could not fetch hangout created_at:', e); }

        if (createdAt) {
            const ageMs = Date.now() - new Date(createdAt).getTime();
            if (ageMs <= 10 * 60 * 1000) {
                const silentMsg = isZH ? "此活動剛建立不久，確定要取消嗎？" : "This event was just created. Are you sure you want to cancel?";
                if (!confirm(silentMsg)) return;
                try { await executeUpdate(); } catch (e) { }
                return;
            }
        }

        // > 10 min → Mandatory Feedback Modal
        const existingModal = document.getElementById('cancel-feedback-overlay');
        if (existingModal) existingModal.remove();

        const reasons = isZH ? [
            { value: 'schedule_conflict', label: '🗓️ 時間衝突 / 有其他安排' },
            { value: 'not_enough_people', label: '👥 人數不足 / 沒人報名' },
            { value: 'wrong_info', label: '📝 發佈資訊有誤' },
            { value: 'personal_reason', label: '🙋 個人原因' },
            { value: 'other', label: '💬 其他原因' }
        ] : [
            { value: 'schedule_conflict', label: '🗓️ Schedule Conflict' },
            { value: 'not_enough_people', label: '👥 Not Enough Participants' },
            { value: 'wrong_info', label: '📝 Posted Wrong Information' },
            { value: 'personal_reason', label: '🙋 Personal Reason' },
            { value: 'other', label: '💬 Other' }
        ];

        const reasonRadios = reasons.map(r => `<label><input type="radio" name="cancel-reason" value="${r.value}"><span>${r.label}</span></label>`).join('');

        const modalHtml = `
            <div class="cancel-feedback-overlay" id="cancel-feedback-overlay">
                <div class="cancel-feedback-modal">
                    <div class="cancel-warning-badge">⚠️ ${isZH ? '取消前必填' : 'Required Before Cancel'}</div>
                    <h3>${isZH ? '為什麼要取消此活動？' : 'Why are you canceling this event?'}</h3>
                    <p class="modal-subtitle">${isZH ? '請告訴我們取消原因。取消已有已核准參與者的活動，或在活動開始前最後 2 小時內取消，將扣除 2 點信用積分。' : 'Please tell us the reason. Canceling with accepted participants, or within 2 hours of start time, will result in a -2 point deduction.'}</p>
                    <div class="cancel-reason-group" id="cancel-reason-group">${reasonRadios}</div>
                    <textarea class="cancel-detail-textarea" id="cancel-detail-text" placeholder="${isZH ? '補充說明（選填）...' : 'Additional details (optional)...'}"></textarea>
                    <button class="cancel-submit-btn" id="cancel-submit-btn" disabled>${isZH ? '❌ 確認取消並送出' : '❌ Confirm Cancel & Submit'}</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const escHandler = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } };
        document.addEventListener('keydown', escHandler, true);

        const overlay = document.getElementById('cancel-feedback-overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) { e.preventDefault(); e.stopPropagation(); const modal = overlay.querySelector('.cancel-feedback-modal'); modal.style.animation = 'none'; requestAnimationFrame(() => { modal.style.animation = 'cancelModalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'; }); }
        });

        document.getElementById('cancel-reason-group').addEventListener('change', () => {
            document.getElementById('cancel-submit-btn').disabled = !document.querySelector('input[name="cancel-reason"]:checked');
        });

        document.getElementById('cancel-submit-btn').addEventListener('click', async () => {
            const selected = document.querySelector('input[name="cancel-reason"]:checked');
            if (!selected) return;
            const submitBtn = document.getElementById('cancel-submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = isZH ? '⏳ 處理中...' : '⏳ Processing...';
            try {
                await fetch('/api/v1/cancellation-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: postId, event_category: 'hangout', user_email: userProfile.email || '', action_type: 'cancel', reason: selected.value, detail: document.getElementById('cancel-detail-text').value || '' }) });
                await executeUpdate();
            } catch (error) {
                console.error("Cancel Error:", error);
                alert(isZH ? "❌ 發生錯誤，請稍後再試。" : "❌ An error occurred.");
                submitBtn.disabled = false;
                submitBtn.textContent = isZH ? '❌ 確認取消並送出' : '❌ Confirm Cancel & Submit';
            } finally { document.removeEventListener('keydown', escHandler, true); overlay?.remove(); }
        });
    };

    // Taruh di bagian bawah file travel.js (Hang Out)
    window.openHangoutChat = async (postId, title, hostEmail) => {
        try {
            const roomId = `hangout_${postId}`;

            // Lapor ke MySQL untuk bikin ruangan
            await fetch('/setup-chat-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: roomId,
                    post_id: postId,
                    room_type: 'hangout',
                    team_name: title,
                    participants: [
                        { id: hostEmail, name: 'Host', role: 'host' }
                    ]
                })
            });

            // Lempar ke messages.js
            window.navigateTo(`messages?room=${roomId}`);
        } catch (error) {
            console.error("Failed to setup chat:", error);
            alert("Connection to chat server failed.");
        }
    };


    // --- POPUP DETAIL ---
    window.showHangoutDetail = async (id) => {
        try {
            const response = await fetch('/hangouts');
            const data = await response.json();
            const p = data.find(item => String(item.id) === String(id));
            if (!p) return;

            const existingOverlay = document.getElementById('ho-detail-overlay');
            if (existingOverlay) existingOverlay.remove();

            const isZH = isAppZH();
            const dTime = new Date(p.event_time);
            const timeStr = isZH
                ? `${dTime.getFullYear()}-${(dTime.getMonth() + 1).toString().padStart(2, '0')}-${dTime.getDate().toString().padStart(2, '0')} ${dTime.getHours().toString().padStart(2, '0')}:${dTime.getMinutes().toString().padStart(2, '0')}`
                : `${dTime.toLocaleDateString()} ${dTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

            let catIcon = '✨';
            if (p.category === 'Food') catIcon = '🍽️';
            else if (p.category === 'Outdoor') catIcon = '🏕️';
            else if (p.category === 'Arts') catIcon = '🎨';
            else if (p.category === 'Entertainment') catIcon = '🍿';
            else if (p.category === 'Shopping') catIcon = '🛍️';
            else if (p.category === 'Sports') catIcon = '🏃';
            else if (p.category === 'Nightlife') catIcon = '🍻';

            let catLabel = p.category;
            if (isZH) {
                if (p.category === 'Food') catLabel = '聚餐/美食';
                else if (p.category === 'Outdoor') catLabel = '戶外/踏青';
                else if (p.category === 'Arts') catLabel = '藝文/展覽';
                else if (p.category === 'Entertainment') catLabel = '娛樂/電影';
                else if (p.category === 'Shopping') catLabel = '逛街/購物';
                else if (p.category === 'Nightlife') catLabel = '夜生活/酒吧';
                else if (p.category === 'Other') catLabel = '其他';
            }

            const mapRouteUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(p.meeting_location)}&daddr=${encodeURIComponent(p.destination)}&output=embed`;

            const modalHtml = `
                <div id="ho-detail-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; justify-content: center; z-index: 100000; animation: fadeIn 0.3s;">
                    <div style="background: white; width: 100%; max-width: 600px; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 25px; overflow-y: auto; position: relative; animation: slideUp 0.3s ease;">
                        <button onclick="document.getElementById('ho-detail-overlay').remove()" style="position: absolute; top: 15px; right: 15px; background: #eee; border: none; width: 30px; height: 30px; border-radius: 50%; font-weight: bold; cursor: pointer; color: #555;">X</button>
                        
                        <div style="display: inline-block; padding: 5px 12px; background: #FFF3E0; color: #FF9800; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 10px;">
                            ${catIcon} ${catLabel}
                        </div>
                        
                        <h2 style="margin: 0 0 5px 0; color: #333; font-size: 1.4rem;">${p.title}</h2>
                        
                        <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; border: 1px solid #eee; margin-top: 15px; margin-bottom: 20px;">
                            <div style="margin-bottom: 10px;"><strong>🕒 ${isZH ? '時間' : 'Time'}:</strong> ${timeStr}</div>
                            <div style="margin-bottom: 10px;"><strong>🤝 ${isZH ? '身分' : 'Meeting'}:</strong> <span style="color:#2196F3; font-weight:bold;">${p.meeting_location}</span></div>
                            <div style="margin-bottom: 10px;"><strong>📍 ${isZH ? '目的地' : 'Destination'}:</strong> <span style="color:#E65100; font-weight:bold;">${p.destination}</span></div>
                            <div><strong>👥 ${isZH ? '需要人數' : 'People Needed'}:</strong> <span style="color:#FF9800; font-weight:bold;">${p.people_needed}</span></div>
                        </div>

                        <div style="width: 100%; height: 200px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; background: #eee; margin-bottom: 20px;">
                            <iframe width="100%" height="100%" style="border:0" loading="lazy" allowfullscreen src="${mapRouteUrl}"></iframe>
                        </div>

                        <div style="background: #FFF9C4; border: 1px solid #FFE0B2; border-radius: 12px; padding: 15px;">
                            <div style="font-size: 0.8rem; color: #E65100; font-weight: bold; margin-bottom: 5px;">📝 ${isZH ? '詳細說明' : 'Notes'}</div>
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

    window.openGroupChat = (activityId) => {
        const userProfileStr = localStorage.getItem('userProfile');
        if (!userProfileStr) {
            alert(I18n.t('auth.err.login_required') || "Please login first!");
            return;
        }
        window.navigateTo(`messages?room=hangout_${activityId}`);
    };

    updateView();
};
