import { isValidNCNUEmail, sanitizeInput } from '../utils/validation.js';
import { MockStore } from '../models/mockStore.js';
import { I18n } from '../services/i18n.js';
import { formatTime } from '../utils/dateFormatter.js';
import { LanguageSelector } from '../components/LanguageSelector.js';

export const renderRegister = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userProfile');

    const app = document.getElementById('app');
    let activeTab = 'login';
    let clockInterval = null;

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
                <div id="lang-selector-container"></div>
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
                        </div>

                        <div id="view-register" style="display: ${activeTab === 'register' ? 'block' : 'none'};">
                            <form id="form-register">
                                <div class="form-group" style="margin-bottom: 15px;">
                                    <label data-i18n="reg.role_label" style="font-weight: bold;">Identity (Role)</label>
                                    <select id="reg-role" class="form-control" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd; background: white; font-family: inherit;">
                                        <option value="student" data-i18n="role.student">🎓 Student</option>
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
                                        <input type="text" id="reg-major" class="form-control" placeholder="CSIE" required>
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
                        </div>
                    </div>
                </div>
                <p style="margin-top: 2rem; color: #666; font-size: 0.8rem; text-align: center;" data-i18n="auth.footer">&copy; 2026 JoinUp!</p>
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

            if (role === 'student') {
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
                alert('Connection error: ' + error.message);
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
                alert('Connection error: ' + error.message);
            } finally {
                btn.innerText = "💾 Save New Password";
                btn.disabled = false;
            }
        };

        new LanguageSelector('lang-selector-container', {
            onUpdate: (lang) => {
                updateTexts();
                const timeEl = document.querySelector('#auth-clock .time');
                if (timeEl) timeEl.innerText = formatTime(new Date());
            }
        });

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

                    localStorage.setItem('userProfile', JSON.stringify(userUntukHomepage));
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
                alert('Connection error: ' + error.message);
            }
        };

        // --- LOGIKA REGISTER ---
        document.getElementById('form-register').onsubmit = async (e) => {
            e.preventDefault();
            const role = document.getElementById('reg-role').value;
            const pwd = document.getElementById('reg-pwd').value;
            const repwd = document.getElementById('reg-repwd').value;
            const email = document.getElementById('reg-email').value;

            // 1. Deteksi Mahasiswa: Wajib s + 9 angka + @mail1.ncnu.edu.tw ATAU @ncnu.edu.tw
            const isStudentFormat = /^s\d{9}@(mail1\.)?ncnu\.edu\.tw$/.test(email);

            // 2. Deteksi Professor/Staff: Wajib @ncnu.edu.tw TAPI TIDAK BOLEH pakai format mahasiswa
            const isProfessorFormat = email.endsWith('@ncnu.edu.tw') && !isStudentFormat;

            if (role === 'student') {
                if (!isStudentFormat) {
                    alert("Invalid format! Students must use:\ns123456789@mail1.ncnu.edu.tw OR s123456789@ncnu.edu.tw");
                    return;
                }
            } else if (role === 'professor' || role === 'staff') {
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

            const inputYear = sanitizeInput(document.getElementById('reg-year').value).trim();
            let finalStudyYear = 0;

            if (role === 'student') {
                if (!inputYear) return alert("Please enter your study year!");

                const studentId = email.substring(0, 10);
                const entryYearStr = studentId.substring(1, 4);
                const entryYear = parseInt(entryYearStr);
                finalStudyYear = 114 - entryYear + 1;

                let grade = '大' + finalStudyYear;
                if (finalStudyYear === 1) grade = '大一';
                else if (finalStudyYear === 2) grade = '大二';
                else if (finalStudyYear === 3) grade = '大三';
                else if (finalStudyYear === 4) grade = '大四';
                else if (finalStudyYear === 5) grade = '大五';
                else if (finalStudyYear === 6) grade = '大六';
                else if (finalStudyYear > 6) grade = '大七+';
                else if (entryYear > 114) grade = '未來學生';

                const isMatch = (inputYear === grade) || (inputYear === entryYearStr) || (inputYear === String(finalStudyYear));

                if (!isMatch) {
                    alert(typeof I18n !== 'undefined' ? I18n.t('auth.err.year_mismatch') : "Year mismatch!");
                    return;
                }
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
                role: role
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
                        major: payloadDatabase.major
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
                alert('Oops, server connection failed: ' + error.message);
            } finally {
                btn.innerText = typeof I18n !== 'undefined' ? I18n.t('reg.submit') : "Register";
                btn.disabled = false;
            }
        };

        updateTexts();
        startClock();
    };

    render();
};
