import { MockStore } from '../models/mockStore.js';
import { I18n } from '../services/i18n.js';
import { openRatingModal } from './rating.js';
import api from '../utils/api.js';

// --- MESIN PENDAFTARAN HOUSING ---
window.HousingAppEngine = {
    saveApp: (appData) => {
        const apps = JSON.parse(localStorage.getItem('joinup_housing_apps') || '[]');
        appData.id = Date.now().toString();
        apps.push(appData);
        localStorage.setItem('joinup_housing_apps', JSON.stringify(apps));
        return appData.id;
    },
    getApps: (postId) => {
        const apps = JSON.parse(localStorage.getItem('joinup_housing_apps') || '[]');
        return apps.filter(a => String(a.postId) === String(postId));
    },
    updateApp: (appId, status) => {
        const apps = JSON.parse(localStorage.getItem('joinup_housing_apps') || '[]');
        const index = apps.findIndex(a => String(a.id) === String(appId));
        if (index > -1) {
            apps[index].status = status;
            localStorage.setItem('joinup_housing_apps', JSON.stringify(apps));
        }
    }
};


export const renderGroupBuy = () => {
    const app = document.getElementById('app');
    const userProfileStr = localStorage.getItem('userProfile');

    if (!userProfileStr) {
        alert(I18n.t('auth.profile_incomplete'));
        localStorage.removeItem('isLoggedIn');
        window.location.reload();
        return;
    }

    const user = JSON.parse(userProfileStr);

    // State management for this view
    let currentState = 'landing'; // landing, location_select, create_on_campus, create_off_campus, list, detail, manage
    let userRole = ''; // 'poster' or 'partner'
    let currentFilter = 'all'; // for list view
    let currentFilters = {
        keyword: '',
        postTypeCategory: 'on_campus',
        role: null,
        gender: 'any',
        dormType: null,
        minRent: null,
        maxRent: null
    };
    let activeFilters = {
        genderPreference: null,
        budgetRange: null,
        dormType: [],
        scheduleTags: [],
        habitTags: [],
        peopleCount: null
    }; // Advanced filters
    const CATEGORY_ID = 'groupbuy'; // Maps to '一起合住吧'

    // --- Helper Functions ---
    const getGoogleMapsLink = (location) => {
        // If location is vague, append Puli/Nantou context
        let query = location;
        if (!query.includes('埔里') && !query.includes('暨大') && !query.includes('南投')) {
            query = '南投縣埔里鎮 ' + query;
        }
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    };

    const getGoogleMapsEmbed = (location) => {
        let query = location;
        if (!query.includes('埔里') && !query.includes('暨大') && !query.includes('南投')) {
            query = '南投縣埔里鎮 ' + query;
        }
        return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    };

    // --- Blocking Check ---
    const checkBlocking = async () => {
        const blockingStatus = MockStore.checkBlocking(user.email);
        if (blockingStatus.isBlocked) {
            alert(blockingStatus.message);
            // Open feedback for the first pending item
            const firstPending = blockingStatus.pendingItems[0];
            const allPosts = await MockStore.getPosts({ includeAll: true });
            if (!Array.isArray(allPosts)) return true;
            const post = allPosts.find(p => p.id === firstPending.id);

            if (post) {
                openRatingModal(post, () => {
                    window.location.reload();
                });
            }
            return true; // Blocked
        }
        return false; // Not blocked
    };
    // --- Render Functions ---

    const renderLanding = () => {
        return `
            <div class="container fade-in" style="height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <span style="font-size: 3rem;">🏠</span>
                    <h1 style="color: var(--primary-dark); margin-top: 1rem;">${I18n.t('housing.title')}</h1>
                    <p style="color: var(--text-secondary);">${I18n.t('housing.subtitle')}</p>
                </div>

                <div style="display: grid; gap: 1rem;">
                    <button id="btn-role-poster" class="role-card" style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: none; border-left: 4px solid #FF8C00; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; margin-bottom: 1rem; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">🏠</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: #333;">${I18n.t('housing.role.host')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: #666;">${I18n.t('housing.role.host_desc')}</p>
                        </div>
                    </button>

                    <button id="btn-role-partner" class="role-card" style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: none; border-left: 4px solid #FFD600; padding: 1.5rem; text-align: left; display: flex; align-items: center; cursor: pointer; width: 100%; margin-bottom: 1rem; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <span style="font-size: 2.5rem; margin-right: 1.5rem;">👀</span>
                        <div>
                            <h3 style="margin: 0 0 0.2rem 0; font-size: 1.2rem; color: #333;">${I18n.t('housing.role.partner')}</h3>
                            <p style="margin: 0; font-size: 0.9rem; color: #666;">${I18n.t('housing.role.partner_desc')}</p>
                        </div>
                    </button>
                    
                    <button id="btn-manage" class="btn" style="background: linear-gradient(135deg, #FFD600, #FF6D00); color: white; margin-top: 1rem; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 109, 0, 0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        ⚙️ ${I18n.t('common.manage')}
                    </button>
                </div>
                
                <button onclick="window.navigateTo('home')" style="position: absolute; top: 1rem; left: 1rem; background: none; border: none; font-size: 1.2rem; cursor: pointer;">
                    ⬅️ ${I18n.t('common.back')}
                </button>
            </div>
        `;
    };

    const renderLocationSelect = () => {
        return `
            <div class="container fade-in" style="height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                <header style="position: absolute; top: 1rem; left: 1rem;">
                    <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">⬅️</button>
                </header>

                <div style="text-align: center; margin-bottom: 2rem;">
                    <h2>${I18n.t('housing.create.select_loc')}</h2>
                </div>

                <div style="display: grid; gap: 1rem;">
                    <button id="btn-loc-on-campus" class="card" style="text-align: center; padding: 2rem; cursor: pointer;">
                        <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🏫</span>
                        <h3 style="margin: 0;">${I18n.t('housing.loc.on_campus')}</h3>
                        <p style="margin: 1rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">${I18n.t('housing.role.host_desc')}</p>
                    </button>

                    <button id="btn-loc-off-campus" class="card" style="text-align: center; padding: 2rem; cursor: pointer;">
                        <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🏘️</span>
                        <h3 style="margin: 0;">${I18n.t('housing.loc.off_campus')}</h3>
                        <p style="margin: 1rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">${I18n.t('housing.role.host_desc')}</p>
                    </button>
                </div>
            </div>
        `;
    };

    const renderCreatePostOnCampus = () => {
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        return `
            <div class="container fade-in" style="padding-bottom: 2rem;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2>${I18n.t('housing.create.title_on')}</h2>
                </header>

                <form id="createPostForm">
                    <input type="hidden" id="postTypeCategory" value="on_campus">
                    
                    <!-- 基本資訊 -->
                    <h3 style="margin-bottom: 1rem; color: var(--primary-dark); border-bottom: 2px solid var(--primary-light); padding-bottom: 0.5rem;">📋 ${I18n.t('common.description')}</h3>
                    
                    <div class="input-group">
                        <div style="color: #888888; font-size: 12px; text-align: center; margin-top: 10px; margin-bottom: 5px;">${I18n.t('common.financial_disclaimer')}</div>
                        <label>${I18n.t('sports.label.title')} *</label>
                        <input type="text" id="postTitle" placeholder="${I18n.t('housing.placeholder.title')}" required>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${I18n.t('reg.name_label')} *</label>
                            <input type="text" id="authorName" value="${userProfile.name || userProfile.displayName || ''}" required>
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('reg.major_label')} *</label>
                            <input type="text" id="authorDept" value="${userProfile.department || ''}" placeholder="" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('housing.loc.on_campus')} *</label>
                        <select id="dormType" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" required>
                            <option value="">${I18n.t('common.select') || 'Select'}</option>
                            <option value="male_undergrad">${I18n.t('housing.dorm.male_undergrad')}</option>
                            <option value="female_undergrad">${I18n.t('housing.dorm.female_undergrad')}</option>
                            <option value="male_grad">${I18n.t('housing.dorm.male_grad')}</option>
                            <option value="female_grad">${I18n.t('housing.dorm.female_grad')}</option>
                        </select>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('housing.type.room')}</label>
                        <input type="text" id="roomNumber" placeholder="e.g. A101">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${I18n.t('common.people_needed')} *</label>
                            <input type="number" id="peopleCount" min="1" value="1" required>
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('housing.label.gender')} *</label>
                            <select id="genderPreference" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" required>
                                <option value="male">${I18n.t('housing.gender.male')}</option>
                                <option value="female">${I18n.t('housing.gender.female')}</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                        <div class="input-group">
                            <label>報名截止日期 *</label>
                            <input type="datetime-local" id="deadline" required>
                        </div>
                        <div class="input-group">
                            <label>租約期間 *</label>
                            <input type="text" id="leaseTerm" placeholder="2026/1/1至2026/6/30" required>
                        </div>
                    </div>

                    <!-- 個人作息 -->
                    <h3 style="margin: 2rem 0 1rem 0; color: var(--primary-dark); border-bottom: 2px solid var(--primary-light); padding-bottom: 0.5rem;">🌙 ${I18n.t('housing.label.schedule')}</h3>
                    
                    <div class="input-group">
                        <label>${I18n.t('housing.label.schedule')}</label>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <label style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px solid var(--border-color); border-radius: 15px; cursor: pointer; font-size: 0.9rem;">
                                <input type="checkbox" name="scheduleTags" value="夜貓子" style="margin-right: 0.4rem;">
                                🦉 ${I18n.t('housing.schedule.night_owl')}
                            </label>
                            <label style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px solid var(--border-color); border-radius: 15px; cursor: pointer; font-size: 0.9rem;">
                                <input type="checkbox" name="scheduleTags" value="晨型人" style="margin-right: 0.4rem;">
                                🌅 ${I18n.t('housing.schedule.early_bird')}
                            </label>
                            <label style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px solid var(--border-color); border-radius: 15px; cursor: pointer; font-size: 0.9rem;">
                                <input type="checkbox" name="scheduleTags" value="規律作息" style="margin-right: 0.4rem;">
                                ⏰ ${I18n.t('housing.schedule.regular')}
                            </label>
                            <button type="button" id="addScheduleTagBtn" style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px dashed var(--primary-light); background: white; border-radius: 15px; cursor: pointer; font-size: 0.9rem; color: var(--primary-dark);">
                                ➕ ${I18n.t('housing.schedule.custom')}
                            </button>
                        </div>
                        <div id="customScheduleTags" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;"></div>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('common.description')}</label>
                        <textarea id="scheduleDetail" rows="2" placeholder="" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"></textarea>
                    </div>

                    <h3 style="margin: 2rem 0 1rem 0; color: var(--primary-dark); border-bottom: 2px solid var(--primary-light); padding-bottom: 0.5rem;">🏠 ${I18n.t('housing.label.habits')}</h3>

                    <div class="input-group">
                        <label>${I18n.t('housing.label.habits')}</label>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <label style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px solid var(--border-color); border-radius: 15px; cursor: pointer; font-size: 0.9rem;">
                                <input type="checkbox" name="habitTags" value="安靜" style="margin-right: 0.4rem;">
                                🤫 ${I18n.t('housing.habit.quiet')}
                            </label>
                            <label style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px solid var(--border-color); border-radius: 15px; cursor: pointer; font-size: 0.9rem;">
                                <input type="checkbox" name="habitTags" value="不抽菸" style="margin-right: 0.4rem;">
                                🚭 ${I18n.t('housing.habit.no_smoke')}
                            </label>
                            <label style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px solid var(--border-color); border-radius: 15px; cursor: pointer; font-size: 0.9rem;">
                                <input type="checkbox" name="habitTags" value="整潔" style="margin-right: 0.4rem;">
                                ✨ ${I18n.t('housing.habit.clean')}
                            </label>
                            <label style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px solid var(--border-color); border-radius: 15px; cursor: pointer; font-size: 0.9rem;">
                                <input type="checkbox" name="habitTags" value="不養寵物" style="margin-right: 0.4rem;">
                                🐕 ${I18n.t('housing.habit.pet_free')}
                            </label>
                            <button type="button" id="addHabitTagBtn" style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px dashed var(--primary-light); background: white; border-radius: 15px; cursor: pointer; font-size: 0.9rem; color: var(--primary-dark);">
                                ➕ ${I18n.t('sports.loc.custom')}
                            </button>
                        </div>
                        <div id="customHabitTags" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;"></div>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('common.description')}</label>
                        <textarea id="habitDetail" rows="3" placeholder="" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary btn-large" style="margin-top: 1.5rem; width: 100%;">${I18n.t('common.submit')}</button>
                </form>
            </div>
            <style>
                .tag-label { display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px solid var(--border-color); border-radius: 15px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; background: white; color: var(--text-primary); }
                .tag-label input:checked { display: none; }
                .tag-label:has(input:checked) { background: var(--primary-light); border-color: var(--primary-color); color: var(--primary-dark); font-weight: bold; }
                .tag-label input { margin-right: 0.4rem; }
            </style>
        `;
    };

    const renderCreatePostOffCampus = () => {
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        return `
            <div class="container fade-in" style="padding-bottom: 2rem;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2>${I18n.t('housing.create.title_off')}</h2>
                </header>

                <form id="createPostForm">
                    <input type="hidden" id="postTypeCategory" value="off_campus">
                    
                    <!-- 物件資訊 -->
                    <h3 style="margin-bottom: 1rem; color: var(--primary-dark); border-bottom: 2px solid var(--primary-light); padding-bottom: 0.5rem;">🏠 ${I18n.t('common.description')}</h3>
                    
                    <div class="input-group">
                        <div style="color: #888888; font-size: 12px; text-align: center; margin-top: 10px; margin-bottom: 5px;">${I18n.t('common.financial_disclaimer')}</div>
                        <label>${I18n.t('sports.label.title')} *</label>
                        <input type="text" id="postTitle" placeholder="${I18n.t('housing.placeholder.title')}" required>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${I18n.t('reg.name_label')} *</label>
                            <input type="text" id="authorName" value="${userProfile.name || userProfile.displayName || ''}" required>
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('reg.major_label')} *</label>
                            <input type="text" id="authorDept" value="${userProfile.department || ''}" placeholder="" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('housing.label.address')} *</label>
                        <input type="text" id="address" placeholder="${I18n.t('sports.loc.puli_rec')}" required>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>${I18n.t('housing.label.rent')} (NT$) *</label>
                            <input type="number" id="budget" min="0" step="100" placeholder="5000" required>
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('housing.label.deposit')} *</label>
                            <input type="text" id="deposit" placeholder="e.g. 2 months">
                        </div>
                    </div>

                    <!-- 租期 & 截止 -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>報名截止日期 *</label>
                            <input type="datetime-local" id="deadline" required>
                        </div>
                        <div class="input-group">
                            <label>租約期間 *</label>
                            <input type="text" id="leaseTerm" placeholder="2026/1/1至2026/6/30" required>
                        </div>
                    </div>

                    <!-- 設施 -->
                    <div class="input-group">
                        <label>${I18n.t('housing.label.facilities')}</label>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <label class="tag-label">
                                <input type="checkbox" name="facilityTags" value="洗衣機">
                                🧺 ${I18n.t('housing.facility.washing_machine')}
                            </label>
                            <label class="tag-label">
                                <input type="checkbox" name="facilityTags" value="飲水機">
                                💧 ${I18n.t('housing.facility.water_dispenser')}
                            </label>
                            <label class="tag-label">
                                <input type="checkbox" name="facilityTags" value="冰箱">
                                ❄️ ${I18n.t('housing.facility.fridge')}
                            </label>
                             <label class="tag-label">
                                <input type="checkbox" name="facilityTags" value="停車位">
                                🅿️ ${I18n.t('housing.facility.parking')}
                            </label>
                            <label class="tag-label">
                                <input type="checkbox" name="facilityTags" value="WIFI">
                                📶 ${I18n.t('housing.facility.wifi')}
                            </label>
                            <button type="button" id="addFacilityTagBtn" style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px dashed var(--primary-light); background: white; border-radius: 15px; cursor: pointer; font-size: 0.9rem; color: var(--primary-dark);">
                                ➕ ${I18n.t('housing.facility.custom')}
                            </button>
                        </div>
                        <div id="customFacilityTags" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;"></div>
                    </div>


                    <h3 style="margin: 2rem 0 1rem 0; color: var(--primary-dark); border-bottom: 2px solid var(--primary-light); padding-bottom: 0.5rem;">👥 ${I18n.t('common.people_needed')}</h3>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                         <div class="input-group">
                            <label>${I18n.t('common.people_needed')} *</label>
                            <input type="number" id="peopleCount" min="1" value="1" required>
                        </div>
                        <div class="input-group">
                            <label>${I18n.t('housing.label.gender')} *</label>
                            <select id="genderPreference" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" required>
                                <option value="male">${I18n.t('housing.gender.male')}</option>
                                <option value="female">${I18n.t('housing.gender.female')}</option>
                                <option value="any">${I18n.t('housing.gender.any')}</option>
                            </select>
                        </div>
                    </div>

                    <h3 style="margin: 2rem 0 1rem 0; color: var(--primary-dark); border-bottom: 2px solid var(--primary-light); padding-bottom: 0.5rem;">🏠 ${I18n.t('housing.label.habits')}</h3>

                    <div class="input-group">
                         <label>${I18n.t('housing.label.habits')}</label>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <label class="tag-label">
                                <input type="checkbox" name="habitTags" value="安靜">
                                🤫 ${I18n.t('housing.habit.quiet')}
                            </label>
                            <label class="tag-label">
                                <input type="checkbox" name="habitTags" value="不抽菸">
                                🚭 ${I18n.t('housing.habit.no_smoke')}
                            </label>
                            <label class="tag-label">
                                <input type="checkbox" name="habitTags" value="整潔">
                                ✨ ${I18n.t('housing.habit.clean')}
                            </label>
                            <label class="tag-label">
                                <input type="checkbox" name="habitTags" value="不養寵物">
                                🐕 ${I18n.t('housing.habit.pet_free')}
                            </label>
                             <button type="button" id="addHabitTagBtn" style="display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px dashed var(--primary-light); background: white; border-radius: 15px; cursor: pointer; font-size: 0.9rem; color: var(--primary-dark);">
                                ➕ ${I18n.t('housing.habit.custom')}
                            </button>
                        </div>
                        <div id="customHabitTags" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;"></div>
                    </div>

                    <div class="input-group">
                        <label>${I18n.t('common.description')}</label>
                        <textarea id="offCampusDetail" rows="3" placeholder="" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary btn-large" style="margin-top: 1.5rem; width: 100%;">${I18n.t('common.submit')}</button>
                </form>
            </div>
            <style>
                .tag-label { display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px solid var(--border-color); border-radius: 15px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; background: white; color: var(--text-primary); }
                .tag-label input:checked { display: none; }
                .tag-label:has(input:checked) { background: var(--primary-light); border-color: var(--primary-color); color: var(--primary-dark); font-weight: bold; }
                .tag-label input { margin-right: 0.4rem; }
            </style>
        `;
    };


    const renderList = async () => {
        // 1. KEMBALI PAKAI MOCKSTORE (Karena data Housing sangat kompleks)
        let posts = [];
        try {
            const res = await fetch('/housing');
            if (res.ok) {
                posts = await res.json();
            }
        } catch (e) { console.error(e); }

        // Map database fields to the ones used in frontend filters
        posts = posts.map(p => ({
            ...p,
            id: p.id,
            type: p.housing_type,
            title: p.title,
            authorName: p.host_name,
            authorDept: p.host_dept,
            peopleCount: p.people_needed,
            roomNumber: p.room_number,
            budget: p.rent_amount,
            address: p.location,
            genderPreference: p.gender_req,
            scheduleTags: [],
            habitTags: p.habits ? p.habits.split(',') : [],
            createdAt: p.created_at,
            status: p.status || 'open'
        }));

        posts = posts.filter(p => {
            if (p.status === 'cancelled' || p.status === 'success' || p.status === 'expired' || p.status === 'full') return false;
            if (p.peopleCount !== undefined && p.peopleCount <= 0) return false;

            // Optional: if housing ever adds a deadline feature
            const dTime = new Date(p.deadline || p.event_time);
            if (!isNaN(dTime) && dTime < new Date()) return false;

            return true;
        });

        if (currentFilters.postTypeCategory === 'on_campus') {
            posts = posts.filter(p => p.type === 'male_undergrad' || p.type === 'female_undergrad' || p.type === 'male_grad' || p.type === 'female_grad');
        } else if (currentFilters.postTypeCategory === 'off_campus') {
            posts = posts.filter(p => p.type === 'off_campus');
        }

        // Apply advanced filters
        if (activeFilters.genderPreference) {
            posts = posts.filter(p => p.genderPreference === activeFilters.genderPreference);
        }

        if (activeFilters.budgetRange) {
            const [min, max] = activeFilters.budgetRange;
            posts = posts.filter(p => p.budget && p.budget >= min && p.budget <= max);
        }

        if (activeFilters.dormType.length > 0) {
            posts = posts.filter(p => activeFilters.dormType.includes(p.type));
        }

        let filtered = posts.filter(p => {
            if (currentFilters.keyword) {
                const k = currentFilters.keyword.toLowerCase();
                const titleMatch = p.title && p.title.toLowerCase().includes(k);
                const authorMatch = p.authorName && p.authorName.toLowerCase().includes(k);
                if (!titleMatch && !authorMatch) return false;
            }
            if (currentFilters.role && p.role !== currentFilters.role) return false;
            if (currentFilters.postTypeCategory === 'on_campus') {
                if (p.type === 'off_campus') return false;
            } else if (currentFilters.postTypeCategory === 'off_campus') {
                if (p.type !== 'off_campus') return false;
            }
            if (currentFilters.gender && currentFilters.gender !== 'any') {
                if (p.genderPreference !== currentFilters.gender && p.genderPreference !== 'any') return false;
            }
            if (currentFilters.dormType && p.dormType !== currentFilters.dormType) return false;
            if (currentFilters.minRent && p.budget < currentFilters.minRent) return false;
            if (currentFilters.maxRent && p.budget > currentFilters.maxRent) return false;
            return true;
        });

        const getHousingTypeDisplay = (post) => {
            if (post.type !== 'off_campus') return I18n.t('housing.dorm.' + post.type) || post.type;
            return I18n.t('housing.loc.off_campus');
        };

        const getTranslatedTags = (tags) => {
            if (!tags || !Array.isArray(tags)) return '';
            return tags.map(tag => {
                const tagMap = {
                    '夜貓子': 'housing.schedule.night_owl', '晨型人': 'housing.schedule.early_bird',
                    '規律作息': 'housing.schedule.regular', '安靜': 'housing.habit.quiet',
                    '不抽菸': 'housing.habit.no_smoke', '整潔': 'housing.habit.clean',
                    '不養寵物': 'housing.habit.pet_free'
                };
                const key = tagMap[tag];
                return key ? I18n.t(key) : tag;
            }).join(', ');
        };

        const normalizeTags = (tags) => {
            if (!tags) return [];
            if (typeof tags === 'string') return tags.split(',').map(s => s.trim()).filter(Boolean);
            return Array.isArray(tags) ? tags : [];
        };

        const listContent = filtered.length ? filtered.map(p => {
            const sTags = normalizeTags(p.scheduleTags);
            const hTags = normalizeTags(p.habitTags);
            const isHost = (p.host_email || p.authorId) === user.email;
            const safeTitle = (p.title || '').replace(/'/g, "\\'");
            const btnHtml = isHost
                ? `<button onclick="event.stopPropagation(); window.openHousingChat('${p.id}', '${safeTitle}')" class="btn btn-primary" style="width:100%;margin-top:10px;padding:10px;border-radius:8px;background:#1976D2;border:none;color:white;font-weight:bold;cursor:pointer;">💬 進入聊天室 / Enter Chat</button>`
                : `<button onclick="event.stopPropagation(); window.openHousingJoinForm('${p.id}', '${safeTitle}')" class="btn" style="width:100%;margin-top:10px;padding:10px;border-radius:8px;background:linear-gradient(135deg,#FF8C00,#FF6D00);border:none;color:white;font-weight:bold;cursor:pointer;">🏠 申請加入 / Apply to Join</button>`;
            return `
            <div class="card fade-in" onclick="window.viewPost('${p.id}')" style="cursor: pointer; display: flex; flex-direction: column; gap: 0.5rem; position: relative; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <span class="badge ${p.type !== 'off_campus' ? 'badge-primary' : 'badge-secondary'}" style="margin-bottom: 0.5rem;">
                        ${getHousingTypeDisplay(p)}
                    </span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">
                        ${new Date(p.createdAt).toLocaleDateString()}
                    </span>
                </div>
                <h3 style="margin: 0; color: var(--primary-dark);">${p.title}</h3>
                <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                    <span>👤 ${p.authorName} (${p.authorDept})</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.5rem; font-size: 0.9rem;">
                    ${p.type !== 'off_campus' ? `
                        <span style="display: flex; align-items: center;">👫 ${I18n.t('common.people_needed')}: <strong style="color: var(--accent-color); margin-left: 0.3rem;">${p.peopleCount}</strong></span>
                        <span style="display: flex; align-items: center;">🚪 ${p.roomNumber ? p.roomNumber : I18n.t('housing.type.room')}</span>
                    ` : `
                        <span style="display: flex; align-items: center;">💰 $${p.budget}/mo</span>
                        <span style="display: flex; align-items: center;">📍 ${p.address}</span>
                    `}
                    <span style="display: flex; align-items: center;">🚻 ${p.genderPreference === 'any' ? I18n.t('housing.gender.any') : (p.genderPreference === 'male' ? I18n.t('housing.gender.male') : I18n.t('housing.gender.female'))}</span>
                </div>
                <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.3rem;">
                    ${sTags.slice(0, 3).map(t => `<span style="background: #f0f0f0; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; color: #666;">${getTranslatedTags([t])}</span>`).join('')}
                    ${hTags.slice(0, 3).map(t => `<span style="background: #f0f0f0; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; color: #666;">${getTranslatedTags([t])}</span>`).join('')}
                </div>
                ${btnHtml}
            </div>
            `;
        }).join('') : `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                <p>No matching records found.</p>
                <button class="btn" style="margin-top: 1rem;" onclick="window.resetFilters()">
                    ${I18n.t('common.cancel')} ${I18n.t('common.filter') || 'Filter'}
                </button>
            </div>
        `;

        // 2. KEMBALIKAN HEADER & TOMBOL BACK
        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <button class="btn-back" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">⬅️</button>
                        <div>
                            <h2 style="margin: 0;">${I18n.t('housing.title')}</h2>
                            <span style="font-size: 0.9rem; color: var(--text-secondary);">
                                ${currentFilters.postTypeCategory === 'on_campus' ? I18n.t('housing.loc.on_campus') : (currentFilters.postTypeCategory === 'off_campus' ? I18n.t('housing.loc.off_campus') : I18n.t('housing.role.partner_desc'))}
                            </span>
                        </div>
                    </div>
                    <button id="btn-create-post" class="btn btn-primary" style="font-size: 1.5rem; width: 3rem; height: 3rem; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">+</button>
                </header>

                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                    <div style="position: relative; flex-grow: 1;">
                        <input type="text" id="searchInput" placeholder="${I18n.t('common.search') || 'Search'}..." value="${currentFilters.keyword || ''}" 
                            style="width: 100%; padding: 0.8rem 2.5rem 0.8rem 1rem; border-radius: 25px; border: 1px solid var(--border-color); background: white;">
                        <span style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);">🔍</span>
                    </div>
                    <button class="btn" onclick="window.openFilterPanel()" style="background: white; border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 50%; width: 3rem; height: 3rem; padding: 0; display: flex; align-items: center; justify-content: center;">
                        ⚙️
                    </button>
                </div>

                <div style="display: grid; gap: 1rem;">
                    ${listContent}
                </div>
            </div>
        `;
    };

    const renderPostDetail = async (postId) => {
        let post = null;
        try {
            const res = await fetch('/housing/' + postId);
            if (res.ok) {
                const p = await res.json();
                post = {
                    ...p,
                    type: p.housing_type,
                    authorId: p.host_email,
                    authorName: p.host_name,
                    authorDept: p.host_dept,
                    peopleCount: p.people_needed,
                    roomNumber: p.room_number,
                    budget: p.rent_amount,
                    address: p.location,
                    genderPreference: p.gender_req,
                    scheduleTags: [],
                    habitTags: p.habits ? p.habits.split(',') : [],
                    facilities: p.facilities ? p.facilities.split(',') : [],
                    leaseTerm: p.rental_period,
                    offCampusDetail: p.description,
                    createdAt: p.created_at,
                    status: p.status
                };
            }
        } catch (e) { console.error(e); }

        if (!post) {
            window.showSimpleConfirm(I18n.t('common.error'), I18n.t('common.no_data'), () => {
                currentState = 'list';
                updateView();
            });
            return '';
        }

        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        const isAuthor = post.authorId === userProfile.id || post.authorId === userProfile.email;

        // Helper to translate tags
        const getTranslatedTags = (tags) => {
            if (!tags || !Array.isArray(tags)) return '';
            const tagMap = {
                '夜貓子': 'housing.schedule.night_owl',
                '晨型人': 'housing.schedule.early_bird',
                '規律作息': 'housing.schedule.regular',
                '安靜': 'housing.habit.quiet',
                '不抽菸': 'housing.habit.no_smoke',
                '整潔': 'housing.habit.clean',
                '不養寵物': 'housing.habit.pet_free',
                '不煮食': 'housing.habit.no_cooking',
                '愛乾淨': 'housing.habit.clean_lover'
            };
            return tags.map(tag => {
                const key = tagMap[tag];
                return key ? I18n.t(key) : tag;
            }).join(', ');
        };

        const renderTags = (tags) => {
            if (!tags) return '';
            const tagArray = (typeof tags === 'string') ? tags.split(',') : tags;
            return tagArray.map(t => {
                const trimmed = t.trim();
                let label = trimmed;
                if (trimmed === '夜貓子') label = I18n.t('housing.schedule.night_owl');
                if (trimmed === '晨型人') label = I18n.t('housing.schedule.early_bird');
                if (trimmed === '規律作息') label = I18n.t('housing.schedule.regular');
                if (trimmed === '安靜') label = I18n.t('housing.habit.quiet');
                if (trimmed === '不抽菸') label = I18n.t('housing.habit.no_smoke');
                if (trimmed === '整潔') label = I18n.t('housing.habit.clean');
                if (trimmed === '不養寵物') label = I18n.t('housing.habit.pet_free');

                return `<span style="font-size: 0.9rem; color: #666; background: #eee; padding: 4px 8px; border-radius: 10px; margin-right: 6px;">#${label}</span>`;
            }).join('');
        };

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1rem; display: flex; align-items: center;">
                    <button class="btn-back" onclick="currentState='list'; updateView();" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <h2 style="flex: 1; margin: 0; font-size: 1.2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${post.title}</h2>
                </header>

                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div>
                            <span class="badge ${post.type !== 'off_campus' ? 'badge-primary' : 'badge-secondary'}">
                                ${post.type !== 'off_campus' ? (post.type === 'male_undergrad' ? I18n.t('housing.dorm.male_undergrad') : post.type === 'female_undergrad' ? I18n.t('housing.dorm.female_undergrad') : post.type) : I18n.t('housing.loc.off_campus')}
                            </span>
                            <div style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                                📅 ${new Date(post.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div style="text-align: right;">
                             <span style="font-size: 2rem; color: var(--accent-color); font-weight: bold;">
                                ${post.type === 'off_campus' ? `$${post.budget}` : ''}
                            </span>
                            ${post.type === 'off_campus' ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">/ ${I18n.t('housing.label.rent')}</div>` : ''}
                        </div>
                    </div>

                    <!-- Details Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.95rem;">
                        <div>
                            <span style="color: var(--text-secondary); display: block; font-size: 0.8rem;">${I18n.t('common.host')}</span>
                            <span onclick="window.showUserProfile('${post.authorId}')" style="cursor: pointer; text-decoration: underline; color: #1976D2;">${post.authorName} (${post.authorDept})</span>
                        </div>
                        <div>
                            <span style="color: var(--text-secondary); display: block; font-size: 0.8rem;">${I18n.t('common.people_needed')}</span>
                            <span style="color: var(--accent-color); font-weight: bold;">${post.peopleCount}p</span>
                        </div>
                        <div>
                            <span style="color: var(--text-secondary); display: block; font-size: 0.8rem;">${I18n.t('housing.label.gender')}</span>
                            ${post.genderPreference === 'male' ? I18n.t('housing.gender.male') : (post.genderPreference === 'female' ? I18n.t('housing.gender.female') : I18n.t('housing.gender.any'))}
                        </div>
                        <div>
                            <span style="color: var(--text-secondary); display: block; font-size: 0.8rem;">報名截止日期</span>
                            ${post.deadline ? new Date(post.deadline).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : (post.leaseTerm || '無')}
                        </div>
                        <div>
                            <span style="color: var(--text-secondary); display: block; font-size: 0.8rem;">租約期間</span>
                            ${post.leaseTerm || '無'}
                        </div>
                        ${post.roomNumber ? `
                        <div>
                            <span style="color: var(--text-secondary); display: block; font-size: 0.8rem;">${I18n.t('housing.type.room')}</span>
                            ${post.roomNumber}
                        </div>` : ''}
                         ${post.deposit ? `
                        <div>
                             <span style="color: var(--text-secondary); display: block; font-size: 0.8rem;">${I18n.t('housing.label.deposit')}</span>
                            ${post.deposit}
                        </div>` : ''}
                    </div>

                    ${post.scheduleDetail ? `
                    <h4 style="margin-bottom: 0.5rem;">${I18n.t('housing.label.schedule')}</h4>
                    <pre style="white-space: pre-wrap; font-family: inherit; color: var(--text-primary); background: #f9f9f9; padding: 0.5rem; border-radius: 8px; margin-bottom: 1rem;">${post.scheduleDetail}</pre>
                     <div style="margin-bottom: 1.5rem;">
                        ${renderTags(post.scheduleTags)}
                    </div>
                    ` : ''}

                    ${post.habitDetail ? `
                    <h4 style="margin-bottom: 0.5rem;">${I18n.t('housing.label.habits')}</h4>
                    <pre style="white-space: pre-wrap; font-family: inherit; color: var(--text-primary); background: #f9f9f9; padding: 0.5rem; border-radius: 8px; margin-bottom: 1rem;">${post.habitDetail}</pre>
                     <div style="margin-bottom: 1.5rem;">
                        ${renderTags(post.habitTags)}
                    </div>
                    ` : ''}

                    ${post.offCampusDetail ? `
                    <h4 style="margin-bottom: 0.5rem;">${I18n.t('common.description')}</h4>
                    <pre style="white-space: pre-wrap; font-family: inherit; color: var(--text-primary); background: #f9f9f9; padding: 0.5rem; border-radius: 8px; margin-bottom: 1rem;">${post.offCampusDetail}</pre>
                    ` : ''}

                    ${post.facilities ? `
                    <h4 style="margin-bottom: 0.5rem;">${I18n.t('housing.label.facilities')}</h4>
                    <div style="margin-bottom: 1.5rem;">
                         ${renderTags(post.facilities)}
                    </div>
                    ` : ''}

                    <div style="margin-top: 1rem;">
                        <h4 style="margin-bottom: 0.5rem;">📍 ${I18n.t('common.location')}</h4>
                        <div style="margin-bottom: 0.5rem;">
                            ${(() => {
                let displayLocation = post.address || post.location;
                if (!displayLocation && (post.type === 'male_undergrad' || post.type === 'female_undergrad')) {
                    displayLocation = '國立暨南國際大學 學士班宿舍';
                } else if (!displayLocation && (post.type === 'male_grad' || post.type === 'female_grad')) {
                    displayLocation = '國立暨南國際大學 研究生宿舍';
                }
                return `
                                <a href="${getGoogleMapsLink(displayLocation)}" target="_blank" style="color: #1976D2; text-decoration: none; display: flex; align-items: center;">
                                    <span style="font-size: 1.2rem; margin-right: 0.5rem;">🗺️</span>
                                    Google Maps
                                </a>
                                `;
            })()}
                        </div>
                        <div style="width: 100%; height: 250px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: #eee; display: flex; align-items: center; justify-content: center;">
                            <iframe 
                                width="100%" 
                                height="100%" 
                                style="border:0" 
                                loading="lazy" 
                                allowfullscreen
                                src="${getGoogleMapsEmbed(post.address || (post.type.includes('undergrad') ? 'NCNU Dorm' : 'NCNU'))}">
                            </iframe>
                        </div>
                    </div>
                    
                    <!-- Community & Safety Notice -->
                    <div style="margin-top: 2rem; padding: 1rem; background: #F8F9FA; border-radius: 8px; text-align: center; font-size: 12px; color: #6c757d; line-height: 1.5;">
                        ${I18n.t('common.safety_notice')}
                    </div>
                </div>

                <div style="position: fixed; bottom: 0; left: 0; width: 100%; padding: 1rem; background: white; border-top: 1px solid var(--border-color); display: flex; gap: 1rem; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);">
                    ${isAuthor ? `
                        <button class="btn" style="flex: 1; background: #FF9800; color: white; font-weight: bold; padding: 0.8rem;" onclick="currentState='manage'; updateView();">
                             ⚙️ ${I18n.t('common.manage')}
                        </button>
                    ` : `
                        <button class="btn btn-primary" style="flex: 1;" onclick="window.openHousingChat('${post.id}', '${post.title}')" ${post.status !== 'open' ? 'disabled' : ''}>
                           💬 ${post.status === 'open' ? '進入聊天室 (Join Chat)' : I18n.t('common.closed')}
                        </button>
                    `}
                </div>
            </div>
    `;
    };

    const renderApplyForm = (postId) => {
        return `
            <div id="apply-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: end; z-index: 1000;">
                <div class="slide-up" style="background: white; width: 100%; border-radius: 24px 24px 0 0; padding: 2rem 1.5rem; max-height: 90vh; overflow-y: auto; text-align: center;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0;">${I18n.t('housing.app.title')}</h3>
                        <button onclick="window.closeApplyForm()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                    </div>

                    <form id="applyForm">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: left; margin-bottom: 1rem;">
                            <div class="input-group">
                                <label style="display: block; margin-bottom: 0.5rem;">${I18n.t('housing.label.name')} *</label>
                                <input type="text" id="applicantName" value="${user.name || user.displayName || ''}" required style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                            </div>
                            <div class="input-group">
                                <label style="display: block; margin-bottom: 0.5rem;">${I18n.t('housing.label.dept')} *</label>
                                <input type="text" id="applicantDept" value="${user.department || ''}" placeholder="${I18n.t('housing.label.dept')}" required style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                            </div>
                        </div>

                        <div class="input-group" style="text-align: left; margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem;">${I18n.t('housing.label.gender')} *</label>
                            <select id="applicantGender" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" required>
                                <option value="male">${I18n.t('housing.gender.male')}</option>
                                <option value="female">${I18n.t('housing.gender.female')}</option>
                            </select>
                        </div>

                        <div class="input-group" style="text-align: left; margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem;">${I18n.t('housing.label.schedule')} *</label>
                            <textarea id="scheduleDesc" rows="3" placeholder="${I18n.t('housing.placeholder.schedule') || '...'}" required style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"></textarea>
                        </div>

                        <div class="input-group" style="text-align: left;">
                            <label style="display: block; margin-bottom: 0.5rem;">${I18n.t('housing.label.habits')} *</label>
                            <textarea id="habitDesc" rows="3" placeholder="${I18n.t('housing.placeholder.habits') || '...'}" required style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"></textarea>
                        </div>

                        <div style="margin-top: 2rem;">
                            <div style="color: #888888; font-size: 12px; margin-bottom: 8px;">${I18n.t('common.financial_disclaimer')}</div>
                            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 1rem; font-size: 1.1rem; border-radius: 12px;">
                                ${I18n.t('common.submit') || 'Submit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <style>
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .slide-up { animation: slideUp 0.3s ease-out; }
            </style>
        `;
    };

    const renderAdvancedFilterPanel = () => {
        const isOffCampus = currentFilters.postTypeCategory === 'off_campus';
        const isOnCampus = currentFilters.postTypeCategory === 'on_campus';

        return `
            <div id="filter-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: end; z-index: 1000;">
                <div class="slide-up" style="background: white; width: 100%; border-radius: 16px 16px 0 0; padding: 1.5rem; padding-bottom: 3rem; max-height: 85vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                        <h3>🔍 ${I18n.t('common.filter_advanced') || 'Filter'}</h3>
                        <button onclick="window.closeFilterPanel()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">${I18n.t('housing.label.gender') || 'Gender'}</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="filter-option ${activeFilters.genderPreference === 'male' ? 'active' : ''}" data-filter="gender" data-value="male" style="flex: 1;">👨 ${I18n.t('housing.gender.male') || 'Male'}</button>
                            <button class="filter-option ${activeFilters.genderPreference === 'female' ? 'active' : ''}" data-filter="gender" data-value="female" style="flex: 1;">👩 ${I18n.t('housing.gender.female') || 'Female'}</button>
                        </div>
                    </div>

                    ${isOffCampus ? `
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">${I18n.t('housing.label.rent') || 'Rent'} (${I18n.t('common.month') || 'Month'})</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                                <button class="filter-option ${JSON.stringify(activeFilters.budgetRange) === JSON.stringify([0, 3000]) ? 'active' : ''}" data-filter="budget" data-value="0,3000">$0 - $3,000</button>
                                <button class="filter-option ${JSON.stringify(activeFilters.budgetRange) === JSON.stringify([3001, 5000]) ? 'active' : ''}" data-filter="budget" data-value="3001,5000">$3,001 - $5,000</button>
                                <button class="filter-option ${JSON.stringify(activeFilters.budgetRange) === JSON.stringify([5001, 8000]) ? 'active' : ''}" data-filter="budget" data-value="5001,8000">$5,001 - $8,000</button>
                                <button class="filter-option ${JSON.stringify(activeFilters.budgetRange) === JSON.stringify([8001, 999999]) ? 'active' : ''}" data-filter="budget" data-value="8001,999999">$8,000+</button>
                            </div>
                        </div>
                    ` : ''}

                    ${isOnCampus ? `
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">${I18n.t('housing.label.dorm_type') || 'Dorm Type'}</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                                <button class="filter-checkbox ${activeFilters.dormType.includes('male_undergrad') ? 'active' : ''}" data-filter="dormType" data-value="male_undergrad">${I18n.t('housing.dorm.male_undergrad') || 'Male Undergrad'}</button>
                                <button class="filter-checkbox ${activeFilters.dormType.includes('female_undergrad') ? 'active' : ''}" data-filter="dormType" data-value="female_undergrad">${I18n.t('housing.dorm.female_undergrad') || 'Female Undergrad'}</button>
                                <button class="filter-checkbox ${activeFilters.dormType.includes('male_grad') ? 'active' : ''}" data-filter="dormType" data-value="male_grad">${I18n.t('housing.dorm.male_grad') || 'Male Grad'}</button>
                                <button class="filter-checkbox ${activeFilters.dormType.includes('female_grad') ? 'active' : ''}" data-filter="dormType" data-value="female_grad">${I18n.t('housing.dorm.female_grad') || 'Female Grad'}</button>
                            </div>
                        </div>
                    ` : ''}

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">${I18n.t('housing.label.schedule') || 'Schedule'}</label>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="filter-checkbox ${activeFilters.scheduleTags.includes('夜貓子') ? 'active' : ''}" data-filter="schedule" data-value="夜貓子">🦉 ${I18n.t('housing.schedule.night_owl') || 'Night Owl'}</button>
                            <button class="filter-checkbox ${activeFilters.scheduleTags.includes('晨型人') ? 'active' : ''}" data-filter="schedule" data-value="晨型人">🌅 ${I18n.t('housing.schedule.early_bird') || 'Early Bird'}</button>
                             <button class="filter-checkbox ${activeFilters.scheduleTags.includes('規律作息') ? 'active' : ''}" data-filter="schedule" data-value="規律作息">⏰ ${I18n.t('housing.schedule.regular') || 'Regular'}</button>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">${I18n.t('housing.label.habits') || 'Habits'}</label>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="filter-checkbox ${activeFilters.habitTags.includes('安靜') ? 'active' : ''}" data-filter="habit" data-value="安靜">🤫 ${I18n.t('housing.habit.quiet') || 'Quiet'}</button>
                            <button class="filter-checkbox ${activeFilters.habitTags.includes('不抽菸') ? 'active' : ''}" data-filter="habit" data-value="不抽菸">🚭 ${I18n.t('housing.habit.no_smoke') || 'No Smoking'}</button>
                            <button class="filter-checkbox ${activeFilters.habitTags.includes('整潔') ? 'active' : ''}" data-filter="habit" data-value="整潔">✨ ${I18n.t('housing.habit.clean') || 'Clean'}</button>
                            <button class="filter-checkbox ${activeFilters.habitTags.includes('不養寵物') ? 'active' : ''}" data-filter="habit" data-value="不養寵物">🐕 ${I18n.t('housing.habit.pet_free') || 'No Pets'}</button>
                             <button class="filter-checkbox ${activeFilters.habitTags.includes('愛乾淨') ? 'active' : ''}" data-filter="habit" data-value="愛乾淨">🧹 ${I18n.t('housing.habit.clean_lover') || 'Clean Lover'}</button>
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-top: 2rem;">
                        <button onclick="window.resetFilters()" class="btn" style="flex: 1; background: #eee; color: #333;">${I18n.t('common.reset') || 'Reset'}</button>
                        <button onclick="window.applyFilters()" class="btn btn-primary" style="flex: 2;">${I18n.t('common.apply') || 'Apply'}</button>
                    </div>
                </div>
            </div>
            <style>
                 .filter-option, .filter-checkbox {
                     padding: 0.6rem; border: 2px solid var(--border-color); border-radius: 8px; background: white; cursor: pointer; transition: all 0.2s;
                 }
                 .filter-option.active, .filter-checkbox.active {
                     background: #FFF3E0 !important; border-color: #FF8C00 !important; color: #E65100 !important; font-weight: bold;
                 }
            </style>
        `;
    };

    const renderManage = async () => {
        let myPosts = [];
        try {
            // Ambil data langsung dari MySQL (Supabase)
            const res = await fetch('/my-housing/' + user.email);
            if (res.ok) {
                myPosts = await res.json();
            }
        } catch (e) { console.error(e); }

        // MENGATASI ERROR FOTO 1: Mendeklarasikan variabel yang hilang
        const isZH = localStorage.getItem('language') === 'zh-TW' || localStorage.getItem('language') === 'zh-CN';
        const txtManageTitle = I18n.t('common.manage') || 'Manage My Events';
        const txtNoData = I18n.t('common.no_data') || 'No records found.';

        const combinedPosts = myPosts.map(p => ({
            ...p,
            type: p.housing_type,
            authorId: p.host_email,
            authorName: p.host_name,
            authorDept: p.host_dept,
            peopleCount: p.people_needed,
            createdAt: p.created_at,
            status: p.status || 'open'
        }));

        // Render card mirip seperti di FOTO 2
        const postsHtmlArray = combinedPosts.map(p => {
            let statusColor = '#9e9e9e';
            let statusIcon = '';
            let statusText = p.status;

            // Logika Status Badge
            switch (p.status) {
                case 'open': statusColor = '#4CAF50'; statusIcon = '🟢'; statusText = isZH ? '招募中' : 'Status: OK'; break;
                case 'paused': statusColor = '#ff9800'; statusIcon = '⏸️'; statusText = isZH ? '暫停' : 'Paused'; break;
                case 'success': case 'full': statusColor = '#2196f3'; statusIcon = '✓'; statusText = isZH ? '已成案' : 'Success'; break;
                case 'cancelled': statusColor = '#f44336'; statusIcon = '✗'; statusText = isZH ? '已取消' : 'Cancelled'; break;
            }

            // Badge UI mirip Foto 2
            const statusBadge = `<span style="font-size: 0.85rem; color: ${statusColor}; border: 1px solid ${statusColor}; padding: 4px 12px; border-radius: 4px; font-weight: normal;">${statusIcon} ${statusText}</span>`;

            const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-';

            // Perintah untuk masuk ke Chat Kuning
            const chatAction = `window.openHousingChat('${p.id}', '${(p.title || '').replace(/'/g, "\\\\'")}')`;

            // Logic Tombol Aksi
            let actionButtons = `
                <button onclick="${chatAction}" style="width: 100%; padding: 12px; margin-bottom: 8px; border-radius: 8px; background: #1976D2; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; transition: opacity 0.2s;">💬 ${isZH ? '進入聊天室' : 'Enter Chat Room'}</button>
            `;

            if (p.status === 'open') {
                actionButtons += `
                    <button onclick="window.pausePost('${p.id}')" style="width: 100%; padding: 12px; margin-bottom: 8px; border-radius: 8px; background: #FF9800; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; transition: opacity 0.2s;">⏸️ ${isZH ? '暫停招募' : 'Pause Recruiting'}</button>
                    <button onclick="window.confirmSuccess('${p.id}')" style="width: 100%; padding: 12px; margin-bottom: 8px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; transition: opacity 0.2s;">✓ ${isZH ? '成案' : 'Success'}</button>
                    <button onclick="window.cancelPost('${p.id}')" style="width: 100%; padding: 12px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; transition: opacity 0.2s;">${isZH ? '取消' : 'Cancel'}</button>
                `;
            } else if (p.status === 'paused') {
                actionButtons += `
                    <button onclick="window.resumePost('${p.id}')" style="width: 100%; padding: 12px; margin-bottom: 8px; border-radius: 8px; background: #FFC107; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; transition: opacity 0.2s;">▶️ ${isZH ? '繼續招募' : 'Resume Recruiting'}</button>
                    <button onclick="window.confirmSuccess('${p.id}')" style="width: 100%; padding: 12px; margin-bottom: 8px; border-radius: 8px; background: #2196f3; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; transition: opacity 0.2s;">✓ ${isZH ? '成案' : 'Success'}</button>
                    <button onclick="window.cancelPost('${p.id}')" style="width: 100%; padding: 12px; border-radius: 8px; background: #F44336; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 1rem; transition: opacity 0.2s;">${isZH ? '取消' : 'Cancel'}</button>
                `;
            }

            return `
                <div class="card" style="${p.status === 'cancelled' ? 'opacity: 0.6;' : ''} margin-bottom: 1.5rem; border-radius: 12px; background: white; padding: 20px; border: 1px solid #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0; font-size: 1.2rem; color: #333;">${p.title}</h3>
                        ${statusBadge}
                    </div>
                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">
                        🗓️ ${dateStr}
                    </div>

                    <div style="background: #fdfdfd; border: 1px solid #eee; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-weight: bold; margin-bottom: 10px; color: #333; display: flex; align-items: center; gap: 8px;">
                            👥 ${isZH ? '申請名單' : 'Applications'}
                        </div>
                        ${(() => {
                    const housingApps = window.HousingAppEngine.getApps(p.id);
                    const pendingApps = housingApps.filter(a => a.status === 'pending');
                    const acceptedApps = housingApps.filter(a => a.status === 'accepted');
                    let html = '';
                    if (pendingApps.length > 0) {
                        html += `<div style="font-size: 0.85rem; font-weight: bold; color: #FF9800; margin-top: 8px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #FFE0B2;">⏳ ${isZH ? '待確認' : 'Pending'}:</div>`;
                        html += pendingApps.map(app => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee;">
                                        <span style="font-size: 0.9rem; color: #333; font-weight: bold;">${app.applicantName}</span>
                                        <div style="display: flex; gap: 5px;">
                                            <button onclick="window.showReviewApplicationModal('${app.id}', '${p.id}', '${app.applicantId}', encodeURIComponent('${(p.title || '').replace(/'/g, "\\\\'")}'), 'housing')" style="background: #2196F3; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: bold;">👤 ${isZH ? '查看' : 'View'}</button>
                                            <button onclick="window.acceptHousingApp('${app.id}', '${p.id}', '${app.applicantId}', '${app.applicantName}', '${(p.title || '').replace(/'/g, "\\\\'")}')" style="background: #4caf50; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: bold;">${isZH ? '接受 ✓' : 'Accept'}</button>
                                            <button onclick="window.rejectHousingApp('${app.id}', '${p.id}', '${app.applicantId}', '${(p.title || '').replace(/'/g, "\\\\'")}')" style="background: #f44336; color: white; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: bold;">${isZH ? '拒絕 ✗' : 'Reject'}</button>
                                        </div>
                                    </div>
                                `).join('');
                    }
                    if (acceptedApps.length > 0) {
                        html += `<div style="font-size: 0.85rem; font-weight: bold; color: #4caf50; margin-top: 12px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #c8e6c9;">✅ ${isZH ? '已接受' : 'Accepted'}:</div>`;
                        html += acceptedApps.map(app => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #eee;">
                                        <span style="font-size: 0.9rem; color: #333; font-weight: bold;">${app.applicantName}</span>
                                        <span style="font-size: 0.8rem; color: #4caf50; font-weight: bold;">✓</span>
                                    </div>
                                `).join('');
                    }
                    if (!pendingApps.length && !acceptedApps.length) {
                        html = `<div style="font-size: 0.85rem; color: #999; text-align: center; padding: 8px 0;">${isZH ? '目前沒有申請' : 'No applications yet'}</div>`;
                    }
                    return html;
                })()}
                    </div>


                    <div style="display: flex; flex-direction: column;">
                        ${actionButtons}
                    </div>
                </div>
            `;
        });

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back" onclick="currentState='landing'; updateView();" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer; color: #1976D2;">⬅️</button>
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">⚙️ ${txtManageTitle}</h2>
                </header>

                ${combinedPosts.length > 0 ? `<section style="margin-bottom: 2rem;">${postsHtmlArray.join('')}</section>` : `<div style="text-align: center; padding: 3rem 1rem; color: #888;">📝 <br>${txtNoData}</div>`}
            </div>
        `;
    };

    const renderApplicationsList = async (postId) => {
        const posts = await MockStore.getPosts({ category: CATEGORY_ID, includeAll: true });
        if (!Array.isArray(posts)) return;
        const post = posts.find(p => p.id === postId);
        const applications = await MockStore.getPostApplications(postId);

        if (!post) return '<div class="container"><p>Post not found</p></div>';

        return `
            <div class="container fade-in" style="padding-bottom: 80px;">
                <header style="margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <button class="btn-back-to-manage" onclick="currentState='manage'; updateView();" style="background: none; border: none; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;">⬅️</button>
                    <div>
                        <h2>${I18n.t('housing.app.list_title')}</h2>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">${post.title}</p>
                    </div>
                </header>

                ${applications.length === 0 ? `
                    <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                        <p>${I18n.t('housing.app.no_apps')}</p>
                    </div>
                ` : `
                    ${applications.map(app => `
                        <div class="card" style="${app.status === 'accepted' ? 'border-left: 4px solid #ffc200;' : app.status === 'rejected' ? 'border-left: 4px solid #f44336; opacity: 0.6;' : ''}">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                <div>
                                    <h4 style="margin: 0 0 0.25rem 0;" onclick="window.showUserProfile('${app.applicantId}')" style="cursor: pointer; text-decoration: underline; color: #1976D2;">${app.applicantName}</h4>
                                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">${app.applicantDept}</p>
                                </div>
                                <span style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 12px; ${app.status === 'accepted' ? 'background: #fff8e1; color: #ffc200;' : app.status === 'rejected' ? 'background: #ffebee; color: #f44336;' : 'background: #fff3e0; color: #ff9800;'}">
                                    ${I18n.t('housing.status.' + app.status) || app.status}
                                </span>
                            </div>

                            <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem; font-size: 0.9rem; margin: 0.75rem 0;">
                                <span style="color: var(--text-secondary);">${I18n.t('housing.label.gender')}:</span>
                                <span>${app.applicantGender === 'male' ? I18n.t('housing.gender.male') : (app.applicantGender === 'female' ? I18n.t('housing.gender.female') : '-')}</span>
                            </div>

                            <div style="margin: 0.75rem 0;">
                                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">${I18n.t('housing.label.schedule')}:</div>
                                <div style="font-size: 0.9rem; color: var(--text-main);">${app.scheduleDesc || '-'}</div>
                            </div>

                            <div style="margin: 0.75rem 0;">
                                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">${I18n.t('housing.label.habits')}:</div>
                                <div style="font-size: 0.9rem; color: var(--text-main);">${app.habitDesc || '-'}</div>
                            </div>

                            ${app.status === 'pending' ? `
                                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                                    <button onclick="window.acceptApplication('${app.id}', '${postId}')" class="btn btn-primary" style="flex: 1;">✓ ${I18n.t('housing.action.accept')}</button>
                                    <button onclick="window.rejectApplication('${app.id}', '${postId}')" class="btn" style="flex: 1; background: #f44336; color: white;">✗ ${I18n.t('housing.action.reject')}</button>
                                </div>
                            ` : app.status === 'accepted' ? `
                                <div style="margin-top: 1rem;">
                                    <button onclick="window.openHousingChat('${postId}', '${(post.title || '').replace(/'/g, "\\\\'")}')" class="btn btn-primary" style="width: 100%;">💬 ${I18n.t('housing.action.chat')}</button>
                                </div>
                            ` : ''}

                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                                ${new Date(app.createdAt).toLocaleString()}
                            </div>
                        </div>
                    `).join('')}
                `}
            </div>
        `;
    };

    // --- Main Logic ---

    const updateView = async () => {
        try {
            app.innerHTML = '';
            if (currentState === 'landing') app.innerHTML = renderLanding();
            else if (currentState === 'location_select') app.innerHTML = renderLocationSelect();
            else if (currentState === 'create_on_campus') app.innerHTML = renderCreatePostOnCampus();
            else if (currentState === 'create_off_campus') app.innerHTML = renderCreatePostOffCampus();
            else if (currentState === 'list') app.innerHTML = await renderList();
            else if (currentState === 'manage') app.innerHTML = await renderManage();

            // Ensure listeners are bound only AFTER HTML is injected and the browser repaints
            bindListeners();
            if (currentState.startsWith('create')) bindFormListeners();
        } catch (error) {
            console.error('[groupbuy.js] Render Error:', error);
            app.innerHTML = `<div style="padding: 2rem; text-align: center; color: red;">
                <h2>Application Error</h2>
                <p>${error.message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top: 1rem;">${I18n.t('common.reset') || 'Reset'}</button>
            </div>`;
        }
    };

    // Events
    window.openApplyForm = (postId) => {
        const div = document.createElement('div');
        div.id = 'apply-overlay';
        div.innerHTML = renderApplyForm(postId);
        document.body.appendChild(div);

        document.getElementById('applyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            if (btn) {
                btn.innerText = "Syncing...";
                btn.disabled = true;
            }

            try {
                const out = await api.fetch('/api/v1/join', {
                    method: 'POST',
                    body: {
                        event_type: 'housing',
                        event_id: postId,
                        user_email: user.email
                    }
                });

                if (out.success) {
                    alert(I18n.t('housing.alert.app_submitted'));
                }
            } catch (err) {
                console.error(err);
                alert('Network error.');
            } finally {
                window.closeApplyForm();
                currentState = 'manage';
                updateView();
                bindListeners();
            }
        });
    };

    window.closeApplyForm = () => {
        const overlay = document.getElementById('apply-overlay');
        if (overlay) overlay.remove();
    };

    window.viewPost = async (postId) => {
        app.innerHTML = await renderPostDetail(postId);
        const backBtn = document.querySelector('.btn-back');
        if (backBtn) {
            // Kita hapus fungsi onclick bawaan HTML yang bikin error
            backBtn.removeAttribute('onclick');

            // Kita pasang fungsi navigasi yang benar lewat JavaScript
            backBtn.onclick = () => {
                currentState = 'list'; // Kembalikan state ke halaman List
                updateView();          // Refresh layar
            };
        }
    };

    window.closePost = (postId) => {
        window.showSimpleConfirm(I18n.t('housing.confirm.close_post'), async () => {
            const response = await fetch('/update-housing-status/' + postId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'closed' }) });
            if (response.ok && window.refreshUserProfile) await window.refreshUserProfile();
            updateView();
        });
    }

    window.filterPosts = (type) => {
        currentFilters.postTypeCategory = type; // Fix: use currentFilters
        updateView();
        bindListeners();
    };

    window.goBackFromList = () => {
        currentState = 'location_select';
        updateView();
        bindListeners();
    };

    // Post status management
    // Generic Confirm Modal
    window.showSimpleConfirm = (message, onConfirm) => {
        const existing = document.getElementById('simple-confirm-modal');
        if (existing) existing.remove();

        window.currentConfirmCallback = () => {
            onConfirm();
            document.getElementById('simple-confirm-modal').remove();
            delete window.currentConfirmCallback;
        };

        const modalDiv = document.createElement('div');
        modalDiv.id = 'simple-confirm-modal';
        modalDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';
        modalDiv.innerHTML = `
            <div style="background: white; width: 85%; max-width: 320px; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.15); animation: scaleIn 0.2s ease-out;">
                <p style="font-size: 1rem; color: #333; margin-bottom: 1.5rem; line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 0.8rem;">
                    <button onclick="document.getElementById('simple-confirm-modal').remove()" class="btn" style="flex: 1; background: #f5f5f5; color: #666; border: none; padding: 0.75rem; border-radius: 12px; font-weight: 500;">${I18n.t('common.cancel') || 'Cancel'}</button>
                    <button onclick="window.currentConfirmCallback()" class="btn" style="flex: 1; background: #2196f3; color: white; border: none; padding: 0.75rem; border-radius: 12px; font-weight: 500; box-shadow: 0 4px 12px rgba(33,150,243,0.3);">${I18n.t('common.confirm') || 'Confirm'}</button>
                </div>
            </div>
            <style>
                @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            </style>
        `;
        document.body.appendChild(modalDiv);
    };

    window.pausePost = async (postId) => {
        const response = await fetch('/update-housing-status/' + postId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paused' }) });
        if (response.ok && window.refreshUserProfile) await window.refreshUserProfile();
        currentState = 'manage';
        updateView();
        bindListeners();
    };

    window.resumePost = async (postId) => {
        const response = await fetch('/update-housing-status/' + postId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'open' }) });
        if (response.ok && window.refreshUserProfile) await window.refreshUserProfile();
        currentState = 'manage';
        updateView();
        bindListeners();
    };

    window.cancelPost = (postId) => {
        window.showSimpleConfirm(
            `${I18n.t('housing.confirm.cancel_post')}<br><span style="font-size:0.85rem; color:#f44336;">${I18n.t('housing.confirm.cancel_desc')}</span>`,
            async () => {
                const response = await fetch('/update-housing-status/' + postId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) });
                if (response.ok && window.refreshUserProfile) await window.refreshUserProfile();
                currentState = 'manage';
                updateView();
                bindListeners();
            }
        );
    };

    window.confirmSuccess = async (postId) => {
        window.showSimpleConfirm(
            `${I18n.t('housing.confirm.success_match') || 'Confirm success?'}`,
            async () => {
                const response = await fetch('/update-housing-status/' + postId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'success' }) });
                if (response.ok && window.refreshUserProfile) await window.refreshUserProfile();
                currentState = 'manage';
                updateView();
                bindListeners();
            }
        );
    };

    // Partner confirms to join
    window.partnerConfirmJoin = (postId, applicationId) => {
        window.showSimpleConfirm(
            `${I18n.t('housing.confirm.success_match')}<br><span style="font-size:0.85rem; color:#888;">${I18n.t('housing.confirm.success_desc')}</span>`,
            async () => {
                const result = await MockStore.confirmHousingApplication(postId, applicationId);
                if (result.success) {
                    alert(result.message);
                    currentState = 'manage';
                    updateView();
                    bindListeners();
                } else {
                    alert(result.message);
                }
            }
        );
    };

    // Advanced filter functions
    window.openFilterPanel = () => {
        window.closeFilterPanel(); // Ensure no duplicates
        const div = document.createElement('div');
        div.innerHTML = renderAdvancedFilterPanel();
        document.body.appendChild(div.firstElementChild);
        bindFilterListeners();
    };

    window.closeFilterPanel = () => {
        const overlay = document.getElementById('filter-overlay');
        if (overlay) overlay.remove();
    };
    window.resetFilters = () => {
        // Reset logic - ensure types align with initial state
        activeFilters = {
            genderPreference: null,
            budgetRange: null,
            dormType: [],
            scheduleTags: [],
            habitTags: [],
            peopleCount: null
        };
        window.closeFilterPanel();
        updateView();
        bindListeners();
    };

    window.applyFilters = () => {
        // Logic to apply filters - actually renderList uses activeFilters directly.
        // Just close panel and update view.
        window.closeFilterPanel();
        updateView();
        bindListeners();
    }; // Missing in original? Added for completeness as button calls it.

    window.clearAllFilters = () => {
        activeFilters = {
            genderPreference: null,
            budgetRange: null,
            dormType: [],
            scheduleTags: [],
            habitTags: [],
            peopleCount: null
        };
        updateView();
        bindListeners();
    };

    const bindFilterListeners = () => {
        // Gender filter (single select)
        document.querySelectorAll('[data-filter="gender"]').forEach(btn => {
            btn.onclick = () => {
                const value = btn.dataset.value;
                activeFilters.genderPreference = activeFilters.genderPreference === value ? null : value;
                document.getElementById('filter-overlay').outerHTML = renderAdvancedFilterPanel();
                bindFilterListeners();
            };
        });

        // Budget filter (single select)
        document.querySelectorAll('[data-filter="budget"]').forEach(btn => {
            btn.onclick = () => {
                const value = btn.dataset.value.split(',').map(Number);
                const currentValue = JSON.stringify(activeFilters.budgetRange);
                const newValue = JSON.stringify(value);
                activeFilters.budgetRange = currentValue === newValue ? null : value;
                document.getElementById('filter-overlay').outerHTML = renderAdvancedFilterPanel();
                bindFilterListeners();
            };
        });

        // Dorm type filter (multi-select)
        document.querySelectorAll('[data-filter="dormType"]').forEach(btn => {
            btn.onclick = () => {
                const value = btn.dataset.value;
                const index = activeFilters.dormType.indexOf(value);
                if (index > -1) {
                    activeFilters.dormType.splice(index, 1);
                } else {
                    activeFilters.dormType.push(value);
                }
                document.getElementById('filter-overlay').outerHTML = renderAdvancedFilterPanel();
                bindFilterListeners();
            };
        });

        // Schedule tags filter (multi-select)
        document.querySelectorAll('[data-filter="schedule"]').forEach(btn => {
            btn.onclick = () => {
                const value = btn.dataset.value;
                const index = activeFilters.scheduleTags.indexOf(value);
                if (index > -1) {
                    activeFilters.scheduleTags.splice(index, 1);
                } else {
                    activeFilters.scheduleTags.push(value);
                }
                document.getElementById('filter-overlay').outerHTML = renderAdvancedFilterPanel();
                bindFilterListeners();
            };
        });

        // Habit tags filter (multi-select)
        document.querySelectorAll('[data-filter="habit"]').forEach(btn => {
            btn.onclick = () => {
                const value = btn.dataset.value;
                const index = activeFilters.habitTags.indexOf(value);
                if (index > -1) {
                    activeFilters.habitTags.splice(index, 1);
                } else {
                    activeFilters.habitTags.push(value);
                }
                document.getElementById('filter-overlay').outerHTML = renderAdvancedFilterPanel();
                bindFilterListeners();
            };
        });
    };

    // Bind initial listeners after first render
    const bindListeners = () => {
        const btnRolePoster = document.getElementById('btn-role-poster');
        const btnRolePartner = document.getElementById('btn-role-partner');
        const btnManage = document.getElementById('btn-manage');

        // Landing Page
        if (btnRolePoster) btnRolePoster.onclick = () => {
            userRole = 'poster';
            currentState = 'location_select';
            updateView();
        };
        if (btnRolePartner) btnRolePartner.onclick = () => {
            userRole = 'partner';
            currentState = 'location_select';
            updateView();
        };
        if (btnManage) btnManage.onclick = () => {
            currentState = 'manage';
            updateView();
        };

        // Location Select Page
        const btnLocOnCampus = document.getElementById('btn-loc-on-campus');
        const btnLocOffCampus = document.getElementById('btn-loc-off-campus');

        if (btnLocOnCampus) btnLocOnCampus.onclick = () => {
            if (userRole === 'poster') {
                currentState = 'create_on_campus';
            } else {
                currentState = 'list';
                currentFilters.postTypeCategory = 'on_campus';
            }
            updateView();
        };

        if (btnLocOffCampus) btnLocOffCampus.onclick = () => {
            if (userRole === 'poster') {
                currentState = 'create_off_campus';
            } else {
                currentState = 'list';
                currentFilters.postTypeCategory = 'off_campus';
            }
            updateView();
        };

        // Back Buttons
        const backBtns = document.querySelectorAll('.btn-back');
        backBtns.forEach(btn => btn.onclick = () => {
            if (currentState === 'location_select') {
                currentState = 'landing';
            } else if (currentState.startsWith('create') || currentState === 'list') {
                currentState = 'location_select';
            } else if (currentState === 'manage') {
                currentState = 'landing';
            } else if (currentState === 'landing') {
                window.navigateTo('home');
                return;
            }
            updateView();
        });

        // Advanced Filter Button
        const btnAdvancedFilter = document.getElementById('btn-advanced-filter');
        if (btnAdvancedFilter) {
            btnAdvancedFilter.onclick = () => {
                window.openFilterPanel();
            };
        }

        // Create Post Button (in list view)
        const btnCreatePost = document.getElementById('btn-create-post');
        if (btnCreatePost) {
            btnCreatePost.onclick = () => {
                // If they are on list view, they might be partner or poster
                // Route them to creation form based on current filter post type
                if (currentFilters.postTypeCategory === 'off_campus') {
                    currentState = 'create_off_campus';
                } else {
                    currentState = 'create_on_campus';
                }
                updateView();
            };
        }
    };

    const bindFormListeners = () => {
        const form = document.getElementById('createPostForm');

        const setupCustomTagInput = (btnId, containerId, inputName, placeholderText) => {
            const btn = document.getElementById(btnId);
            const container = document.getElementById(containerId);
            if (!btn || !container) return;

            btn.onclick = () => {
                btn.style.display = 'none';

                const inputUI = document.createElement('div');
                inputUI.style.cssText = 'width: 100%; margin-top: 0.5rem; animation: fadeIn 0.3s ease-out;';
                inputUI.innerHTML = `
                    <textarea rows="2" placeholder="${placeholderText}" style="width: 100%; padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 0.5rem; resize: vertical; margin-top: 0.5rem;"></textarea>
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button type="button" class="btn cancel-btn" style="padding: 0.4rem 1rem; background: #f5f5f5; color: #666; border: none; border-radius: 8px;">${I18n.t('common.cancel') || 'Cancel'}</button>
                        <button type="button" class="btn btn-primary add-btn" style="padding: 0.4rem 1rem; border-radius: 8px;">${I18n.t('common.add') || 'Add'}</button>
                    </div>
                `;

                container.parentNode.insertBefore(inputUI, container);

                const textarea = inputUI.querySelector('textarea');
                textarea.focus();

                const closeInput = () => {
                    inputUI.remove();
                    btn.style.display = 'inline-flex';
                };

                inputUI.querySelector('.cancel-btn').onclick = closeInput;

                inputUI.querySelector('.add-btn').onclick = () => {
                    const customTag = textarea.value;
                    if (customTag && customTag.trim()) {
                        const tagElement = document.createElement('label');
                        tagElement.style.cssText = 'display: inline-flex; align-items: center; padding: 0.4rem 0.8rem; border: 2px solid var(--border-color); border-radius: 15px; cursor: pointer; font-size: 0.9rem; background: #f0f8ff; margin-right: 0.5rem; margin-bottom: 0.5rem; animation: scaleIn 0.2s ease-out;';
                        tagElement.innerHTML = `
                            <input type="checkbox" name="${inputName}" value="${customTag.trim()}" style="margin-right: 0.4rem;" checked>
                            ${customTag.trim()}
                        `;
                        container.appendChild(tagElement);
                    }
                    closeInput();
                };
            };
        };

        setupCustomTagInput('addScheduleTagBtn', 'customScheduleTags', 'scheduleTags', I18n.t('housing.prompt.custom_schedule') || I18n.t('housing.schedule.custom'));
        setupCustomTagInput('addHabitTagBtn', 'customHabitTags', 'habitTags', I18n.t('housing.prompt.custom_habit') || I18n.t('housing.habit.custom'));
        setupCustomTagInput('addFacilityTagBtn', 'customFacilityTags', 'facilityTags', I18n.t('housing.prompt.custom_facility') || I18n.t('housing.facility.custom'));

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const postTypeCategory = document.getElementById('postTypeCategory').value;
                let postType = '';

                if (postTypeCategory === 'on_campus') {
                    postType = document.getElementById('dormType').value;
                } else {
                    postType = 'off_campus';
                }

                // Gather fields based on form existence
                const title = document.getElementById('postTitle').value;
                const peopleCount = document.getElementById('peopleCount').value;
                const deadlineInput = document.getElementById('deadline');
                const deadline = deadlineInput ? deadlineInput.value : null;

                if (deadline) {
                    const selectedDate = new Date(deadline);
                    const now = new Date();
                    if (selectedDate < now) {
                        alert(I18n.t('common.error') + ': 報名截止日期不能早於現在');
                        return;
                    }
                }

                // Optional fields depending on type
                const budgetInput = document.getElementById('budget');
                const facilitiesInput = document.getElementById('facilities');
                const roomNumberInput = document.getElementById('roomNumber');
                const addressInput = document.getElementById('address');
                const leaseTermInput = document.getElementById('leaseTerm');

                // New fields for off-campus
                const authorNameInput = document.getElementById('authorName');
                const authorDeptInput = document.getElementById('authorDept');
                const genderPreferenceInput = document.getElementById('genderPreference');

                // Schedule tags (checkboxes for off-campus, radio for on-campus)
                const scheduleTagsCheckboxes = document.querySelectorAll('input[name="scheduleTags"]:checked');
                const scheduleTags = Array.from(scheduleTagsCheckboxes).map(cb => cb.value).join(', ');
                const scheduleTypeRadio = document.querySelector('input[name="scheduleType"]:checked');
                const scheduleDetailInput = document.getElementById('scheduleDetail');

                // Habit tags (checkboxes)
                const habitTagsCheckboxes = document.querySelectorAll('input[name="habitTags"]:checked');
                const habitTags = Array.from(habitTagsCheckboxes).map(cb => cb.value).join(', ');
                const habitDetailInput = document.getElementById('habitDetail');

                const postData = {
                    host_email: user.email,
                    host_name: authorNameInput ? authorNameInput.value : user.displayName,
                    host_dept: authorDeptInput ? authorDeptInput.value : (user.department || ''),
                    housing_type: postType,
                    title: title,
                    location: addressInput ? addressInput.value : '',
                    room_number: roomNumberInput ? roomNumberInput.value : '',
                    rent_amount: budgetInput ? budgetInput.value : null,
                    deposit: document.getElementById('deposit') ? document.getElementById('deposit').value : '',
                    people_needed: peopleCount,
                    gender_req: genderPreferenceInput ? genderPreferenceInput.value : 'any',
                    deadline: deadline,
                    rental_period: leaseTermInput ? leaseTermInput.value : '',
                    facilities: facilitiesInput ? facilitiesInput.value : (document.querySelectorAll('input[name="facilityTags"]:checked').length ? Array.from(document.querySelectorAll('input[name="facilityTags"]:checked')).map(cb => cb.value).join(', ') : ''),
                    habits: habitTags || null,
                    description: (postType === 'off_campus' && document.getElementById('offCampusDetail')) ? document.getElementById('offCampusDetail').value : (scheduleDetailInput ? scheduleDetailInput.value : '')
                };

                try {
                    const response = await fetch('/create-housing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(postData)
                    });
                    if (response.ok) {
                        if (window.refreshUserProfile) await window.refreshUserProfile();
                        alert(I18n.t('housing.alert.post_created') || 'Post created successfully!');
                        currentState = 'manage';
                        updateView();
                        bindListeners();
                    } else {
                        const err = await response.json();
                        alert('Error: ' + err.error);
                    }
                } catch (e) {
                    console.error('Failed to create housing:', e);
                    alert('Failed to connect to server.');
                }
            });
        }
    };

    // Application management functions
    window.viewApplications = async (postId) => {
        app.innerHTML = await renderApplicationsList(postId);

        // Bind back button
        const btnBackToManage = document.querySelector('.btn-back-to-manage');
        if (btnBackToManage) {
            btnBackToManage.onclick = () => {
                currentState = 'manage';
                updateView();
                bindListeners();
            };
        }
    };

    // Taruh di bagian bawah file housing.js
    window.openHousingChat = async (postId, postTitle) => {
        const userProfileStr = localStorage.getItem('userProfile');
        if (!userProfileStr) return;
        const user = JSON.parse(userProfileStr);

        try {
            await fetch('/setup-chat-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: 'housing_' + postId,
                    post_id: postId,
                    room_type: 'housing',
                    team_name: postTitle || 'Housing Group',
                    participants: [{
                        id: user.email,
                        name: user.name || user.displayName,
                        role: 'participant'
                    }]
                })
            });
            window.navigateTo(`messages?room=housing_${postId}`);
        } catch (e) {
            console.error('Failed to setup chat:', e);
            alert('Failed to connect to chat room');
        }
    };

    // Consolidated openChatRoom
    window.openChatRoom = async (applicationId) => {
        const app = await MockStore.getApplicationById(applicationId) || window.HousingAppEngine.getApps().find(a => a.id === applicationId);
        if (app) {
            window.navigateTo(`messages?room=housing_${app.postId}`);
        } else {
            alert(I18n.t('housing.alert.chat_error'));
        }
    };

    window.acceptApplication = async (appId, postId) => {
        await MockStore.updateApplicationStatus(appId, 'accepted', postId);

        // Fetch application for potential future use (or remove if unneeded)
        const applications = await MockStore.getPostApplications(postId);
        const acceptedApp = applications.find(a => a.id === appId);

        // Refresh the view safely
        if (currentState === 'manage') {
            await updateView();
            bindListeners();
        } else {
            app.innerHTML = await renderApplicationsList(postId);
            const btnBackToManage = document.querySelector('.btn-back-to-manage');
            if (btnBackToManage) {
                btnBackToManage.onclick = () => {
                    currentState = 'manage';
                    updateView();
                    bindListeners();
                };
            }
        }

        alert(I18n.t('housing.alert.accepted'));
    };

    window.rejectApplication = async (appId, postId) => {
        window.showSimpleConfirm(I18n.t('housing.confirm.reject'), async () => {
            await MockStore.updateApplicationStatus(appId, 'rejected', postId);

            // Refresh the view safely
            if (currentState === 'manage') {
                await updateView();
                bindListeners();
            } else {
                app.innerHTML = await renderApplicationsList(postId);
                const btnBackToManage = document.querySelector('.btn-back-to-manage');
                if (btnBackToManage) {
                    btnBackToManage.onclick = () => {
                        currentState = 'manage';
                        updateView();
                        bindListeners();
                    };
                }
            }
        });
    };


    // --- HOUSING JOIN FORM ---
    window.openHousingJoinForm = async (postId, titleRaw) => {
        const teamName = decodeURIComponent(titleRaw || '');
        const existingOverlay = document.getElementById('housing-join-overlay');
        if (existingOverlay) existingOverlay.remove();

        const isZH = localStorage.getItem('language')?.includes('zh') !== false;
        const msgConfirm = isZH ? '確認申請加入' : 'Confirm Application';
        const msgDesc = isZH
            ? `您確定要申請加入 <strong>${teamName}</strong> 嗎？<br><small style="color:#888">發起人將收到您的個人資料並決定是否接受</small>`
            : `Apply to join <strong>${teamName}</strong>?<br><small style="color:#888">The host will review your profile and decide</small>`;

        const formHtml = `
            <div id="housing-join-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(4px);">
                <div style="background:white;width:85%;max-width:350px;border-radius:16px;padding:2rem;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.2);animation:scaleIn 0.2s ease-out;">
                    <div style="font-size:2.5rem;margin-bottom:0.5rem;">🏠</div>
                    <h3 style="margin:0 0 1rem 0;color:#333;">${msgConfirm}</h3>
                    <p style="color:#666;margin-bottom:1.5rem;line-height:1.6;">${msgDesc}</p>
                    <div style="display:flex;gap:1rem;">
                        <button onclick="document.getElementById('housing-join-overlay').remove()" style="flex:1;padding:0.8rem;background:#eee;color:#555;border-radius:8px;border:none;cursor:pointer;font-weight:bold;">
                            ${isZH ? '取消' : 'Cancel'}
                        </button>
                        <button id="btn-housing-confirm-join" style="flex:1;padding:0.8rem;background:linear-gradient(135deg,#FF8C00,#FF6D00);color:white;border-radius:8px;border:none;cursor:pointer;font-weight:bold;">
                            ${isZH ? '確認送出' : 'Submit'}
                        </button>
                    </div>
                </div>
            </div>
            <style>@keyframes scaleIn{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}</style>
        `;
        document.body.insertAdjacentHTML('beforeend', formHtml);

        document.getElementById('btn-housing-confirm-join').onclick = async () => {
            const btn = document.getElementById('btn-housing-confirm-join');
            btn.innerText = "Syncing...";
            btn.disabled = true;

            const currentUserStr = localStorage.getItem('userProfile');
            let u = currentUserStr ? JSON.parse(currentUserStr) : {};

            try {
                const out = await api.fetch('/api/v1/join', {
                    method: 'POST',
                    body: {
                        event_type: 'housing',
                        event_id: postId,
                        user_email: u.email
                    }
                });

                if (out.success) {
                    alert(isZH ? '申請已送出！等待發起人確認。' : 'Application sent! Waiting for host to confirm.');
                }
            } catch (e) {
                console.error(e);
                alert('Network error.');
            } finally {
                const ov = document.getElementById('housing-join-overlay');
                if (ov) ov.remove();
                updateView();
            }
        };
    };

    // --- HOUSING ACCEPT / REJECT ---
    window.acceptHousingApp = async (appId, postId, applicantId, applicantName, teamName) => {
        const isZH = localStorage.getItem('language')?.includes('zh') !== false;
        try {
            const out = await api.fetch('/api/v1/join/approve', {
                method: 'POST',
                body: {
                    event_type: 'housing',
                    event_id: postId,
                    target_user_email: applicantId,
                    host_email: user.email
                }
            });
            if (out.success) {
                alert(isZH ? '已接受！ ✓' : 'Accepted! ✓');
            }
        } catch (e) {
            console.error(e);
        } finally {
            updateView();
        }
    };

    window.rejectHousingApp = async (appId, postId, applicantId, teamName) => {
        const isZH = localStorage.getItem('language')?.includes('zh') !== false;
        try {
            const out = await api.fetch('/api/v1/join/reject', {
                method: 'POST',
                body: {
                    event_type: 'housing',
                    event_id: postId,
                    target_user_email: applicantId,
                    host_email: user.email
                }
            });
            if (out.success) {
                alert(isZH ? '已拒絕！' : 'Rejected!');
            }
        } catch (e) {
            console.error(e);
        } finally {
            updateView();
        }
    };

    window.openGroupChat = (activityId) => {
        const userProfileStr = localStorage.getItem('userProfile');
        if (!userProfileStr) {
            alert(I18n.t('auth.err.login_required') || "Please login first!");
            return;
        }
        window.navigateTo(`messages?room=housing_${activityId}`);
    };


    // Initial Render
    updateView();
    bindListeners();
};
