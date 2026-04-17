import { MockStore } from '../models/mockStore.js?v=12';
import api from '../utils/api.js';
import { I18n } from '../services/i18n.js';

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

// --- MESIN PENDAFTARAN CARPOOL ---
window.CarpoolAppEngine = {
    saveApp: (appData) => {
        const apps = JSON.parse(localStorage.getItem('joinup_carpool_apps') || '[]');
        appData.id = Date.now().toString();
        apps.push(appData);
        localStorage.setItem('joinup_carpool_apps', JSON.stringify(apps));
        return appData.id;
    },
    getApps: (postId) => {
        const apps = JSON.parse(localStorage.getItem('joinup_carpool_apps') || '[]');
        return apps.filter(a => String(a.postId) === String(postId));
    },
    updateApp: (appId, status) => {
        const apps = JSON.parse(localStorage.getItem('joinup_carpool_apps') || '[]');
        const index = apps.findIndex(a => String(a.id) === String(appId));
        if (index > -1) {
            apps[index].status = status;
            localStorage.setItem('joinup_carpool_apps', JSON.stringify(apps));
        }
    }
};

export const renderCarpool = () => {
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
        vehicleType: null,
        pickupLoc: null,
        dateRange: null,
        seatCount: null,
        priceRange: null
    };

    const renderLanding = () => {
        return `
            <div class="container fade-in" style="height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <span style="font-size: 3.5rem;">🚗</span>
                    <h1 style="color: var(--primary-dark); margin-top: 1rem;">${t('cp.title', '共乘', 'Carpool')}</h1>
                    <p style="color: var(--text-secondary);">${t('cp.sub', '一起搭車，省錢又環保！', 'Share a ride, save money, and go green!')}</p>
                </div>

                <div style="display: grid; gap: 1rem;">
                    <button id="btn-role-host" class="role-card" style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: none; border-left: 4px solid #FF8C00; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; transition: transform 0.2s;">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">🚙</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: var(--text-primary);">${t('cp.host.title', '我是發起人', 'Offer a Ride')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${t('cp.host.desc', '我有空位，尋找乘客', 'I have empty seats, looking for passengers')}</p>
                        </div>
                    </button>

                    <button id="btn-role-partner" class="role-card" style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: none; border-left: 4px solid #FFD600; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; transition: transform 0.2s;">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">🎒</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: var(--text-primary);">${t('cp.join.title', '我是夥伴', 'I am Partner')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${t('cp.join.desc', '尋找共乘', 'Looking for a ride')}</p>
                        </div>
                    </button>

                    <button id="btn-manage" class="btn" style="background: linear-gradient(135deg, #FFD600, #FF6D00); color: white; margin-top: 1rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 109, 0, 0.3); transition: transform 0.2s;">
                        ⚙️ ${t('common.manage', '管理我的活動', 'Manage My Activities')}
                    </button>
                </div>
                
                <button onclick="window.navigateTo('home')" style="position: absolute; top: 1rem; left: 1rem; background: none; border: none; font-size: 1.2rem; cursor: pointer; font-weight: bold; color: #555;">
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
                    <h2>${t('cp.create.title', '發佈共乘', 'Create Carpool')}</h2>
                </header>

                <form id="createCarpoolForm" style="background: var(--bg-card); padding: 20px; border-radius: 12px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);">
                    
                    <h3 style="margin-top: 0; margin-bottom: 0.5rem; color: #FF8C00; border-bottom: 2px solid #FFE0B2; padding-bottom: 0.5rem; font-size: 1.2rem;">🚙 詳細說明</h3>
                    <div style="color: #888; font-size: 12px; text-align: center; margin-bottom: 1.5rem;">⚠️ 本平台不對任何財務問題負責<br>(This platform is not responsible for any financial issues)</div>
                    
                    <div class="input-group">
                        <label>行程標題 * (Trip Title)</label>
                        <input type="text" id="cpTitle" placeholder="${isZH ? '例如: 週末返鄉、台中一日遊' : 'e.g. Weekend trip to Taichung'}" required>
                    </div>

                    <div class="input-group">
                        <label>交通工具 * (Vehicle Type)</label>
                        <select id="cpVehicle" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd;" required>
                            <option value="" disabled selected>請選擇...</option>
                            <option value="Taxi">🚕 ${isZH ? '計程車' : 'Taxi'}</option>
                            <option value="Uber">🚙 Uber</option>
                            <option value="Private">🚗 ${isZH ? '自家車' : 'Private'}</option>
                            <option value="Rental">🚐 ${isZH ? '租車' : 'Rental'}</option>
                            <option value="Scooter">🛵 ${isZH ? '機車' : 'Scooter'}</option>
                        </select>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>出發地 * (Departure)</label>
                            <select id="cpDepartSelect" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd;" required>
                                <option value="暨大校門口">暨大校門口 (Main Gate)</option>
                                <option value="宿舍">宿舍 (Dorms)</option>
                                <option value="埔里車站">埔里車站 (Puli Station)</option>
                                <option value="自訂">自訂... (Custom)</option>
                            </select>
                            <input type="text" id="cpDepartCustom" style="margin-top: 0.5rem; width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd; display: none;" placeholder="${isZH ? '請輸入出發地...' : 'Enter departure location...'}">
                        </div>
                        
                        <div class="input-group">
                            <label>目的地 * (Destination)</label>
                            <input type="text" id="cpDest" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>需要人數 * (Seats)</label>
                        <input type="number" id="cpSeats" min="2" max="10" value="4" required>
                    </div>

                    <div class="input-group">
                        <label>搭乘費用 * (Price)</label>
                        <input type="number" id="cpPrice" min="0" value="0" required>
                    </div>

                    <div class="input-group">
                        <label>出發時間 * (Departure Time)</label>
                        <input type="datetime-local" id="cpTime" required>
                    </div>

                    <div class="input-group">
                        <label>截止時間 * (Deadline)</label>
                        <input type="datetime-local" id="cpDeadline" required>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>發起人 * (Host)</label>
                            <input type="text" value="${user.displayName || user.name || ''}" readonly style="background: var(--bg-secondary); color: var(--text-secondary);">
                        </div>
                        <div class="input-group">
                            <label>系所 * (Dept)</label>
                            <input type="text" value="${user.department || user.major || ''}" readonly style="background: var(--bg-secondary); color: var(--text-secondary);">
                        </div>
                    </div>

                    <div class="input-group">
                        <label>備註 / 其他說明 (Notes)</label>
                        <textarea id="cpNotes" rows="3" placeholder="${isZH ? '例如: 自備零錢、可帶小行李等...' : 'e.g. Bring exact change, small luggage allowed...'}" style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #ddd;"></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 12px; font-size: 1.1rem; border-radius: 8px; background: linear-gradient(135deg, #FF8C00, #E65100); border: none; font-weight: bold; color: white; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 140, 0, 0.3);">
                        確認發佈 (Publish)
                    </button>
                </form>
            </div>
        `;
    };

    const renderFilterPanel = () => {
        const isZH = isAppZH();
        const txtFilterTitle = isZH ? '篩選共乘' : 'Filter Activities';
        const txtVehicle = isZH ? '車輛類型' : 'Vehicle';
        const txtPickup = isZH ? '出發地' : 'Pick-up';
        const txtPrice = isZH ? '費用' : 'Price';
        const txtDate = isZH ? '日期' : 'Date';
        const txtSeats = isZH ? '需要座位數' : 'People Needed';
        const txtClear = isZH ? '清除篩選' : 'Clear Filters';
        const txtConfirm = isZH ? '確認' : 'Confirm';

        const vehicles = [
            { id: 'Taxi', label: isZH ? '計程車' : 'Taxi' },
            { id: 'Uber', label: 'Uber' },
            { id: 'Private', label: isZH ? '自家車' : 'Private' },
            { id: 'Rental', label: isZH ? '租車' : 'Rental' }
        ];

        const pickups = [
            { id: 'Main Gate', label: isZH ? '暨大正門' : 'Main Gate' },
            { id: 'Dorms', label: isZH ? '宿舍' : 'Dorms' },
            { id: 'Puli Station', label: isZH ? '埔里車站' : 'Puli Station' },
            { id: 'Custom', label: isZH ? '其他 (自訂)' : 'Custom' }
        ];

        const prices = [
            { id: 'Free', label: isZH ? '免費' : 'Free' },
            { id: '50-250', label: '50 - 250' },
            { id: '250-500', label: '250 - 500' },
            { id: '500-1000', label: '500 - 1000' },
            { id: '>1000', label: isZH ? '大於 1000' : '> 1000' }
        ];

        let vehicleHtml = vehicles.map(v => {
            const isActive = activeFilters.vehicleType === v.id;
            return `<button class="filter-option" data-filter="vehicleType" data-value="${v.id}" style="padding: 0.6rem 1rem; border: 1px solid ${isActive ? '#FF8C00' : 'var(--border-color)'}; border-radius: 8px; background: ${isActive ? '#FFF3E0' : 'var(--bg-card)'}; color: ${isActive ? '#E65100' : 'var(--text-secondary)'}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer;">${v.label}</button>`;
        }).join('');

        let pickupHtml = pickups.map(p => {
            const isActive = activeFilters.pickupLoc === p.id;
            return `<button class="filter-option" data-filter="pickupLoc" data-value="${p.id}" style="padding: 0.6rem 1rem; border: 1px solid ${isActive ? '#FF8C00' : 'var(--border-color)'}; border-radius: 8px; background: ${isActive ? '#FFF3E0' : 'var(--bg-card)'}; color: ${isActive ? '#E65100' : 'var(--text-secondary)'}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer;">${p.label}</button>`;
        }).join('');

        let priceHtml = prices.map(p => {
            const isActive = activeFilters.priceRange === p.id;
            return `<button class="filter-option" data-filter="priceRange" data-value="${p.id}" style="padding: 0.6rem 1rem; border: 1px solid ${isActive ? '#FF8C00' : 'var(--border-color)'}; border-radius: 8px; background: ${isActive ? '#FFF3E0' : 'var(--bg-card)'}; color: ${isActive ? '#E65100' : 'var(--text-secondary)'}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer;">${p.label}</button>`;
        }).join('');

        return `
            <div id="filter-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: end; z-index: 1000;">
                <div style="background: var(--bg-card); width: 100%; border-radius: 16px 16px 0 0; padding: 1.5rem; max-height: 85vh; overflow-y: auto; animation: slideUp 0.3s ease-out; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                        <h3 style="color: #FF8C00; margin: 0;">${txtFilterTitle}</h3>
                        <button onclick="window.closeCarpoolFilter()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-primary);">×</button>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: #333;">${txtVehicle}</label>
                        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">${vehicleHtml}</div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: #333;">${txtPickup}</label>
                        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">${pickupHtml}</div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: #333;">${txtPrice}</label>
                        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">${priceHtml}</div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: #333;">${txtDate}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="filter-option" data-filter="dateRange" data-value="today" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.dateRange === 'today' ? '#FF8C00' : '#ddd'}; border-radius: 8px; background: ${activeFilters.dateRange === 'today' ? '#FFF3E0' : 'white'}; color: ${activeFilters.dateRange === 'today' ? '#E65100' : '#555'}; cursor: pointer;">${isZH ? '今天' : 'Today'}</button>
                            <button class="filter-option" data-filter="dateRange" data-value="week" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.dateRange === 'week' ? '#FF8C00' : '#ddd'}; border-radius: 8px; background: ${activeFilters.dateRange === 'week' ? '#FFF3E0' : 'white'}; color: ${activeFilters.dateRange === 'week' ? '#E65100' : '#555'}; cursor: pointer;">${isZH ? '一週內' : 'Within 1 Week'}</button>
                            <button class="filter-option" data-filter="dateRange" data-value="month" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.dateRange === 'month' ? '#FF8C00' : '#ddd'}; border-radius: 8px; background: ${activeFilters.dateRange === 'month' ? '#FFF3E0' : 'white'}; color: ${activeFilters.dateRange === 'month' ? '#E65100' : '#555'}; cursor: pointer;">${isZH ? '一個月內' : 'Within 1 Month'}</button>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: var(--text-primary);">${txtSeats}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            ${[1, 2, 3, 4].map(num => `
                                <button class="filter-option" data-filter="seatCount" data-value="${num}" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.seatCount === num ? '#FF8C00' : 'var(--border-color)'}; border-radius: 8px; background: ${activeFilters.seatCount === num ? '#FFF3E0' : 'var(--bg-card)'}; color: ${activeFilters.seatCount === num ? '#E65100' : 'var(--text-secondary)'}; cursor: pointer;">≤ ${num} ${isZH ? '人' : ''}</button>
                            `).join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button onclick="window.resetCarpoolFilters()" class="btn" style="flex: 1; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; font-weight: bold;">${txtClear}</button>
                        <button onclick="window.applyCarpoolFilters()" class="btn btn-primary" style="flex: 2; background: #FF8C00; border: none; color: white; padding: 12px; border-radius: 8px; font-weight: bold;">${txtConfirm}</button>
                    </div>
                </div>
            </div>
            <style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
        `;
    };

    const renderList = async () => {
        const isZH = isAppZH();
        const txtTitle = isZH ? '活動列表' : 'Activity List';
        const txtNoData = isZH ? '沒有符合的活動。' : 'No matching activities found.';
        const txtHost = isZH ? '發起人' : 'Host';
        const txtJoin = isZH ? '申請加入' : 'Join Ride';
        const txtJoinChat = isZH ? '進入聊天室' : 'Enter Chat Room';
        const txtFull = isZH ? '額滿' : 'Full';
        const txtHobbyLabel = isZH ? '興趣' : 'Hobby';

        let contentHtml = `<div style="text-align: center; padding: 2rem; color: #888;">⏳ ${t('common.loading', '載入中...', 'Loading...')}</div>`;

        const activeFilterCount = [
            activeFilters.vehicleType,
            activeFilters.pickupLoc,
            activeFilters.priceRange,
            activeFilters.dateRange,
            activeFilters.seatCount
        ].filter(Boolean).length;

        try {
            const response = await fetch(`/carpools?user_email=${encodeURIComponent(user.email)}`);
            const dbPosts = await response.json();
            const allUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
            
            let myStatuses = {};
            if (user && user.email) {
                try {
                    const statusRes = await fetch(`/api/v1/join/my-statuses?user_email=${encodeURIComponent(user.email)}`);
                    const statusData = await statusRes.json();
                    if (statusData.success) myStatuses = statusData.data || {};
                } catch (e) { console.warn("Fail fetch statuses", e); }
            }

            let availablePosts = dbPosts.filter(p => {
                if (p.status === 'cancelled' || p.status === 'success' || p.status === 'expired') return false;
                const dTime = new Date(p.deadline || p.departure_time);
                if (dTime < new Date()) return false;

                return true;
            });

            if (activeFilters.searchQuery) {
                const q = activeFilters.searchQuery.toLowerCase();
                availablePosts = availablePosts.filter(p =>
                    (p.title && p.title.toLowerCase().includes(q)) ||
                    p.departure_loc.toLowerCase().includes(q) ||
                    p.destination_loc.toLowerCase().includes(q)
                );
            }
            if (activeFilters.vehicleType) {
                availablePosts = availablePosts.filter(p => p.vehicle_type === activeFilters.vehicleType);
            }
            if (activeFilters.pickupLoc) {
                if (activeFilters.pickupLoc === 'Custom') {
                    availablePosts = availablePosts.filter(p => {
                        const loc = p.departure_loc.toLowerCase();
                        return !loc.includes('main gate') && !loc.includes('正門') &&
                            !loc.includes('dorm') && !loc.includes('宿舍') &&
                            !loc.includes('puli station') && !loc.includes('埔里');
                    });
                } else {
                    const terms = activeFilters.pickupLoc === 'Main Gate' ? ['main gate', '正門', '暨大校門口'] :
                        activeFilters.pickupLoc === 'Dorms' ? ['dorm', '宿舍'] :
                            ['puli station', '埔里車站', 'puli'];
                    availablePosts = availablePosts.filter(p => terms.some(t => p.departure_loc.toLowerCase().includes(t)));
                }
            }
            if (activeFilters.priceRange) {
                availablePosts = availablePosts.filter(p => {
                    const pStr = String(p.price).toLowerCase();
                    let numPrice = 0;

                    if (pStr.includes('free') || pStr.includes('免') || pStr.includes('0')) {
                        numPrice = 0;
                    } else {
                        const match = pStr.match(/\d+/);
                        if (match) numPrice = parseInt(match[0], 10);
                        else numPrice = -1;
                    }

                    if (activeFilters.priceRange === 'Free') return numPrice === 0;
                    if (activeFilters.priceRange === '50-250') return numPrice >= 50 && numPrice <= 250;
                    if (activeFilters.priceRange === '250-500') return numPrice > 250 && numPrice <= 500;
                    if (activeFilters.priceRange === '500-1000') return numPrice > 500 && numPrice <= 1000;
                    if (activeFilters.priceRange === '>1000') return numPrice > 1000;
                    return true;
                });
            }
            if (activeFilters.dateRange) {
                const targetDate = new Date();
                if (activeFilters.dateRange === 'today') {
                    targetDate.setHours(23, 59, 59, 999);
                    availablePosts = availablePosts.filter(p => new Date(p.departure_time) <= targetDate);
                } else if (activeFilters.dateRange === 'week') {
                    targetDate.setDate(targetDate.getDate() + 7);
                    availablePosts = availablePosts.filter(p => new Date(p.departure_time) <= targetDate);
                } else if (activeFilters.dateRange === 'month') {
                    targetDate.setMonth(targetDate.getMonth() + 1);
                    availablePosts = availablePosts.filter(p => new Date(p.departure_time) <= targetDate);
                }
            }

            if (availablePosts.length > 0) {
                contentHtml = availablePosts.map(p => {
                    const apps = window.CarpoolAppEngine.getApps(p.id) || [];
                    const acceptedApps = apps.filter(a => a.status === 'accepted');
                    const participantCount = acceptedApps.length;
                    const availableNow = p.available_seats - participantCount;


                    // The post shouldn't be full here because of the above filter, but just in case
                    const isFull = availableNow <= 0;
                    const dTime = new Date(p.departure_time);
                    const timeStr = isZH
                        ? `${dTime.getFullYear()}-${(dTime.getMonth() + 1).toString().padStart(2, '0')}-${dTime.getDate().toString().padStart(2, '0')} ${dTime.getHours().toString().padStart(2, '0')}:${dTime.getMinutes().toString().padStart(2, '0')}`
                        : `${(dTime.getMonth() + 1).toString().padStart(2, '0')}/${dTime.getDate().toString().padStart(2, '0')}/${dTime.getFullYear()} ${dTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

                    let vIcon = '🚗';
                    if (p.vehicle_type === 'Taxi') vIcon = '🚕';
                    else if (p.vehicle_type === 'Uber') vIcon = '🚙';
                    else if (p.vehicle_type === 'Rental') vIcon = '🚐';
                    else if (p.vehicle_type === 'Scooter') vIcon = '🛵';

                    const isHost = (p.host_email === user.email);
                    const cpDisplayTitle = p.title ? p.title : `${p.departure_loc} ➔ ${p.destination_loc}`;

                    let hostData = null;
                    if (window.MockStore && window.MockStore.getUser) hostData = window.MockStore.getUser(p.host_email);
                    if (!hostData) hostData = allUsers.find(u => u.email === p.host_email);

                    const hostAvatar = hostData?.profile_pic || hostData?.profilePic || hostData?.avatar || hostData?.picture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                    const studyYear = hostData?.study_year || hostData?.studyYear || '';
                    const hostHobby = hostData?.hobby || hostData?.hobbies || '';

                    const statusKey = `carpool_${p.id}`;
                    const userStatus = myStatuses[statusKey];
                    const isParticipant = userStatus === 'approved' || userStatus === 'accepted';

                    let actionBtn = '';
                    if (isHost || isParticipant) {
                        actionBtn = `<button class="btn" onclick="event.stopPropagation(); window.openGroupChat('${p.id}');">💬 ${txtJoinChat}</button>`;
                    } else if (isFull || p.status === 'full') {
                        actionBtn = `<button class="btn btn-full" disabled style="width: 100%; padding: 0.7rem; font-weight: bold; border: none; color: white; border-radius: 8px; cursor: not-allowed; font-size: 0.95rem;">${txtFull}</button>`;
                    } else {
                        actionBtn = `<button class="btn join-btn" onclick="event.stopPropagation(); window.openCarpoolJoinForm('${p.id}', '${cpDisplayTitle}')" style="width: 100%; padding: 0.7rem; font-weight: bold; background: linear-gradient(135deg, #FF8C00, #E65100); border: none; color: white; border-radius: 8px; cursor: pointer; transition: transform 0.2s; font-size: 0.95rem; box-shadow: 0 2px 5px rgba(255, 140, 0, 0.3);">${txtJoin}</button>`;
                    }

                    return `
                        <div class="card carpool-card" onclick="window.showCarpoolDetail('${p.id}')" style="cursor: pointer; ${(isFull || p.status === 'full') ? 'opacity: 0.8;' : ''} margin-bottom: 1.5rem; border-radius: 12px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); padding: 1.2rem; transition: transform 0.2s; background: var(--bg-card);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <img src="${hostAvatar}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">
                                    <div>
                                        <div style="font-weight: bold; color: var(--text-primary); font-size: 1rem;">${p.host_name}</div>
                                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">🎓 ${p.host_dept} ${studyYear ? `(Year ${studyYear})` : ''}</div>
                                        ${hostHobby ? `<div style="font-size: 0.75rem; color: #2196F3; margin-top: 4px;">🎯 ${txtHobbyLabel}: ${hostHobby}</div>` : ''}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="background: #FFF3E0; color: #E65100; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: bold; margin-bottom: 5px;">${vIcon} ${p.vehicle_type}</div>
                                    <div style="font-size: 1.1rem; color: #E65100; font-weight: bold;">💰 ${p.price}</div>
                                </div>
                            </div>
                            
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.15rem; color: var(--text-primary);">${cpDisplayTitle}</h3>
                            <div style="font-size: 0.9rem; color: #2196F3; font-weight: bold; margin-bottom: 1rem;">📍 ${p.departure_loc} ➔ ${p.destination_loc}</div>
                            
                            <div style="background: var(--bg-secondary); padding: 10px; border-radius: 8px; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px; display: flex; justify-content: space-between;">
                                <div><strong>🕒 ${isZH ? '時間' : 'Time'}:</strong> <br>${timeStr}</div>
                                <div style="text-align: right;"><strong>💺 ${isZH ? '人數' : 'People'}:</strong> <br><span style="color: #FF8C00; font-size: 1.1rem; font-weight: bold;">${participantCount} / ${p.available_seats}</span></div>
                            </div>
                            <div style="margin-top: 0.5rem; margin-bottom: 10px;">${(isFull || p.status === 'full') ? `<span style="font-size: 0.8rem; color: #f57c00; background: #fff3e0; padding: 4px 8px; border-radius: 10px;">${txtFull}</span>` : ''}</div>
                            ${actionBtn}
                        </div>
                    `;
                }).join('');

                if (contentHtml.trim() === '') {
                    contentHtml = `
                        <div style="text-align: center; padding: 3rem 1rem; color: #888;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                            <p>${txtNoData}</p>
                            <button onclick="window.resetCarpoolFilters()" style="margin-top: 1rem; background: #FFB300; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">${isZH ? '清除篩選' : 'Clear Filters'}</button>
                        </div>
                    `;
                }

            } else {
                contentHtml = `<div style="text-align: center; padding: 3rem 1rem; color: #888;"><div style="font-size: 3rem; margin-bottom: 1rem;">🚷</div>${txtNoData}</div>`;
            }
        } catch (error) {
            contentHtml = `<div style="text-align: center; padding: 2rem; color: red;">Error connecting to server.</div>`;
        }

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center;">
                        <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                        <h2 style="margin: 0; color: #FF8C00; font-size: 1.3rem;">${txtTitle}</h2>
                    </div>
                    
                    <button id="btn-cp-filter" style="background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 15px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 5px; position: relative;">
                        🔍 ${isZH ? '篩選' : 'Filter'}
                        ${activeFilterCount > 0 ? `<span style="position: absolute; top: -5px; right: -5px; background: #F44336; color: white; font-size: 0.6rem; padding: 2px 6px; border-radius: 10px; font-weight: bold;">${activeFilterCount}</span>` : ''}
                    </button>
                </header>

                <div style="display: flex; gap: 10px; margin-bottom: 1.5rem;">
                    <div style="flex: 1; position: relative;">
                        <input type="text" id="cpSearchInput" placeholder="${isZH ? '搜尋標題/地點...' : 'Search title/locations...'}" value="${activeFilters.searchQuery}" style="width: 100%; padding: 12px 20px; border-radius: 30px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); outline: none; padding-right: 40px; font-size: 0.95rem;">
                        <span id="btn-cp-search" style="position: absolute; right: 15px; top: 12px; cursor: pointer;">🔍</span>
                    </div>
                </div>

                <div class="post-list">
                    ${contentHtml}
                </div>
            </div>
            <style>
                .carpool-card:hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0,0,0,0.1) !important; }
                .chat-btn:hover { background: linear-gradient(135deg, #1976D2, #1565C0) !important; }
                .join-btn:hover { background: linear-gradient(135deg, #E65100, #EF6C00) !important; }
            </style>
        `;
    };

    const renderManage = async () => {
        let myPosts = [];
        try {
            const response = await fetch('/my-carpools/' + user.email);
            myPosts = await response.json();
        } catch (error) { }

        const isZH = isAppZH();
        const txtManageTitle = t('common.manage', '管理我的活動', 'Manage My Events');
        const txtNoData = t('cp.nodata_manage', '尚未建立任何活動。', 'No events created yet.');
        const txtCreateBtn = t('cp.btn.create', '+ 建立新共乘', '+ Create New Ride');

        const postsHtmlArray = await Promise.all(myPosts.map(async p => {
            let pendingApps = [];
            let acceptedApps = [];

            // 1. Fetch from Server (Source of Truth)
            try {
                const data = await api.fetch(`/api/v1/host/participants?event_type=carpool&event_id=${p.id}&host_email=${user.email}`, { idempotency: false });
                if (data.success && data.data) {
                    pendingApps = data.data.filter(a => a.status === 'pending');
                    acceptedApps = data.data.filter(a => a.status === 'approved' || a.status === 'accepted');
                }
            } catch (e) { console.warn("Failed to fetch server participants.", e); }

            // 2. Legacy Fallback
            if (pendingApps.length === 0 && acceptedApps.length === 0) {
                const legacyApps = window.CarpoolAppEngine.getApps(p.id) || [];
                pendingApps = legacyApps.filter(a => a.status === 'pending');
                acceptedApps = legacyApps.filter(a => a.status === 'accepted');
            }

            const actualParticipants = acceptedApps.filter(app => {
                const email = app.user_email || app.user_id || app.applicantId;
                return email !== p.host_email && email !== user.email;
            });
            const participantCount = 1 + actualParticipants.length;

            let statusBadge = '';
            if (p.status === 'open') statusBadge = `<span style="font-size: 0.8rem; color: #4CAF50; border: 1px solid #4CAF50; padding: 4px 10px; border-radius: 20px; font-weight: bold;">🟢 ${t('cp.stat.open', '狀態: 招募中', 'Status: OK')}</span>`;
            else if (p.status === 'paused') statusBadge = `<span style="font-size: 0.8rem; color: #ff9800; border: 1px solid #ff9800; padding: 4px 10px; border-radius: 20px; font-weight: bold;">⏸️ ${t('common.paused', '暫停招募', 'Paused')}</span>`;
            else if (p.status === 'success') statusBadge = `<span style="font-size: 0.8rem; color: #2196f3; border: 1px solid #2196f3; padding: 4px 10px; border-radius: 20px; font-weight: bold;">🎉 ${t('common.success', '已成案', 'Success')}</span>`;
            else statusBadge = `<span style="font-size: 0.8rem; color: #f44336; border: 1px solid #f44336; padding: 4px 10px; border-radius: 20px; font-weight: bold;">✗ ${t('common.cancel', '已取消', 'Cancelled')}</span>`;

            let appsHtml = '';
            if (pendingApps.length > 0) {
                appsHtml += `<div style="font-size: 0.85rem; font-weight: bold; color: #FF9800; margin-top: 15px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #FFE0B2;">⏳ ${t('cp.pending', '待確認:', 'Pending Confirmation:')}:</div>`;
                appsHtml += pendingApps.map(app => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee;">
                        <span style="font-size: 0.9rem; color: #333; font-weight: bold;">${app.snapshot_display_name || app.applicantName}</span>
                        <button onclick="window.showReviewApplicationModal('${app.id}', '${p.id}', '${app.user_email || app.user_id || app.applicantId}', '${(p.title || (p.departure_loc + ' ➔ ' + p.destination_loc)).replace(/'/g, "\\'").replace(/"/g, '&quot;')}', 'carpool', null)" style="background: #2196F3; color: white; border: none; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: bold;">👤 ${isZH ? '查看申請' : 'Review'}</button>
                    </div>
                `).join('');
            }
            if (acceptedApps.length > 0) {
                appsHtml += `<div style="font-size: 0.85rem; font-weight: bold; color: #4caf50; margin-top: 15px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #c8e6c9;">✅ ${isZH ? '已加入:' : 'Joined:'}</div>`;
                appsHtml += acceptedApps.map(app => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee;">
                        <span style="font-size: 0.9rem; color: #333; font-weight: bold;">${app.snapshot_display_name || app.applicantName}</span>
                        <span style="font-size: 0.8rem; color: #4caf50; font-weight: bold;">✓ ${isZH ? '已在前座' : 'Joined'}</span>
                    </div>
                `).join('');
            }
            if (!appsHtml) appsHtml = `<div style="text-align: center; color: #999; padding: 10px; font-size: 0.9rem;">${isZH ? '目前沒有申請' : 'No applications yet.'}</div>`;

            const cpTitle = p.title || `${p.departure_loc} ➔ ${p.destination_loc}`;
            const dTime = new Date(p.departure_time);
            const dateStr = isZH ? `${dTime.getFullYear()}/${(dTime.getMonth() + 1)}/${dTime.getDate()}` : `${(dTime.getMonth() + 1)}/${dTime.getDate()}/${dTime.getFullYear()}`;

            return `
                <div class="card" style="${p.status === 'cancelled' || p.status === 'expired' ? 'opacity: 0.6;' : ''} margin-bottom: 1.5rem; border-radius: 12px; background: var(--bg-card); padding: 20px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-primary);">${cpTitle}</h3>
                        ${statusBadge}
                    </div>
                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 20px;">🗓️ ${dateStr}</div>
                    
                    <div style="background: #fdfdfd; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-weight: bold; color: #333; font-size: 0.95rem; margin-bottom: 10px;">👥 ${t('cp.passengers', '乘客名單', 'Participants')} (${participantCount}/${p.available_seats})</div>
                        ${appsHtml}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button onclick="window.navigateTo('messages?room=carpool_${p.id}')" style="width: 100%; padding: 12px; border-radius: 8px; background: #1976D2; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">💬 ${t('cp.chat', '進入聊天室', 'Enter Chat Room')}</button>

                        ${p.status === 'open' ? `
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'paused')" style="width: 100%; padding: 12px; border-radius: 8px; background: #FF9800; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">⏸️ ${t('common.pause', '暫停招募', 'Pause Recruiting')}</button>
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'success')" style="width: 100%; padding: 12px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">✓ ${t('common.success', '成案', 'Success')}</button>
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'cancelled')" style="width: 100%; padding: 12px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">${t('common.cancel', '取消', 'Cancel')}</button>
                        ` : p.status === 'paused' ? `
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'open')" style="width: 100%; padding: 12px; border-radius: 8px; background: #FFC107; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">▶️ ${t('common.resume', '繼續招募', 'Resume Recruiting')}</button>
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'success')" style="width: 100%; padding: 12px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">✓ ${t('common.success', '成案', 'Success')}</button>
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'cancelled')" style="width: 100%; padding: 12px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">${t('common.cancel', '取消', 'Cancel')}</button>
                            ` : p.status === 'success' ? `
                            <button onclick="window.openRatingModal({ id: '${p.id}', title: '${(p.title || (p.departure_loc + ' ➔ ' + p.destination_loc)).replace(/'/g, "\\'")}', category: 'carpool' })" style="width: 100%; padding: 12px; border-radius: 8px; background: linear-gradient(135deg, #FFB300, #FF8C00); color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; margin-top: 8px; box-shadow: 0 2px 6px rgba(255, 140, 0, 0.3);">⭐ 給予評價 (Rate Event)</button>
                        ` : ''}
                        <button onclick="window.deletePost('${p.id}', 'carpool')" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); font-weight: bold; cursor: pointer; font-size: 1rem; margin-top: 5px;">${isZH ? '🗑️ 刪除' : '🗑️ Delete'}</button>
                    </div>
                </div>
            `;
        }));

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2>⚙️ ${txtManageTitle}</h2>
                </header>

                ${myPosts.length > 0 ? `
                    <section style="margin-bottom: 2rem;">
                        ${postsHtmlArray.join('')}
                    </section>
                ` : `
                    <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🚙</div>
                        <p>${txtNoData}</p>
                        <button onclick="window.setState('create', 'host')" class="btn btn-primary" style="margin-top: 1rem; background: linear-gradient(135deg, #FF8C00, #E65100); border: none; box-shadow: 0 2px 5px rgba(255, 140, 0, 0.3);">${txtCreateBtn}</button>
                    </div>
                `}
            </div>
        `;
    };

    const updateView = async () => {
        if (currentState === 'landing') {
            app.innerHTML = renderLanding();
            bindLandingListeners();
        } else if (currentState === 'create') {
            app.innerHTML = renderCreateForm();
            bindCreateListeners();
        } else if (currentState === 'list') {
            app.innerHTML = await renderList();
            bindListListeners();
        } else if (currentState === 'manage') {
            app.innerHTML = await renderManage();
            bindManageListeners();
        }
    };

    const bindLandingListeners = () => {
        document.getElementById('btn-role-host')?.addEventListener('click', () => { currentState = 'create'; updateView(); });
        document.getElementById('btn-role-partner')?.addEventListener('click', () => { currentState = 'list'; updateView(); });
        document.getElementById('btn-manage')?.addEventListener('click', () => { currentState = 'manage'; updateView(); });
    };

    const bindCreateListeners = () => {
        document.querySelector('.btn-back')?.addEventListener('click', () => { currentState = 'landing'; updateView(); });

        const deptSelect = document.getElementById('cpDepartSelect');
        const deptCustom = document.getElementById('cpDepartCustom');
        deptSelect?.addEventListener('change', () => {
            if (deptSelect.value === '自訂') {
                deptCustom.style.display = 'block';
                deptCustom.required = true;
            } else {
                deptCustom.style.display = 'none';
                deptCustom.required = false;
            }
        });

        document.getElementById('createCarpoolForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            const oriText = btnSubmit.innerText;
            btnSubmit.innerText = "⏳..."; btnSubmit.disabled = true;

            try {
                const rawTime = document.getElementById('cpTime').value;
                const formattedTime = rawTime ? rawTime.replace('T', ' ') + ':00' : null;

                const rawDeadline = document.getElementById('cpDeadline').value;
                const formattedDeadline = rawDeadline ? rawDeadline.replace('T', ' ') + ':00' : null;

                const finalDepart = deptSelect.value === '自訂' ? deptCustom.value : deptSelect.value;

                const response = await fetch('/create-carpool', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        host_email: user.email || 'unknown@email.com',
                        host_name: user.displayName || user.name || 'Host',
                        host_dept: user.department || user.major || 'N/A',
                        title: document.getElementById('cpTitle').value || 'Carpool Trip',
                        departure_loc: finalDepart,
                        destination_loc: document.getElementById('cpDest').value,
                        departure_time: formattedTime,
                        deadline: formattedDeadline,
                        available_seats: parseInt(document.getElementById('cpSeats').value) || 1,
                        price: document.getElementById('cpPrice').value || '0',
                        vehicle_type: document.getElementById('cpVehicle').value || 'Car',
                        description: document.getElementById('cpNotes').value || ''
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    if (window.refreshUserProfile) await window.refreshUserProfile();
                    alert(t('cp.alert.ok', "發佈成功！ 🎉", "Success! 🎉"));
                    currentState = 'manage';
                    updateView();
                } else {
                    const errorMsg = result.fields ? `${result.error}: ${result.fields.join(', ')}` : result.error;
                    alert("⚠️ " + t('cp.alert.err1', "資料庫錯誤：", "Database error: ") + (errorMsg || "Unknown"));
                }
            } catch (err) {
                alert("❌ " + t('cp.alert.err2', "連線失敗！請檢查伺服器是否運行。", "Connection failed!") + ": " + err.message);
            }
            finally { btnSubmit.innerText = oriText; btnSubmit.disabled = false; }
        });
    };

    const bindListListeners = () => {
        document.querySelector('.btn-back')?.addEventListener('click', () => { currentState = 'landing'; updateView(); });

        document.getElementById('btn-cp-filter')?.addEventListener('click', () => {
            const existingOverlay = document.getElementById('filter-overlay');
            if (existingOverlay) existingOverlay.remove();
            app.insertAdjacentHTML('beforeend', renderFilterPanel());
            bindFilterOptions();
        });

        const searchInput = document.getElementById('cpSearchInput');
        const triggerSearch = () => {
            activeFilters.searchQuery = searchInput.value;
            updateView();
        };
        document.getElementById('btn-cp-search')?.addEventListener('click', triggerSearch);
        searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') triggerSearch(); });
    };

    const bindFilterOptions = () => {
        document.querySelectorAll('.filter-option').forEach(btn => {
            btn.addEventListener('click', function () {
                const filterType = this.getAttribute('data-filter');
                const value = this.getAttribute('data-value');

                if (activeFilters[filterType] === value || (filterType === 'seatCount' && activeFilters[filterType] === parseInt(value))) {
                    activeFilters[filterType] = null;
                } else {
                    activeFilters[filterType] = filterType === 'seatCount' ? parseInt(value) : value;
                }
                const filterOverlay = document.getElementById('filter-overlay');
                if (filterOverlay) {
                    filterOverlay.outerHTML = renderFilterPanel();
                    bindFilterOptions();
                }
            });
        });
    };

    window.closeCarpoolFilter = () => {
        const overlay = document.getElementById('filter-overlay');
        if (overlay) overlay.remove();
    };

    window.resetCarpoolFilters = () => {
        activeFilters = { searchQuery: '', vehicleType: null, pickupLoc: null, dateRange: null, seatCount: null, priceRange: null };
        window.closeCarpoolFilter();
        updateView();
    };

    window.applyCarpoolFilters = () => {
        window.closeCarpoolFilter();
        updateView();
    };

    const bindManageListeners = () => {
        document.querySelector('.btn-back')?.addEventListener('click', () => { currentState = 'landing'; updateView(); });
    };

    window.setState = (state, role) => {
        currentState = state;
        updateView();
    };

    window.updateCarpoolStatus = async (postId, newStatus) => {
        const isZH = isAppZH();
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');

        // --- Helper: Execute the actual status update ---
        const executeUpdate = async () => {
            const response = await fetch(`/update-carpool-status/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                if (window.refreshUserProfile) await window.refreshUserProfile();
                updateView();
            } else {
                alert(t('cp.fail.stat', "更新失敗。", "Failed to update."));
            }
        };

        // --- For non-cancel statuses, use simple confirm ---
        if (newStatus !== 'cancelled') {
            const msgConfirm = t('cp.confirm.stat', `確定要更改狀態為 ${newStatus} 嗎？`, `Change status to ${newStatus}?`);
            if (!confirm(msgConfirm)) return;
            try { await executeUpdate(); }
            catch (error) { alert("Error server."); }
            return;
        }

        // --- CANCEL FLOW: Apply 10-minute grace period ---
        let createdAt = null;
        try {
            const res = await fetch(`/carpool/${postId}`);
            const data = await res.json();
            createdAt = data.created_at || null;
        } catch (e) {
            console.warn('Could not fetch carpool created_at:', e);
        }

        if (createdAt) {
            const ageMs = Date.now() - new Date(createdAt).getTime();
            const GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes

            if (ageMs <= GRACE_PERIOD_MS) {
                // Within grace period → Silent cancel
                const silentMsg = isZH
                    ? "此共乘剛建立不久，確定要取消嗎？"
                    : "This ride was just created. Are you sure you want to cancel?";
                if (!confirm(silentMsg)) return;
                try { await executeUpdate(); }
                catch (error) { alert("Error server."); }
                return;
            }
        }

        // --- > 10 minutes → Show Mandatory Feedback Modal ---
        const existingModal = document.getElementById('cancel-feedback-overlay');
        if (existingModal) existingModal.remove();

        const reasons = isZH ? [
            { value: 'schedule_conflict', label: '🗓️ 時間衝突 / 有其他安排' },
            { value: 'not_enough_people', label: '👥 人數不足 / 沒人報名' },
            { value: 'wrong_info', label: '📝 發佈資訊有誤' },
            { value: 'vehicle_issue', label: '🚗 車輛問題 / 無法出車' },
            { value: 'personal_reason', label: '🙋 個人原因' },
            { value: 'other', label: '💬 其他原因' }
        ] : [
            { value: 'schedule_conflict', label: '🗓️ Schedule Conflict' },
            { value: 'not_enough_people', label: '👥 Not Enough Passengers' },
            { value: 'wrong_info', label: '📝 Posted Wrong Information' },
            { value: 'vehicle_issue', label: '🚗 Vehicle Issue / Can\'t Drive' },
            { value: 'personal_reason', label: '🙋 Personal Reason' },
            { value: 'other', label: '💬 Other' }
        ];

        const reasonRadios = reasons.map(r => `
            <label>
                <input type="radio" name="cancel-reason" value="${r.value}">
                <span>${r.label}</span>
            </label>
        `).join('');

        const modalHtml = `
            <div class="cancel-feedback-overlay" id="cancel-feedback-overlay">
                <div class="cancel-feedback-modal">
                    <div class="cancel-warning-badge">⚠️ ${isZH ? '取消前必填' : 'Required Before Cancel'}</div>
                    <h3>${isZH ? '為什麼要取消此共乘？' : 'Why are you canceling this ride?'}</h3>
                    <p class="modal-subtitle">${isZH 
                        ? '請告訴我們取消原因。取消已有已核准參與者的活動，或在活動開始前最後 2 小時內取消，將扣除 2 點信用積分。' 
                        : 'Please tell us the reason. Canceling with accepted participants, or within 2 hours of start time, will result in a -2 point deduction.'}</p>
                    
                    <div class="cancel-reason-group" id="cancel-reason-group">
                        ${reasonRadios}
                    </div>

                    <textarea class="cancel-detail-textarea" id="cancel-detail-text" placeholder="${isZH ? '補充說明（選填）...' : 'Additional details (optional)...'}"></textarea>

                    <button class="cancel-submit-btn" id="cancel-submit-btn" disabled>
                        ${isZH ? '❌ 確認取消並送出' : '❌ Confirm Cancel & Submit'}
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // --- Block Escape key ---
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        document.addEventListener('keydown', escHandler, true);

        // --- Block overlay click ---
        const overlay = document.getElementById('cancel-feedback-overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                e.preventDefault();
                e.stopPropagation();
                const modal = overlay.querySelector('.cancel-feedback-modal');
                modal.style.animation = 'none';
                requestAnimationFrame(() => {
                    modal.style.animation = 'cancelModalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
                });
            }
        });

        // --- Enable submit when a reason is selected ---
        const radioGroup = document.getElementById('cancel-reason-group');
        const submitBtn = document.getElementById('cancel-submit-btn');

        radioGroup.addEventListener('change', () => {
            const selected = document.querySelector('input[name="cancel-reason"]:checked');
            submitBtn.disabled = !selected;
        });

        // --- Submit handler ---
        submitBtn.addEventListener('click', async () => {
            const selected = document.querySelector('input[name="cancel-reason"]:checked');
            if (!selected) return;

            submitBtn.disabled = true;
            submitBtn.textContent = isZH ? '⏳ 處理中...' : '⏳ Processing...';

            try {
                // 1. Save feedback
                await fetch('/api/v1/cancellation-feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event_id: postId,
                        event_category: 'carpool',
                        user_email: userProfile.email || '',
                        action_type: 'cancel',
                        reason: selected.value,
                        detail: document.getElementById('cancel-detail-text').value || ''
                    })
                });

                // 2. Execute cancel
                await executeUpdate();
            } catch (error) {
                console.error("Cancel Error:", error);
                alert(isZH ? "❌ 發生錯誤，請稍後再試。" : "❌ An error occurred. Please try again later.");
                submitBtn.disabled = false;
                submitBtn.textContent = isZH ? '❌ 確認取消並送出' : '❌ Confirm Cancel & Submit';
            } finally {
                document.removeEventListener('keydown', escHandler, true);
                overlay?.remove();
            }
        });
    };

    // HANDLED GLOBALLY IN app.js (window.handleReviewAction)

    updateView();
};

window.openCarpoolJoinForm = async (postId, teamName) => {
    const isZH = isAppZH();

    const msgConfirm = t('cp.join.confirm', '確認申請共乘', 'Confirm Ride Request');
    const msgDesc = t('cp.join.ask', `您確定要申請搭乘 <strong>${teamName}</strong> 嗎？車主將會收到您的申請。`, `Request to join the ride <strong>${teamName}</strong>? The host will be notified.`);
    const txtFinancial = t('common.finance', '本平台不對任何財務問題負責', 'This platform is not responsible for any financial issues');

    const formHtml = `
        <div id="join-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);">
            <div style="background: white; width: 85%; max-width: 350px; border-radius: 16px; padding: 2rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: scaleIn 0.2s ease-out;">
                <h3 style="margin: 0 0 1rem 0; color: #333;">${msgConfirm}</h3>
                <p style="color: #666; margin-bottom: 1.5rem; line-height: 1.5;">${msgDesc}</p>
                <div style="color: #888888; font-size: 11px; text-align: center; margin-bottom: 1.5rem; border-top: 1px dashed #eee; padding-top: 10px;">⚠️ ${txtFinancial}</div>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="document.getElementById('join-overlay').remove()" class="btn" style="flex: 1; padding: 0.8rem; background: #eee; color: #555; border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                        ${t('common.cancel', '取消', 'Cancel')}
                    </button>
                    <button id="btn-confirm-join" class="btn btn-primary" style="flex: 1; padding: 0.8rem; background: linear-gradient(135deg, #FF8C00, #E65100); color: white; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; box-shadow: 0 2px 5px rgba(255, 140, 0, 0.3);">
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
                body: { event_type: 'carpool', event_id: postId, user_email: userProfile.email }
            });

            if (result.success) {
                // 2. Legacy Local Fallback
                window.CarpoolAppEngine.saveApp({
                    postId: postId,
                    applicantId: userProfile.email,
                    applicantName: userProfile.displayName || userProfile.name || 'Passenger',
                    applicantDept: userProfile.department || '',
                    status: 'pending'
                });

                alert(t('cp.alert.sent', '申請已送出！請等待車主確認。', 'Request sent! Please wait for host confirmation.'));
                document.getElementById('join-overlay').remove();
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


/// --- FITUR POP-UP DETAIL CARPOOL DENGAN GOOGLE MAPS ---
window.showCarpoolDetail = async (id) => {
    try {
        const response = await fetch('/carpools');
        const data = await response.json();
        const p = data.find(item => String(item.id) === String(id));

        if (!p) return alert("Data not found!");

        const existingOverlay = document.getElementById('carpool-detail-overlay');
        if (existingOverlay) existingOverlay.remove();

        // ---- KACAMATA BARU: BACA LANGSUNG DARI MYSQL ----
        let hostUser = {};
        try {
            // Kita panggil API backend untuk ngambil data profil si pembuat post
            const userRes = await fetch(`/profile/${encodeURIComponent(p.host_email)}`);
            if (userRes.ok) {
                hostUser = await userRes.json();
            }
        } catch (err) {
            console.error("Failed to get Host profile from MySQL:", err);
        }

        // Kalau dapet dari MySQL, pakai datanya. Kalau kosong, pakai data dari postingan
        const hostName = hostUser.name || p.host_name || 'Host';
        const hostDept = hostUser.department || p.host_dept || 'Student';
        const hostAvatar = hostUser.profile_pic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        const hostHobby = hostUser.hobby || '';
        const studyYear = hostUser.study_year || '';

        const isAppZH = () => {
            try {
                const langObj = (window.I18n?.locale || window.I18n?.language || '').toLowerCase();
                if (langObj.includes('en')) return false;
                if (langObj.includes('zh')) return true;
            } catch (e) { }
            const ls = (localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW').toLowerCase();
            if (ls.includes('en')) return false;
            return true;
        };
        const isZH = isAppZH();

        const txtDetails = isZH ? '共乘詳情' : 'Ride Details';
        const txtDepart = isZH ? '出發地' : 'Departure';
        const txtDest = isZH ? '目的地' : 'Destination';
        const txtTime = isZH ? '時間' : 'Time';
        const txtPrice = isZH ? '費用' : 'Price';
        const txtSeats = isZH ? '空位' : 'Available Seats';
        const txtSeatsLeft = isZH ? '個空位' : 'Seats Left';
        const txtNotes = isZH ? '備註' : 'Notes';
        const txtClickMap = isZH ? '點擊開啟地圖' : 'Click to open Maps';
        const txtHobbyLabel = isZH ? '興趣' : 'Hobby';

        const dTime = new Date(p.departure_time);
        const timeStr = isZH
            ? `${dTime.getFullYear()}-${(dTime.getMonth() + 1).toString().padStart(2, '0')}-${dTime.getDate().toString().padStart(2, '0')} ${dTime.getHours().toString().padStart(2, '0')}:${dTime.getMinutes().toString().padStart(2, '0')}`
            : `${(dTime.getMonth() + 1).toString().padStart(2, '0')}/${dTime.getDate().toString().padStart(2, '0')}/${dTime.getFullYear()} ${dTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

        const getGeoQuery = (locStr) => {
            if (locStr && locStr.includes('宿舍')) {
                return '國立暨南國際大學 學生宿舍, 埔里鎮';
            }
            return locStr;
        };

        const mapDepart = getGeoQuery(p.departure_loc);
        const mapDest = getGeoQuery(p.destination_loc);

        const mapRouteUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(mapDepart)}&daddr=${encodeURIComponent(mapDest)}&output=embed`;
        const departLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapDepart)}`;
        const destLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapDest)}`;

        let vIcon = '🚗';
        if (p.vehicle_type === 'Taxi') vIcon = '🚕';
        else if (p.vehicle_type === 'Uber') vIcon = '🚙';
        else if (p.vehicle_type === 'Rental') vIcon = '🚐';
        else if (p.vehicle_type === 'Scooter') vIcon = '🛵';

        const cpDisplayTitle = p.title ? p.title : `${p.departure_loc} ➔ ${p.destination_loc}`;

        const modalHtml = `
            <div id="carpool-detail-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; justify-content: center; z-index: 100000; animation: fadeIn 0.3s; backdrop-filter: blur(4px);">
                <div style="background: var(--bg-card); width: 100%; max-width: 600px; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 25px; overflow-y: auto; position: relative; animation: slideUp 0.3s ease; color: var(--text-primary); border: 1px solid var(--border-color); border-bottom: none;">
                    <button onclick="document.getElementById('carpool-detail-overlay').remove()" style="position: absolute; top: 15px; right: 15px; background: var(--bg-secondary); border: none; width: 30px; height: 30px; border-radius: 50%; font-weight: bold; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; justify-content: center;">✕</button>
                    
                    <div style="display: inline-block; padding: 5px 12px; background: rgba(255, 140, 0, 0.1); color: #E65100; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 10px; border: 1px solid rgba(255, 140, 0, 0.2);">
                        ${vIcon} ${p.vehicle_type}
                    </div>
                    
                    <h2 style="margin: 0 0 20px 0; color: var(--text-primary); font-size: 1.4rem; font-weight: 700;">${cpDisplayTitle}</h2>
                    
                    <div style="background: var(--bg-secondary); border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                        <img src="${hostAvatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid var(--bg-card); box-shadow: var(--shadow-sm);">
                        <div>
                            <div style="font-weight: bold; font-size: 1.1rem; color: var(--text-primary);">${hostName}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">🎓 ${hostDept} ${studyYear ? `(Year ${studyYear})` : ''}</div>
                            ${hostHobby ? `<div style="font-size: 0.8rem; color: #2196F3; margin-top: 4px;">🎯 ${txtHobbyLabel}: ${hostHobby}</div>` : ''}
                        </div>
                    </div>
1137: 
1138:                     <div style="background: var(--bg-card); border-radius: 12px; padding: 15px; border: 1px solid var(--border-color); margin-bottom: 20px;">
1139:                         <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
1140:                             <span style="font-size: 1.2rem; color: #2196F3;">📍</span>
1141:                             <div>
1142:                                 <div style="font-size: 0.8rem; color: var(--text-secondary);">${txtDepart} - <span style="font-size: 0.7rem; color: #2196F3;">${txtClickMap}</span></div>
1143:                                 <a href="${departLink}" target="_blank" style="font-weight: bold; color: #2196F3; text-decoration: none; font-size: 1.1rem;">${p.departure_loc}</a>
1144:                             </div>
1145:                         </div>
1146:                         <div style="margin-left: 6px; border-left: 2px dashed var(--border-color); height: 20px; margin-bottom: 10px;"></div>
1147:                         <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
1148:                             <span style="font-size: 1.2rem; color: #F44336;">🏁</span>
1149:                             <div>
1150:                                 <div style="font-size: 0.8rem; color: var(--text-secondary);">${txtDest} - <span style="font-size: 0.7rem; color: #F44336;">${txtClickMap}</span></div>
1151:                                 <a href="${destLink}" target="_blank" style="font-weight: bold; color: #F44336; text-decoration: none; font-size: 1.1rem;">${p.destination_loc}</a>
1152:                             </div>
1153:                         </div>
1154:                         
1155:                         <div style="width: 100%; height: 200px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: var(--bg-secondary);">
1156:                             <iframe width="100%" height="100%" style="border:0" loading="lazy" allowfullscreen src="${mapRouteUrl}"></iframe>
1157:                         </div>
1158:                     </div>
1159: 
1160:                     <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
1161:                         <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px;">
1162:                             <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">🕒 ${txtTime}</div>
1163:                             <div style="font-weight: bold; color: var(--text-primary);">${timeStr}</div>
1164:                         </div>
1165:                         <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px;">
1166:                             <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">💰 ${txtPrice}</div>
1167:                             <div style="font-weight: bold; color: #E65100;">${p.price}</div>
1168:                         </div>
1169:                     </div>
1170: 
1171:                     <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
1172:                         <div>
1173:                             <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">💺 ${txtSeats}</div>
1174:                             <div style="font-weight: bold; color: #4CAF50; font-size: 1.1rem;">${p.available_seats} ${txtSeatsLeft}</div>
1175:                         </div>
1176:                     </div>
1177: 
1178:                     <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
1179:                         <div style="font-size: 0.8rem; color: #E65100; font-weight: bold; margin-bottom: 5px;">📝 ${txtNotes}</div>
1180:                         <div style="color: var(--text-primary); line-height: 1.5; font-size: 0.95rem;">${p.description || (isZH ? '無' : 'None')}</div>
1181:                     </div>
1182:                 </div>
1183:             </div>
1184:             <style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (e) {
        console.error(e);
        alert("Failed to load the details! Make sure the server is running.");
    }
};

// Taruh di bagian bawah file carpool.js dan study.js
window.openGroupChat = (activityId) => {
    const userProfileStr = localStorage.getItem('userProfile');
    if (!userProfileStr) {
        alert(I18n.t('auth.err.login_required') || "Please login first!");
        return;
    }
    // Ini kodingan ajaib yang melempar user ke messages.js
    window.navigateTo(`messages?room=carpool_${activityId}`);
};
