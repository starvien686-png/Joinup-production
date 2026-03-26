import { I18n } from '../services/i18n.js';

export const renderActivities = async () => {
    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');
    const user = userProfileStr ? JSON.parse(userProfileStr) : null;

    let upcoming = [];
    try {
        const [actRes, carpoolRes, studyRes, hangoutRes, housingRes] = await Promise.all([
            fetch('/activities'),
            fetch('/carpools'),
            fetch('/studies'),
            fetch('/hangouts'),
            fetch('/housing')
        ]);

        const [activities, carpools, studies, hangouts, housings] = await Promise.all([
            actRes.json(), carpoolRes.json(), studyRes.json(), hangoutRes.json(), housingRes.json()
        ]);

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
            if (p.status === 'cancelled' || p.status === 'success' || p.status === 'expired' || p.status === 'full') return false;

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

        upcoming = targetPosts.map(p => ({
            ...p,
            id: p.id, category: p.category, title: p.title,
            sportType: p.sport_type, peopleNeeded: p.people_needed,
            eventTime: p.event_time || p.departure_time || p.deadline,
            location: p.location || p.destination || p.meeting_location,
            deadline: p.deadline, description: p.description, hostEmail: p.host_email,
            hostName: p.host_name || 'Host', hostDept: p.host_dept || '', status: 'open',
            createdAt: p.created_at
        }));
        window._cachedActivitiesPosts = upcoming;
    } catch (error) {
        console.error("Gagal load Activities:", error);
    }

    // Urutkan agar post baru langsung di depan (sort by created_at descending)
    upcoming = upcoming.sort((a, b) => new Date(b.createdAt || b.eventTime || 0) - new Date(a.createdAt || a.eventTime || 0));

    // --- KAMUS PENERJEMAH ---
    const getLocTrans = (loc) => {
        const map = {
            '體育健康中心 (1F 健身房)': 'sports.loc.gym_1f', '體育健康中心 (2F 綜合球場)': 'sports.loc.gym_2f',
            '體育健康中心 (3F 羽球場)': 'sports.loc.gym_3f', '游泳池 (室內)': 'sports.loc.pool',
            '學生活動中心 (舞鏡月屋)': 'sports.loc.dance_room', '室外籃球場 (靠宿舍)': 'sports.loc.court_basket',
            '室外排球場 (靠田徑場)': 'sports.loc.court_volley', '網球場': 'sports.loc.court_tennis',
            '田徑場 (司令台)': 'sports.loc.track', '壘球場': 'sports.loc.field_softball',
            '大草皮 (近校門)': 'sports.loc.grass_field', '埔里國小 (籃球場)': 'sports.loc.puli_elem',
            '埔里鎮立育樂中心': 'sports.loc.puli_rec', '虎頭山 (慢跑/飛行傘點)': 'sports.loc.hutou',
            '地理中心碑 (階梯訓練)': 'sports.loc.geographic', '國立中興大學(NCHU)籃球場': 'sports.loc.nchu',
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

    const renderList = () => {
        if (upcoming.length === 0) {
            return `<div style="text-align: center; color: var(--text-secondary); margin-top: 3rem;">${I18n.t('common.no_data')}</div>`;
        }

        return upcoming.map(p => {
            const date = new Date(p.eventTime || p.createdAt || Date.now());
            const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

            const getIconAndColor = (cat, sportType) => {
                if (cat === 'sports') {
                    const color = '#FF7043';
                    if (!sportType) return { icon: '🏅', color };
                    if (sportType.includes('籃') || sportType.toLowerCase().includes('basket')) return { icon: '🏀', color };
                    if (sportType.includes('羽') || sportType.toLowerCase().includes('badminton')) return { icon: '🏸', color };
                    if (sportType.includes('排') || sportType.toLowerCase().includes('volley')) return { icon: '🏐', color };
                    if (sportType.includes('網') || sportType.toLowerCase().includes('tennis')) return { icon: '🎾', color };
                    return { icon: '🏅', color };
                }
                if (cat === 'carpool') return { icon: '🚗', color: '#42A5F5' };
                if (cat === 'housing' || cat === 'groupbuy') return { icon: '🏠', color: '#FFCA28' };
                if (cat === 'study') return { icon: '📚', color: '#66BB6A' };

                // Hangout Icons & Colors
                const color = '#EC407A';
                const hangoutCats = ['travel', 'food', 'Food', 'Outdoor', 'Arts', 'Entertainment', 'Shopping', 'Sports', 'Nightlife'];
                if (hangoutCats.includes(cat)) {
                    if (cat === 'Food' || cat === 'food') return { icon: '🍽️', color };
                    if (cat === 'Outdoor') return { icon: '🏕️', color };
                    if (cat === 'Arts') return { icon: '🎨', color };
                    if (cat === 'Entertainment') return { icon: '🍿', color };
                    if (cat === 'Shopping') return { icon: '🛍️', color };
                    if (cat === 'Sports') return { icon: '🏃', color };
                    if (cat === 'Nightlife') return { icon: '🍻', color };
                    return { icon: '🛍️', color };
                }
                return { icon: '📅', color: '#666' };
            };

            const getCatLabel = (cat) => {
                const mapping = {
                    'sports': 'home.cat.sports', 'carpool': 'home.cat.carpool',
                    'housing': 'home.cat.groupbuy', 'groupbuy': 'home.cat.groupbuy',
                    'study': 'home.cat.study', 'travel': 'home.cat.food', 'food': 'home.cat.food',
                    'Food': 'home.cat.food', 'Outdoor': '户外/踏青', 'Arts': '艺文/展览',
                    'Entertainment': '娱乐/电影', 'Shopping': '逛街/购物', 'Sports': '运动/健身',
                    'Nightlife': '夜生活'
                };
                const key = mapping[cat];
                if (!key) return cat;
                return key.includes('.') ? I18n.t(key) : key;
            };

            const { icon, color } = getIconAndColor(p.category, p.sportType);
            const labelName = p.category === 'sports' && p.sportType ? getSportTrans(p.sportType) : getCatLabel(p.category);
            const translatedLoc = getLocTrans(p.location);

            return `
                <div class="card" onclick="window.showUniversalDetail('${p.id}', '${p.category}')" style="cursor: pointer; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.8rem; background: ${color}15; color: ${color}; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px;">
                            ${icon} ${labelName}
                        </span>
                        <span style="font-size: 0.8rem; color: #999;">${dateStr}</span>
                    </div>
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">${p.title}</h3>
                    
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                        <span>📍 ${translatedLoc || 'NCNU'}</span>
                    </div>

                    ${p.description ? `
                    <p style="color: var(--text-secondary); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${p.description}
                    </p>` : ''}

                    <div style="margin-top: 0.8rem; display: flex; justify-content: flex-end;">
                        <span style="font-size: 0.8rem; color: var(--primary-color);">${I18n.t('common.view_details')} ➜</span>
                    </div>
                </div>
            `;
        }).join('');
    };

    app.innerHTML = `
        <div class="container fade-in" style="padding-bottom: 80px;">
            <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                <button onclick="window.navigateTo('home')" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                <h2 style="margin: 0; font-size: 1.5rem;">${I18n.t('home.section.new_activity')}</h2>
            </header>
            <div class="activity-list">${renderList()}</div>
        </div>
    `;

    if (!document.getElementById('activities-styles')) {
        const style = document.createElement('style');
        style.id = 'activities-styles';
        style.innerHTML = `
            .card { background: white; border-radius: 16px; padding: 1.2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; transition: transform 0.2s, box-shadow 0.2s; }
            .card:active { transform: scale(0.98); }
        `;
        document.head.appendChild(style);
    }

    // Inject universal detail script if it doesn't exist yet
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
            const emailToFind = p.host_email || p.hostEmail || '';

            const hostAvatar = p.profile_pic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            const hostHobby = p.hobby || '';
            const hostBio = p.bio || '';
            const studyYear = p.study_year || '';
            const hostFinalNm = p.host_name || hostNm;
            const hostFinalDp = p.host_dept || hostDp;

            const makeMap = loc => {
                if (!loc) return 'There is no location information';
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
};
