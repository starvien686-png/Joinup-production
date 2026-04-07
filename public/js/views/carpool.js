import { MockStore } from '../models/mockStore.js?v=21';
import { I18n } from '../services/i18n.js';
import { notifications } from '../services/notification.js';
import { openRatingModal } from './rating.js';

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
        alert(I18n.t('auth.req'));
        window.navigateTo('home');
        return;
    }

    const user = JSON.parse(userProfileStr);

    if (user && user.credit_points < 0) {
        alert(I18n.t('common.credit_low'));
        window.navigateTo('home');
        return;
    }

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
                    <span style="font-size: 3rem;">🚗</span>
                    <h1 style="color: #1976D2; margin-top: 1rem;">${I18n.t('carpool.title')}</h1>
                    <p style="color: var(--text-secondary);">${I18n.t('carpool.subtitle')}</p>
                </div>

                <div style="display: grid; gap: 1rem;">
                    <button id="btn-role-driver" class="role-card" style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: none; border-left: 4px solid #1976D2; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; transition: transform 0.2s;">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">🚘</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: #333;">${I18n.t('carpool.role.driver')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: #666;">${I18n.t('carpool.role.driver_desc')}</p>
                        </div>
                    </button>

                    <button id="btn-role-passenger" class="role-card" style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: none; border-left: 4px solid #4CAF50; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; transition: transform 0.2s;">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">🎒</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: #333;">${I18n.t('carpool.role.partner')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: #666;">${I18n.t('carpool.role.partner_desc')}</p>
                        </div>
                    </button>

                    <button id="btn-manage" class="btn" style="background: linear-gradient(135deg, #1976D2, #42A5F5); color: white; margin-top: 1rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(25, 118, 210, 0.3); transition: transform 0.2s;">
                        ⚙️ ${I18n.t('common.manage')}
                    </button>
                </div>
                
                <button onclick="window.navigateTo('home')" style="position: absolute; top: 1rem; left: 1rem; background: none; border: none; font-size: 1.2rem; cursor: pointer;">
                    ⬅️ ${I18n.t('common.back')}
                </button>
            </div>
        `;
    };

    const renderCreateForm = () => {
        return `
            <div class="container fade-in" style="padding-bottom: 3rem;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2>${I18n.t('carpool.create.title')}</h2>
                </header>

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
                        <input type="number" id="cpSeats" min="1" max="10" value="4" required>
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
                            <input type="text" value="${user.displayName || user.name || ''}" readonly style="background: #f5f5f5;">
                        </div>
                        <div class="input-group">
                            <label>系所 * (Dept)</label>
                            <input type="text" value="${user.department || user.major || ''}" readonly style="background: #f5f5f5;">
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
            return `<button class="filter-option" data-filter="vehicleType" data-value="${v.id}" style="padding: 0.6rem 1rem; border: 1px solid ${isActive ? '#FF8C00' : '#ddd'}; border-radius: 8px; background: ${isActive ? '#FFF3E0' : 'white'}; color: ${isActive ? '#E65100' : '#555'}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer;">${v.label}</button>`;
        }).join('');

        let pickupHtml = pickups.map(p => {
            const isActive = activeFilters.pickupLoc === p.id;
            return `<button class="filter-option" data-filter="pickupLoc" data-value="${p.id}" style="padding: 0.6rem 1rem; border: 1px solid ${isActive ? '#FF8C00' : '#ddd'}; border-radius: 8px; background: ${isActive ? '#FFF3E0' : 'white'}; color: ${isActive ? '#E65100' : '#555'}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer;">${p.label}</button>`;
        }).join('');

        let priceHtml = prices.map(p => {
            const isActive = activeFilters.priceRange === p.id;
            return `<button class="filter-option" data-filter="priceRange" data-value="${p.id}" style="padding: 0.6rem 1rem; border: 1px solid ${isActive ? '#FF8C00' : '#ddd'}; border-radius: 8px; background: ${isActive ? '#FFF3E0' : 'white'}; color: ${isActive ? '#E65100' : '#555'}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer;">${p.label}</button>`;
        }).join('');

        return `
            <div id="filter-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: end; z-index: 1000;">
                <div style="background: white; width: 100%; border-radius: 16px 16px 0 0; padding: 1.5rem; max-height: 85vh; overflow-y: auto; animation: slideUp 0.3s ease-out;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                        <h3 style="color: #FF8C00; margin: 0;">${txtFilterTitle}</h3>
                        <button onclick="window.closeCarpoolFilter()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #333;">×</button>
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
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; color: #333;">${txtSeats}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            ${[1, 2, 3, 4].map(num => `
                                <button class="filter-option" data-filter="seatCount" data-value="${num}" style="flex: 1; padding: 0.6rem; border: 1px solid ${activeFilters.seatCount === num ? '#FF8C00' : '#ddd'}; border-radius: 8px; background: ${activeFilters.seatCount === num ? '#FFF3E0' : 'white'}; color: ${activeFilters.seatCount === num ? '#E65100' : '#555'}; cursor: pointer;">≤ ${num} ${isZH ? '人' : ''}</button>
                            `).join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button onclick="window.resetCarpoolFilters()" class="btn" style="flex: 1; background: #f5f5f5; color: #333; border: 1px solid #ddd; padding: 12px; border-radius: 8px; font-weight: bold;">${txtClear}</button>
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
            const response = await fetch('/carpools');
            const dbPosts = await response.json();
            const allUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');

            let availablePosts = dbPosts.filter(p => {
                if (p.status === 'cancelled' || p.status === 'success' || p.status === 'expired' || p.status === 'full') return false;
                const dTime = new Date(p.deadline || p.departure_time);
                if (dTime < new Date()) return false;

                const apps = window.CarpoolAppEngine.getApps(p.id) || [];
                const acceptedApps = apps.filter(a => a.status === 'accepted');
                if (acceptedApps.length >= p.available_seats) return false;

                if (p.people_needed !== undefined && p.people_needed <= 0) return false;
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

                    return `
                        <div class="card carpool-card" onclick="window.showCarpoolDetail('${p.id}')" style="cursor: pointer; ${isFull ? 'opacity: 0.7;' : ''} margin-bottom: 1.5rem; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #eee; padding: 1.2rem; transition: transform 0.2s;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <img src="${hostAvatar}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd;">
                                    <div>
                                        <div style="font-weight: bold; color: #333; font-size: 1rem;">${p.host_name}</div>
                                        <div style="font-size: 0.8rem; color: #666; margin-top: 2px;">🎓 ${p.host_dept} ${studyYear ? `(Year ${studyYear})` : ''}</div>
                                        ${hostHobby ? `<div style="font-size: 0.75rem; color: #2196F3; margin-top: 4px;">🎯 ${txtHobbyLabel}: ${hostHobby}</div>` : ''}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="background: #FFF3E0; color: #E65100; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: bold; margin-bottom: 5px;">${vIcon} ${p.vehicle_type}</div>
                                    <div style="font-size: 1.1rem; color: #E65100; font-weight: bold;">💰 ${p.price}</div>
                                </div>
                            </div>
                            
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.15rem; color: #333;">${cpDisplayTitle}</h3>
                            <div style="font-size: 0.9rem; color: #2196F3; font-weight: bold; margin-bottom: 1rem;">📍 ${p.departure_loc} ➔ ${p.destination_loc}</div>
                            
                            <div style="background: #f9f9f9; padding: 10px; border-radius: 8px; font-size: 0.85rem; color: #555; margin-bottom: 15px; display: flex; justify-content: space-between;">
                                <div><strong>🕒 ${I18n.t('common.time')}:</strong> <br>${timeStr}</div>
                                <div style="text-align: right;"><strong>💺 ${I18n.t('carpool.label.seats')}:</strong> <br><span style="color: #FF8C00; font-size: 1.1rem; font-weight: bold;">${participantCount} / ${p.available_seats}</span></div>
                            </div>
                            <div style="margin-top: 0.5rem; margin-bottom: 10px;">${isFull ? `<span style="font-size: 0.8rem; color: #f57c00; background: #fff3e0; padding: 4px 8px; border-radius: 10px;">${txtFull}</span>` : ''}</div>
                            ${isHost ? `
                            <button class="btn" onclick="event.stopPropagation(); window.openGroupChat('${p.id}');">💬 ${txtJoinChat}</button>
                            ` : !isFull ? `
                            <button class="btn join-btn" onclick="event.stopPropagation(); window.openCarpoolJoinForm('${p.id}', '${cpDisplayTitle}')" style="width: 100%; padding: 0.7rem; font-weight: bold; background: linear-gradient(135deg, #FF8C00, #E65100); border: none; color: white; border-radius: 8px; cursor: pointer; transition: transform 0.2s; font-size: 0.95rem; box-shadow: 0 2px 5px rgba(255, 140, 0, 0.3);">${txtJoin}</button>
                            ` : ''}
                        </div>
                    `;
                }).join('');

                if (contentHtml.trim() === '') {
                    contentHtml = `
                        <div style="text-align: center; padding: 3rem 1rem; color: #888;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                            <p>${txtNoData}</p>
                            <button onclick="window.resetCarpoolFilters()" style="margin-top: 1rem; background: #FFB300; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">${I18n.t('common.clear_filter')}</button>
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
                    
                    <button id="btn-cp-filter" style="background: #eee; border: 1px solid #ccc; padding: 6px 15px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 5px; position: relative;">
                        🔍 ${I18n.t('common.filter')}
                        ${activeFilterCount > 0 ? `<span style="position: absolute; top: -5px; right: -5px; background: #F44336; color: white; font-size: 0.6rem; padding: 2px 6px; border-radius: 10px; font-weight: bold;">${activeFilterCount}</span>` : ''}
                    </button>
                </header>

                <div style="display: flex; gap: 10px; margin-bottom: 1.5rem;">
                    <div style="flex: 1; position: relative;">
                        <input type="text" id="cpSearchInput" placeholder="${I18n.t('common.search')}..." value="${activeFilters.searchQuery}" style="width: 100%; padding: 12px 20px; border-radius: 30px; border: 1px solid #ddd; outline: none; padding-right: 40px; font-size: 0.95rem;">
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
            const response = await fetch('/carpools');
            const allPosts = await response.json();
            myPosts = allPosts.filter(p => p.host_email === user.email);
        } catch (error) { }

        const txtManageTitle = I18n.t('common.manage');
        const txtNoData = I18n.t('cp.nodata_manage');
        const txtCreateBtn = I18n.t('cp.btn.create');

        const postsHtmlArray = await Promise.all(myPosts.map(async p => {
            let pendingApps = [];
            let acceptedApps = [];

            try {
                const data = await api.fetch(`/api/v1/host/participants?event_type=carpool&event_id=${p.id}&host_email=${user.email}`, { idempotency: false });
                if (data.success && data.data) {
                    pendingApps = data.data.filter(a => a.status === 'pending');
                    acceptedApps = data.data.filter(a => a.status === 'approved' || a.status === 'accepted');
                }
            } catch (e) { console.warn("Failed to fetch server participants.", e); }

            if (pendingApps.length === 0 && acceptedApps.length === 0) {
                const legacyApps = window.CarpoolAppEngine.getApps(p.id) || [];
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
                        <button onclick="window.showReviewApplicationModal('${app.id}', '${p.id}', '${app.user_email || app.user_id || app.applicantId}', '${(p.title || (p.departure_loc + ' ➔ ' + p.destination_loc)).replace(/'/g, "\\'").replace(/"/g, '&quot;')}', 'carpool', null)" style="background: #2196F3; color: white; border: none; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: bold;">👤 ${I18n.t('common.view_details')}</button>
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
            if (!appsHtml) appsHtml = `<div style="text-align: center; color: #999; padding: 10px; font-size: 0.9rem;">${I18n.t('common.no_participants')}</div>`;

            const cpTitle = p.title || `${p.departure_loc} ➔ ${p.destination_loc}`;
            const dTime = new Date(p.departure_time);
            const dateStr = dTime.toLocaleDateString();

            return `
                <div class="card" style="${p.status === 'cancelled' || p.status === 'expired' ? 'opacity: 0.6;' : ''} margin-bottom: 1.5rem; border-radius: 12px; background: white; padding: 20px; border: 1px solid #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0; font-size: 1.2rem; color: #333;">${cpTitle}</h3>
                        ${statusBadge}
                    </div>
                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 20px;">🗓️ ${dateStr}</div>
                    
                    <div style="background: #fdfdfd; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-weight: bold; color: #333; font-size: 0.95rem; margin-bottom: 10px;">👥 ${I18n.t('cp.passengers')} (${participantCount}/${p.available_seats})</div>
                        ${appsHtml}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button onclick="window.navigateTo('messages?room=carpool_${p.id}')" style="width: 100%; padding: 12px; border-radius: 8px; background: #1976D2; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">💬 ${I18n.t('common.enter_chat')}</button>

                        ${p.status === 'open' ? `
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'paused')" style="width: 100%; padding: 12px; border-radius: 8px; background: #FF9800; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">⏸️ ${I18n.t('common.pause')}</button>
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'success')" style="width: 100%; padding: 12px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">✓ ${I18n.t('common.success')}</button>
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'cancelled')" style="width: 100%; padding: 12px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">${I18n.t('common.cancel')}</button>
                        ` : p.status === 'paused' ? `
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'open')" style="width: 100%; padding: 12px; border-radius: 8px; background: #FFC107; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">▶️ ${I18n.t('common.resume')}</button>
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'success')" style="width: 100%; padding: 12px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">✓ ${I18n.t('common.success')}</button>
                            <button onclick="window.updateCarpoolStatus('${p.id}', 'cancelled')" style="width: 100%; padding: 12px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem;">${I18n.t('common.cancel')}</button>
                            ` : p.status === 'success' ? `
                            <button onclick="window.openRatingModal({ id: '${p.id}', title: '${(p.title || (p.departure_loc + ' ➔ ' + p.destination_loc)).replace(/'/g, "\\'")}', category: 'carpool' })" style="width: 100%; padding: 12px; border-radius: 8px; background: linear-gradient(135deg, #FFB300, #FF8C00); color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; margin-top: 8px; box-shadow: 0 2px 6px rgba(255, 140, 0, 0.3);">⭐ ${I18n.t('common.rate')}</button>
                        ` : ''}
                        <button onclick="window.deletePost('${p.id}', 'carpool')" style="width: 100%; padding: 12px; border-radius: 8px; background: #333; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; margin-top: 5px;">🗑️ ${I18n.t('common.delete')}</button>
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
                        host_dept: user.department || user.major || 'Student',
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
                    alert(I18n.t('common.success'));
                    currentState = 'manage';
                    updateView();
                } else {
                    alert(I18n.t('common.error') + ": " + (result.error || "Unknown"));
                }
            } catch (err) {
                alert(I18n.t('common.error_occurred'));
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
        const msgConfirm = I18n.t('common.confirm_action');
        if (!confirm(msgConfirm)) return;

        try {
            const response = await fetch(`/update-carpool-status/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                if (window.refreshUserProfile) await window.refreshUserProfile();
                updateView();
            }
            else { alert(I18n.t('common.error')); }
        } catch (error) {
            alert(I18n.t('common.error_occurred'));
        }
    };

    updateView();
};

window.openCarpoolJoinForm = async (postId, teamName) => {
    const msgConfirm = I18n.t('common.confirm_join');
    const msgDesc = `${I18n.t('housing.confirm.join_msg') || 'Join'} <strong>${teamName}</strong>?`;

    const formHtml = `
        <div id="join-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);">
            <div style="background: white; width: 85%; max-width: 350px; border-radius: 16px; padding: 2rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: scaleIn 0.2s ease-out;">
                <h3 style="margin: 0 0 1rem 0; color: #333;">${msgConfirm}</h3>
                <p style="color: #666; margin-bottom: 1.5rem; line-height: 1.5;">${msgDesc}</p>
                <div style="color: #888888; font-size: 11px; text-align: center; margin-bottom: 1.5rem; border-top: 1px dashed #eee; padding-top: 10px;">⚠️ ${I18n.t('common.financial_disclaimer')}</div>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="document.getElementById('join-overlay').remove()" class="btn" style="flex: 1; padding: 0.8rem; background: #eee; color: #555; border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                        ${I18n.t('common.cancel')}
                    </button>
                    <button id="btn-confirm-join" class="btn btn-primary" style="flex: 1; padding: 0.8rem; background: linear-gradient(135deg, #FF8C00, #E65100); color: white; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; box-shadow: 0 2px 5px rgba(255, 140, 0, 0.3);">
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

                    alert(I18n.t('carpool.alert.sent'));
                    document.getElementById('join-overlay').remove();
                } else {
                    alert(I18n.t('common.error') + ": " + (result.message || ""));
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = I18n.t('common.submit');
                }
            } catch (e) {
                console.error("Join Request Error:", e);
                alert(I18n.t('common.error_occurred'));
                btnSubmit.disabled = false;
                btnSubmit.innerText = I18n.t('common.submit');
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

        const dTime = new Date(p.departure_time);
        const timeStr = dTime.toLocaleString();

        const mapRouteUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(p.departure_loc)}&daddr=${encodeURIComponent(p.destination_loc)}&output=embed`;
        const departLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.departure_loc)}`;
        const destLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.destination_loc)}`;

        let vIcon = '🚗';
        if (p.vehicle_type === 'Taxi') vIcon = '🚕';
        else if (p.vehicle_type === 'Uber') vIcon = '🚙';
        else if (p.vehicle_type === 'Rental') vIcon = '🚐';
        else if (p.vehicle_type === 'Scooter') vIcon = '🛵';

        const cpDisplayTitle = p.title ? p.title : `${p.departure_loc} ➔ ${p.destination_loc}`;

        const modalHtml = `
            <div id="carpool-detail-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; justify-content: center; z-index: 100000; animation: fadeIn 0.3s;">
                <div style="background: white; width: 100%; max-width: 600px; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 25px; overflow-y: auto; position: relative; animation: slideUp 0.3s ease;">
                    <button onclick="document.getElementById('carpool-detail-overlay').remove()" style="position: absolute; top: 15px; right: 15px; background: #eee; border: none; width: 30px; height: 30px; border-radius: 50%; font-weight: bold; cursor: pointer; color: #555;">X</button>
                    
                    <div style="display: inline-block; padding: 5px 12px; background: #FFF3E0; color: #E65100; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 10px;">
                        ${vIcon} ${p.vehicle_type}
                    </div>
                    
                    <h2 style="margin: 0 0 20px 0; color: #333; font-size: 1.3rem;">${cpDisplayTitle}</h2>
                    
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px; border: 1px solid #eee; margin-bottom: 20px;">
                        <img src="${hostAvatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd;">
                        <div>
                            <div style="font-weight: bold; font-size: 1.1rem; color: #333;">${hostName}</div>
                            <div style="font-size: 0.85rem; color: #666; margin-bottom: 4px;">🎓 ${hostDept} ${studyYear ? `(Year ${studyYear})` : ''}</div>
                            ${hostHobby ? `<div style="font-size: 0.8rem; color: #2196F3; margin-top: 4px;">🎯 ${I18n.t('reg.hobby_label') || 'Hobby'}: ${hostHobby}</div>` : ''}
                        </div>
                    </div>

                    <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; border: 1px solid #eee; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <span style="font-size: 1.2rem; color: #2196F3;">📍</span>
                            <div>
                                <div style="font-size: 0.8rem; color: #888;">${I18n.t('carpool.detail.depart')} - <span style="font-size: 0.7rem; color: #2196F3;">${I18n.t('carpool.detail.click_map')}</span></div>
                                <a href="${departLink}" target="_blank" style="font-weight: bold; color: #2196F3; text-decoration: none; font-size: 1.1rem;">${p.departure_loc}</a>
                            </div>
                        </div>
                        <div style="margin-left: 6px; border-left: 2px dashed #ccc; height: 20px; margin-bottom: 10px;"></div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <span style="font-size: 1.2rem; color: #F44336;">🏁</span>
                            <div>
                                <div style="font-size: 0.8rem; color: #888;">${I18n.t('carpool.detail.dest')} - <span style="font-size: 0.7rem; color: #F44336;">${I18n.t('carpool.detail.click_map')}</span></div>
                                <a href="${destLink}" target="_blank" style="font-weight: bold; color: #F44336; text-decoration: none; font-size: 1.1rem;">${p.destination_loc}</a>
                            </div>
                        </div>
                        
                        <div style="width: 100%; height: 200px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; background: #eee;">
                            <iframe width="100%" height="100%" style="border:0" loading="lazy" allowfullscreen src="${mapRouteUrl}"></iframe>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div style="background: white; border: 1px solid #ddd; border-radius: 12px; padding: 15px;">
                            <div style="font-size: 0.8rem; color: #888; margin-bottom: 5px;">🕒 ${I18n.t('common.time')}</div>
                            <div style="font-weight: bold; color: #333;">${timeStr}</div>
                        </div>
                        <div style="background: white; border: 1px solid #ddd; border-radius: 12px; padding: 15px;">
                            <div style="font-size: 0.8rem; color: #888; margin-bottom: 5px;">💰 ${I18n.t('carpool.label.transport')}</div>
                            <div style="font-weight: bold; color: #E65100;">${p.price || ''}</div>
                        </div>
                    </div>

                    <div style="background: white; border: 1px solid #ddd; border-radius: 12px; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 0.8rem; color: #888; margin-bottom: 5px;">💺 ${I18n.t('carpool.label.seats')}</div>
                            <div style="font-weight: bold; color: #4CAF50; font-size: 1.1rem;">${p.available_seats}</div>
                        </div>
                    </div>

                    <div style="background: #FFF9C4; border: 1px solid #FFE0B2; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                        <div style="font-size: 0.8rem; color: #E65100; font-weight: bold; margin-bottom: 5px;">📝 ${I18n.t('common.description')}</div>
                        <div style="color: #444; line-height: 1.5;">${p.description || (I18n.t('common.no_data') || 'None')}</div>
                    </div>
                </div>
            </div>
            <style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (e) {
        console.error(e);
        alert(I18n.t('app.err.load_fail', { error: e.message }));
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
