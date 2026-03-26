// import { AirtableService } from '../services/airtableService.js';

/**
 * Mock Data Store for JoinUp! (Simulating Backend)
 * Handles: Posts, Applications
 */

const STORAGE_KEYS = {
    POSTS: 'joinup_posts_manual_test_v1',
    APPLICATIONS: 'joinup_applications_manual_test_v1',
    MESSAGES: 'joinup_messages_manual_test_v1',
    NOTIFICATIONS: 'joinup_notifications_v1',
    CHATROOMS: 'joinup_chatrooms_v1',
    REPORTS: 'joinup_reports_v1',
    MATCH_FEEDBACKS: 'joinup_match_feedbacks', // Developer Data
    BLOCKED_USERS: 'joinup_blocked_users_v1',
    REGISTERED_USERS: 'joinup_users_v1',
    AUDIT_LOGS: 'joinup_audit_logs_v1',
    EVIDENCE_ARCHIVE: 'joinup_evidence_archive_v1'
};

const INITIAL_CREDIT = 0;
const NCNU_EMAIL_REGEX = /^s\d{9}@mail1\.ncnu\.edu\.tw$/;


// Memory Cache for Performance (Phase 9)
const CACHE = {};

// Initial Data Helper
const getStorage = (key) => {
    if (CACHE[key]) return CACHE[key];
    const data = localStorage.getItem(key);
    const parsed = data ? JSON.parse(data) : [];
    CACHE[key] = parsed;
    return parsed;
};

const setStorage = (key, data) => {
    try {
        CACHE[key] = data;
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`[MockStore] Storage failed for key "${key}":`, e);
        if (e.name === 'QuotaExceededError') {
            throw new Error(I18n.t('common.err.quota'));
        }
        throw e;
    }
};

// Seed Data for Demo - DISABLED for manual testing
const currentPosts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]');
if (currentPosts.length === 0) {
    console.log('[MockStore] Fresh start - no data seeded.');
    setStorage(STORAGE_KEYS.POSTS, []);
}

export const MockStore = {
    // --- User Management ---
    registerUser: async (userData) => {
        const users = getStorage(STORAGE_KEYS.REGISTERED_USERS);
        // Check if email already exists
        if (users.some(u => u.email === userData.email)) {
            return { success: false, message: 'Email already registered' };
        }

        // Strict Email Format Enforcement for Students
        if (userData.role === 'student' && !NCNU_EMAIL_REGEX.test(userData.email)) {
            return { success: false, message: 'Invalid email format. Must be s+studentID@mail1.ncnu.edu.tw' };
        }

        const newUser = {
            status: 'Active',
            isBlacklisted: false,
            reportsMade: 0,
            reportsReceived: 0,
            ...userData,
            creditScore: INITIAL_CREDIT,
            successMatches: 0, // Keep legacy field for now but favor creditScore
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        setStorage(STORAGE_KEYS.REGISTERED_USERS, users);

        // SYNC TO AIRTABLE (Requirement 2)
        // await AirtableService.syncUser(newUser);

        return { success: true, user: newUser };
    },

    loginUser: async (email, password) => {
        // Use Supabase for login
        try {
            const { data, error } = await window.supabaseClient
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();

            if (error || !data) {
                return { success: false, message: 'Invalid email or password' };
            }

            // Strict Email Format Enforcement for Students
            if (data.role === 'student' && !NCNU_EMAIL_REGEX.test(email)) {
                return { success: false, message: 'Invalid email format. Must be s+studentID@mail1.ncnu.edu.tw' };
            }

            if (data.status === 'Suspended' || data.status === 'Banned') {
                return { success: false, message: 'Your account has been suspended or banned.' };
            }

            const { password: _, ...safeUser } = data;

            // ADMIN CHECK (Requirement 3)
            // const adminCheck = await AirtableService.verifyAdmin(email);
            const adminCheck = false;
            if (adminCheck.success) {
                safeUser.isAdmin = true;
                safeUser.adminName = adminCheck.name;
            } else {
                safeUser.isAdmin = false;
            }

            return { success: true, user: safeUser };

        } catch (err) {
            console.error("Supabase login error:", err);
            return { success: false, message: 'An error occurred during login.' };
        }
    },

    getUser: (userId) => {
        const users = getStorage(STORAGE_KEYS.REGISTERED_USERS);
        const user = users.find(u => u.email === userId);
        if (!user) return null;

        // Return public info only
        const { password, ...publicInfo } = user;
        return publicInfo;
    },

    updateUserProfile: async (email, updates) => {
        console.log(`[MockStore] Updating profile for ${email}`, updates);

        if (window.supabaseClient && window.supabaseClient.supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL') {
            try {
                const mapUpdates = { ...updates };
                if (updates.displayName) mapUpdates.realName = updates.displayName;

                const { data, error } = await window.supabaseClient
                    .from('users')
                    .update(mapUpdates)
                    .eq('email', email)
                    .select();

                if (!error && data && data.length > 0) {
                    const currentProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
                    if (currentProfile.email === email) {
                        const updatedSession = { ...currentProfile, ...data[0] };
                        localStorage.setItem('userProfile', JSON.stringify(updatedSession));
                        window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updatedSession }));
                    }
                }
            } catch (error) {
                console.error('[MockStore] Supabase updateUser failed:', error);
            }
        }

        const users = getStorage(STORAGE_KEYS.REGISTERED_USERS);
        const userIndex = users.findIndex(u => u.email === email);

        if (userIndex !== -1) {
            // 1. Update Registered Users List
            users[userIndex] = { ...users[userIndex], ...updates };
            setStorage(STORAGE_KEYS.REGISTERED_USERS, users);

            // 2. Synchronize Current Session Cache if it matches
            const currentProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
            if (currentProfile.email === email) {
                const updatedSession = { ...currentProfile, ...updates };
                localStorage.setItem('userProfile', JSON.stringify(updatedSession));
                // Dispatch event for UI components to listen
                window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updatedSession }));
            }

            // 3. Sync to Airtable
            try {
                // Map local fields to Airtable fields if necessary
                const airtableFields = {};
                if (updates.photoURL !== undefined) airtableFields['Avatar'] = updates.photoURL;
                if (updates.displayName !== undefined) airtableFields['Nickname'] = updates.displayName;
                if (updates.department !== undefined) airtableFields['Department'] = updates.department;
                if (updates.gender !== undefined) airtableFields['Gender'] = updates.gender;
                if (updates.interests !== undefined) airtableFields['Interests'] = updates.interests;
                if (updates.bio !== undefined) airtableFields['Bio'] = updates.bio;

                if (Object.keys(airtableFields).length > 0) {
                    // await AirtableService.updateUser(email, airtableFields);
                }
            } catch (error) {
                console.error('[MockStore] Airtable sync failed:', error);
            }

            return { success: true, user: users[userIndex] };
        }
        return { success: false, message: 'User not found' };
    },

    completeMatch: async (roomId, status) => {
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
        const room = rooms.find(r => r.id === roomId);
        if (!room) return;

        const posts = getStorage(STORAGE_KEYS.POSTS);
        const post = posts.find(p => p.id === room.postId);

        if (post) {
            post.status = 'closed';
            post.matchConfirmed = true;
            post.matchStatus = status;
            setStorage(STORAGE_KEYS.POSTS, posts);

            // Log to Analytics
            MockStore.logMatchResult(post.id, post.category, status, post.participants?.length || 0, post.teamName || post.title);

            // Award points if success
            if (status === 'Success') {
                const participants = post.participants || [];
                const postAuthor = post.userId || post.authorId;

                for (const p of participants) {
                    const pId = typeof p === 'string' ? p : (p.id || p.userId);
                    const isHost = pId === postAuthor;
                    const points = isHost ? 2 : 1;

                    await MockStore.awardCredit(pId, points);

                    // Create Notification for Rating
                    MockStore.createNotification(
                        pId,
                        I18n.t('system.notif.match_success', { title: post.teamName || post.title, points: points }),
                        'success',
                        `action:rate:${post.id}`
                    );
                }

                // Send System Message
                MockStore.sendChatMessage(roomId, 'system', I18n.t('common.system'), I18n.t('system.msg.match_success'));
            } else {
                MockStore.sendChatMessage(roomId, 'system', I18n.t('common.system'), I18n.t('system.msg.match_failed'));
            }
        }
    },

    // --- Posts ---
    simulateGoogleSheetExport: (userData) => {
        return new Promise((resolve) => {
            console.log(`[Backend] Initiating Google Sheet Export for: ${userData.email}`);

            // Determine Target Sheet based on Role
            const role = userData.role || 'student';
            const teacherRoles = ['professor', 'doctor', 'lecturer', 'senior_lecturer'];
            const targetSheet = teacherRoles.includes(role) ? 'Teachers_Staff_Data' : 'Students_Data';

            console.log(`[Backend] Routing data to Sheet Tab: [${targetSheet}]`);

            // Simulate Network Delay
            setTimeout(() => {
                console.log(`[Backend] ✅ Data successfully row appended to ${targetSheet}`);
                console.log(`[Backend] Columns: ${userData.realName} | ${userData.major} ${userData.year} | ${userData.email} | [HASHED_PWD]`);
                resolve(true);
            }, 2500); // 2.5s delay to be noticeable but not annoying
        });
    },

    createPost: async (postData) => {
        const newPost = {
            id: 'post_' + Date.now().toString(), // Ensure generated IDs are strings
            category: postData.category,
            author_id: postData.authorId,
            authorid: postData.authorId, // Duplicate for backwards compat or specific table schema
            teamname: postData.teamName || postData.title || 'Untitled',
            title: postData.title || postData.teamName || 'Untitled',
            description: postData.description || '',
            status: 'open',
            location: postData.location || '',
            eventtime: postData.eventTime ? new Date(postData.eventTime).toISOString() : null,
            deadline: postData.deadline ? new Date(postData.deadline).toISOString() : null,
        };

        if (window.supabaseClient && window.supabaseClient.supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL') {
            try {
                const { data, error } = await window.supabaseClient
                    .from('activities')
                    .insert([newPost])
                    .select();

                if (error) {
                    console.error("Supabase createPost error:", error);
                } else if (data && data.length > 0) {
                    // Award 1 point for participation (initiator)
                    MockStore.awardCredit(newPost.author_id, 1);
                    return data[0]; // Return the inserted row
                }
            } catch (err) {
                console.error("Failed to insert into Supabase:", err);
            }
        }

        // Fallback or returned data
        const posts = getStorage(STORAGE_KEYS.POSTS);
        const localPost = {
            ...postData,
            id: newPost.id,
            status: 'open',
            createdAt: new Date().toISOString()
        };
        posts.push(localPost);
        setStorage(STORAGE_KEYS.POSTS, posts);

        // Award 1 point for participation (initiator)
        MockStore.awardCredit(localPost.authorId, 1);

        return localPost;
    },

    getLiveActivities: async () => {
        if (window.supabaseClient && window.supabaseClient.supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL') {
            try {
                const { data, error } = await window.supabaseClient
                    .from('activities')
                    .select('*')
                    .eq('status', 'open')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (error) {
                    console.error('Error fetching live activities:', error);
                    return [];
                }
                return data || [];
            } catch (err) {
                console.error("Supabase fetch error:", err);
            }
        }
        const posts = await MockStore.getPosts({ includeAll: true });
        if (!Array.isArray(posts)) return [];
        return posts
            .filter(p => p.status === 'open')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
    },

    // Check and update expired posts
    checkAndUpdateExpiredPosts: () => {
        const posts = getStorage(STORAGE_KEYS.POSTS);
        const now = new Date();
        let updated = false;
        const expiredPosts = [];

        posts.forEach(p => {
            if (p.status === 'open' || p.status === 'paused') {
                let shouldExpire = false;
                let expireReason = '';

                // Check deadline expiration (for all categories)
                if (p.deadline) {
                    const deadline = new Date(p.deadline);
                    if (deadline < now) {
                        shouldExpire = true;
                        expireReason = 'deadline';
                    }
                }

                // Check event time expiration (for travel, sports, carpool, and study category)
                if (!shouldExpire && (p.category === 'travel' || p.category === 'sports' || p.category === 'carpool' || p.category === 'study') && p.eventTime) {
                    const eventTime = new Date(p.eventTime);
                    if (eventTime < now) {
                        shouldExpire = true;
                        expireReason = 'eventTime';
                    }
                }

                if (shouldExpire) {
                    p.status = 'expired';
                    updated = true;
                    expiredPosts.push({ post: p, reason: expireReason });
                    console.log(`[MockStore] Post expired (${expireReason}):`, p.id);
                }
            }
        });

        if (updated) {
            setStorage(STORAGE_KEYS.POSTS, posts);
            // Log analytics for each expired post
            expiredPosts.forEach(({ post: p, reason }) => {
                let categoryName = '租屋';
                if (p.category === 'travel') categoryName = 'Travel';
                if (p.category === 'sports') categoryName = 'Sports';
                if (p.category === 'carpool') categoryName = 'Carpool';

                MockStore.logMatchResult(p.id, categoryName, 'Expired', 0, p.title || p.teamName);

                // Notify all participants to rate
                const participants = p.participants || [];
                participants.forEach(part => {
                    const pId = typeof part === 'string' ? part : part.id;
                    MockStore.createNotification(
                        pId,
                        `活動 "${p.teamName}" 時間已到！請協助填寫評價`,
                        'info',
                        `action:rate:${p.id}`
                    );
                });

                // Send System Message to Group Chat
                const room = MockStore.getGroupChatByPost(p.id);
                if (room) {
                    MockStore.sendChatMessage(room.id, 'system', '系統', '🕒 活動時間已結束，請記得填寫評價喔！');
                }
            });
        }
    },

    getPosts: async (filter = {}) => {
        if (window.supabaseClient && window.supabaseClient.supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL') {
            try {
                let query = window.supabaseClient
                    .from('activities')
                    .select('*');

                if (!filter.includeAll) {
                    query = query.eq('status', 'open');
                }
                if (filter.category) {
                    query = query.eq('category', filter.category);
                }
                if (filter.type) {
                    query = query.eq('type', filter.type);
                }
                if (filter.location) {
                    query = query.eq('location', filter.location);
                }

                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) {
                    console.error('Error fetching getPosts from Supabase:', error);
                } else if (data) {
                    return data.map(p => ({
                        ...p,
                        id: p.id,
                        authorId: p.author_id || p.authorId,
                        teamName: p.teamname || p.teamName || p.title,
                        title: p.title || p.teamname || p.teamName,
                        eventTime: p.eventtime || p.eventTime,
                        createdAt: p.created_at || p.createdAt
                    }));
                }
            } catch (e) {
                console.error("Supabase getPosts error", e);
            }
        }

        // Fallback
        MockStore.checkAndUpdateExpiredPosts();
        let posts = getStorage(STORAGE_KEYS.POSTS);
        if (!filter.includeAll) posts = posts.filter(p => p.status === 'open');
        if (filter.category) posts = posts.filter(p => p.category === filter.category);
        if (filter.type) posts = posts.filter(p => p.type === filter.type);
        if (filter.location) posts = posts.filter(p => p.location === filter.location);
        return posts;
    },

    getPost: async (postId) => {
        if (window.supabaseClient && window.supabaseClient.supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL') {
            try {
                const { data, error } = await window.supabaseClient
                    .from('activities')
                    .select('*')
                    .eq('id', postId)
                    .single();

                if (data && !error) {
                    return {
                        ...data,
                        authorId: data.author_id || data.authorId,
                        teamName: data.teamname || data.teamName || data.title,
                        title: data.title || data.teamname || data.teamName,
                        eventTime: data.eventtime || data.eventTime,
                        createdAt: data.created_at || data.createdAt
                    };
                }
            } catch (err) { }
        }
        const posts = getStorage(STORAGE_KEYS.POSTS);
        return posts.find(p => p.id === postId) || null;
    },

    getMyPosts: async (userId) => {
        if (window.supabaseClient && window.supabaseClient.supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL') {
            try {
                const { data, error } = await window.supabaseClient
                    .from('activities')
                    .select('*')
                    .eq('author_id', userId)
                    .order('created_at', { ascending: false });

                if (data && !error) {
                    return data.map(p => ({
                        ...p,
                        authorId: p.author_id || p.authorId,
                        teamName: p.teamname || p.teamName || p.title,
                        title: p.title || p.teamname || p.teamName,
                        eventTime: p.eventtime || p.eventTime,
                        createdAt: p.created_at || p.createdAt
                    }));
                }
            } catch (err) { }
        }
        // Fallback
        MockStore.checkAndUpdateExpiredPosts();
        const posts = getStorage(STORAGE_KEYS.POSTS);
        return posts.filter(p => p.authorId === userId);
    },

    updatePostStatus: async (postId, status, selectedPartnerIds = null) => {
        if (window.supabaseClient && window.supabaseClient.supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL') {
            try {
                let updateData = { status: status };
                if (status === 'pending_confirmation' && selectedPartnerIds) {
                    updateData.selectedPartners = selectedPartnerIds; // Supabase natively supports JSONB
                    updateData.confirmedPartners = [];
                }
                const { error } = await window.supabaseClient
                    .from('activities')
                    .update(updateData)
                    .eq('id', postId);
                if (!error) return true;
            } catch (err) { console.error('Supabase updatePostStatus error:', err); }
        }

        const posts = getStorage(STORAGE_KEYS.POSTS);
        const index = posts.findIndex(p => p.id === postId);
        if (index !== -1) {
            posts[index].status = status;

            // If pending_confirmation (host confirmed, waiting for partners)
            if (status === 'pending_confirmation' && selectedPartnerIds) {
                posts[index].selectedPartners = selectedPartnerIds;
                posts[index].confirmedPartners = []; // Track who has confirmed
                posts[index].hostConfirmedAt = new Date().toISOString();
            }

            // If success (all parties confirmed)
            if (status === 'success') {
                posts[index].successAt = new Date().toISOString();
            }

            setStorage(STORAGE_KEYS.POSTS, posts);

            // Analytics
            if (status === 'cancelled') {
                MockStore.logMatchResult(postId, '租屋', 'Cancelled', 0, posts[index].title);
            } else if (status === 'success') {
                MockStore.logMatchResult(postId, '租屋', 'Success', posts[index].selectedPartners?.length || 1, posts[index].title);
            }
            return true;
        }
        return false;
    },

    // --- Applications ---
    createApplication: async (appData) => {
        const newApp = {
            id: 'app_' + Date.now(),
            created_at: new Date().toISOString(),
            status: 'pending', // pending, accepted, rejected
            budget_confirmed: appData.budgetConfirmed || false, // Path D
            post_id: appData.postId,
            applicant_id: appData.applicantId,
            applicant_name: appData.applicantName,
            applicant_dept: appData.applicantDept,
            details: JSON.stringify(appData) // Keep extra dynamic data in a JSON payload or similar
        };

        if (window.supabaseClient && window.supabaseClient.supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL') {
            try {
                const { data, error } = await window.supabaseClient
                    .from('applications')
                    .insert([newApp])
                    .select();

                if (error) {
                    console.error('Supabase createApplication error:', error);
                }
            } catch (err) { console.error(err); }
        }

        // Fallback or mirror locally for now
        const apps = getStorage(STORAGE_KEYS.APPLICATIONS);
        const localApp = { ...newApp, ...appData, createdAt: newApp.created_at, postId: newApp.post_id, applicantId: newApp.applicant_id };
        apps.push(localApp);
        setStorage(STORAGE_KEYS.APPLICATIONS, apps);

        // Award 1 point for participation (applicant)
        await MockStore.awardCredit(appData.applicantId, 1);
        MockStore.createNotification(appData.applicantId, `✨ 感謝參與 "${appData.title || '活動'}"，獲得 1 點信用積分！`, 'success');

        // Notify Host & Sync Airtable
        const post = await MockStore.getPost(appData.postId);
        if (post) {
            if (['housing', 'roommate', 'groupbuy'].includes(post.category)) {
                // AirtableService.linkEventParticipation(appData.applicantId, post.title || 'Housing Event').catch(e => console.error(e));
            }

            if (post.authorId !== appData.applicantId) {
                MockStore.createNotification(
                    post.authorId,
                    I18n.t('system.notif.apply', { name: appData.applicantName, title: post.title }),
                    'info',
                    'manage' // Redirect to management page
                );
            }
        }

        return localApp;
    },

    // --- (Previous code snippet ends, refactoring deductTrustPoints) ---

    deductTrustPoints: async (userId, points, reason, adminId = null) => {
        // Unify logic to use adjustTrustPoints (Phase 9 standard)
        // ensure points is positive, so delta is negative
        const delta = -Math.abs(points);
        return await MockStore.adjustTrustPoints(userId, delta, reason, adminId);
    },

    // Partner confirms they want to join (bidirectional confirmation)
    // Housing / GroupBuy specific confirm
    confirmHousingApplication: async (postId, applicationId) => {
        const posts = getStorage(STORAGE_KEYS.POSTS);
        const postIndex = posts.findIndex(p => p.id === postId);

        if (postIndex === -1) return { success: false, message: '找不到貼文' };

        const post = posts[postIndex];

        if (post.status !== 'pending_confirmation') {
            return { success: false, message: '此貼文尚未進入確認階段' };
        }

        // Check if this application is in selectedPartners
        if (!post.selectedPartners || !post.selectedPartners.includes(applicationId)) {
            return { success: false, message: '您未被選為最終室友' };
        }

        // Check if already confirmed
        if (post.confirmedPartners && post.confirmedPartners.includes(applicationId)) {
            return { success: false, message: '您已經確認過了' };
        }

        // Add to confirmedPartners
        if (!post.confirmedPartners) post.confirmedPartners = [];
        post.confirmedPartners.push(applicationId);

        // Check if all selected partners have confirmed
        const allConfirmed = post.selectedPartners.every(id => post.confirmedPartners.includes(id));

        if (allConfirmed) {
            post.status = 'success';
            post.successAt = new Date().toISOString();
            MockStore.logMatchResult(postId, '租屋', 'Success', post.selectedPartners.length, post.title);

            // Award points: 2 for initiator, 1 for partners
            const initiatorId = post.userId || post.authorId;
            await MockStore.awardCredit(initiatorId, 2);
            MockStore.createNotification(initiatorId, `✨ 恭喜室友媒合成功 (${post.title})，獲得 2 點信用積分！`, 'success', `action:rate:${post.id}`);

            if (post.confirmedPartners) {
                for (const appId of post.confirmedPartners) {
                    const app = MockStore.getApplicationById(appId);
                    if (app && app.userId) {
                        await MockStore.awardCredit(app.userId, 1);
                        MockStore.createNotification(app.userId, `✨ 恭喜室友媒合成功 (${post.title})，獲得 1 點信用積分！`, 'success', `action:rate:${post.id}`);
                    }
                }
            }
        }

        setStorage(STORAGE_KEYS.POSTS, posts);

        return {
            success: true,
            allConfirmed: allConfirmed,
            message: allConfirmed ? I18n.t('system.alert.all_confirmed') : I18n.t('system.alert.waiting_others')
        };
    },

    updateApplicationStatus: (appId, status, postId = null) => {
        const apps = getStorage(STORAGE_KEYS.APPLICATIONS);
        const appIndex = apps.findIndex(a => a.id === appId);

        if (appIndex !== -1) {
            apps[appIndex].status = status;
            setStorage(STORAGE_KEYS.APPLICATIONS, apps);

            // If accepted, just update the status (do not decrement count or set full)
            if (status === 'accepted') {
                // Logic removed as per user request: "accept" means chat, not taken.
                // Count decrement and closing happens only on manual Stop or Confirm Success.

                // Notify Applicant
                const app = apps[appIndex];
                const post = MockStore.getPost(app.postId);
                if (post) {
                    MockStore.createNotification(
                        app.applicantId,
                        I18n.t('system.notif.accepted', { title: post.title }),
                        'success',
                        'manage' // Or a better link if possible, but manage is safe
                    );
                }
            } else if (status === 'rejected') {
                // Notify Applicant
                const app = apps[appIndex];
                const post = MockStore.getPost(app.postId);
                if (post) {
                    MockStore.createNotification(
                        app.applicantId,
                        I18n.t('system.notif.rejected', { title: post.title }),
                        'warning',
                        'manage'
                    );
                }
            }
            return true;
        }
        return false;
    },

    getApplicationById: (appId) => {
        const apps = getStorage(STORAGE_KEYS.APPLICATIONS);
        return apps.find(a => a.id === appId) || null;
    },

    // --- Chat Messages ---
    getMessages: (postId) => {
        const msgs = getStorage(STORAGE_KEYS.MESSAGES);
        return msgs.filter(m => m.postId === postId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    addMessage: (msgData) => {
        const msgs = getStorage(STORAGE_KEYS.MESSAGES);
        const newMsg = {
            id: 'msg_' + Date.now(),
            timestamp: new Date().toISOString(),
            ...msgData
        };
        msgs.push(newMsg);
        setStorage(STORAGE_KEYS.MESSAGES, msgs);
        return newMsg;
    },

    getPostApplications: (postId) => {
        const apps = getStorage(STORAGE_KEYS.APPLICATIONS);
        return apps.filter(a => a.postId === postId);
    },

    getMySentApplications: (userId) => {
        const apps = getStorage(STORAGE_KEYS.APPLICATIONS);
        return apps.filter(a => a.applicantId === userId);
    },

    // --- Final Match Confirmation ---
    confirmFinalMatch: (postId, confirmedPartnerIds) => {
        const posts = getStorage(STORAGE_KEYS.POSTS);
        const postIndex = posts.findIndex(p => p.id === postId);

        if (postIndex !== -1) {
            posts[postIndex].status = 'success';
            posts[postIndex].finalOutcome = 'Success';
            posts[postIndex].confirmedPartners = confirmedPartnerIds;
            posts[postIndex].partnerConfirmed = []; // Track who has double-confirmed
            posts[postIndex].confirmedAt = new Date().toISOString();

            setStorage(STORAGE_KEYS.POSTS, posts);

            // Analytics for Success
            MockStore.logMatchResult(postId, '租屋', 'Success', confirmedPartnerIds.length, posts[postIndex].title);
            return true;
        }
        return false;
    },

    // Generic Activity / Travel / Sports specific confirm
    confirmActivityParticipation: async (postId, partnerId) => {
        const posts = getStorage(STORAGE_KEYS.POSTS);
        const postIndex = posts.findIndex(p => p.id === postId);

        if (postIndex === -1) return { success: false, message: '找不到貼文' };
        const post = posts[postIndex];

        // 1. Check status: must be 'pending_confirmation'
        if (post.status !== 'pending_confirmation') {
            return { success: false, message: '此貼文目前無法確認成案 (狀態不正確)' };
        }

        // 2. Verify user is in the selectedPartners list
        if (!post.selectedPartners || !post.selectedPartners.includes(partnerId)) {
            return { success: false, message: '您不在發起人的成案名單中' };
        }

        // 3. Check if already confirmed
        const confirmedList = post.confirmedPartners || [];
        if (confirmedList.includes(partnerId)) {
            return { success: false, message: '您已經確認過了，請等待其他人。' };
        }

        // 4. Mark as confirmed
        confirmedList.push(partnerId);
        post.confirmedPartners = confirmedList;

        // 5. Check if ALL selected partners have confirmed
        const allConfirmed = post.selectedPartners.every(id => confirmedList.includes(id));

        if (allConfirmed) {
            post.status = 'success';
            post.finalOutcome = 'Success';
            post.confirmedAt = new Date().toISOString();
            // Analytics
            MockStore.logMatchResult(postId, post.category || '活動', 'Success', confirmedList.length, post.title);

            // Award points: 2 for initiator, 1 for partners
            const initiatorId = post.userId || post.authorId;
            await MockStore.awardCredit(initiatorId, 2);
            MockStore.createNotification(initiatorId, `✨ 恭喜活動媒合成功 (${post.title})，獲得 2 點信用積分！`, 'success', `action:rate:${post.id}`);

            for (const pId of confirmedList) {
                await MockStore.awardCredit(pId, 1);
                MockStore.createNotification(pId, `✨ 恭喜活動媒合成功 (${post.title})，獲得 1 點信用積分！`, 'success', `action:rate:${post.id}`);
            }
        }

        setStorage(STORAGE_KEYS.POSTS, posts);

        // Update current user cache if they are part of it
        const currentProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        if (currentProfile.email && (currentProfile.email === initiatorId || confirmedList.includes(currentProfile.email))) {
            const updatedUser = MockStore.getUser(currentProfile.email);
            if (updatedUser) {
                currentProfile.creditScore = updatedUser.creditScore;
                currentProfile.successMatches = updatedUser.successMatches;
                localStorage.setItem('userProfile', JSON.stringify(currentProfile));
                window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: currentProfile }));
            }
        }

        return {
            success: true,
            message: allConfirmed ? I18n.t('system.alert.confirmed_done') : I18n.t('system.alert.confirmed_wait')
        };
    },

    // --- Chat Rooms ---
    createChatRoom: (roomData) => {
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);

        // Check if room already exists for this application
        const existingRoom = rooms.find(r => r.applicationId === roomData.applicationId);
        if (existingRoom) {
            return existingRoom;
        }

        const newRoom = {
            id: 'room_' + Date.now(),
            createdAt: new Date().toISOString(),
            postId: roomData.postId,
            applicationId: roomData.applicationId,
            roomType: roomData.roomType || 'direct',
            teamName: roomData.teamName || null,
            participants: roomData.participants || [],
            lastMessage: null,
            lastMessageAt: null
        };
        rooms.push(newRoom);
        setStorage(STORAGE_KEYS.CHATROOMS, rooms);
        return newRoom;
    },

    getChatRoomByApplication: (applicationId) => {
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
        return rooms.find(r => r.applicationId === applicationId) || null;
    },

    getChatRooms: (userId) => {
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
        return rooms.filter(r => r.participants && r.participants.some(p => {
            const id = typeof p === 'string' ? p : p.id;
            return id === userId;
        }));
    },

    getChatRoomById: (roomId) => {
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
        return rooms.find(r => r.id === roomId) || null;
    },

    getAllSupportChats: () => {
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
        return rooms.filter(r => r.roomType === 'support').sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));
    },

    deleteChatRoom: (roomId) => {
        let rooms = getStorage(STORAGE_KEYS.CHATROOMS);
        rooms = rooms.filter(r => r.id !== roomId);
        setStorage(STORAGE_KEYS.CHATROOMS, rooms);

        // Also clear messages for this room
        let msgs = getStorage(STORAGE_KEYS.MESSAGES);
        msgs = msgs.filter(m => m.roomId !== roomId);
        setStorage(STORAGE_KEYS.MESSAGES, msgs);
        console.log(`[MockStore] Room ${roomId} deleted`);
    },

    clearChatMessages: (roomId) => {
        let msgs = getStorage(STORAGE_KEYS.MESSAGES);
        msgs = msgs.filter(m => m.roomId !== roomId);
        setStorage(STORAGE_KEYS.MESSAGES, msgs);

        // Update room's last message
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
        const roomIndex = rooms.findIndex(r => r.id === roomId);
        if (roomIndex !== -1) {
            rooms[roomIndex].lastMessage = I18n.t('system.msg.cleared');
            rooms[roomIndex].lastMessageAt = new Date().toISOString();
            setStorage(STORAGE_KEYS.CHATROOMS, rooms);
        }
    },

    getChatMessages: (roomId) => {
        const msgs = getStorage(STORAGE_KEYS.MESSAGES);
        return msgs.filter(m => m.roomId === roomId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    sendChatMessage: (roomId, senderId, senderName, content, type = 'text') => {
        const msgs = getStorage(STORAGE_KEYS.MESSAGES);
        const newMsg = {
            id: 'msg_' + Date.now(),
            roomId: roomId,
            senderId: senderId,
            senderName: senderName,
            content: content,
            type: type, // text, image, file, location
            timestamp: new Date().toISOString()
        };
        msgs.push(newMsg);
        setStorage(STORAGE_KEYS.MESSAGES, msgs);

        // Update room's last message
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
        const roomIndex = rooms.findIndex(r => r.id === roomId);
        if (roomIndex !== -1) {
            let displayContent = content;
            if (type === 'image') displayContent = I18n.t('system.msg.image');
            if (type === 'video') displayContent = I18n.t('system.msg.video');
            if (type === 'file') displayContent = I18n.t('system.msg.file');
            if (type === 'location') displayContent = I18n.t('system.msg.location');

            rooms[roomIndex].lastMessage = displayContent;
            rooms[roomIndex].lastMessageAt = newMsg.timestamp;
            rooms[roomIndex].unreadCount = (rooms[roomIndex].unreadCount || 0) + 1;
            setStorage(STORAGE_KEYS.CHATROOMS, rooms);
        }

        // TRIGGER PUSH (Requirement 9 Ext)
        if (senderId !== 'system') {
            const receiver = rooms[roomIndex]?.participants.find(p => (typeof p === 'string' ? p : p.id) !== senderId);
            const receiverId = typeof receiver === 'string' ? receiver : receiver?.id;
            if (receiverId) {
                MockStore.MockPushService.triggerForMessage(senderId, receiverId, roomId, content);
            }
        }

        return newMsg;
    },

    // --- Analytics ---
    logMatchResult: (postId, category, status, count, postTitle) => {
        const stats = JSON.parse(localStorage.getItem('match_statistics') || '[]');
        stats.push({
            id: 'stat_' + Date.now(),
            postId,
            category,
            status, // Success, Failed, Withdrawn, Expired, Full
            peopleCount: count,
            title: postTitle,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('match_statistics', JSON.stringify(stats));
        console.log('[Analytics] Logged:', { postId, status });
    },

    // --- Travel: Group Chat & Quick Join ---

    // Create Group Chat Room (for travel activities)
    createGroupChatRoom: (roomData) => {
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);

        // Check if room already exists for this post
        const existingRoom = rooms.find(r => r.postId === roomData.postId && r.roomType === 'group');
        if (existingRoom) {
            return existingRoom;
        }

        const newRoom = {
            id: 'room_' + Date.now(),
            createdAt: new Date().toISOString(),
            postId: roomData.postId,
            roomType: 'group', // Mark as group chat
            category: roomData.category || 'travel',
            teamName: roomData.teamName,
            participants: roomData.participants || [],
            lastMessage: null,
            lastMessageAt: null
        };
        rooms.push(newRoom);
        setStorage(STORAGE_KEYS.CHATROOMS, rooms);

        console.log('[Travel] Group chat room created:', newRoom.id);
        return newRoom;
    },

    // Get Group Chat by Post ID
    getGroupChatByPost: (postId) => {
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
        return rooms.find(r => r.postId === postId && r.roomType === 'group') || null;
    },

    // Quick Join Travel Activity
    joinTravelActivity: async (postId, userId, userName, department) => {
        const posts = getStorage(STORAGE_KEYS.POSTS);
        const postIndex = posts.findIndex(p => p.id === postId);

        if (postIndex === -1) {
            return { success: false, message: '找不到活動' };
        }

        const post = posts[postIndex];

        // Check if already joined
        if (post.participants && post.participants.some(p => p.userId === userId)) {
            return { success: false, message: '你已經加入此活動了' };
        }

        // Check Deadline
        if (post.deadline && new Date() > new Date(post.deadline)) {
            return { success: false, message: '此活動已過報名截止日期 (Expired)' };
        }

        // Check if full
        const currentCount = post.participants?.length || 0;
        if (currentCount >= post.maxParticipants) {
            return { success: false, message: '活動已滿額' };
        }

        const newParticipant = {
            userId,
            name: userName,
            department,
            role: 'member',
            joinedAt: new Date().toISOString()
        };

        const updatedParticipants = [...(post.participants || []), newParticipant];

        if (window.supabaseClient && window.supabaseClient.supabaseUrl !== 'YOUR_SUPABASE_PROJECT_URL') {
            try {
                const { error } = await window.supabaseClient
                    .from('activities')
                    .update({ participants: updatedParticipants })
                    .eq('id', postId);
                if (error) console.error('Supabase join update err', error);
            } catch (e) { console.error('Supabase error', e); }
        }

        // Add participant LOCALLY
        if (!post.participants) post.participants = [];
        post.participants.push(newParticipant);

        // Update post
        setStorage(STORAGE_KEYS.POSTS, posts);

        // Award 1 point for participation
        await MockStore.awardCredit(userId, 1);
        MockStore.createNotification(userId, `✨ 感謝參與活動 "${post.teamName}"，獲得 1 點信用積分！`, 'success');

        // >>> AIRTABLE HOOK <<<
        try {
            // await AirtableService.updateRideStatus(userId, `Joined: ${post.teamName}`);
            if (post.category !== 'carpool') {
                // await AirtableService.linkEventParticipation(userId, post.teamName || post.title);
            }
        } catch (e) {
            console.error("Airtable sync failed:", e);
        }

        // Add to group chat room
        let room = MockStore.getGroupChatByPost(postId);
        if (!room) {
            // Create room if it doesn't exist
            room = MockStore.createGroupChatRoom({
                postId: post.id,
                category: post.category || 'travel',
                teamName: post.teamName,
                participants: post.participants || []
            });
        }

        if (room) {
            const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
            const roomIndex = rooms.findIndex(r => r.id === room.id);
            if (roomIndex !== -1) {
                // Check if user is already in participants to avoid duplicates
                if (!rooms[roomIndex].participants.some(p => p.id === userId)) {
                    rooms[roomIndex].participants.push({
                        id: userId,
                        name: userName,
                        role: 'member'
                    });
                    setStorage(STORAGE_KEYS.CHATROOMS, rooms);

                    // Send system message (Welcome)
                    MockStore.sendChatMessage(room.id, 'system', I18n.t('common.system'), I18n.t('system.msg.join', { name: userName }));
                }

                // Check if full (Host Notification)
                const currentCount = room.participants.length;
                const maxCount = post.maxParticipants;
                if (currentCount >= maxCount) {
                    MockStore.sendChatMessage(room.id, 'system', I18n.t('common.system'), I18n.t('system.msg.full', { current: currentCount, max: maxCount }));
                }
            }
        }

        // Notify Host
        if (post.authorId !== userId) {
            MockStore.createNotification(
                post.authorId,
                I18n.t('system.notif.join', { name: userName, title: post.teamName }),
                'info',
                `messages?room=${room ? room.id : ''}`
            );
        }

        console.log('[Travel] User joined activity:', { postId, userId, userName });
        return { success: true, message: I18n.t('system.alert.join_success'), roomId: room ? room.id : null };
    },

    // Alias for Travel (fix for inconsistencies)
    joinActivity: async (postId, userData) => {
        // userData might be an object { userId, name, department... } or individual args
        // If it's an object, destructure it if possible, or support both.
        // Based on travel.js: MockStore.joinActivity(postId, { userId, name, department ... })
        if (typeof userData === 'object') {
            return await MockStore.joinTravelActivity(postId, userData.userId, userData.name, userData.department);
        }
        // Fallback for other calls
        return await MockStore.joinTravelActivity(postId, userData); // userData as userId? Unlikely but safe
    },

    // Remove Participant (Host only)
    removeParticipant: (postId, userId) => {
        const posts = getStorage(STORAGE_KEYS.POSTS);
        const postIndex = posts.findIndex(p => p.id === postId);

        if (postIndex === -1) {
            return { success: false, message: I18n.t('system.err.not_found') };
        }

        const post = posts[postIndex];
        const participant = post.participants?.find(p => p.userId === userId);

        if (!participant) {
            return { success: false, message: I18n.t('system.err.member_not_found') };
        }

        if (participant.role === 'host') {
            return { success: false, message: I18n.t('system.err.remove_host') };
        }

        // Remove from post
        post.participants = post.participants.filter(p => p.userId !== userId);
        setStorage(STORAGE_KEYS.POSTS, posts);

        // Remove from group chat
        const room = MockStore.getGroupChatByPost(postId);
        if (room) {
            const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
            const roomIndex = rooms.findIndex(r => r.id === room.id);
            if (roomIndex !== -1) {
                rooms[roomIndex].participants = rooms[roomIndex].participants.filter(p => p.id !== userId);
                setStorage(STORAGE_KEYS.CHATROOMS, rooms);

                // Send system message
                MockStore.sendChatMessage(room.id, 'system', I18n.t('common.system'), I18n.t('system.msg.leave', { name: participant.name }));
            }
        }

        console.log('[Travel] Participant removed:', { postId, userId });
        return { success: true, message: I18n.t('system.alert.member_removed') };
    },

    // Leave Activity (Partner self-exit)
    leaveActivity: (postId, userId) => {
        return MockStore.removeParticipant(postId, userId);
    },

    // Alias for Sports (Same logic as Travel)
    joinSportsActivity: async (postId, userId, userName, department) => {
        return await MockStore.joinTravelActivity(postId, userId, userName, department);
    },

    // Alias for Carpool (Same logic as Travel)
    joinCarpoolActivity: async (postId, userId, userName, department) => {
        return await MockStore.joinTravelActivity(postId, userId, userName, department);
    },

    // Alias for Study (Same logic as Travel)
    joinStudyActivity: async (postId, userId, userName, department) => {
        return await MockStore.joinTravelActivity(postId, userId, userName, department);
    },


    // --- Reports / Feedback ---
    createReport: async (reportData) => {
        const reports = getStorage(STORAGE_KEYS.REPORTS);
        const newReport = {
            id: 'rep_' + Date.now(),
            createdAt: new Date().toISOString(),
            status: 'pending', // pending, resolved, dismissed
            type: reportData.type, // bug, violation, suggestion
            priority: reportData.priority || 'normal',
            targetId: reportData.targetId || null, // postId or userId being reported
            targetType: reportData.targetType || null, // 'post', 'user', 'system'
            description: reportData.description || '',
            reporterId: reportData.reporterId,
            reporterName: reportData.reporterName,
            ...reportData
        };
        reports.unshift(newReport);
        setStorage(STORAGE_KEYS.REPORTS, reports);

        // Sync to Airtable
        // await AirtableService.recordReport(newReport);

        return newReport;
    },

    getReports: (filter = {}) => {
        let reports = getStorage(STORAGE_KEYS.REPORTS);
        if (filter.status) {
            reports = reports.filter(r => r.status === filter.status);
        }
        return reports;
    },

    updateReportStatus: (reportId, status) => {
        const reports = getStorage(STORAGE_KEYS.REPORTS);
        const index = reports.findIndex(r => r.id === reportId);
        if (index !== -1) {
            reports[index].status = status;
            setStorage(STORAGE_KEYS.REPORTS, reports);
            return true;
        }
        return false;
    },

    // --- Penalty System ---
    suspendUser: async (userId, durationDays, reason, adminId = null) => {
        const blocked = getStorage(STORAGE_KEYS.BLOCKED_USERS) || [];
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        blocked.push({
            userId,
            reason,
            expiresAt: expiresAt.toISOString(),
            timestamp: new Date().toISOString()
        });
        setStorage(STORAGE_KEYS.BLOCKED_USERS, blocked);

        // STRIKE POLICY (Phase 6)
        const allUsers = getStorage(STORAGE_KEYS.REGISTERED_USERS);
        const idx = allUsers.findIndex(u => u.email === userId);
        if (idx !== -1) {
            const strikes = (allUsers[idx].confirmedViolations || 0);
            if (strikes === 3) {
                MockStore.createNotification(userId, window.I18n.t('admin.notify.strike_warning'), "critical");
            } else if (strikes > 3) {
                await MockStore.syncToBlacklistSheet(userId, reason, adminId);
            }
        }

        // Automated Notification (Requirement 11)
        const violationMsg = window.I18n.t('admin.notify.violation_msg', {
            reason: reason,
            date: expiresAt.toLocaleDateString()
        });

        MockStore.createNotification(userId, violationMsg, 'violation', 'support_appeal', {
            caseId: 'sus_' + Date.now(),
            appealTemplate: `I have a question regarding the suspension issued on ${new Date().toLocaleString()}. Please provide more information.`
        });

        console.log(`[MockStore] User ${userId} suspended for ${durationDays} days.`);
    },

    warnUser: (userId, reason) => {
        const user = MockStore.getUser(userId);
        if (user) {
            user.violationScore = (user.violationScore || 0) + 1;
            // Persist
            const allUsers = getStorage(STORAGE_KEYS.REGISTERED_USERS);
            const idx = allUsers.findIndex(u => u.email === userId);
            if (idx !== -1) {
                allUsers[idx].violationScore = user.violationScore;
                setStorage(STORAGE_KEYS.REGISTERED_USERS, allUsers);
            }
        }

        const template = `I have a question regarding the warning I received on ${new Date().toLocaleString()}. Reason: ${reason}.`;
        const warnMsg = window.I18n.t('admin.notify.warning_msg', { reason: reason });
        MockStore.createNotification(userId, warnMsg, 'warning', null, {
            type: 'support_appeal',
            appealTemplate: template
        });
        console.log(`[MockStore] Warning sent to ${userId}: ${reason}`);
    },

    // --- Admin Investigation Helpers (Phase 6) ---
    getUserViolationHistory: (userId) => {
        const user = MockStore.getUser(userId) || {};
        const reports = MockStore.getReports({ targetId: userId, status: 'resolved' });

        return {
            violationScore: user.violationScore || 0,
            strikeCount: user.strikeCount || 0,
            resolvedReports: reports.length,
            isBlacklisted: user.isBlacklisted || false
        };
    },

    getReportContext: (reportId, limit = 50) => {
        const reports = MockStore.getReports();
        const report = reports.find(r => r.id === reportId);
        if (!report || report.targetType !== 'chat') return [];

        const messages = MockStore.getChatMessages(report.targetId);
        // Find messages before the report timestamp
        const reportTime = new Date(report.createdAt || report.timestamp);
        const relevant = messages.filter(m => new Date(m.timestamp) <= reportTime);

        return relevant.slice(-Math.min(limit, 100000));
    },

    archiveEvidence: (reportId, messages) => {
        const archive = getStorage(STORAGE_KEYS.EVIDENCE_ARCHIVE) || [];
        const snapshot = {
            reportId,
            timestamp: new Date().toISOString(),
            messages: messages.map(m => ({
                sender: m.senderId,
                content: m.content,
                time: m.timestamp
            }))
        };
        archive.push(snapshot);
        setStorage(STORAGE_KEYS.EVIDENCE_ARCHIVE, archive);
        console.log(`[MockStore] Evidence archived for report ${reportId}`);
    },

    syncToBlacklistSheet: async (userId, reason, adminId) => {
        const user = MockStore.getUser(userId) || {};

        // Airtable Sync (New)
        // await AirtableService.addBlacklistEntry(userId, reason, adminId);

        // Mark as blacklisted in local store
        const allUsers = getStorage(STORAGE_KEYS.REGISTERED_USERS);
        const idx = allUsers.findIndex(u => u.email === userId);
        if (idx !== -1) {
            allUsers[idx].isBlacklisted = true;
            setStorage(STORAGE_KEYS.REGISTERED_USERS, allUsers);
        }
    },

    deductTrustPoints: async (userId, points, reason, adminId) => {
        // Point 2: Retrieve local user & subtract with bounds check
        const users = getStorage(STORAGE_KEYS.REGISTERED_USERS);
        const user = users.find(u => u.email === userId);
        if (!user) return null;

        if (user.creditScore === undefined) user.creditScore = INITIAL_CREDIT;
        if (user.confirmedViolations === undefined) user.confirmedViolations = 0;

        // Bounds check (Score >= 0)
        user.creditScore = Math.max(0, user.creditScore - points);
        user.confirmedViolations += 1;
        user.violationCount = user.confirmedViolations;

        // Save updated data
        setStorage(STORAGE_KEYS.REGISTERED_USERS, users);

        // Also synchronize local user profile session if it matches
        const currentProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        if (currentProfile.email === userId) {
            currentProfile.creditScore = user.creditScore;
            currentProfile.violationCount = user.confirmedViolations;
            currentProfile.confirmedViolations = user.confirmedViolations;
            localStorage.setItem('userProfile', JSON.stringify(currentProfile));
            window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: currentProfile }));
        }

        // Point 3: Airtable Sync wrapped in try/catch
        try {
            // await AirtableService.updateUserPoints(userId, user.creditScore);
        } catch (error) {
            console.error('[MockStore] Failed to sync Trust Points to Airtable:', error);
        }

        // Point 4: Trigger notifications and logging
        const template = `I have a question regarding the point deduction on ${new Date().toLocaleString()}. Point Deduction: -${points}.`;
        MockStore.createNotification(userId, `您因違反社群規範被扣除 ${points} 點信用積分。原因：${reason}。`, 'violation', 'support_appeal', {
            appealTemplate: template,
            pointsDeducted: points
        });

        if (adminId) {
            MockStore.logAdminAction(adminId, `deduct_points_${points}`, userId);
        }

        // Banning Trigger (3 Strikes Policy)
        if (user.confirmedViolations >= 3) {
            MockStore.suspendUser(userId, 9999, `累積 3 次違規裁決`, adminId);
        }

        return user.creditScore;
    },

    // Legacy mapping (pointing to the standardized method)
    deductCredit: async (userId, amount, reason) => await MockStore.adjustTrustPoints(userId, -amount, reason),

    logAdminAction: (adminId, action, targetId) => {
        const logs = getStorage(STORAGE_KEYS.AUDIT_LOGS);
        const newLog = {
            id: 'audit_' + Date.now(),
            adminId,
            action, // 'view_chat', 'suspend_user', 'warn_user', 'dismiss_report'
            targetId,
            timestamp: new Date().toISOString()
        };
        logs.push(newLog);
        setStorage(STORAGE_KEYS.AUDIT_LOGS, logs);
        console.log(`[Audit] Admin ${adminId} performed ${action} on ${targetId}`);
        return newLog;
    },

    getAuditLogs: () => {
        return getStorage(STORAGE_KEYS.AUDIT_LOGS);
    },

    getAgentInboxMessages: () => {
        const rooms = getStorage(STORAGE_KEYS.CHATROOMS);
        const supportRooms = rooms.filter(r => r.roomType === 'support');

        // Sort by last message time
        return supportRooms.sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));
    },

    // --- Push Notification Simulation (Requirement 9 & 11 Extension) ---
    MockPushService: {
        send: (payload) => {
            console.log('%c[Native Push Simulator]', 'background: #333; color: #FFEB3B; padding: 2px 5px; border-radius: 3px; font-weight: bold;');
            console.log('Payload:', payload);

            if (window.notifications && typeof window.notifications.showNativeBanner === 'function') {
                window.notifications.showNativeBanner(payload);
            }
        },
        triggerForMessage: (senderId, receiverId, roomId, message) => {
            MockStore.MockPushService.send({
                title: I18n.t('system.notif.new_msg', { sender: senderId }),
                body: message.length > 50 ? message.substring(0, 47) + '...' : message,
                data: {
                    type: 'chat',
                    id: roomId
                }
            });
        },
        triggerForViolation: (userId, message, type, metadata = {}) => {
            MockStore.MockPushService.send({
                title: type === 'warning' ? '⚠️ Community Guideline Alert' : '🚫 Account Status Update',
                body: message,
                data: {
                    type: metadata.link || 'violation',
                    id: metadata.caseId || userId,
                    metadata: metadata
                }
            });
        }
    },

    // --- Trust & Credit System (Standardized in Phase 9) ---
    adjustTrustPoints: async (userId, delta, reason, adminId = null) => {
        const users = getStorage(STORAGE_KEYS.REGISTERED_USERS);
        const user = users.find(u => u.email === userId);
        if (!user) return null;

        // Ensure default values
        if (user.credit_points === undefined) user.credit_points = INITIAL_CREDIT;
        if (user.confirmedViolations === undefined) user.confirmedViolations = 0;

        user.credit_points = Math.max(0, user.credit_points + delta);

        const isViolation = delta < 0;
        if (isViolation) {
            user.confirmedViolations += 1;
            user.violationCount = user.confirmedViolations; // Legacy sync
        } else if (delta > 0) {
            user.successMatches = (user.successMatches || 0) + delta; // Legacy sync
        }

        setStorage(STORAGE_KEYS.REGISTERED_USERS, users);

        // Sync to Airtable
        // await AirtableService.updateUserPoints(userId, user.creditScore);

        // Synchronize current local session if it matches the user being updated
        const currentProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        if (currentProfile.email === userId) {
            currentProfile.credit_points = user.credit_points;
            if (isViolation) {
                currentProfile.violationCount = user.confirmedViolations;
                currentProfile.confirmedViolations = user.confirmedViolations;
            }
            localStorage.setItem('userProfile', JSON.stringify(currentProfile));
            window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: currentProfile }));
        }

        // Notification & Logging
        if (isViolation) {
            const absDelta = Math.abs(delta);
            const template = `I have a question regarding the point deduction on ${new Date().toLocaleString()}. Point Deduction: -${absDelta}.`;
            MockStore.createNotification(userId, `您因違反社群規範被扣除 ${absDelta} 點信用積分。原因：${reason}。`, 'violation', 'support_appeal', {
                appealTemplate: template,
                pointsDeducted: absDelta
            });
            if (adminId) MockStore.logAdminAction(adminId, `deduct_points_${absDelta}`, userId);

            // Banning Trigger (3 Strikes Policy)
            if (user.confirmedViolations >= 3) {
                MockStore.suspendUser(userId, 9999, `累積 3 次違規裁決`, adminId);
            }
        }

        // Sync to Server (New Point System)
        try {
            await fetch('http://localhost:3000/award-points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userId, points: delta })
            });
        } catch (error) {
            console.warn('[MockStore] Failed to sync points to server:', error);
        }

        return user.credit_points;
    },

    // Legacy wrappers
    awardCredit: async (userId, points) => await MockStore.adjustTrustPoints(userId, points, 'Participation Award'),
    deductCredit: async (userId, points, reason) => await MockStore.adjustTrustPoints(userId, -points, reason),

    unblockUser: (userId) => {
        let blocked = getStorage(STORAGE_KEYS.BLOCKED_USERS);
        blocked = blocked.filter(b => b.userId !== userId);
        setStorage(STORAGE_KEYS.BLOCKED_USERS, blocked);
        console.log(`[MockStore] User ${userId} unblocked.`);
    },

    getUserStatus: (userId) => {
        const blocked = getStorage(STORAGE_KEYS.BLOCKED_USERS);
        const record = blocked.find(b => b.userId === userId);

        if (!record) return { isBlocked: false };

        const now = new Date();
        const expiry = new Date(record.expiresAt);

        if (now > expiry) {
            // Auto-unblock if expired
            MockStore.unblockUser(userId);
            return { isBlocked: false };
        }

        return {
            isBlocked: true,
            reason: record.reason,
            expiresAt: record.expiresAt
        };
    },

    // --- Notifications --- (Enhanced Phase 8)
    createNotification: (userId, message, type = 'info', link = null, metadata = {}) => {
        const newNotification = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId,
            message,
            type,
            link,
            metadata,
            isRead: false,
            deliveryStatus: 'delivered', // Phase 8: Default to delivered
            createdAt: new Date().toISOString()
        };

        const json = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        const all = json ? JSON.parse(json) : [];
        all.push(newNotification);
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));

        // TRIGGER PUSH (Requirement 11 Ext)
        if (type === 'warning' || type === 'violation' || type === 'critical') {
            MockStore.MockPushService.triggerForViolation(userId, message, type, { ...metadata, link });
        }

        return newNotification;
    },

    trackNotificationStatus: (notificationId, status) => {
        const all = MockStore.getAllNotifications();
        const notification = all.find(n => n.id === notificationId);
        if (notification) {
            notification.deliveryStatus = status; // e.g., 'opened'
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
            console.log(`[MockStore] Notification ${notificationId} status updated to: ${status}`);
        }
    },

    getAllNotifications: () => {
        const json = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        return json ? JSON.parse(json) : [];
    },

    getSystemNotifications: () => {
        // Return only violation/warning/critical notifications for tracking
        return MockStore.getAllNotifications()
            .filter(n => n.type === 'violation' || n.type === 'warning' || n.type === 'critical')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    getNotifications: (userId) => {
        const all = MockStore.getAllNotifications();
        return all
            .filter(n => n.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    markNotificationAsRead: (notificationId) => {
        const all = MockStore.getAllNotifications();
        const notification = all.find(n => n.id === notificationId);
        if (notification) {
            notification.isRead = true;
            notification.deliveryStatus = 'opened'; // Implicitly opened if read
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
        }
    },

    // --- Feedback & Blocking System ---
    getAllFeedbacks: () => {
        return getStorage(STORAGE_KEYS.MATCH_FEEDBACKS) || [];
    },

    hasUserRated: (postId, userId) => {
        const feedbacks = getStorage(STORAGE_KEYS.MATCH_FEEDBACKS) || [];
        return feedbacks.some(f => f.postId === postId && f.userId === userId);
    },

    getPendingFeedbacks: (userId) => {
        const feedbacks = getStorage(STORAGE_KEYS.MATCH_FEEDBACKS) || [];
        const posts = getStorage(STORAGE_KEYS.POSTS);
        const userPending = [];

        posts.forEach(p => {
            if (p.status === 'closed' && p.participants && p.participants.some(part => (typeof part === 'string' ? part : part.userId) === userId)) {
                // Check if feedback exists
                const hasFeedback = feedbacks.some(f => f.postId === p.id && f.userId === userId);
                if (!hasFeedback) {
                    userPending.push({
                        id: p.id,
                        title: p.teamName || p.title,
                        type: 'post'
                    });
                }
            }
        });

        return userPending;
    },

    submitMatchFeedback: async (feedbackData) => {
        // Prevent duplicate submissions
        if (MockStore.hasUserRated(feedbackData.postId, feedbackData.userId)) {
            console.warn('[MockStore] User already rated this post.');
            return { success: false, message: I18n.t('system.alert.already_rated') };
        }

        // feedbackData from rating.js: { postId, userId, effectiveness, speed, isSuccess, comment, submittedAt }
        const feedbacks = getStorage(STORAGE_KEYS.MATCH_FEEDBACKS) || [];
        feedbacks.push({
            ...feedbackData,
            createdAt: new Date().toISOString()
        });
        setStorage(STORAGE_KEYS.MATCH_FEEDBACKS, feedbacks);

        // Award Credits Logic
        // +2 for Host, +1 for Joiner (if isSuccess is true)
        // Check for 'yes' string or true boolean
        const isSuccess = feedbackData.isSuccess === true || feedbackData.isSuccess === 'yes' || feedbackData.meetStatus === 'yes';

        if (isSuccess) {
            const posts = getStorage(STORAGE_KEYS.POSTS);
            const post = posts.find(p => p.id === feedbackData.postId);
            if (post) {
                // Check both userId and authorId as they might differ across modules
                const postAuthor = post.userId || post.authorId;
                const isHost = postAuthor === feedbackData.userId;

                // Rule: Host gets 2 points, Joiner gets 1 point
                const points = isHost ? 2 : 1;
                await MockStore.awardCredit(feedbackData.userId, points);
                console.log(`[MockStore] Feedback submitted. Awarded ${points} points to ${feedbackData.userId}. IsHost: ${isHost}`);
            }
        }

        return { success: true };
    },

    checkBlocking: (userId) => {
        const pending = MockStore.getPendingFeedbacks(userId);
        if (pending.length > 0) {
            return {
                isBlocked: true,
                message: I18n.t('system.alert.pending_feedback', { count: pending.length }),
                pendingItems: pending
            };
        }
        return { isBlocked: false };
    },

    getUnreadNotificationCount: (userId) => {
        return MockStore.getNotifications(userId).filter(n => !n.isRead).length;
    },

    // --- Badge Synchronization (Requirement 13) ---
    getGlobalUnreadCount: (userId) => {
        // Combined Unread Messages (across all rooms where user is participant)
        const rooms = MockStore.getChatRooms(userId);
        const msgUnread = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);

        // Unread Notifications
        const notifUnread = MockStore.getUnreadNotificationCount(userId);

        return msgUnread + notifUnread;
    },

    checkFeedbackReminders: (userId) => {
        const pending = MockStore.getPendingFeedbacks(userId);
        const existingNotifs = MockStore.getNotifications(userId);
        const now = new Date();

        pending.forEach(item => {
            // Check if we already sent a reminder for this item in the last 24h
            // Simplified: Check if ANY unread reminder exists for this item
            const hasUnreadReminder = existingNotifs.some(n =>
                !n.isRead &&
                n.type === 'feedback_reminder' &&
                n.link === `action:rate:${item.id}`
            );

            if (!hasUnreadReminder) {
                MockStore.createNotification(
                    userId,
                    I18n.t('system.notif.feedback_remind', { title: item.title }),
                    'feedback_reminder',
                    `action:rate:${item.id}`
                );
            }
        });
    }
};
