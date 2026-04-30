import { isValidNCNUEmail, sanitizeInput } from '../utils/validation.js';
import { MockStore } from '../models/mockStore.js';
import { I18n } from '../services/i18n.js';
import { formatTime } from '../utils/dateFormatter.js';
import { LanguageSelector } from '../components/LanguageSelector.js';
import { ThemeToggle } from '../components/ThemeToggle.js';

const departmentsData = [
    {
        college: { zh: '人文學院', en: 'College of Humanities' },
        departments: [
            { zh: '中國語文學系', en: 'Department of Chinese Language and Literature' },
            { zh: '外國語文學系', en: 'Department of Foreign Languages and Literature' },
            { zh: '歷史學系', en: 'Department of History' },
            { zh: '公共行政與政策學系', en: 'Department of Public Policy and Administration' },
            { zh: '社會政策與社會工作學系', en: 'Department of Social Policy and Social Work' },
            { zh: '東南亞學系', en: 'Department of Southeast Asian Studies' },
            { zh: '原住民文化產業與社會工作學士學位學程原住民族專班', en: 'Indigenous Culture Industry and Social Work Program' },
            { zh: '華語文教學碩士學位學程', en: 'Teaching Chinese as a Second Language' },
            { zh: '非營利組織經營管理碩士學位學程', en: 'Non-Profit Organization Management' },
            { zh: '文化創意與社會行銷碩士學位學程', en: 'Cultural Creative Industry and Social Marketing' },
            { zh: '長期照顧經營管理碩士在職學位學程', en: 'Long-Term Care Management' }
        ]
    },
    {
        college: { zh: '管理學院', en: 'College of Management' },
        departments: [
            { zh: '國際企業學系', en: 'Department of International Business Studies' },
            { zh: '經濟學系', en: 'Department of Economics' },
            { zh: '財務金融學系', en: 'Department of Banking and Finance' },
            { zh: '資訊管理學系', en: 'Department of Information Management' },
            { zh: '觀光休閒與餐旅管理學系', en: 'Department of Tourism, Leisure and Hospitality Management' },
            { zh: '管理學院學士班', en: 'Interdisciplinary Program of College of Management' },
            { zh: '經營管理碩士學位學程在職專班', en: 'Executive Master Program of Administration' },
            { zh: '新興產業策略與發展碩士/博士學位學程', en: 'Strategy and Development of Emerging Industries' },
            { zh: '區域發展重點產業碩士專班', en: 'Industry-Academy Collaborated Master Program on Regional Development Focuses' },
            { zh: '商業管理及資訊科技創新應用全英語碩士學位學程', en: 'Business Administration and Information Technology Innovation and Application (BAITIA)' }
        ]
    },
    {
        college: { zh: '科技學院', en: 'College of Science and Technology' },
        departments: [
            { zh: '土木工程學系', en: 'Department of Civil Engineering' },
            { zh: '資訊工程學系', en: 'Department of Computer Science and Information Engineering' },
            { zh: '電機工程學系', en: 'Department of Electrical Engineering' },
            { zh: '應用化學系', en: 'Department of Applied Chemistry' },
            { zh: '應用材料及光電工程學系', en: 'Department of Applied Materials and Optoelectronic Engineering' },
            { zh: '科技學院學士班', en: 'Bachelor Program of College of Science and Technology' },
            { zh: '人工智慧與機器人碩士學位學程', en: 'Master Program in Artificial Intelligence and Robotics' },
            { zh: '智慧半導體及綠色科技國際碩士學位學程', en: 'International Master Program in Intelligent Semiconductor and Green Technology' },
            { zh: '智慧精準農業產學研發博士學位學程', en: 'PhD Program in Smart Precision Agriculture' }
        ]
    },
    {
        college: { zh: '教育學院', en: 'College of Education' },
        departments: [
            { zh: '國際文教與比較教育學系', en: 'Department of International and Comparative Education' },
            { zh: '教育政策與行政學系', en: 'Department of Educational Policy and Administration' },
            { zh: '諮商心理與人力資源發展學系', en: 'Department of Counseling Psychology and Human Resource Development' },
            { zh: '教育學院學士班', en: 'Interdisciplinary Program of Education' },
            { zh: '課程教學與科技研究所', en: 'Institute of Curriculum Instruction and Technology' },
            { zh: '終身學習與人力資源發展碩士學位學程', en: 'Institute of Lifelong Learning & Human Resource Development' },
            { zh: '心理健康與諮詢碩士在職學位學程', en: 'Mental Health and Counseling Master\'s Degree Program' }
        ]
    },
    {
        college: { zh: '護理暨健康福祉學院', en: 'College of Nursing and Health Welfare' },
        departments: [
            { zh: '護理學系', en: 'Department of Nursing' },
            { zh: '學士後護理', en: 'Post-Baccalaureate Nursing' },
            { zh: '高齡健康與長期照顧管理學士學位學程原住民族專班', en: 'High-quality Health and Long-term Care Management' },
            { zh: '智慧健康管理碩士在職學位學程', en: 'Smart Health Management' }
        ]
    },
    {
        college: { zh: '水沙連學院', en: 'Shui Sha Lian College' },
        departments: [
            { zh: '地方創生與跨域治理碩士學位學程', en: 'Master Program of Regional Revitalization and Cross-boundary Governance' }
        ]
    },
    {
        college: { zh: '獨立學程', en: 'Independent Programs' },
        departments: [
            { zh: '智慧暨永續農業學士學位學程公費專班', en: 'Smart and Sustainable Agriculture Bachelor\'s Degree Program' }
        ]
    }
];
export const renderRegister = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('last_notif_id');

    const app = document.getElementById('app');
    let activeTab = 'login';
    let clockInterval = null;
    let googleUserPendingData = null; // Store Google info for new users

    if (!document.getElementById('auth-style')) {
        const link = document.createElement('link');
        link.id = 'auth-style';
        link.rel = 'stylesheet';
        link.href = 'css/auth.css';
        document.head.appendChild(link);
    }

    const updateTexts = () => {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (el.tagName === 'INPUT') {
                el.placeholder = I18n.t(key);
            } else {
                el.innerText = I18n.t(key);
            }
        });
    };

    const renderDepartmentDropdown = (currentLang) => {
        const isEng = (currentLang || '').includes('en');
        const langKey = isEng ? 'en' : 'zh';
        
        const selectEl = document.getElementById('reg-major');
        if (!selectEl) return;
        
        const currentVal = selectEl.value; // Keep selection intact
        
        let html = `<option value="" disabled ${!currentVal ? 'selected' : ''}>${isEng ? '-- Select Department --' : '-- 請選擇系所 --'}</option>`;
        
        departmentsData.forEach(collegeData => {
            html += `<optgroup label="[${collegeData.college[langKey]}]">`;
            collegeData.departments.forEach(dept => {
                const isSelected = (currentVal === dept.zh) ? 'selected' : '';
                html += `<option value="${dept.zh}" ${isSelected}>${dept[langKey]}</option>`;
            });
            html += `</optgroup>`;
        });
        
        if (selectEl.innerHTML !== html) {
            selectEl.innerHTML = html;
        }
    };

    const startClock = () => {
        const timeEl = document.querySelector('#auth-clock .time');
        const dateEl = document.querySelector('#auth-clock .date');
        const update = () => {
            if (!timeEl) return;
            const now = new Date();
            timeEl.innerText = formatTime(now);
            dateEl.innerText = now.toLocaleDateString();
        };
        update();
        clockInterval = setInterval(update, 1000);
    };

    const render = () => {
        if (clockInterval) clearInterval(clockInterval);

        app.innerHTML = `
            <div id="auth-container">
                <div id="lang-selector-container">
                    <div id="header-lang-selector"></div>
                    <div id="header-theme-toggle"></div>
                </div>
                <div id="auth-clock">
                    <div class="time">--:--</div>
                    <div class="date">----/--/--</div>
                    <div class="sync-badge">
                        <span>⚡</span> <span data-i18n="clock.sync">Syncing...</span>
                    </div>
                </div>

                <div class="auth-card">
                    <div class="auth-header" style="text-align: center; padding: 0; background: transparent;">
                        <img src="assets/banner.png?v=2" alt="JoinUp Banner" style="width: 100%; height: auto; display: block; border-radius: 12px 12px 0 0;">
                    </div>

                    <div class="auth-tabs">
                        <button id="tab-login" class="auth-tab ${activeTab === 'login' ? 'active' : ''}" data-i18n="auth.login_tab">Login</button>
                        <button id="tab-register" class="auth-tab ${activeTab === 'register' ? 'active' : ''}" data-i18n="auth.register_tab">Sign Up</button>
                    </div>

                    <div class="auth-body">
                        <div id="view-login" style="display: ${activeTab === 'login' ? 'block' : 'none'};">
                            <form id="form-login">
                                <div class="form-group">
                                    <label data-i18n="login.email_label">Email</label>
                                    <input type="email" id="login-email" class="form-control" data-i18n="login.email_placeholder" placeholder="name@ncnu.edu.tw" required>
                                </div>
                                <div class="form-group">
                                    <label data-i18n="login.pwd_label">Password</label>
                                    <input type="password" id="login-pwd" class="form-control" data-i18n="login.pwd_placeholder" placeholder="Password" required>
                                    
                                    <a href="#" id="btn-forgot-pwd" data-i18n="login.forgot_pwd" style="font-size: 0.85rem; color: #d97706; display: block; margin-top: 8px; text-align: right; text-decoration: none; font-weight: bold;">Forgot Password?</a>
                                </div>
                                <button type="submit" class="btn-primary" data-i18n="login.submit">Login</button>
                            </form>
                            
                            <div class="divider">
                                <span data-i18n="login.or">OR</span>
                            </div>
                            
                            <div id="google-login-container" style="display: flex; justify-content: center; margin-bottom: 20px;">
                                <div id="google-btn-login"></div>
                            </div>
                        </div>

                        <div id="view-register" style="display: ${activeTab === 'register' ? 'block' : 'none'};">
                            <form id="form-register">
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label data-i18n="reg.role_label" style="font-weight: bold;">Identity (Role)</label>
                                    <select id="reg-role" class="form-control" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd; background: white; font-family: inherit;">
                                        <option value="bachelor_student" data-i18n="role.bachelor_student">🎓 Bachelor Student</option>
                                        <option value="master_student" data-i18n="role.master_student">🎓 Master Student</option>
                                        <option value="doctoral_student" data-i18n="role.doctoral_student">🎓 Doctoral Student</option>
                                        <option value="professor" data-i18n="role.professor">👔 Professor</option>
                                        <option value="staff" data-i18n="role.staff">🏢 Staff</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label data-i18n="reg.email_label">Email</label>
                                    <input type="email" id="reg-email" class="form-control" placeholder="s112... / name@ncnu.edu.tw" required>
                                </div>
                                <div class="grid-2">
                                    <div class="form-group">
                                        <label data-i18n="reg.name_label">Full Name</label>
                                        <input type="text" id="reg-realName" class="form-control" required>
                                    </div>
                                    <div class="form-group">
                                        <label data-i18n="reg.nickname_label">Nickname</label>
                                        <input type="text" id="reg-displayName" class="form-control" required>
                                    </div>
                                </div>
                                <div class="grid-2-1">
                                    <div class="form-group">
                                        <label id="label-major" data-i18n="reg.major_label">Major</label>
                                        <select id="reg-major" class="form-control" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd; background: white; font-family: inherit;" required></select>
                                    </div>
                                    <div class="form-group" id="group-year">
                                        <label data-i18n="reg.year_label">Year</label>
                                        <input type="text" id="reg-year" class="form-control" placeholder="大三" required>
                                    </div>
                                </div>
                                <div class="grid-2">
                                    <div class="form-group">
                                        <label data-i18n="reg.pwd_label">Password</label>
                                        <input type="password" id="reg-pwd" class="form-control" required>
                                    </div>
                                    <div class="form-group">
                                        <label data-i18n="reg.repwd_label">Re-Password</label>
                                        <input type="password" id="reg-repwd" class="form-control" required>
                                    </div>
                                </div>
                                <button type="submit" class="btn-primary" style="margin-top: 10px;" data-i18n="reg.submit">Register</button>
                            </form>

                            <div class="divider">
                                <span data-i18n="auth.or">OR</span>
                            </div>
                            
                            <div id="google-reg-container" style="display: flex; justify-content: center; margin-bottom: 20px;">
                                <div id="google-btn-reg"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <p style="margin-top: 2rem; color: var(--text-secondary); font-size: 0.8rem; text-align: center;">
                    JoinUp! <span style="font-weight: 600; color: var(--primary-dark);">v2026.03.31</span><br>
                    <span data-i18n="auth.footer">&copy; 2026 JoinUp!</span>
                </p>
            </div>

            <div id="modal-forgot-pwd" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000; justify-content: center; align-items: center;">
                <div style="background: white; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                    <h3 style="margin-top: 0; color: #333;">🔑 Reset Password</h3>
                    
                    <div id="step-1-email">
                        <p style="font-size: 0.9rem; color: #666;">Enter your NCNU email to receive an OTP code.</p>
                        <input type="email" id="forgot-input-email" class="form-control" placeholder="name@ncnu.edu.tw" style="width: 100%; margin-bottom: 15px;">
                        <button id="btn-send-otp" class="btn-primary" style="width: 100%; margin-bottom: 10px;">📩 Send OTP</button>
                    </div>

                    <div id="step-2-otp" style="display: none;">
                        <p style="font-size: 0.9rem; color: #2e7d32; font-weight: bold;">OTP sent! Check your email.</p>
                        <input type="text" id="forgot-input-otp" class="form-control" placeholder="Enter 6-digit OTP" style="width: 100%; margin-bottom: 10px; text-align: center; letter-spacing: 3px; font-weight: bold;">
                        <input type="password" id="forgot-input-newpwd" class="form-control" placeholder="Enter New Password" style="width: 100%; margin-bottom: 15px;">
                        <button id="btn-reset-pwd" class="btn-primary" style="width: 100%; margin-bottom: 10px;">💾 Save New Password</button>
                    </div>

                    <button id="btn-close-modal" style="width: 100%; padding: 10px; background: transparent; border: none; color: #888; cursor: pointer; font-weight: bold;">Cancel</button>
                </div>
            </div>
        `;

        document.getElementById('tab-login').onclick = () => { activeTab = 'login'; render(); };
        document.getElementById('tab-register').onclick = () => { activeTab = 'register'; render(); };

        // --- LOGIKA UBAH FORM ROLE (Major/Year) ---
        document.getElementById('reg-role').addEventListener('change', (e) => {
            const role = e.target.value;
            const yearGroup = document.getElementById('group-year');
            const yearInput = document.getElementById('reg-year');
            const majorLabel = document.getElementById('label-major');
            const majorInput = document.getElementById('reg-major');

            const isAnyStudent = ['bachelor_student', 'master_student', 'doctoral_student'].includes(role);
            if (isAnyStudent) {
                yearGroup.style.display = 'block';
                yearInput.required = true;
                majorLabel.innerText = typeof I18n !== 'undefined' ? (I18n.t('reg.major_label') || 'Major') : 'Major';
                majorInput.placeholder = 'CSIE';
            } else {
                yearGroup.style.display = 'none';
                yearInput.required = false;
                yearInput.value = '';
                majorLabel.innerText = typeof I18n !== 'undefined' ? (I18n.t('reg.departmentoffice_label') || 'Department / Office') : 'Department / Office';
                majorInput.placeholder = 'e.g., Computer Science Dept';
            }
        });

        // --- LOGIKA POPUP FORGOT PASSWORD ---
        const modal = document.getElementById('modal-forgot-pwd');

        // Buka Popup
        document.getElementById('btn-forgot-pwd').onclick = (e) => {
            e.preventDefault();
            modal.style.display = 'flex';
        };

        // Tutup Popup
        document.getElementById('btn-close-modal').onclick = () => {
            modal.style.display = 'none';
            document.getElementById('step-1-email').style.display = 'block';
            document.getElementById('step-2-otp').style.display = 'none';
        };

        // STEP 1: Kirim OTP ke Server
        document.getElementById('btn-send-otp').onclick = async () => {
            const email = document.getElementById('forgot-input-email').value;
            if (!email) return alert("Please enter your email!");

            const btn = document.getElementById('btn-send-otp');
            btn.innerText = "⏳ Sending...";
            btn.disabled = true;

            try {
                // Deteksi bahasa yang lagi dipakai user di website
                const currentLang = typeof I18n !== 'undefined' ? I18n.getLanguage() : 'en';

                const response = await fetch('/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Tambahin 'lang' ke dalam paket yang dikirim ke server!
                    body: JSON.stringify({ email: email, lang: currentLang })
                });
                const result = await response.json();

                if (response.ok) {
                    document.getElementById('step-1-email').style.display = 'none';
                    document.getElementById('step-2-otp').style.display = 'block';
                } else {
                    alert(result.error);
                }
            } catch (error) {
                const isQuotaError = error.name === 'QuotaExceededError' || error.message?.toLowerCase().includes('quota');
                alert(isQuotaError ? 'Storage Error: Browser storage quota exceeded. Please clear space.' : 'Connection error: ' + error.message);
            } finally {
                btn.innerText = "📩 Send OTP";
                btn.disabled = false;
            }
        };

        // STEP 2: Kirim Password Baru ke Server
        document.getElementById('btn-reset-pwd').onclick = async () => {
            const email = document.getElementById('forgot-input-email').value;
            const otp = document.getElementById('forgot-input-otp').value;
            const newPwd = document.getElementById('forgot-input-newpwd').value;

            if (!otp || !newPwd) return alert("Please fill all fields!");

            const btn = document.getElementById('btn-reset-pwd');
            btn.innerText = "⏳ Saving...";
            btn.disabled = true;

            try {
                const response = await fetch('/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, otp: otp, newPassword: newPwd })
                });
                const result = await response.json();

                if (response.ok) {
                    alert("SUCCESS! 🎉 Password changed. Please login again.");
                    modal.style.display = 'none'; // Tutup modal
                    document.getElementById('login-pwd').value = ''; // Kosongin kolom password
                } else {
                    alert(result.error);
                }
            } catch (error) {
                const isQuotaError = error.name === 'QuotaExceededError' || error.message?.toLowerCase().includes('quota');
                alert(isQuotaError ? 'Storage Error: Browser storage quota exceeded. Please clear space.' : 'Connection error: ' + error.message);
            } finally {
                btn.innerText = "💾 Save New Password";
                btn.disabled = false;
            }
        };

        new LanguageSelector('header-lang-selector', {
            onUpdate: (lang) => {
                updateTexts();
                renderDepartmentDropdown(lang);
                const timeEl = document.querySelector('#auth-clock .time');
                if (timeEl) timeEl.innerText = formatTime(new Date());
            }
        });

        new ThemeToggle('header-theme-toggle');

        // --- LOGIKA LOGIN ---
        document.getElementById('form-login').onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pwd = document.getElementById('login-pwd').value;

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: pwd })
                });
                const result = await response.json();

                if (response.ok) {
                    alert('Login Successful! Welcome To Join Up, ' + result.user.username);

                    const userUntukHomepage = {
                        email: result.user.email,
                        displayName: result.user.username,
                        role: result.user.role,
                        study_year: result.user.study_year,
                        major: result.user.major,
                        // Tarik data abadi dari server!
                        bio: result.user.bio || '',
                        hobby: result.user.hobby || '',
                        profile_pic: result.user.profile_pic || '',
                        photoURL: result.user.profile_pic || ''
                    };

                    try {
                        localStorage.setItem('userProfile', JSON.stringify(userUntukHomepage));
                    } catch (e) {
                        const liteProfile = { ...userUntukHomepage, profile_pic: '', photoURL: '' };
                        localStorage.setItem('userProfile', JSON.stringify(liteProfile));
                    }
                    localStorage.setItem('isLoggedIn', 'true');

                    if (typeof window.validLogin === 'function') {
                        window.validLogin(userUntukHomepage);
                    } else {
                        window.location.hash = '#home';
                        window.location.reload();
                    }
                } else {
                    alert('Login Failed: ' + result.error);
                }
            } catch (error) {
                const isQuotaError = error.name === 'QuotaExceededError' || error.message?.toLowerCase().includes('quota');
                alert(isQuotaError ? 'Storage Error: Browser storage quota exceeded. Please clear space.' : 'Connection error: ' + error.message);
            }
        };

        // --- LOGIKA REGISTER ---
        document.getElementById('form-register').onsubmit = async (e) => {
            e.preventDefault();
            const role = document.getElementById('reg-role').value;
            const pwd = document.getElementById('reg-pwd').value;
            const repwd = document.getElementById('reg-repwd').value;
            const email = document.getElementById('reg-email').value;
            const isAdminWhitelist = email.toLowerCase() === 'ncnujoinupadmin@gmail.com';

            // 1. Deteksi Mahasiswa: Wajib s + 9 angka + @mail1.ncnu.edu.tw ATAU @ncnu.edu.tw
            const isStudentFormat = /^s\d{9}@(mail1\.)?ncnu\.edu\.tw$/.test(email);

            // 2. Deteksi Professor/Staff: Wajib @ncnu.edu.tw TAPI TIDAK BOLEH pakai format mahasiswa
            const isProfessorFormat = email.endsWith('@ncnu.edu.tw') && !isStudentFormat;

            const isAnyStudent = ['bachelor_student', 'master_student', 'doctoral_student'].includes(role);
            if (isAnyStudent && !isAdminWhitelist) {
                if (!isStudentFormat) {
                    alert("Invalid format! Students must use:\ns123456789@mail1.ncnu.edu.tw OR s123456789@ncnu.edu.tw");
                    return;
                }
            } else if ((role === 'professor' || role === 'staff') && !isAdminWhitelist) {
                if (isStudentFormat) {
                    alert("Students cannot register as Professor/Staff! 👮‍♂️\nPlease use a valid staff email.");
                    return;
                }
                if (!isProfessorFormat) {
                    alert("Professor/Staff email must end with @ncnu.edu.tw");
                    return;
                }
            }

            if (pwd !== repwd) {
                alert(typeof I18n !== 'undefined' ? I18n.t('auth.err.pwd_match') : "Password not match!");
                return;
            }

            let finalStudyYear = 1;
            let is_delayed_graduation = false;

            if (isAnyStudent && !isAdminWhitelist) {
                const inputYearVal = sanitizeInput(document.getElementById('reg-year').value).trim();
                const studentId = email.substring(0, 10);
                const entryYearStr = studentId.substring(1, 4);
                const entryYear = parseInt(entryYearStr);

                const now = new Date();
                const currentMinguoYear = now.getFullYear() - 1911;
                const currentMonth = now.getMonth() + 1;
                const academicYear = (currentMonth < 8) ? (currentMinguoYear - 1) : currentMinguoYear;

                let calculatedSeniority = academicYear - entryYear + 1;
                if (['master_student', 'doctoral_student'].includes(role) && entryYear === currentMinguoYear && currentMonth < 8) {
                    calculatedSeniority = 1;
                }

                let prefix = '大';
                if (role === 'master_student') prefix = '碩';
                else if (role === 'doctoral_student') prefix = '博';

                const yearNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
                const standardGradeLabel = prefix + (yearNames[calculatedSeniority - 1] || calculatedSeniority);

                let inputSeniorityNum = 0;
                const chineseMatch = inputYearVal.match(/[一二三四五六七]/);
                if (chineseMatch) {
                    inputSeniorityNum = yearNames.indexOf(chineseMatch[0]) + 1;
                } else {
                    const numMatch = inputYearVal.match(/\d+/);
                    if (numMatch) inputSeniorityNum = parseInt(numMatch[0]);
                }

                if (!inputSeniorityNum) {
                    alert(typeof I18n !== 'undefined' ? I18n.t('auth.err.year_mismatch') : "Invalid year format! Please use formats like 大一, 碩二, or 3.");
                    return;
                }

                if (inputSeniorityNum < calculatedSeniority) {
                    alert((typeof I18n !== 'undefined' ? I18n.t('auth.err.year_mismatch') : "Year mismatch!") + ` (Min expected: ${standardGradeLabel})`);
                    return;
                }

                is_delayed_graduation = inputSeniorityNum > calculatedSeniority;
                finalStudyYear = inputSeniorityNum;
            }

            const btn = e.target.querySelector('button[type="submit"]');
            btn.innerText = typeof I18n !== 'undefined' ? I18n.t('reg.processing') : "Processing...";
            btn.disabled = true;

            const payloadDatabase = {
                username: sanitizeInput(document.getElementById('reg-displayName').value),
                email: email,
                password: pwd,
                major: sanitizeInput(document.getElementById('reg-major').value),
                study_year: finalStudyYear,
                role: role,
                is_delayed_graduation: is_delayed_graduation,
                profile_pic: googleUserPendingData ? googleUserPendingData.picture : ''
            };

            try {
                const response = await fetch('/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadDatabase)
                });
                const result = await response.json();

                if (response.ok) {
                    alert('SUCCESS! 🎉 Registration saved!');

                    const userUntukHomepage = {
                        email: payloadDatabase.email,
                        displayName: payloadDatabase.username,
                        role: payloadDatabase.role,
                        study_year: payloadDatabase.study_year,
                        major: payloadDatabase.major,
                        profile_pic: payloadDatabase.profile_pic
                    };

                    try {
                        localStorage.setItem('userProfile', JSON.stringify(userUntukHomepage));
                    } catch (e) {
                        const liteProfile = { ...userUntukHomepage, profile_pic: '', photoURL: '' };
                        localStorage.setItem('userProfile', JSON.stringify(liteProfile));
                    }
                    localStorage.setItem('isLoggedIn', 'true');

                    if (typeof window.validLogin === 'function') {
                        window.validLogin(userUntukHomepage);
                    } else {
                        window.location.hash = '#home';
                        window.location.reload();
                    }
                } else {
                    alert('Registration failed: ' + result.error);
                }
            } catch (error) {
                const isQuotaError = error.name === 'QuotaExceededError' || error.message?.toLowerCase().includes('quota');
                alert(isQuotaError ? 'Storage Error: Browser storage quota exceeded. Please clear space.' : 'Oops, server connection failed: ' + error.message);
            } finally {
                btn.innerText = typeof I18n !== 'undefined' ? I18n.t('reg.submit') : "Register";
                btn.disabled = false;
            }
        };

        // --- GOOGLE AUTH LOGIC ---
        const handleGoogleResponse = async (response) => {
            try {
                const res = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ credential: response.credential })
                });
                const result = await res.json();

                if (result.isNewUser) {
                    // New User: Switch to Register tab and pre-fill
                    googleUserPendingData = result.googleData;
                    activeTab = 'register';
                    render(); // Re-render to show register tab

                    // Fill fields
                    setTimeout(() => {
                        document.getElementById('reg-email').value = googleUserPendingData.email;
                        document.getElementById('reg-email').readOnly = true;
                        document.getElementById('reg-displayName').value = googleUserPendingData.name;
                        document.getElementById('reg-realName').value = googleUserPendingData.name;
                        
                        // Set a random password for Google users to satisfy DB constraint
                        const randomPwd = Math.random().toString(36).slice(-10) + "G!";
                        document.getElementById('reg-pwd').value = randomPwd;
                        document.getElementById('reg-repwd').value = randomPwd;
                        
                        // Hide password fields to keep it clean, but keep them in DOM
                        document.getElementById('reg-pwd').closest('.form-group').style.display = 'none';
                        document.getElementById('reg-repwd').closest('.form-group').style.display = 'none';
                        
                        alert("Google Account verified! 🛡️ Please complete your Major and Year to finish registration.");
                    }, 100);
                } else if (result.user) {
                    // Existing User: Success Login
                    alert('Login Successful! Welcome back, ' + result.user.username);
                    if (typeof window.validLogin === 'function') {
                        window.validLogin(result.user);
                    } else {
                        localStorage.setItem('userProfile', JSON.stringify(result.user));
                        localStorage.setItem('userEmail', result.user.email);
                        localStorage.setItem('isLoggedIn', 'true');
                        window.location.hash = '#home';
                        window.location.reload();
                    }
                } else {
                    alert("Error: " + (result.error || "Failed to authenticate with Google"));
                }
            } catch (err) {
                console.error("Google Auth Error:", err);
                alert("Connection error during Google login.");
            }
        };

        const initGoogleSignIn = () => {
            if (typeof google === 'undefined') {
                setTimeout(initGoogleSignIn, 500);
                return;
            }
            
            google.accounts.id.initialize({
                client_id: "188345013634-hhgf4i3octm6j5dqtgdp0p56grbufvbb.apps.googleusercontent.com",
                callback: handleGoogleResponse
            });

            const btnOptions = {
                theme: "outline",
                size: "large",
                width: "300",
                text: activeTab === 'login' ? "signin_with" : "signup_with",
                shape: "pill"
            };

            const containerId = activeTab === 'login' ? 'google-btn-login' : 'google-btn-reg';
            const container = document.getElementById(containerId);
            if (container) {
                google.accounts.id.renderButton(container, btnOptions);
            }
        };

        updateTexts();
        renderDepartmentDropdown(typeof I18n !== 'undefined' && I18n.getLanguage ? I18n.getLanguage() : (localStorage.getItem('app_language') || localStorage.getItem('language') || 'en'));
        startClock();
        initGoogleSignIn();
    };

    render();
};
