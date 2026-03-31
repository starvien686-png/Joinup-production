import { MockStore } from '../models/mockStore.js?v=17';
import { I18n } from '../services/i18n.js';
import { LanguageSelector } from '../components/LanguageSelector.js';
import api from '../utils/api.js';

export const renderHome = () => {
    const app = document.getElementById('app');

    // Get User Profile
    const profileStr = localStorage.getItem('userProfile');
    let user = { displayName: '同學', department: '' };

    if (profileStr) {
        try {
            user = JSON.parse(profileStr);
        } catch (e) {
            console.error('Error parsing user profile', e);
        }
    }

    // Use I18n for default name if generic? Or keep simple.
    const username = user.displayName || '同學';
    const deptInfo = user.department ? `<span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: normal; margin-left: 0.5rem;">(${user.department})</span>` : '';

    // --- Dynamic Greeting Logic ---
    const getGreeting = () => {
        const hour = new Date().getHours();
        let key = 'home.greeting.night';
        if (hour >= 0 && hour < 2) key = 'home.greeting.late_night';
        else if (hour >= 2 && hour < 5) key = 'home.greeting.dawn';
        else if (hour >= 5 && hour < 7) key = 'home.greeting.early_morning';
        else if (hour >= 7 && hour < 9) key = 'home.greeting.morning';
        else if (hour >= 9 && hour < 11.5) key = 'home.greeting.morning'; // "Shang Wu" mapped to morning generally or specific key? sticking to morning for simplicty in generic keys, or specific.
        // Actually I18n has specific keys:
        else if (hour >= 11.5 && hour < 13.5) key = 'home.greeting.noon';
        else if (hour >= 13.5 && hour < 18) key = 'home.greeting.afternoon';
        else if (hour >= 18 && hour < 22) key = 'home.greeting.evening';

        return I18n.t(key);
    };

    const categories = [
        { id: 'sports', key: 'home.cat.sports', icon: '🏀', color: '#FF7043' },
        { id: 'carpool', key: 'home.cat.carpool', icon: '🚗', color: '#42A5F5' },
        { id: 'groupbuy', key: 'home.cat.groupbuy', icon: '🏠', color: '#FFCA28' },
        { id: 'study', key: 'home.cat.study', icon: '📚', color: '#66BB6A' },
        { id: 'travel', key: 'home.cat.travel', icon: '🎉', color: '#EC407A' }
    ];

    const renderCategories = () => {
        return categories.map(cat => `
            <div class="category-card" onclick="window.navigateTo('${cat.id}')">
                <div class="cat-icon" style="background-color: ${cat.color}20; color: ${cat.color};">
                    ${cat.icon}
                </div>
                <span>${I18n.t(cat.key)}</span>
            </div>
        `).join('');
    };



    const renderContent = () => {
        app.innerHTML = `
            <div class="container fade-in" style="padding-bottom: 90px;">
                <!-- Banner -->
                <div style="margin-bottom: 1.5rem; border-radius: 16px; overflow: hidden;">
                    <img src="assets/transparent banner.png" alt="JoinUp Banner" style="width: 100%; display: block;">
                </div>

                <header style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h2 style="margin:0; font-size: 1.2rem; color: var(--text-secondary);" id="greeting-text">${getGreeting()}！</h2>
                        <h1 style="margin:0; font-size: 1.8rem;">
                            ${username} 
                            ${deptInfo}
                        </h1>
                        <p id="location-text" style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: #999;" data-i18n="loc.ncnu">${I18n.t('loc.ncnu')}</p>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; justify-content: flex-end; max-width: 160px;">
                        <!-- Language Selector Container -->
                        <div id="header-lang-selector"></div>
                        
                        <div style="display: flex; gap: 0.8rem;">
                            <button onclick="window.showAnnouncements()" style="position: relative; background: white; border: 1px solid #ddd; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 2px 5px rgba(0,0,0,0.05);" title="最新公告">
                                🔔
                                <span class="notification-badge-dot"></span>
                            </button>
                            <div class="avatar" style="background: var(--primary-light); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; overflow: hidden; ${user.photoURL ? `background-image: url('${user.photoURL}'); background-size: cover; background-position: center; color: transparent;` : ''}">
                                ${user.photoURL ? '' : username[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <section>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;" data-i18n="home.section.new_activity">${I18n.t('home.section.new_activity')}</h3>
                        <button onclick="window.navigateTo('activities')" style="border: none; background: none; color: var(--primary-color); font-size: 0.9rem; font-weight: bold; cursor: pointer;">
                            ${I18n.t('common.more')} >
                        </button>
                    </div>
                    
                    <div id="home-upcoming-scroll" class="upcoming-scroll" style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; scroll-snap-type: x mandatory;">
                        <div style="text-align:center;width:100%;color:#999;padding: 1rem;">Loading...</div>
                    </div>
                </section>



                <section style="margin-top: 1rem;">
                    <h3 style="margin-bottom: 1rem;" data-i18n="home.section.explore">${I18n.t('home.section.explore')}</h3>
                    <div class="category-grid">
                        ${renderCategories()}
                    </div>
                </section>
                
                <!-- Community & Safety Notice -->
                <div style="margin-top: 2rem; padding: 1rem; background: #F8F9FA; border-radius: 8px; text-align: center; font-size: 12px; color: #6c757d; line-height: 1.5;">
                    ${I18n.t('common.safety_notice')}
                </div>
            </div>

            <!-- Bottom Navigation -->
            <nav class="bottom-nav">
                <a href="#" class="nav-item active">
                    <span class="nav-icon">🏠</span>
                    <span data-i18n="nav.home">${I18n.t('nav.home')}</span>
                </a>
                <a href="#" class="nav-item" onclick="window.navigateTo('messages')">
                    <span class="nav-icon">💬</span>
                    <span data-i18n="nav.messages">${I18n.t('nav.messages')}</span>
                </a>
                <a href="#" class="nav-item" onclick="window.navigateTo('profile')">
                    <span class="nav-icon">👤</span>
                    <span data-i18n="nav.profile">${I18n.t('nav.profile')}</span>
                </a>
            </nav>
        `;

        // Inject Styles
        if (!document.getElementById('home-styles')) {
            const style = document.createElement('style');
            style.id = 'home-styles';
            style.innerHTML = `
                .category-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }
                .category-card {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 16px;
                    text-align: center;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    border: 1px solid #f1f5f9;
                }
                .category-card:active { transform: scale(0.95); }
                .cat-icon {
                    font-size: 2rem;
                    margin-bottom: 0.8rem;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    margin-left: auto;
                    margin-right: auto;
                }
                .bottom-nav {
                    position: fixed; bottom: 0; left: 0; width: 100%;
                    background: #FFFFFF; border-top: 1px solid #f1f5f9;
                    padding: 1.2rem 1rem; display: flex; justify-content: space-around;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.05); z-index: 100;
                }
                .nav-item {
                    display: flex; flex-direction: column; align-items: center;
                    color: #94a3b8; font-size: 0.8rem; text-decoration: none;
                }
                .nav-icon { font-size: 1.5rem; margin-bottom: 0.2rem; }
                .nav-item.active { color: #FF8C00; }

            `;
            document.head.appendChild(style);
        }

        // Initialize Language Selector in Header
        new LanguageSelector('header-lang-selector', {
            onUpdate: (lang) => {
                // Re-render home on change to update all texts
                renderHome();
            }
        });
    };

    renderContent();

    // Fetch live activities from Supabase dynamically (Now from MySQL 🚀)
    // Fetch live activities from Supabase dynamically (Now from MySQL 🚀)
    const loadHomeActivities = async () => {
        const scrollContainer = document.getElementById('home-upcoming-scroll');
        if (!scrollContainer) return;

        let posts = [];
        let myStatuses = {};
        try {
            const currentUserStr = localStorage.getItem('userProfile');
            const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};

            const fetchTasks = [
                fetch('/activities'),
                fetch('/carpools'),
                fetch('/studies'),
                fetch('/hangouts'),
                fetch('/housing')
            ];

            const responses = await Promise.all(fetchTasks);
            const [activities, carpools, studies, hangouts, housings] = await Promise.all([
                responses[0].json(), responses[1].json(), responses[2].json(), responses[3].json(), responses[4].json()
            ]);

            // Fetch user join statuses separately so a failure here doesn't block activities
            if (currentUser.email) {
                try {
                    const statusData = await api.fetch(`/api/v1/join/my-statuses?user_email=${encodeURIComponent(currentUser.email)}`, { idempotency: false });
                    if (statusData.success) {
                        myStatuses = statusData.data || {};
                    }
                } catch (statusErr) {
                    console.warn('Could not fetch join statuses (non-blocking):', statusErr.message || statusErr);
                }
            }

            let dbPosts = [
                ...(Array.isArray(activities) ? activities : []).map(p => ({ ...p, category: p.category || 'sports' })),
                ...(Array.isArray(carpools) ? carpools : []).map(p => ({
                    ...p, category: 'carpool', people_needed: p.available_seats,
                    event_time: p.departure_time, location: p.departure_loc
                })),
                ...(Array.isArray(studies) ? studies : []).map(p => ({ ...p, category: 'study' })),
                ...(Array.isArray(hangouts) ? hangouts : []).map(p => ({
                    ...p, category: p.category || 'travel', location: p.meeting_location
                })),
                ...(Array.isArray(housings) ? housings : []).map(p => ({ ...p, category: 'housing' }))
            ];

            const isPostActive = (p) => {
                // 1. Check Status
                if (p.status === 'cancelled' || p.status === 'success' || p.status === 'expired' || p.status === 'full' || p.status === 'deleted') return false;

                // 2. Check Deadline / Event Time
                const refDateStr = p.deadline || p.event_time || p.departure_time;
                if (refDateStr) {
                    const eventDate = new Date(refDateStr);
                    if (eventDate < new Date()) return false;
                }

                // 3. Check Participants Capacity
                let apps = [];
                const hangoutCats = ['travel', 'food', 'Food', 'Outdoor', 'Arts', 'Entertainment', 'Shopping', 'Sports', 'Nightlife'];

                if (p.category === 'carpool') apps = JSON.parse(localStorage.getItem('joinup_carpool_apps') || '[]');
                else if (p.category === 'sports') apps = JSON.parse(localStorage.getItem('joinup_applications') || '[]');
                else if (p.category === 'study') apps = JSON.parse(localStorage.getItem('joinup_study_apps') || '[]');
                else if (hangoutCats.includes(p.category)) apps = JSON.parse(localStorage.getItem('joinup_hangout_apps') || '[]');
                else if (p.category === 'housing' || p.category === 'groupbuy') apps = JSON.parse(localStorage.getItem('joinup_housing_apps') || '[]');

                if (apps.length > 0) {
                    const accepted = apps.filter(a => String(a.postId) === String(p.id) && a.status === 'accepted');
                    if (accepted.length >= (p.people_needed || 999)) return false;
                }

                // 4. Static people_needed check from DB
                if (p.people_needed !== undefined && p.people_needed <= 0) return false;

                return true;
            };

            // Filter only active posts
            const availablePosts = dbPosts.filter(p => isPostActive(p));

            // Filter out specific categories requested
            const allowedCats = [
                'carpool', 'travel', 'study', 'housing', 'groupbuy', 'sports',
                'Food', 'Outdoor', 'Arts', 'Entertainment', 'Shopping', 'Sports', 'Nightlife', 'food'
            ];
            const targetPosts = availablePosts.filter(p => allowedCats.includes(p.category));

            // Urutkan agar post baru langsung ditaruh di depan (sort by created_at descending)
            targetPosts.sort((a, b) => new Date(b.created_at || b.event_time || 0) - new Date(a.created_at || a.event_time || 0));

            posts = targetPosts.map(p => ({
                ...p, // preserve all original fields like description, host_name, subject, etc.
                id: p.id,
                category: p.category,
                title: p.title,
                peoplecount: p.people_needed,
                eventtime: p.event_time || p.departure_time || p.deadline,
                location: p.location || p.destination || p.meeting_location,
                sport_type: p.sport_type,
                created_at: p.created_at
            }));
            window._cachedHomePosts = posts;
        } catch (error) {
            console.error("Gagal load Home:", error);
        }

        if (!Array.isArray(posts)) return;

        if (posts.length === 0) {
            scrollContainer.innerHTML = `
            <div class="card" onclick="window.navigateTo('activities')" style="min-width: 280px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, #FF9800, #F44336); padding: 2rem; border: none;">
                <div style="font-size: 2.5rem; margin-bottom: 1rem;">✨</div>
                <h3 style="color: white; margin-bottom: 0.5rem; font-size: 1.1rem; line-height: 1.4;">${I18n.t('home.empty_banner.title', "Let's make new activities with your friends")}</h3>
                <button class="btn" style="background: white; color: #F44336; border: none; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin-top: 15px; width: auto; font-size: 0.9rem;">${I18n.t('home.section.new_activity', 'Create Now')}</button>
            </div>`;
            return;
        }

        // --- KAMUS PENERJEMAH LOKASI & OLAHRAGA ---
        const getLocTrans = (loc) => {
            const map = {
                '體育健康中心 (1F 健身房)': 'sports.loc.gym_1f',
                '體育健康中心 (2F 綜合球場)': 'sports.loc.gym_2f',
                '體育健康中心 (3F 羽球場)': 'sports.loc.gym_3f',
                '游泳池 (室內)': 'sports.loc.pool',
                '學生活動中心 (舞鏡月屋)': 'sports.loc.dance_room',
                '室外籃球場 (靠宿舍)': 'sports.loc.court_basket',
                '室外排球場 (靠田徑場)': 'sports.loc.court_volley',
                '網球場': 'sports.loc.court_tennis',
                '田徑場 (司令台)': 'sports.loc.track',
                '壘球場': 'sports.loc.field_softball',
                '大草皮 (近校門)': 'sports.loc.grass_field',
                '埔里國小 (籃球場)': 'sports.loc.puli_elem',
                '埔里鎮立育樂中心': 'sports.loc.puli_rec',
                '虎頭山 (慢跑/飛行傘點)': 'sports.loc.hutou',
                '地理中心碑 (階梯訓練)': 'sports.loc.geographic',
                '國立中興大學(NCHU)籃球場': 'sports.loc.nchu',
                '自訂': 'sports.loc.custom'
            };
            return map[loc] ? I18n.t(map[loc]) : loc;
        };

        const getSportTrans = (sport) => {
            const map = {
                '籃球': 'sports.type.basketball', '羽球': 'sports.type.badminton',
                '排球': 'sports.type.volleyball', '網球': 'sports.type.tennis',
                '桌球': 'sports.type.table_tennis', '棒壘球': 'sports.type.baseball',
                '足球': 'sports.type.soccer', '健身重訓': 'sports.type.gym',
                '瑜珈': 'sports.type.yoga', '有氧舞蹈': 'sports.type.aerobics',
                '慢跑': 'sports.type.jogging', '游泳': 'sports.type.swimming',
                '騎單車': 'sports.type.cycling', '其他': 'sports.type.other'
            };
            return map[sport] ? I18n.t(map[sport]) : sport;
        };

        scrollContainer.innerHTML = posts.map(p => {
            const getIcon = (cat, sportType) => {
                if (cat === 'sports') {
                    if (!sportType) return '🏅';
                    if (sportType.includes('籃') || sportType.toLowerCase().includes('basket')) return '🏀';
                    if (sportType.includes('羽') || sportType.toLowerCase().includes('badminton')) return '🏸';
                    if (sportType.includes('排') || sportType.toLowerCase().includes('volley')) return '🏐';
                    if (sportType.includes('網') || sportType.toLowerCase().includes('tennis')) return '🎾';
                    if (sportType.includes('桌') || sportType.toLowerCase().includes('table')) return '🏓';
                    if (sportType.includes('棒') || sportType.includes('壘') || sportType.toLowerCase().includes('base')) return '⚾';
                    if (sportType.includes('足') || sportType.toLowerCase().includes('soccer')) return '⚽';
                    if (sportType.includes('游') || sportType.toLowerCase().includes('swim')) return '🏊';
                    if (sportType.includes('跑') || sportType.toLowerCase().includes('jog')) return '🏃';
                    return '🏅';
                }
                if (cat === 'carpool') return '🚗';
                if (cat === 'housing' || cat === 'groupbuy') return '🏠';
                if (cat === 'study') return '📚';

                // Hangout Icons
                const hangoutCats = ['travel', 'food', 'Food', 'Outdoor', 'Arts', 'Entertainment', 'Shopping', 'Sports', 'Nightlife'];
                if (hangoutCats.includes(cat)) {
                    if (cat === 'Food' || cat === 'food') return '🍽️';
                    if (cat === 'Outdoor') return '🏕️';
                    if (cat === 'Arts') return '🎨';
                    if (cat === 'Entertainment') return '🍿';
                    if (cat === 'Shopping') return '🛍️';
                    if (cat === 'Sports') return '🏃';
                    if (cat === 'Nightlife') return '🍻';
                    return '🛍️';
                }
                return '📅';
            };

            const getCatLabel = (cat) => {
                const mapping = {
                    'sports': 'home.cat.sports', 'carpool': 'home.cat.carpool',
                    'housing': 'home.cat.groupbuy', 'groupbuy': 'home.cat.groupbuy',
                    'study': 'home.cat.study', 'travel': 'home.cat.travel', 'food': 'home.cat.travel',
                    'Food': 'home.cat.travel', 'Outdoor': '户外/踏青', 'Arts': '艺文/展览',
                    'Entertainment': '娱乐/电影', 'Shopping': '逛街/购物', 'Sports': '运动/健身',
                    'Nightlife': '夜生活'
                };
                const key = mapping[cat];
                if (!key) return cat;
                return key.includes('.') ? I18n.t(key) : key;
            };

            // Pakai kamus penerjemah di sini!
            const labelName = p.category === 'sports' && p.sport_type ? getSportTrans(p.sport_type) : getCatLabel(p.category);
            const iconEmoji = getIcon(p.category, p.sport_type);
            const dateStr = new Date(p.eventtime || p.created_at || new Date()).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const translatedLoc = getLocTrans(p.location);

            return `
                <div class="card" onclick="window.showUniversalDetail('${p.id}', '${p.category}')" style="min-width: 280px; scroll-snap-align: center; cursor: pointer; border: 1px solid #f0f0f0; flex-shrink: 0; padding: 15px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: transform 0.2s; position: relative;">
                    ${(user.email && p.host_email && user.email === p.host_email) ? `
                        <button onclick="event.stopPropagation(); window.deletePost('${p.id}', '${p.category}')" 
                                style="position: absolute; top: -10px; right: -10px; width: 28px; height: 28px; border-radius: 50%; background: #F44336; color: white; border: 2px solid white; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 10;">
                            ✕
                        </button>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
                        <span style="font-size: 0.75rem; background: #FFF3E0; padding: 3px 10px; border-radius: 20px; color: #E67E22; font-weight: bold;">
                            ${iconEmoji} ${labelName}
                        </span>
                        <span style="font-size: 0.8rem; color: #2E7D32; font-weight: bold; background: #E8F5E9; padding: 2px 8px; border-radius: 10px;">
                            👥 ${p.peoplecount || 0}${I18n.t('common.person')}
                        </span>
                    </div>
                    
                    <h4 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700;">${p.title}</h4>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 8px; background: #fbfbfb; border-radius: 8px;">
                        <img src="${p.profile_pic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 1.5px solid #eee;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 0.85rem; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.host_name}</div>
                            <div style="font-size: 0.7rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">🎓 ${p.host_dept} ${p.study_year ? `• ${p.study_year}` : ''}</div>
                        </div>
                    </div>

                    <div style="font-size: 0.8rem; color: #777; display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 4px;">📅 <span style="color: #444;">${dateStr}</span></div>
                        <div style="display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📍 <span style="color: #444;">${translatedLoc || I18n.t('common.location_tbd')}</span></div>
                    </div>

                    ${(() => {
                    if (user.email && p.host_email && user.email === p.host_email) {
                        return `<button onclick="event.stopPropagation(); window.navigateTo('messages?room=${p.category || 'sports'}_${p.id}')" style="width:100%; margin-top:12px; padding:8px; border-radius:8px; background:#1976D2; border:none; color:white; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3);">
                                💬 進入聊天室 / Enter Chat
                            </button>`;
                    }

                    // Determine participant status
                    const roleStatus = myStatuses[`${p.category || 'sports'}_${p.id}`];
                    if (roleStatus === 'approved') {
                        return `<button onclick="event.stopPropagation(); window.navigateTo('messages?room=${p.category || 'sports'}_${p.id}')" style="width:100%; margin-top:12px; padding:8px; border-radius:8px; background:#4CAF50; border:none; color:white; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);">
                                💬 進入聊天室 / Enter Chat
                            </button>`;
                    } else if (roleStatus === 'pending') {
                        return `<button onclick="event.stopPropagation();" disabled style="width:100%; margin-top:12px; padding:8px; border-radius:8px; background:#9E9E9E; border:none; color:white; font-weight:bold; cursor:not-allowed; box-shadow: 0 2px 4px rgba(158, 158, 158, 0.3);">
                                ⏳ Pending...
                            </button>`;
                    } else {
                        return `<button onclick="event.stopPropagation(); window.quickApply('${p.id}', '${p.category}', this)" style="width:100%; margin-top:12px; padding:8px; border-radius:8px; background:linear-gradient(135deg,#FF8C00,#FF6D00); border:none; color:white; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(255, 140, 0, 0.3);">
                                申請加入 / Apply to Join
                            </button>`;
                    }
                })()}
                </div>
            `;
        }).join('');
    };

    // Quick Apply Function directly bridging the API
    if (!window.quickApply) {
        window.quickApply = async (eventId, category, btn) => {
            const currentUserStr = localStorage.getItem('userProfile');
            let u = currentUserStr ? JSON.parse(currentUserStr) : {};

            if (!u.email) {
                alert("Please login first!");
                return;
            }

            // Custom Confirmation Modal
            const confirmHtml = `
                <div id="join-confirm-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100000; animation: fadeIn 0.2s;">
                    <div style="background: white; width: 90%; max-width: 400px; border-radius: 16px; padding: 25px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                        <h3 style="margin-top: 0; color: #333;">Are you sure you want to join?</h3>
                        <p style="color: #666; font-size: 0.95rem; margin-bottom: 25px;">
                            The request will be sent to the Host. While waiting for approval, the status will be Pending.
                        </p>
                        <div style="display: flex; gap: 15px; justify-content: center;">
                            <button id="join-cancel-btn" style="flex: 1; padding: 10px; border-radius: 8px; background: #f1f5f9; border: none; color: #64748b; font-weight: bold; cursor: pointer;">Cancel</button>
                            <button id="join-submit-btn" style="flex: 1; padding: 10px; border-radius: 8px; background: linear-gradient(135deg,#FF8C00,#FF6D00); border: none; color: white; font-weight: bold; cursor: pointer;">Submit</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', confirmHtml);

            document.getElementById('join-cancel-btn').onclick = () => {
                document.getElementById('join-confirm-overlay').remove();
            };

            document.getElementById('join-submit-btn').onclick = async () => {
                const submitBtn = document.getElementById('join-submit-btn');
                submitBtn.innerText = "Loading...";
                submitBtn.disabled = true;

                try {
                    const out = await api.fetch('/api/v1/join', {
                        method: 'POST',
                        body: {
                            event_type: category || 'sports',
                            event_id: eventId,
                            user_email: u.email
                        }
                    });

                    document.getElementById('join-confirm-overlay').remove();

                    alert('申請已送出！ / Application sent!');
                    btn.innerText = "⏳ Pending...";
                    btn.style.background = "#9E9E9E";
                    btn.style.cursor = "not-allowed";
                    btn.onclick = (e) => e.stopPropagation();

                    if (window.syncNotifications) window.syncNotifications();
                } catch (e) {
                    alert('Failed: ' + (e.message || 'Unknown error'));
                    submitBtn.innerText = "申請加入 / Apply to Join";
                    submitBtn.disabled = false;
                }
            };
        };
    }

    // Inject universal detail script if it doesn't exist
    if (!window.showUniversalDetail) {
        window.showUniversalDetail = async (id, category) => {
            const lookIn = [...(window._cachedHomePosts || []), ...(window._cachedActivitiesPosts || [])];
            const p = lookIn.find(post => String(post.id) === String(id) && post.category === category);
            if (!p) return;

            const existing = document.getElementById('univ-detail-overlay');
            if (existing) existing.remove();

            const isZH = (localStorage.getItem('language') || '').includes('zh') || true;

            const peopleCnt = p.peoplecount !== undefined ? p.peoplecount : (p.peopleNeeded !== undefined ? p.peopleNeeded : p.people_needed);
            const hostNm = p.host_name || p.hostName || 'Anonymous';
            const hostDp = p.host_dept || p.hostDept || '';
            const desc = p.description || p.notes || '';
            const evTimeStr = p.eventtime || p.eventTime || p.event_time || p.departure_time || p.deadline || p.created_at;

            const allUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
            const regUsers = JSON.parse(localStorage.getItem('joinup_users_v1') || '[]');
            const currUser = JSON.parse(localStorage.getItem('userProfile') || '{}');
            const hostAvatar = p.profile_pic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            const hostHobby = p.hobby || '';
            const hostBio = p.bio || '';
            const studyYear = p.study_year || '';
            const hostFinalNm = p.host_name || hostNm;
            const hostFinalDp = p.host_dept || hostDp;

            const makeMap = loc => {
                if (!loc) return 'There is no location information for this post.';
                const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(loc)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
                return `<div style="margin-top: 8px;"><iframe width="100%" height="200" src="${mapUrl}" style="border:0; border-radius: 10px;" allowfullscreen loading="lazy"></iframe></div>`;
            };

            const makeDirectionMap = (from, to) => {
                if (!from || !to) return '';
                const mapUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(from)}&daddr=${encodeURIComponent(to)}&output=embed`;
                return `<div style="margin-top: 8px;"><iframe width="100%" height="200" src="${mapUrl}" style="border:0; border-radius: 10px;" allowfullscreen loading="lazy"></iframe></div>`;
            };

            let specificDetails = '';
            if (p.category === 'study') {
                specificDetails = `
                    <div style="font-size: 1.1rem; color: #1976D2; font-weight: bold; margin-bottom: 10px;">📚 ${p.subject || p.title || ''}</div>
                    <div style="margin-bottom: 5px;"><strong>📍 ${isZH ? '地點' : 'Location'}:</strong> ${p.location}</div>
                    <div style="margin-bottom: 5px;"><strong>👥 ${isZH ? '人數' : 'People'}:</strong> ${peopleCnt}</div>
                    ${makeMap(p.location)}
                `;
            } else if (p.category === 'carpool') {
                specificDetails = `
                    <div style="margin-bottom: 5px;"><strong>🚗 ${isZH ? '出發地' : 'From'}:</strong> ${p.departure_loc || p.location}</div>
                    <div style="margin-bottom: 5px;"><strong>📍 ${isZH ? '目的地' : 'To'}:</strong> ${p.destination_loc || p.destination}</div>
                    <div style="margin-bottom: 5px;"><strong>👥 ${isZH ? '提供座位' : 'Seats'}:</strong> ${p.available_seats || peopleCnt}</div>
                    ${p.price ? `<div style="margin-bottom: 5px;"><strong>💰 ${isZH ? '車資' : 'Price'}:</strong> NT$${p.price}</div>` : ''}
                    ${makeDirectionMap(p.departure_loc || p.location, p.destination_loc || p.destination)}
                `;
            } else if (p.category === 'travel') {
                specificDetails = `
                    <div style="font-size: 1.1rem; color: #1976D2; font-weight: bold; margin-bottom: 10px;">📍 ${p.destination || p.location}</div>
                    <div style="margin-bottom: 5px;"><strong>🤝 ${isZH ? '集合地點' : 'Meet'}:</strong> ${p.meeting_location || p.location}</div>
                    <div style="margin-bottom: 5px;"><strong>👥 ${isZH ? '需要人數' : 'People Needed'}:</strong> ${peopleCnt}</div>
                    ${makeDirectionMap(p.meeting_location || p.location, p.destination || p.location)}
                `;
            } else if (p.category === 'housing' || p.category === 'groupbuy') {
                specificDetails = `
                    <div style="margin-bottom: 5px;"><strong>📍 ${isZH ? '地址' : 'Address'}:</strong> ${p.location}</div>
                    <div style="margin-bottom: 5px;"><strong>💰 ${isZH ? '租金' : 'Rent'}:</strong> ${p.rent_amount ? 'NT$' + p.rent_amount : (isZH ? '面議' : 'Negotiable')}</div>
                    <div style="margin-bottom: 5px;"><strong>👥 ${isZH ? '缺幾人' : 'People Needed'}:</strong> ${peopleCnt}</div>
                    <div style="margin-bottom: 5px;"><strong>🚻 ${isZH ? '性別限制' : 'Gender Req'}:</strong> ${p.gender_req || '無'}</div>
                    ${makeMap(p.location)}
                `;
            } else {
                specificDetails = `
                    <div style="margin-bottom: 5px;"><strong>📍 ${isZH ? '地點' : 'Location'}:</strong> ${p.location || 'N/A'}</div>
                    <div style="margin-bottom: 5px;"><strong>👥 ${isZH ? '需要人數' : 'People Needed'}:</strong> ${peopleCnt}</div>
                    ${makeMap(p.location)}
                `;
            }

            // fallback to general formatting
            const dTime = new Date(evTimeStr || new Date());
            const timeStr = `${dTime.getFullYear()}-${(dTime.getMonth() + 1).toString().padStart(2, '0')}-${dTime.getDate().toString().padStart(2, '0')} ${dTime.getHours().toString().padStart(2, '0')}:${dTime.getMinutes().toString().padStart(2, '0')}`;

            const modalHtml = `
                <div id="univ-detail-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; justify-content: center; z-index: 100000; animation: fadeIn 0.3s;">
                    <div style="background: white; width: 100%; max-width: 600px; max-height: 90vh; border-radius: 20px 20px 0 0; padding: 25px; overflow-y: auto; position: relative; animation: slideUp 0.3s ease;">
                        <button onclick="document.getElementById('univ-detail-overlay').remove()" style="position: absolute; top: 15px; right: 15px; background: #eee; border: none; width: 30px; height: 30px; border-radius: 50%; font-weight: bold; cursor: pointer; color: #555;">X</button>
                        
                        <div style="display: inline-block; padding: 5px 12px; background: #FFF3E0; color: #FF9800; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">
                            ${p.category === 'groupbuy' ? 'housing' : p.category.toUpperCase()}
                        </div>
                        
                        <h2 style="margin: 0 0 15px 0; color: #333; font-size: 1.4rem;">${p.title}</h2>
                        
                        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; font-size: 0.9rem; color: #666; background: #f3f9f3; padding: 12px; border-radius: 10px;">
                            <img src="${hostAvatar}" alt="avatar" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #81C784;">
                            <div style="flex: 1;">
                                <div style="color: #2E7D32; font-weight: bold; font-size: 1rem; margin-bottom: 4px;">${hostFinalNm}</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                    ${hostFinalDp ? `<span style="background: #E8F5E9; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">🎓 ${hostFinalDp}</span>` : ''}
                                    ${studyYear ? `<span style="background: #E8F5E9; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">📅 ${studyYear}</span>` : ''}
                                    ${hostHobby ? `<span style="background: #E8F5E9; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">⭐ ${hostHobby}</span>` : ''}
                                </div>
                            </div>
                        </div>

                        <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; border: 1px solid #eee; margin-bottom: 20px;">
                            ${specificDetails}
                            <div style="margin-top: 5px; border-top: 1px dashed #ccc; padding-top: 5px;"><strong>🕒 ${isZH ? '時間' : 'Time'}:</strong> ${timeStr}</div>
                        </div>

                        <div style="background: #FFF9C4; border: 1px solid #FFE0B2; border-radius: 12px; padding: 15px;">
                            <div style="font-size: 0.8rem; color: #E65100; font-weight: bold; margin-bottom: 5px;">📝 ${isZH ? '詳細說明' : 'Details'}</div>
                            <div style="color: #444; line-height: 1.5; white-space: pre-wrap;">${desc || (isZH ? '無' : 'None')}</div>
                            ${hostBio ? `<div style="margin-top: 10px; border-top: 1px solid #FFE0B2; padding-top: 10px; font-size: 0.85rem; color: #555;"><strong>Host Bio:</strong> ${hostBio}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        };
    }

    loadHomeActivities();

    // --- Feedback Trigger (Time Check) ---
    // Check for unrated activities that are 'success' or expired
    setTimeout(() => {
        import('./rating.js').then(module => {
            module.checkPendingFeedback(user);
        });
    }, 1000); // 1s delay to let UI load

};
