import { I18n } from '../services/i18n.js';
import { LanguageSelector } from '../components/LanguageSelector.js';

export const renderRegister = () => {
    const app = document.getElementById('app');
    let activeTab = 'login'; // 'login' or 'register'

    const sanitizeInput = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    };

    const startClock = () => {
        const timeEl = document.querySelector('#auth-clock .time');
        const dateEl = document.querySelector('#auth-clock .date');
        if (!timeEl || !dateEl) return;

        setInterval(() => {
            const now = new Date();
            timeEl.innerText = formatTime(now);
            dateEl.innerText = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
        }, 1000);
    };

    const render = () => {
        const currentLang = typeof I18n !== 'undefined' ? I18n.getLanguage() : 'en';

        app.innerHTML = `
            <div class="auth-container fade-in">
                <header id="auth-clock" style="text-align: center; margin-bottom: 2rem; color: #333;">
                    <div class="time" style="font-size: 3.5rem; font-weight: 300; letter-spacing: -2px;">${formatTime(new Date())}</div>
                    <div class="date" style="font-size: 1rem; opacity: 0.7; text-transform: uppercase;">${new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                </header>

                <div class="auth-card">
                    <div class="auth-tabs">
                        <div id="tab-login" class="tab ${activeTab === 'login' ? 'active' : ''}" data-i18n="auth.login_tab">Login</div>
                        <div id="tab-register" class="tab ${activeTab === 'register' ? 'active' : ''}" data-i18n="auth.register_tab">Register</div>
                    </div>

                    <div class="auth-form-container">
                        ${activeTab === 'login' ? `
                            <form id="form-login" class="fade-in">
                                <div class="form-group">
                                    <label data-i18n="auth.email_label">University Email</label>
                                    <input type="email" id="login-email" placeholder="s112213xxx@mail1.ncnu.edu.tw" required>
                                </div>
                                <div class="form-group">
                                    <label data-i18n="auth.pwd_label">Password</label>
                                    <input type="password" id="login-pwd" placeholder="••••••••" required>
                                </div>
                                <button type="submit" class="btn-primary" style="width: 100%; margin-top: 1rem;" data-i18n="auth.login_btn">Sign In</button>
                                
                                <div style="text-align: center; margin-top: 1rem;">
                                    <a href="#" id="btn-forgot-pwd" style="color: var(--primary-color); font-size: 0.85rem; text-decoration: none;" data-i18n="auth.forgot_pwd">Forgot password?</a>
                                </div>
                            </form>
                        ` : `
                            <form id="form-register" class="fade-in">
                                <div class="form-group">
                                    <label data-i18n="reg.role_label">I am a...</label>
                                    <select id="reg-role" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                                        <option value="student" selected data-i18n="reg.role_student">Student / Mahasiswa</option>
                                        <option value="professor" data-i18n="reg.role_professor">Professor / Dosen</option>
                                        <option value="staff" data-i18n="reg.role_staff">University Staff / Staf</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label data-i18n="reg.name_label">Display Name</label>
                                    <input type="text" id="reg-displayName" placeholder="Budi / John Doe" required>
                                </div>
                                <div class="form-group">
                                    <label data-i18n="auth.email_label">University Email</label>
                                    <input type="email" id="reg-email" placeholder="s123xxxxxx@ncnu.edu.tw" required>
                                </div>

                                <div class="form-row">
                                    <div class="form-group" style="flex: 2;">
                                        <label id="label-major" data-i18n="reg.major_label">Major</label>
                                        <input type="text" id="reg-major" placeholder="CSIE" required>
                                    </div>
                                    <div class="form-group" id="group-year" style="flex: 1;">
                                        <label data-i18n="reg.year_label">Year</label>
                                        <input type="text" id="reg-year" placeholder="112" required>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label data-i18n="auth.pwd_label">Password</label>
                                    <input type="password" id="reg-pwd" placeholder="••••••••" required>
                                </div>
                                <div class="form-group">
                                    <label data-i18n="reg.confirm_pwd">Confirm Password</label>
                                    <input type="password" id="reg-repwd" placeholder="••••••••" required>
                                </div>
                                <button type="submit" class="btn-primary" style="width: 100%; margin-top: 1rem;" data-i18n="reg.submit">Create Account</button>
                            </form>
                        `}
                    </div>
                </div>

                <div id="lang-selector-container" style="margin-top: 2rem; display: flex; justify-content: center;"></div>
            </div>

            <!-- MODAL FORGOT PASSWORD -->
            <div id="modal-forgot-pwd" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000; justify-content: center; align-items: center;">
                <div class="modal-content" style="background: white; padding: 25px; border-radius: 15px; width: 90%; max-width: 400px; text-align: center;">
                    <h3 style="margin-bottom: 15px;">🔑 Reset Password</h3>
                    
                    <div id="step-1-email">
                        <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">Enter your university email to receive a recovery OTP.</p>
                        <input type="email" id="forgot-input-email" class="form-control" placeholder="s112213xxx@ncnu.edu.tw" style="width: 100%; margin-bottom: 15px;">
                        <button id="btn-send-otp" class="btn-primary" style="width: 100%;">📩 Send OTP</button>
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

            if (otp === '' || newPwd === '') return alert("Please fill all fields!");

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

            const inputYear = document.getElementById('reg-year').value.trim();
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
                        localStorage.setItem('userProfile', JSON.stringify(userUntukHomepage));
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

        const updateTexts = () => {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = I18n.t(key) || el.placeholder;
                } else {
                    el.innerText = I18n.t(key) || el.innerText;
                }
            });
        };

        updateTexts();
        startClock();
    };

    render();
};
