import { MockStore } from '../models/mockStore.js?v=12';
import { I18n } from '../services/i18n.js';
import api from '../utils/api.js';

window.AppEngine = {
    saveApp: (appData) => {
        const apps = JSON.parse(localStorage.getItem('joinup_applications') || '[]');
        appData.id = Date.now().toString();
        apps.push(appData);
        localStorage.setItem('joinup_applications', JSON.stringify(apps));
        return appData.id;
    },
    getApps: (postId) => {
        const apps = JSON.parse(localStorage.getItem('joinup_applications') || '[]');
        return apps.filter(a => String(a.postId) === String(postId));
    },
    updateApp: (appId, status) => {
        const apps = JSON.parse(localStorage.getItem('joinup_applications') || '[]');
        const index = apps.findIndex(a => String(a.id) === String(appId));
        if (index > -1) {
            apps[index].status = status;
            localStorage.setItem('joinup_applications', JSON.stringify(apps));
        }
    }
};

export const renderSports = () => {
    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');

    if (!userProfileStr) {
        alert(I18n.t('auth.profile_incomplete'));
        localStorage.removeItem('isLoggedIn');
        window.location.reload();
        return;
    }

    const user = JSON.parse(userProfileStr);
    let currentState = 'landing';
    let userRole = '';
    const CATEGORY_ID = 'sports';

    let activeFilters = {
        eventType: null,
        dateRange: null,
        peopleCount: null,
        keyword: null
    };

    const getLocName = (val) => {
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
        return map[val] ? I18n.t(map[val]) : val;
    };

    const checkBlocking = async () => {
        const blockingStatus = MockStore.checkBlocking(user.email);
        if (blockingStatus.isBlocked) {
            alert(blockingStatus.message);
            return true;
        }
        return false;
    };

    const renderLanding = () => {
        return `
            <div class="container fade-in" style="height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <span style="font-size: 3rem;">🏀</span>
                    <h1 style="color: var(--primary-dark); margin-top: 1rem;">${I18n.t('sports.title')}</h1>
                    <p style="color: var(--text-secondary);">${I18n.t('sports.subtitle')}</p>
                </div>

                <div style="display: grid; gap: 1rem;">
                    <button id="btn-role-host" class="role-card" style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: none; border-left: 4px solid #FF8C00; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; margin-bottom: 1rem; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">💪</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: var(--text-primary);">${I18n.t('sports.role.host')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${I18n.t('sports.role.host_desc')}</p>
                        </div>
                    </button>

                    <button id="btn-role-partner" class="role-card" style="background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow-sm); border: none; border-left: 4px solid #FFD600; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; margin-bottom: 1rem; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">👟</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: var(--text-primary);">${I18n.t('sports.role.join')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${I18n.t('sports.role.join_desc')}</p>
                        </div>
                    </button>
                    
                    <button id="btn-manage" class="btn" style="background: linear-gradient(135deg, #FFD600, #FF6D00); color: white; margin-top: 1rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 109, 0, 0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        ⚙️ ${I18n.t('home.cat.activity') || '活動'}
                    </button>
                </div>
                
                <button onclick="window.navigateTo('home')" style="position: absolute; top: 1rem; left: 1rem; background: none; border: none; font-size: 1.2rem; cursor: pointer;">
                    ⬅️ ${I18n.t('common.back')}
                </button>
            </div>
        `;
    };

    const renderCreatePost = () => {
        return `
            <div class="container fade-in" style="padding-bottom: 2rem;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2>${I18n.t('sports.create.title')}</h2>
                </header>

                <form id="createPostForm">
                    <h3 style="margin-bottom: 1rem; color: var(--primary-dark); border-bottom: 2px solid var(--primary-light); padding-bottom: 0.5rem;">📋 ${I18n.t('common.description')}</h3>
                    
                    <div class="input-group">
                        <div style="color: #888888; font-size: 12px; text-align: center; margin-top: 10px; margin-bottom: 5px;">${I18n.t('common.financial_disclaimer')}</div>
                        <label>${I18n.t('sports.label.title')} *</label>
                        <input type="text" id="teamName" placeholder="${I18n.t('sports.placeholder.title')}" required>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('sports.label.sport')} *</label>
                        <select id="eventType" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" required>
                            <option value="">${I18n.t('common.select')}</option>
                            <optgroup label="🏀 ${I18n.t('sports.cat.ball')}">
                                <option value="籃球">🏀 ${I18n.t('sports.type.basketball')}</option>
                                <option value="羽球">🏸 ${I18n.t('sports.type.badminton')}</option>
                                <option value="排球">🏐 ${I18n.t('sports.type.volleyball')}</option>
                                <option value="網球">🎾 ${I18n.t('sports.type.tennis')}</option>
                                <option value="桌球">🏓 ${I18n.t('sports.type.table_tennis')}</option>
                                <option value="棒壘球">⚾ ${I18n.t('sports.type.baseball')}</option>
                                <option value="足球">⚽ ${I18n.t('sports.type.soccer')}</option>
                            </optgroup>
                            <optgroup label="💪 ${I18n.t('sports.cat.fitness')}">
                                <option value="健身重訓">🏋️ ${I18n.t('sports.type.gym')}</option>
                                <option value="瑜珈">🧘 ${I18n.t('sports.type.yoga')}</option>
                                <option value="有氧舞蹈">💃 ${I18n.t('sports.type.aerobics')}</option>
                            </optgroup>
                            <optgroup label="🏃 ${I18n.t('sports.cat.outdoor')}">
                                <option value="慢跑">🏃 ${I18n.t('sports.type.jogging')}</option>
                                <option value="游泳">🏊 ${I18n.t('sports.type.swimming')}</option>
                                <option value="騎單車">🚴 ${I18n.t('sports.type.cycling')}</option>
                                <option value="其他">✨ ${I18n.t('sports.type.other')}</option>
                            </optgroup>
                        </select>
                        <input type="text" id="customEventType" style="margin-top: 0.5rem; width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: none;" placeholder="${I18n.t('sports.type.other')}">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${I18n.t('reg.name_label')} *</label>
                            <input type="text" id="hostName" value="${user.name || user.displayName || ''}" required>
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('reg.major_label')} *</label>
                            <input type="text" id="hostDept" value="${user.department || ''}" placeholder="" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('common.people_needed')} *</label>
                        <input type="number" id="requiredPeople" min="2" max="20" value="4" required>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${I18n.t('sports.label.time')} *</label>
                            <input type="datetime-local" id="eventTime" required>
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('housing.label.deadline')} *</label>
                            <input type="datetime-local" id="deadline" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('sports.label.location')} *</label>
                        <select id="meetingPoint" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" required>
                            <option value="">${I18n.t('common.select')}</option>
                            <optgroup label="🏢 ${I18n.t('sports.loc_group.indoor')}">
                                <option value="體育健康中心 (1F 健身房)">🏋️ ${I18n.t('sports.loc.gym_1f')}</option>
                                <option value="體育健康中心 (2F 綜合球場)">🏐 ${I18n.t('sports.loc.gym_2f')}</option>
                                <option value="體育健康中心 (3F 羽球場)">🏸 ${I18n.t('sports.loc.gym_3f')}</option>
                                <option value="游泳池 (室內)">🏊 ${I18n.t('sports.loc.pool')}</option>
                                <option value="學生活動中心 (舞鏡月屋)">💃 ${I18n.t('sports.loc.dance_room')}</option>
                            </optgroup>
                            <optgroup label="🏀 ${I18n.t('sports.loc_group.outdoor')}">
                                <option value="室外籃球場 (靠宿舍)">🏀 ${I18n.t('sports.loc.court_basket')}</option>
                                <option value="室外排球場 (靠田徑場)">🏐 ${I18n.t('sports.loc.court_volley')}</option>
                                <option value="網球場">🎾 ${I18n.t('sports.loc.court_tennis')}</option>
                                <option value="田徑場 (司令台)">🏃 ${I18n.t('sports.loc.track')}</option>
                                <option value="壘球場">⚾ ${I18n.t('sports.loc.field_softball')}</option>
                                <option value="大草皮 (近校門)">⛺ ${I18n.t('sports.loc.grass_field')}</option>
                            </optgroup>
                            <optgroup label="🏘️ ${I18n.t('sports.loc_group.puli')}">
                                <option value="埔里國小 (籃球場)">🏀 ${I18n.t('sports.loc.puli_elem')}</option>
                                <option value="埔里鎮立育樂中心">🏸 ${I18n.t('sports.loc.puli_rec')}</option>
                                <option value="虎頭山 (慢跑/飛行傘點)">🌄 ${I18n.t('sports.loc.hutou')}</option>
                                <option value="地理中心碑 (階梯訓練)">🧗 ${I18n.t('sports.loc.geographic')}</option>
                            </optgroup>
                             <optgroup label="${I18n.t('sports.loc_group.other')}">
                                <option value="國立中興大學(NCHU)籃球場">🏀 ${I18n.t('sports.loc.nchu')}</option>
                            </optgroup>
                            <option value="自訂">📍 ${I18n.t('sports.loc.custom')}</option>
                        </select>
                        <input type="text" id="customLocation" style="margin-top: 0.5rem; width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: none;" placeholder="${I18n.t('sports.loc.custom')}">
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('sports.label.description')}</label>
                        <textarea id="description" rows="4" placeholder="" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary btn-large" style="margin-top: 1.5rem; width: 100%;">${I18n.t('common.submit')}</button>
                </form>
            </div>
        `;
    };

    const renderList = async () => {
        let posts = [];
        let myStatuses = {};
        try {
            if (user && user.email) {
                try {
                    const statusRes = await fetch(`/api/v1/join/my-statuses?user_email=${encodeURIComponent(user.email)}`);
                    const statusData = await statusRes.json();
                    if (statusData.success) myStatuses = statusData.data || {};
                } catch (e) { console.warn("Fail fetch statuses", e); }
            }
            const response = await fetch(`/activities?user_email=${encodeURIComponent(user.email)}`);
            const dbPosts = await response.json();
            const availablePosts = dbPosts.filter(p => {
                // Strictly hide deleted and cancelled posts
                if (p.status === 'cancelled' || p.status === 'deleted') return false;

                return true;
            });

            posts = availablePosts.map(p => ({
                id: p.id,
                category: p.category,
                teamName: p.title,
                eventType: p.sport_type,
                maxParticipants: p.people_needed,
                eventTime: p.event_time,
                deadline: p.deadline,
                meetingPoint: p.location,
                description: p.description,
                status: 'open',
                authorId: p.host_email,
                hostName: p.host_name || 'Host',
                hostDept: p.host_dept || '',
                display_status: p.display_status,
                participants: [{ userId: p.host_email, role: 'host' }],
                createdAt: p.created_at
            })).filter(p => p.category === CATEGORY_ID);
        } catch (error) {
            console.error("Gagal ambil data List:", error);
        }

        if (activeFilters.eventType) {
            posts = posts.filter(p => p.eventType === activeFilters.eventType);
        }

        if (activeFilters.dateRange) {
            const targetDate = new Date();
            if (activeFilters.dateRange === 'today') {
                targetDate.setHours(23, 59, 59, 999);
                posts = posts.filter(p => new Date(p.eventTime) <= targetDate);
            } else if (activeFilters.dateRange === 'week') {
                targetDate.setDate(targetDate.getDate() + 7);
                posts = posts.filter(p => new Date(p.eventTime) <= targetDate);
            } else if (activeFilters.dateRange === 'month') {
                targetDate.setMonth(targetDate.getMonth() + 1);
                posts = posts.filter(p => new Date(p.eventTime) <= targetDate);
            }
        }

        if (activeFilters.peopleCount) {
            posts = posts.filter(p => p.maxParticipants <= activeFilters.peopleCount);
        }

        const activeFilterCount = [
            activeFilters.eventType,
            activeFilters.dateRange,
            activeFilters.peopleCount
        ].filter(Boolean).length;

        if (activeFilters.keyword) {
            const kw = activeFilters.keyword.toLowerCase();
            posts = posts.filter(p =>
                (p.teamName && p.teamName.toLowerCase().includes(kw)) ||
                (p.hostName && p.hostName.toLowerCase().includes(kw)) ||
                (p.description && p.description.toLowerCase().includes(kw))
            );
        }

        // Sensor Bahasa List View
        const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';
        const isZH = currentLang.toLowerCase().includes('zh');

        const txtHost = isZH ? '發起人' : 'Host';
        const txtJoin = isZH ? '加入' : 'Join';
        const txtJoinChat = isZH ? '進入聊天室' : 'Enter Chat Room';
        const txtFull = isZH ? '額滿' : 'Full';
        const txtExpired = I18n.t('status.expired');

        const postsHtml = posts.length ? posts.map(p => {
            const isHost = (p.authorId === user.email);
            const totalActiveCount = Math.max(1, parseInt(p.approvedCount) || 0);
            const isSportsFull = totalActiveCount >= p.maxParticipants || p.status === 'full';
            const isExpired = p.display_status === 'expired';
            const isSuccess = p.status === 'success';
            const statusKey = `${p.category || 'sports'}_${p.id}`;
            const userStatus = myStatuses[statusKey];
            const isParticipant = userStatus === 'approved' || userStatus === 'accepted';

            let actionBtn = '';
            if (isHost || isParticipant) {
                actionBtn = `
                <button 
                    class="btn" 
                    onclick="event.stopPropagation(); window.openGroupChat('${p.id}');" 
                    style="width: 100%; margin-top: 0.8rem; padding: 0.7rem; font-weight: bold; background: linear-gradient(135deg, #42A5F5, #1976D2); border: none; color: white; border-radius: 8px; cursor: pointer; transition: transform 0.2s; font-size: 0.95rem;"
                >
                    💬 ${txtJoinChat}
                </button>`;
            } else if (user && (user.is_admin || user.email === 'ncnujoinupadmin@gmail.com')) {
                actionBtn = `
                <button 
                    class="btn" 
                    onclick="event.stopPropagation(); window.openJoinForm('${p.id}', '${p.teamName}');" 
                    style="width: 100%; margin-top: 0.8rem; padding: 0.7rem; font-weight: bold; background: linear-gradient(135deg, #607D8B, #455A64); border: none; color: white; border-radius: 8px; cursor: pointer; transition: transform 0.2s; font-size: 0.95rem;"
                >
                    🕵️‍♀️ ${isZH ? 'Pantau Acara' : 'Admin Override'}
                </button>`;
            } else if (isExpired || isSportsFull || isSuccess) {
                const label = isExpired ? txtExpired : (isSportsFull ? txtFull : (isZH ? '已完成' : 'Finished'));
                actionBtn = `
                <button 
                    class="btn btn-full" 
                    disabled 
                    style="width: 100%; margin-top: 0.8rem; padding: 0.7rem; font-weight: bold; border: none; color: white; border-radius: 8px; cursor: not-allowed; font-size: 0.95rem; background: #9E9E9E;"
                >
                    ${label}
                </button>`;
            } else {
                actionBtn = `
                <button 
                    class="btn btn-primary" 
                    onclick="event.stopPropagation(); window.openJoinForm('${p.id}', '${p.teamName}');" 
                    style="width: 100%; margin-top: 0.8rem; padding: 0.7rem; font-weight: bold; background: linear-gradient(135deg, #FF7043, #E64A19); border: none; color: white; border-radius: 8px; cursor: pointer; transition: transform 0.2s; font-size: 0.95rem;"
                >
                    ${txtJoin}
                </button>`;
            }

            return `
            <div class="card" style="${isExpired ? 'opacity: 0.6;' : (isSportsFull || isSuccess ? 'opacity: 0.8;' : '')} margin-bottom: 1rem;">
                <div onclick="window.showEventDetail('${p.id}')" style="cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.8rem; padding: 0.2rem 0.5rem; background: #FFEBEE; color: #D32F2F; border-radius: 4px;">
                            ${p.eventType} ${isExpired ? `<span style="background: #9E9E9E; color: white; padding: 1px 6px; border-radius: 4px; margin-left: 5px; font-size: 0.6rem; font-weight: normal;">${I18n.t('status.expired')}</span>` : ''}
                        </span>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 style="margin-bottom: 0.5rem;">${p.teamName}</h3>
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                        <span>🏷️ ${txtHost}: ${p.hostName} (${p.hostDept})</span>
                        ${p.is_admin ? `<span style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 900; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">🛡️ ADMIN</span>` : ''}
                    </div>
                    <div style="display: flex; gap: 1rem; color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                        <span>👥 ${totalActiveCount} / ${p.maxParticipants}</span>
                        <span>📅 ${new Date(p.eventTime).toLocaleDateString()}</span>
                        <span>📍 ${getLocName(p.meetingPoint)}</span>
                    </div>
                    ${p.description ? `
                    <p style="color: var(--text-secondary); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${p.description}
                    </p>` : ''}
                </div>
                ${actionBtn}
            </div>
        `;
        }).join('') : `<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">${I18n.t('common.no_data') || 'No items'}</p>`;

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1rem; display: flex; align-items: center;">
                    <button id="btn-list-back" class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2 style="flex: 1; margin: 0;">${I18n.t('sports.role.join')}</h2>
                    <button id="btn-filter" style="background: #FFEBEE; border: none; padding: 0.5rem 1rem; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #D32F2F;">
                        ⚙️ ${I18n.t('common.filter')}
                        ${activeFilterCount > 0 ? `<span style="background: #f44336; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px;">${activeFilterCount}</span>` : ''}
                    </button>
                </header>

                <div id="search-container" style="margin-bottom: 1rem; position: relative;">
                    <input type="text" id="search-events" value="${activeFilters.keyword || ''}" placeholder="${I18n.t('common.search')}..." style="width: 100%; padding: 12px 20px; border-radius: 20px; border: 1px solid #ddd; font-size: 1rem; outline: none; transition: border-color 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <span style="position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); color: #888; font-size: 1.1rem;">🔍</span>
                </div>
                
                ${activeFilterCount > 0 ? `
                <div style="margin-bottom: 1rem; padding: 0.5rem 1rem; background: #FFEBEE; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.9rem; color: #D32F2F;">✓ ${activeFilterCount} ${I18n.t('common.active')}</span>
                    <button id="btn-clear-filters" style="background: none; border: none; color: #D32F2F; font-size: 0.9rem; cursor: pointer; text-decoration: underline;">${I18n.t('common.clear')}</button>
                </div>
                ` : ''}
                
                <div class="post-list">
                    ${postsHtml}
                </div>
            </div>
        `;
    };

    window.openJoinForm = async (postId, teamName) => {
        if (await checkBlocking()) return;

        const existingOverlay = document.getElementById('join-overlay');
        if (existingOverlay) existingOverlay.remove();

        const currentLang = localStorage.getItem('language') || localStorage.getItem('lang') || 'zh-TW';
        const isZH = currentLang.toLowerCase().includes('zh');

        const t = (key, fallbackZH, fallbackEN) => {
            if (typeof I18n !== 'undefined' && I18n.t) {
                const trans = I18n.t(key);
                if (trans && trans !== key) return trans;
            }
            return isZH ? fallbackZH : fallbackEN;
        };

        const currentUserStr = localStorage.getItem('userProfile');
        let u = currentUserStr ? JSON.parse(currentUserStr) : {};
        const isAdmin = u.is_admin || u.email === 'ncnujoinupadmin@gmail.com';

        const msgConfirm = isAdmin ? 'Admin Override Mode 🕵️‍♀️' : (isZH ? '確認加入' : 'Confirm Join');
        const msgDesc = isAdmin 
            ? 'You are about to join this activity with <strong>Superadmin Bypass</strong>. You will be approved immediately and added to the chat.'
            : (isZH ? `您確定要報名參與 <strong>${teamName}</strong> 嗎？發起人將會收到您的申請。` : `Are you sure you want to apply for <strong>${teamName}</strong>? The host will receive your request.`);
        const msgCancel = isZH ? '取消' : 'Cancel';
        const msgSubmit = isZH ? '確認送出' : 'Submit';

        const formHtml = `
            <div id="join-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);">
                <div style="background: var(--bg-card); width: 85%; max-width: 350px; border-radius: 16px; padding: 2rem; text-align: center; box-shadow: var(--shadow-lg); animation: scaleIn 0.2s ease-out; border: 1px solid var(--border-color);">
                    <h3 style="margin: 0 0 1rem 0; color: var(--text-primary);">${msgConfirm}</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.5;">${msgDesc}</p>
                    <div style="display: flex; gap: 1rem;">
                        <button onclick="document.getElementById('join-overlay').remove()" class="btn" style="flex: 1; padding: 0.8rem; background: var(--bg-secondary); color: var(--text-secondary); border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                            ${msgCancel}
                        </button>
                        <button id="btn-confirm-join" class="btn btn-primary" style="flex: 1; padding: 0.8rem; background: #FF8C00; color: white; border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">
                            ${msgSubmit}
                        </button>
                    </div>
                </div>
            </div>
            <style>@keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }</style>
        `;
        document.body.insertAdjacentHTML('beforeend', formHtml);

        document.getElementById('btn-confirm-join').onclick = async () => {
            const currentUserStr = localStorage.getItem('userProfile');
            let user = currentUserStr ? JSON.parse(currentUserStr) : {};

            // MENGAMBIL DATA PALING FRESH DARI DATABASE LOKAL
            if (window.MockStore && window.MockStore.getUser) {
                const fresh = window.MockStore.getUser(user.email);
                if (fresh) user = fresh;
            } else {
                const allUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
                const fresh = allUsers.find(u => u.email === user.email);
                if (fresh) user = fresh;
            }

            // PENYEDOT FOTO UNIVERSAL (Agar Foto Profil yang muncul di Account Settings tidak hilang)
            const finalAvatar = user.profile_pic || user.profilePic || user.avatar || user.picture || '';

            // --- BACKEND INTEGRATION ---
            try {
                const result = await api.fetch('/api/v1/join', {
                    method: 'POST',
                    body: { event_type: 'sports', event_id: postId, user_email: user.email }
                });

                if (result.success && result.data && (result.data.status === 'approved' || result.data.status === 'accepted')) {
                    alert(isZH ? '已成功進入監看模式！🕵️‍♀️' : 'Admin override success! Entering monitor mode.');
                    document.getElementById('join-overlay').remove();
                    updateView(); // Refresh list to show "Enter Chat"
                    return;
                }
            } catch (e) {
                console.error("Backend join error:", e);
            }

            const appId = window.AppEngine.saveApp({
                postId: postId,
                applicantId: user.email,
                applicantName: user.displayName || user.name || 'Pelajar',
                applicantDept: user.department || user.major || '',
                applicantBio: user.bio || '',
                applicantHobby: user.hobby || '',
                applicantPic: finalAvatar,
                status: 'pending'
            });

            try {
                const response = await fetch('/activities');
                const posts = await response.json();
                const post = posts.find(p => String(p.id) === String(postId));

                if (post && window.sendAppNotification) {
                    const linkPayload = `action:review_sports_app:${appId}:${postId}:${user.email}:${encodeURIComponent(teamName)}`;
                    window.sendAppNotification(
                        post.host_email,
                        'action',
                        isZH ? `🔔 ${user.displayName || user.name} 想加入您的活動「${teamName}」！` : `🔔 ${user.displayName || user.name} wants to join "${teamName}"!`,
                        linkPayload
                    );
                }
            } catch (e) { console.error("Gagal kirim notif", e); }

            const successMsg = isZH ? '報名已送出！請等待發起人確認。' : 'Application sent! Please wait for host confirmation.';
            alert(successMsg);

            document.getElementById('join-overlay').remove();
        };
    };

    const renderFilterPanel = async () => {
        const sportsList = [
            { id: '籃球', icon: '🏀', key: 'sports.type.basketball' },
            { id: '羽球', icon: '🏸', key: 'sports.type.badminton' },
            { id: '排球', icon: '🏐', key: 'sports.type.volleyball' },
            { id: '網球', icon: '🎾', key: 'sports.type.tennis' },
            { id: '桌球', icon: '🏓', key: 'sports.type.table_tennis' },
            { id: '棒壘球', icon: '⚾', key: 'sports.type.baseball' },
            { id: '足球', icon: '⚽', key: 'sports.type.soccer' },
            { id: '健身重訓', icon: '🏋️', key: 'sports.type.gym' },
            { id: '瑜珈', icon: '🧘', key: 'sports.type.yoga' },
            { id: '慢跑', icon: '🏃', key: 'sports.type.jogging' },
            { id: '游泳', icon: '🏊', key: 'sports.type.swimming' },
            { id: '騎單車', icon: '🚴', key: 'sports.type.cycling' }
        ];

        let eventTypesHtml = sportsList.map(sport => {
            const isActive = activeFilters.eventType === sport.id;
            const label = (typeof I18n !== 'undefined') ? I18n.t(sport.key) : sport.id;
            return `<button class="filter-option ${isActive ? 'active' : ''}" data-filter="eventType" data-value="${sport.id}" style="padding: 0.6rem 1rem; border: 2px solid var(--border-color); border-radius: 20px; background: ${isActive ? '#FFF3E0' : 'white'}; border-color: ${isActive ? '#FF8C00' : 'var(--border-color)'}; color: ${isActive ? '#E65100' : '#555'}; font-weight: ${isActive ? 'bold' : 'normal'}; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">${sport.icon} ${label}</button>`;
        }).join('');

        return `
            <div id="filter-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: end; z-index: 1000;">
                <div class="slide-up" style="background: var(--bg-card); border: 1px solid var(--border-color); width: 100%; border-radius: 16px 16px 0 0; padding: 1.5rem; max-height: 85vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                        <h3 style="color: var(--text-primary);">🔍 ${I18n.t('common.filter')}</h3>
                        <button onclick="window.closeFilterPanel()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-primary);">×</button>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.8rem; font-weight: bold; font-size: 1.1rem; color: var(--text-primary);">${I18n.t('sports.label.sport')}</label>
                        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                            ${eventTypesHtml}
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: var(--text-primary);">${I18n.t('common.date')}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="filter-option ${activeFilters.dateRange === 'today' ? 'active' : ''}" data-filter="dateRange" data-value="today" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.dateRange === 'today' ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.dateRange === 'today' ? 'white' : 'inherit'}; cursor: pointer;">${I18n.t('outing.filter.date_today')}</button>
                            <button class="filter-option ${activeFilters.dateRange === 'week' ? 'active' : ''}" data-filter="dateRange" data-value="week" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.dateRange === 'week' ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.dateRange === 'week' ? 'white' : 'inherit'}; cursor: pointer;">${I18n.t('outing.filter.date_week')}</button>
                            <button class="filter-option ${activeFilters.dateRange === 'month' ? 'active' : ''}" data-filter="dateRange" data-value="month" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.dateRange === 'month' ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.dateRange === 'month' ? 'white' : 'inherit'}; cursor: pointer;">${I18n.t('outing.filter.date_month')}</button>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: var(--text-primary);">${I18n.t('common.people_needed')} <=</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="filter-option ${activeFilters.peopleCount === 5 ? 'active' : ''}" data-filter="peopleCount" data-value="5" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.peopleCount === 5 ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.peopleCount === 5 ? 'white' : 'inherit'}; cursor: pointer;">5</button>
                            <button class="filter-option ${activeFilters.peopleCount === 10 ? 'active' : ''}" data-filter="peopleCount" data-value="10" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.peopleCount === 10 ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.peopleCount === 10 ? 'white' : 'inherit'}; cursor: pointer;">10</button>
                            <button class="filter-option ${activeFilters.peopleCount === 20 ? 'active' : ''}" data-filter="peopleCount" data-value="20" style="flex: 1; padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: ${activeFilters.peopleCount === 20 ? 'var(--primary-light)' : 'var(--bg-card)'}; color: ${activeFilters.peopleCount === 20 ? 'white' : 'inherit'}; cursor: pointer;">20</button>
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 2rem;">
                        <button onclick="window.resetFilters()" class="btn" style="flex: 1; background: var(--bg-body); color: var(--text-primary); border: 1px solid var(--border-color);">${I18n.t('common.reset')}</button>
                        <button onclick="window.applyFilters()" class="btn btn-primary" style="flex: 2;">${I18n.t('common.apply')}</button>
                    </div>
                </div>
            </div>
            <style>
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .slide-up { animation: slideUp 0.3s ease-out; }
            </style>
        `;
    };

    const updateView = async () => {
        let html = '';
        if (currentState === 'landing') html = renderLanding();
        else if (currentState === 'create') html = renderCreatePost();
        else if (currentState === 'list') html = await renderList();

        const isZH = (localStorage.getItem('language') || 'zh-TW').includes('zh');
        const navHtml = `
            <nav class="bottom-nav" style="display: flex; position: fixed; bottom: 0; left: 0; width: 100%; background: var(--bg-card); border-top: 1px solid var(--border-color); padding: 10px 0; justify-content: space-around; align-items: center; z-index: 1000; box-shadow: 0 -2px 10px rgba(0,0,0,0.05);">
                <a href="#" class="nav-item" onclick="window.navigateTo('home')" style="text-decoration: none; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                    <span style="font-size: 1.4rem;">🏠</span>
                    <span style="font-size: 0.75rem; font-weight: bold;">${I18n.t('nav.home', '首頁')}</span>
                </a>
                <a href="#" class="nav-item" onclick="window.navigateTo('my-activities')" style="text-decoration: none; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                    <span style="font-size: 1.4rem;">📋</span>
                    <span style="font-size: 0.75rem; font-weight: bold;">${I18n.t('nav.activities', '活動')}</span>
                </a>
                <a href="#" class="nav-item" onclick="window.navigateTo('messages')" style="text-decoration: none; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                    <span style="font-size: 1.4rem; position: relative;">
                        💬
                        <span id="unread-badge-nav" class="unread-badge" style="display: none; position: absolute; top: -5px; right: -8px; background: #FF3D00; color: white; font-size: 0.65rem; padding: 2px 5px; border-radius: 10px; border: 2px solid white; min-width: 14px; text-align: center;">0</span>
                    </span>
                    <span style="font-size: 0.75rem; font-weight: bold;">${I18n.t('nav.messages', '訊息')}</span>
                </a>
                <a href="#" class="nav-item" onclick="window.navigateTo('profile')" style="text-decoration: none; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                    <span style="font-size: 1.4rem;">👤</span>
                    <span style="font-size: 0.75rem; font-weight: bold;">${I18n.t('nav.profile', '我的')}</span>
                </a>
            </nav>
        `;
        app.innerHTML = html + navHtml;

        if (currentState === 'landing') bindLandingListeners();
        else if (currentState === 'create') bindCreateListeners();
        else if (currentState === 'list') bindListListeners();
        
        if (window.checkNotificationBadge) window.checkNotificationBadge();
    };

    const bindLandingListeners = () => {
        document.getElementById('btn-role-host')?.addEventListener('click', () => { currentState = 'create'; updateView(); });
        document.getElementById('btn-role-partner')?.addEventListener('click', () => { currentState = 'list'; updateView(); });
        document.getElementById('btn-manage')?.addEventListener('click', () => { window.navigateTo('my-activities'); });
    };

    const bindCreateListeners = () => {
        document.querySelector('.btn-back')?.addEventListener('click', () => { currentState = 'landing'; updateView(); });
        
        const eventTypeSelect = document.getElementById('eventType');
        const customEventType = document.getElementById('customEventType');
        eventTypeSelect?.addEventListener('change', () => {
            customEventType.style.display = eventTypeSelect.value === '其他' ? 'block' : 'none';
        });

        const meetingPointSelect = document.getElementById('meetingPoint');
        const customLocation = document.getElementById('customLocation');
        meetingPointSelect?.addEventListener('change', () => {
            customLocation.style.display = meetingPointSelect.value === '自訂' ? 'block' : 'none';
        });

        document.getElementById('createPostForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = "⏳..."; btnSubmit.disabled = true;

            try {
                const sportType = eventTypeSelect.value === '其他' ? customEventType.value : eventTypeSelect.value;
                const location = meetingPointSelect.value === '自訂' ? customLocation.value : meetingPointSelect.value;

                const postData = {
                    host_email: user.email,
                    host_name: document.getElementById('hostName').value,
                    host_dept: document.getElementById('hostDept').value,
                    category: 'sports',
                    title: document.getElementById('teamName').value,
                    sport_type: sportType,
                    people_needed: parseInt(document.getElementById('requiredPeople').value),
                    event_time: document.getElementById('eventTime').value.replace('T', ' ') + ':00',
                    deadline: document.getElementById('deadline').value.replace('T', ' ') + ':00',
                    location: location,
                    description: document.getElementById('description').value
                };

                const response = await fetch('/create-activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });

                if (response.ok) {
                    alert(I18n.t('common.post_success') || "Success! 🎉");
                    window.navigateTo('my-activities');
                } else {
                    const err = await response.json();
                    alert("Error: " + (err.error || "Unknown"));
                }
            } catch (err) { alert("Network Error: " + err.message); }
            finally { btnSubmit.innerText = originalText; btnSubmit.disabled = false; }
        });
    };

    const bindListListeners = () => {
        document.getElementById('btn-list-back')?.addEventListener('click', () => { currentState = 'landing'; updateView(); });
        document.getElementById('btn-filter')?.addEventListener('click', async () => {
            const overlay = document.createElement('div');
            overlay.innerHTML = await renderFilterPanel();
            app.appendChild(overlay.firstElementChild);
            bindFilterOptions();
        });

        const searchInput = document.getElementById('search-events');
        searchInput?.addEventListener('input', (e) => {
            activeFilters.keyword = e.target.value;
            // Debounce or immediate update? Immediate for now as per design
            updateView();
        });

        document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
            window.resetFilters();
        });
    };

    const bindFilterOptions = () => {
        document.querySelectorAll('.filter-option').forEach(btn => {
            btn.onclick = () => {
                const filterType = btn.getAttribute('data-filter');
                const value = btn.getAttribute('data-value');
                const parsedValue = filterType === 'peopleCount' ? parseInt(value) : value;

                if (activeFilters[filterType] === parsedValue) {
                    activeFilters[filterType] = null;
                } else {
                    activeFilters[filterType] = parsedValue;
                }
                
                const overlay = document.getElementById('filter-overlay');
                if (overlay) {
                    overlay.outerHTML = renderFilterPanel().then(html => {
                        const newOverlay = document.createElement('div');
                        newOverlay.innerHTML = html;
                        overlay.replaceWith(newOverlay.firstElementChild);
                        bindFilterOptions();
                    });
                }
            };
        });
    };

    window.closeFilterPanel = () => {
        document.getElementById('filter-overlay')?.remove();
    };

    window.resetFilters = () => {
        activeFilters = { eventType: null, dateRange: null, peopleCount: null, keyword: null };
        window.closeFilterPanel();
        updateView();
    };

    window.showEventDetail = (postId) => {
         // Simple detail view or alert
         alert(I18n.t('common.loading') || "Loading...");
    };

    window.openGroupChat = (activityId) => {
        window.navigateTo(`messages?room=sports_${activityId}`);
    };

    updateView();
};


