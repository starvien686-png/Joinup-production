const nodemailer = require('nodemailer');
const express = require('express');
const cors = require('cors');
const sequelize = require('./database');
const User = require('./User');

const app = express();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

app.use(express.static('public'));

app.get('/', (req, res) => {
    // If you want index.html to show, static('public') already handles it.
    // This route can be kept as a health check or removed.
    res.send('JoinUp Server is running 🚀');
});

const otpStorage = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ncnujoinupadmin@gmail.com',
        pass: 'oabrqgtshscfjrvo'
    },
    tls: {
        rejectUnauthorized: false
    }
});

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, major, study_year, role } = req.body;

        const isStudentFormat = /^s\d{9}@(mail1\.)?ncnu\.edu\.tw$/.test(email);
        const isProfessorFormat = email.endsWith('@ncnu.edu.tw');

        if (role === 'student' && !isStudentFormat) {
            return res.status(400).json({ error: 'Format email mahasiswa tidak valid.' });
        }
        if ((role === 'professor' || role === 'staff')) {
            if (!isProfessorFormat) return res.status(400).json({ error: 'Email Dosen/Staf harus @ncnu.edu.tw' });
            if (isStudentFormat) return res.status(403).json({ error: 'Mahasiswa dilarang mendaftar sebagai Dosen.' });
        }

        const newUser = await User.create({
            username,
            email,
            password,
            major,
            study_year,
            role
        });

        res.status(201).json({ message: 'User created successfully!', user: newUser });
    } catch (error) {
        res.status(400).json({ error: 'Sign up failed: ' + error.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const query = `SELECT * FROM users WHERE email = ?`;
        const [results] = await sequelize.query(query, { replacements: [email] });

        const user = results[0];

        if (!user) return res.status(404).json({ error: 'User not found!' });
        if (user.password !== password) return res.status(401).json({ error: 'Password incorrect!' });

        console.log(`User ${user.username} login successful!`);
        res.status(200).json({
            message: 'Login successful!',
            user: {
                username: user.username,
                email: user.email,
                major: user.major,
                study_year: user.study_year,
                role: user.role,
                bio: user.bio,
                hobby: user.hobby,
                profile_pic: user.profile_pic,
                credit_points: user.credit_points
            }
        });

    } catch (error) {
        res.status(500).json({ error: 'A server error occured: ' + error.message });
    }
});

app.post('/update-profile', async (req, res) => {
    try {
        const { email, bio, hobby, profile_pic } = req.body;

        const query = `UPDATE users SET bio = ?, hobby = ?, profile_pic = ? WHERE email = ?`;
        await sequelize.query(query, {
            replacements: [bio, hobby, profile_pic, email]
        });

        res.json({ message: 'Profil dan Foto berhasil diperbarui! ✨' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/send-otp', async (req, res) => {
    try {
        const { email, lang } = req.body;

        const user = await User.findOne({ where: { email: email } });
        if (!user) {
            return res.status(404).json({ error: 'Email not found in JoinUp system!' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStorage[email] = otp;

        let emailSubject = '';
        let emailHtml = '';

        if (lang === 'zh-TW') {
            emailSubject = '🔑 JoinUp 密碼重置驗證碼';
            emailHtml = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px; margin: auto;">
              <h2 style="color: #d97706;">JoinUp 密碼重置</h2>
              <p>你好 <strong>${user.username}</strong>，有人嘗試重置你的帳戶密碼。</p>
              <p>這是你的專屬驗證碼 (OTP)：</p>
              <h1 style="color: #d97706; font-size: 40px; letter-spacing: 5px; background: #f3f4f6; padding: 15px; border-radius: 8px;">${otp}</h1>
              <p style="color: red; font-size: 13px; font-weight: bold;">重要提示：請勿將此驗證碼告訴任何人！</p>
              <p style="color: #888; font-size: 12px; margin-top: 20px;">如果你沒有提出此請求，請忽略這封電子郵件。</p>
            </div>`;
        } else if (lang === 'id') {
            emailSubject = '🔑 Kode Reset Password JoinUp';
            emailHtml = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px; margin: auto;">
              <h2 style="color: #d97706;">Reset Password JoinUp</h2>
              <p>Halo <strong>${user.username}</strong>, seseorang mencoba mereset password akunmu.</p>
              <p>Ini adalah kode rahasia (OTP) kamu:</p>
              <h1 style="color: #d97706; font-size: 40px; letter-spacing: 5px; background: #f3f4f6; padding: 15px; border-radius: 8px;">${otp}</h1>
              <p style="color: red; font-size: 13px; font-weight: bold;">PENTING: Jangan berikan kode ini kepada siapapun!</p>
              <p style="color: #888; font-size: 12px; margin-top: 20px;">Jika kamu tidak merasa meminta kode ini, abaikan saja email ini.</p>
            </div>`;
        } else {
            emailSubject = '🔑 JoinUp Password Reset Code';
            emailHtml = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px; margin: auto;">
              <h2 style="color: #d97706;">JoinUp Password Reset</h2>
              <p>Hello <strong>${user.username}</strong>, someone requested to reset your account password.</p>
              <p>Here is your One-Time Password (OTP):</p>
              <h1 style="color: #d97706; font-size: 40px; letter-spacing: 5px; background: #f3f4f6; padding: 15px; border-radius: 8px;">${otp}</h1>
              <p style="color: red; font-size: 13px; font-weight: bold;">IMPORTANT: Do not share this code with anyone!</p>
              <p style="color: #888; font-size: 12px; margin-top: 20px;">If you didn't request this, please safely ignore this email.</p>
            </div>`;
        }

        const mailOptions = {
            from: 'JoinUp Support <ncnujoinupadmin@gmail.com>',
            to: email,
            subject: emailSubject,
            html: emailHtml
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP successfully sent to your email!' });

    } catch (error) {
        console.error("Failed to send email:", error);
        res.status(500).json({ error: 'Failed to send email: ' + error.message });
    }
});

app.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (otpStorage[email] !== otp) {
            return res.status(400).json({ error: 'Kode OTP salah!' });
        }

        await User.update(
            { password: newPassword },
            { where: { email: email } }
        );

        delete otpStorage[email];

        res.json({ message: 'Password successfully changed! 🎉 Please login again.' });

    } catch (error) {
        console.error("Failed to reset password:", error);
        res.status(500).json({ error: 'Failed to reset password: ' + error.message });
    }
});

// Helper functions for Point System
async function awardPoints(email, points) {
    if (!email) {
        console.log(`[Points] Attempted to award ${points} points but email is missing.`);
        return;
    }
    try {
        const [result] = await sequelize.query('UPDATE users SET credit_points = credit_points + ? WHERE email = ?', {
            replacements: [points, email]
        });
        console.log(`[Points] Awarded ${points} points to ${email}. Affected rows: ${result.affectedRows}`);
    } catch (error) {
        console.log(`[Points] Failed to award ${points} points to ${email}:`, error);
    }
}

async function handleSuccessPoints(activityId, category) {
    try {
        // 1. Get Host
        let tableName = 'activities';
        let roomIdPrefix = '';
        if (category === 'carpool') { tableName = 'carpools'; roomIdPrefix = 'carpool_'; }
        else if (category === 'study') { tableName = 'studies'; roomIdPrefix = 'study_'; }
        else if (category === 'hangout') { tableName = 'hangouts'; roomIdPrefix = 'hangout_'; }
        else if (category === 'housing') { tableName = 'housing'; roomIdPrefix = 'housing_'; }
        else { roomIdPrefix = 'sports_'; } // Default activity (Sports)

        const [post] = await sequelize.query(`SELECT host_email FROM ${tableName} WHERE id = ?`, { replacements: [activityId] });
        if (post.length > 0) {
            const hostEmail = post[0].host_email;
            await awardPoints(hostEmail, 1); // +1 success for host

            // 2. Get Participants from Chat
            const roomId = roomIdPrefix + activityId;
            const [participants] = await sequelize.query('SELECT user_email FROM chat_participants WHERE room_id = ? AND user_email != ?', {
                replacements: [roomId, hostEmail]
            });

            for (let p of participants) {
                await awardPoints(p.user_email, 1); // +1 success for each participant
            }
        }
    } catch (error) {
        console.error("Failed to handle success points:", error);
    }
}

app.post('/award-points', async (req, res) => {
    try {
        const { email, points } = req.body;
        await awardPoints(email, points);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/create-activity', async (req, res) => {
    try {
        const {
            host_email, category, title, sport_type,
            people_needed, event_time, deadline, location, description
        } = req.body;

        const query = `
            INSERT INTO activities 
            (host_email, category, title, sport_type, people_needed, event_time, deadline, location, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await sequelize.query(query, {
            replacements: [host_email, category, title, sport_type, people_needed, event_time, deadline, location, description]
        });

        await awardPoints(host_email, 1); // +1 Point for creating event!

        res.status(201).json({ message: 'Yeay! Post created successfully! 🏀' });

    } catch (error) {
        console.error("Failed to create post:", error);
        res.status(500).json({ error: 'Failed to create post: ' + error.message });
    }
});

app.get('/activities', async (req, res) => {
    try {
        const query = `
            SELECT a.*, u.username as host_name, u.major as host_dept, u.study_year, u.profile_pic, u.hobby, u.bio
            FROM activities a
            JOIN users u ON a.host_email = u.email
            ORDER BY a.created_at DESC
        `;
        const [results] = await sequelize.query(query);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get activities: ' + error.message });
    }
});

app.get('/my-activities/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const query = `
            SELECT * FROM activities 
            WHERE host_email = ? 
            ORDER BY created_at DESC
        `;
        const [results] = await sequelize.query(query, {
            replacements: [email]
        });
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get manage activities: ' + error.message });
    }
});

app.put('/update-activity-status/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const newStatus = req.body.status;
        await sequelize.query(`UPDATE activities SET status = ? WHERE id = ?`, { replacements: [newStatus, activityId] });

        if (newStatus === 'success') {
            await handleSuccessPoints(activityId, 'sports');
        } else if (newStatus === 'cancelled') {
            const [post] = await sequelize.query('SELECT host_email FROM activities WHERE id = ?', { replacements: [activityId] });
            if (post.length > 0) await awardPoints(post[0].host_email, -1);
        }

        res.json({ message: 'Status berhasil diubah jadi ' + newStatus });
    } catch (error) { res.status(500).json({ error: 'Gagal update status: ' + error.message }); }
});

app.put('/update-carpool-status/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const newStatus = req.body.status;
        await sequelize.query(`UPDATE carpools SET status = ? WHERE id = ?`, { replacements: [newStatus, activityId] });

        if (newStatus === 'success') {
            await handleSuccessPoints(activityId, 'carpool');
        } else if (newStatus === 'cancelled') {
            const [post] = await sequelize.query('SELECT host_email FROM carpools WHERE id = ?', { replacements: [activityId] });
            if (post.length > 0) await awardPoints(post[0].host_email, -1);
        }

        res.json({ message: 'Carpool status updated successfully!' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/update-study-status/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const newStatus = req.body.status;
        await sequelize.query(`UPDATE studies SET status = ? WHERE id = ?`, { replacements: [newStatus, activityId] });

        if (newStatus === 'success') {
            await handleSuccessPoints(activityId, 'study');
        } else if (newStatus === 'cancelled') {
            const [post] = await sequelize.query('SELECT host_email FROM studies WHERE id = ?', { replacements: [activityId] });
            if (post.length > 0) await awardPoints(post[0].host_email, -1);
        }

        res.json({ message: 'Study status updated successfully!' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/update-hangout-status/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const newStatus = req.body.status;
        await sequelize.query(`UPDATE hangouts SET status = ? WHERE id = ?`, { replacements: [newStatus, activityId] });

        if (newStatus === 'success') {
            await handleSuccessPoints(activityId, 'hangout');
        } else if (newStatus === 'cancelled') {
            const [post] = await sequelize.query('SELECT host_email FROM hangouts WHERE id = ?', { replacements: [activityId] });
            if (post.length > 0) await awardPoints(post[0].host_email, -1);
        }

        res.json({ message: 'Hangout status updated successfully!' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/update-housing-status/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const newStatus = req.body.status;
        await sequelize.query(`UPDATE housing SET status = ? WHERE id = ?`, { replacements: [newStatus, activityId] });

        if (newStatus === 'success') {
            await handleSuccessPoints(activityId, 'housing');
        } else if (newStatus === 'cancelled') {
            const [post] = await sequelize.query('SELECT host_email FROM housing WHERE id = ?', { replacements: [activityId] });
            if (post.length > 0) await awardPoints(post[0].host_email, -1);
        }

        res.json({ message: 'Housing status updated successfully!' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// --- ROOM CHAT ROUTES (STAGE 2) ---
// ==========================================

app.get('/chat/:activityId', async (req, res) => {
    try {
        const activityId = req.params.activityId;
        const query = `
            SELECT * FROM chat_messages 
            WHERE activity_id = ? 
            ORDER BY created_at ASC
        `;
        const [results] = await sequelize.query(query, {
            replacements: [activityId]
        });
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat history: ' + error.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const { activity_id, sender_email, sender_name, sender_dept, sender_student_id, role, message_type, content } = req.body;

        const query = `
            INSERT INTO chat_messages 
            (activity_id, sender_email, sender_name, sender_dept, sender_student_id, role, message_type, content) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await sequelize.query(query, {
            replacements: [
                activity_id, sender_email, sender_name, sender_dept, sender_student_id,
                role || 'participant', message_type || 'text', content
            ]
        });

        res.status(201).json({ message: 'Message sent successfully! 🚀' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message: ' + error.message });
    }
});

app.get('/activity/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const query = `
            SELECT a.*, 
                   u.username as host_name, 
                   u.major as host_dept, 
                   u.study_year,
                   u.profile_pic, 
                   u.bio, 
                   u.hobby
            FROM activities a
            JOIN users u ON a.host_email = u.email
            WHERE a.id = ?
        `;
        const [results] = await sequelize.query(query, { replacements: [activityId] });

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Event not found!' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch event details: ' + error.message });
    }
});

app.post('/activity/:id/close', async (req, res) => {
    try {
        const activityId = req.params.id;
        await sequelize.query("UPDATE activities SET people_needed = 0 WHERE id = ?", {
            replacements: [activityId]
        });
        res.json({ success: true, message: 'Event closed successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const uploadDir = path.join(__dirname, '.uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '.uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, '.uploads')));

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, type: req.file.mimetype.startsWith('image') ? 'image' : 'file' });
});


// ==========================================
// --- API UNTUK CARPOOL (TEBENGAN) ---
// ==========================================

// 1. Mengambil semua data tebengan
app.get('/carpools', async (req, res) => {
    try {
        const query = `
            SELECT c.*, u.username as host_name, u.major as host_dept, u.study_year, u.profile_pic, u.hobby, u.bio
            FROM carpools c
            JOIN users u ON c.host_email = u.email
            ORDER BY c.created_at DESC
        `;
        const [results] = await sequelize.query(query);
        res.json(results);
    } catch (error) {
        console.error("Error fetching carpools:", error);
        res.status(500).json({ error: "Failed to fetch carpools" });
    }
});

// 2. Membuat tebengan baru
app.post('/create-carpool', async (req, res) => {
    try {
        const {
            host_email, host_name, host_dept, title,
            departure_loc, destination_loc, departure_time, deadline,
            available_seats, price, vehicle_type, description
        } = req.body;

        const query = `
            INSERT INTO carpools 
            (host_email, host_name, host_dept, title, departure_loc, destination_loc, departure_time, deadline, available_seats, price, vehicle_type, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await sequelize.query(query, {
            replacements: [
                host_email, host_name, host_dept, title,
                departure_loc, destination_loc, departure_time, deadline,
                available_seats, price, vehicle_type, description
            ]
        });

        await awardPoints(host_email, 1); // +1 Point for creating carpool!

        res.status(201).json({ message: "Carpool created successfully!" });
    } catch (error) {
        console.error("Error creating carpool:", error);
        res.status(500).json({ error: "Failed to create carpool: " + error.message });
    }
});

// 3. Mengubah status tebengan (Pause, Resume, Success, Cancel)
app.put('/update-carpool-status/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const newStatus = req.body.status;

        const query = `UPDATE carpools SET status = ? WHERE id = ?`;
        await sequelize.query(query, {
            replacements: [newStatus, activityId]
        });

        if (newStatus === 'success') {
            await handleSuccessPoints(activityId, 'carpool');
        } else if (newStatus === 'cancelled') {
            const [post] = await sequelize.query('SELECT host_email FROM carpools WHERE id = ?', { replacements: [activityId] });
            if (post.length > 0) await awardPoints(post[0].host_email, -1);
        }

        res.json({ message: 'Carpool status updated successfully!' });
    } catch (error) {
        console.error("Error updating carpool status:", error);
        res.status(500).json({ error: "Failed to update carpool status: " + error.message });
    }
});

// 4. Mengambil detail tebengan spesifik
app.get('/carpool/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const query = `SELECT * FROM carpools WHERE id = ?`;
        const [results] = await sequelize.query(query, { replacements: [activityId] });

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Carpool not found!' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch carpool details: ' + error.message });
    }
});

// ==========================================
// --- API UNTUK STUDY (BELAJAR BARENG) ---
// ==========================================

// 1. Mengambil semua data Study yang masih open (Untuk Halaman Depan)
app.get('/studies', async (req, res) => {
    try {
        const query = `
            SELECT s.*, u.username as host_name, u.major as host_dept, u.study_year, u.profile_pic, u.hobby, u.bio
            FROM studies s
            JOIN users u ON s.host_email = u.email
            ORDER BY s.created_at DESC
        `;
        const [results] = await sequelize.query(query);
        res.json(results);
    } catch (error) {
        console.error("Error fetching studies:", error);
        res.status(500).json({ error: "Failed to fetch studies" });
    }
});

// 2. Membuat event Study baru (Dari form kuning)
app.post('/create-study', async (req, res) => {
    try {
        const {
            host_email, host_name, host_dept,
            title, event_type, subject, location,
            people_needed, event_time, deadline, description
        } = req.body;

        const query = `
            INSERT INTO studies 
            (host_email, host_name, host_dept, title, event_type, subject, location, people_needed, event_time, deadline, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await sequelize.query(query, {
            replacements: [
                host_email, host_name, host_dept,
                title, event_type, subject, location,
                people_needed, event_time, deadline, description
            ]
        });

        await awardPoints(host_email, 1); // +1 Point for creating study!

        res.status(201).json({ message: "Study event created successfully!" });
    } catch (error) {
        console.error("Error creating study:", error);
        res.status(500).json({ error: "Failed to create study: " + error.message });
    }
});

// 3. Mengubah status Study (Pause, Resume, Success, Cancel)
app.put('/update-study-status/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const newStatus = req.body.status;

        const query = `UPDATE studies SET status = ? WHERE id = ?`;
        await sequelize.query(query, {
            replacements: [newStatus, activityId]
        });

        if (newStatus === 'success') {
            await handleSuccessPoints(activityId, 'study');
        } else if (newStatus === 'cancelled') {
            const [post] = await sequelize.query('SELECT host_email FROM studies WHERE id = ?', { replacements: [activityId] });
            if (post.length > 0) await awardPoints(post[0].host_email, -1);
        }

        res.json({ message: 'Study status updated successfully!' });
    } catch (error) {
        console.error("Error updating study status:", error);
        res.status(500).json({ error: "Failed to update study status: " + error.message });
    }
});

// 4. Mengambil data Study milik sendiri (Untuk Halaman Manage My Activities)
app.get('/my-studies/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const query = `SELECT * FROM studies WHERE host_email = ? ORDER BY created_at DESC`;
        const [results] = await sequelize.query(query, { replacements: [email] });
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch my studies: ' + error.message });
    }
});

// 5. Mengambil detail spesifik (Untuk Pop-up Detail / Masuk Chat)
app.get('/study/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const query = `SELECT * FROM studies WHERE id = ?`;
        const [results] = await sequelize.query(query, { replacements: [activityId] });

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Study event not found!' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch study details: ' + error.message });
    }
});

// ==========================================
// --- API UNTUK HANG OUT (創建活動) ---
// ==========================================

// 1. Mengambil semua data Hang Out yang masih open (Untuk Halaman List)
app.get('/hangouts', async (req, res) => {
    try {
        const query = `
            SELECT h.*, u.username as host_name, u.major as host_dept, u.study_year, u.profile_pic, u.hobby, u.bio
            FROM hangouts h
            JOIN users u ON h.host_email = u.email
            ORDER BY h.created_at DESC
        `;
        const [results] = await sequelize.query(query);
        res.json(results);
    } catch (error) {
        console.error("Error fetching hangouts:", error);
        res.status(500).json({ error: "Failed to fetch hangouts" });
    }
});

// 2. Membuat event Hang Out baru (Dari Form)
app.post('/create-hangout', async (req, res) => {
    try {
        const {
            host_email, title, category, host_name, host_dept,
            people_needed, event_time, deadline,
            meeting_location, destination, description
        } = req.body;

        const query = `
            INSERT INTO hangouts 
            (host_email, title, category, host_name, host_dept, people_needed, event_time, deadline, meeting_location, destination, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await sequelize.query(query, {
            replacements: [
                host_email, title, category, host_name, host_dept,
                people_needed, event_time, deadline,
                meeting_location, destination, description
            ]
        });

        await awardPoints(host_email, 1); // +1 Point for creating hangout!

        res.status(201).json({ message: "Hangout event created successfully!" });
    } catch (error) {
        console.error("Error creating hangout:", error);
        res.status(500).json({ error: "Failed to create hangout: " + error.message });
    }
});

// 3. Mengubah status Hang Out (Pause, Resume, Success, Cancel)
app.put('/update-hangout-status/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const newStatus = req.body.status;

        const query = `UPDATE hangouts SET status = ? WHERE id = ?`;
        await sequelize.query(query, {
            replacements: [newStatus, activityId]
        });

        if (newStatus === 'success') {
            await handleSuccessPoints(activityId, 'hangout');
        } else if (newStatus === 'cancelled') {
            const [post] = await sequelize.query('SELECT host_email FROM hangouts WHERE id = ?', { replacements: [activityId] });
            if (post.length > 0) await awardPoints(post[0].host_email, -1);
        }

        res.json({ message: 'Hangout status updated successfully!' });
    } catch (error) {
        console.error("Error updating hangout status:", error);
        res.status(500).json({ error: "Failed to update hangout status: " + error.message });
    }
});

// 4. Mengambil data Hang Out milik sendiri (Untuk Halaman Manage My Activities)
app.get('/my-hangouts/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const query = `SELECT * FROM hangouts WHERE host_email = ? ORDER BY created_at DESC`;
        const [results] = await sequelize.query(query, { replacements: [email] });
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch my hangouts: ' + error.message });
    }
});

// ==========================================
// --- API UNTUK SISTEM CHAT (REAL DATABASE) ---
// ==========================================

// 1. Setup Room Chat (Dipanggil waktu klik Enter Chat Room / Accept)
app.post('/setup-chat-room', async (req, res) => {
    try {
        const { room_id, post_id, room_type, team_name, participants } = req.body;

        // Bikin ruangan (Kalau udah ada, abaikan pakai IGNORE)
        await sequelize.query(`INSERT IGNORE INTO chat_rooms (room_id, post_id, room_type, team_name) VALUES (?, ?, ?, ?)`, {
            replacements: [room_id, post_id, room_type, team_name]
        });

        // Masukin daftar orangnya
        if (participants && participants.length > 0) {
            for (let p of participants) {
                await sequelize.query(`INSERT IGNORE INTO chat_participants (room_id, user_email, user_name, role) VALUES (?, ?, ?, ?)`, {
                    replacements: [room_id, p.id, p.name || 'User', p.role || 'participant']
                });
            }
        }

        res.json({ message: "Room is ready!" });
    } catch (error) {
        console.error("Error setup chat:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Ambil Daftar Chat Room milik seorang User
app.get('/my-chat-rooms/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const query = `
            SELECT r.room_id as id, r.post_id, r.room_type as roomType, r.team_name as teamName 
            FROM chat_rooms r
            JOIN chat_participants p ON r.room_id = p.room_id
            WHERE p.user_email = ?
            ORDER BY r.created_at DESC
        `;
        const [rooms] = await sequelize.query(query, { replacements: [email] });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Ambil semua pesan di dalam satu Room
app.get('/room-messages/:roomId', async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const query = `SELECT * FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC`;
        const [messages] = await sequelize.query(query, { replacements: [roomId] });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Kirim Pesan Baru
app.post('/send-message', async (req, res) => {
    try {
        const { room_id, sender_email, sender_name, message } = req.body;
        const query = `INSERT INTO chat_messages (room_id, sender_email, sender_name, message) VALUES (?, ?, ?, ?)`;
        await sequelize.query(query, { replacements: [room_id, sender_email, sender_name, message] });
        res.status(201).json({ message: "Message sent!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 1. API CREATE HOUSING
app.post('/create-housing', async (req, res) => {
    try {
        const { host_email, host_name, host_dept, housing_type, title, location, room_number, rent_amount, deposit, people_needed, gender_req, deadline, rental_period, facilities, habits, description } = req.body;

        const query = `
            INSERT INTO housing 
            (host_email, host_name, host_dept, housing_type, title, location, room_number, rent_amount, deposit, people_needed, gender_req, deadline, rental_period, facilities, habits, description, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
        `;

        const [results] = await sequelize.query(query, {
            replacements: [host_email, host_name, host_dept, housing_type, title, location, room_number || null, rent_amount || null, deposit || null, people_needed, gender_req, deadline, rental_period, facilities || '', habits || '', description || '']
        });

        await awardPoints(host_email, 1); // +1 Point for creating housing!

        res.status(201).json({ success: true, id: results });
    } catch (error) {
        console.error("Failed to create housing:", error);
        res.status(500).json({ error: 'Failed to create housing: ' + error.message });
    }
});

// 2. API GET ALL HOUSING (Untuk List)
app.get('/housing', async (req, res) => {
    try {
        const query = `
            SELECT ho.*, u.username as host_name, u.major as host_dept, u.study_year, u.profile_pic, u.hobby, u.bio
            FROM housing ho
            JOIN users u ON ho.host_email = u.email
            ORDER BY ho.created_at DESC
        `;
        const [results] = await sequelize.query(query);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. API GET MY HOUSING (Untuk Manage)
app.get('/my-housing/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const query = "SELECT * FROM housing WHERE host_email = ? ORDER BY created_at DESC";
        const [results] = await sequelize.query(query, { replacements: [email] });
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Update Housing status
app.put('/update-housing-status/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const newStatus = req.body.status;

        const query = `UPDATE housing SET status = ? WHERE id = ?`;
        await sequelize.query(query, {
            replacements: [newStatus, activityId]
        });

        if (newStatus === 'success') {
            await handleSuccessPoints(activityId, 'housing');
        } else if (newStatus === 'cancelled') {
            const [post] = await sequelize.query('SELECT host_email FROM housing WHERE id = ?', { replacements: [activityId] });
            if (post.length > 0) await awardPoints(post[0].host_email, -1);
        }

        res.json({ message: 'Housing status updated successfully!' });
    } catch (error) {
        res.status(500).json({ error: "Failed to update housing status: " + error.message });
    }
});

// 5. Get Housing specific details
app.get('/housing/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const query = `SELECT * FROM housing WHERE id = ?`;
        const [results] = await sequelize.query(query, { replacements: [activityId] });

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Housing post not found!' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch housing details: ' + error.message });
    }
});

// API UNTUK MENGAMBIL PROFIL USER BERDASARKAN EMAIL
app.get('/profile/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const [results] = await sequelize.query('SELECT * FROM users WHERE email = ?', {
            replacements: [email]
        });

        if (results.length > 0) {
            res.json(results); // 👈 WAJIB PAKAI DI SINI!
        } else {
            res.status(404).json({ error: 'User tidak ditemukan' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API UNTUK MENGAMBIL SEMUA USER (Biar tampilan daftar/List-nya juga muncul foto)
app.get('/users', async (req, res) => {
    try {
        const [results] = await sequelize.query('SELECT * FROM users');
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. API UNTUK MENYIMPAN FEEDBACK DARI USER
app.post('/submit-feedback', async (req, res) => {
    try {
        const { user_email, user_name, user_dept, study_year, event_id, event_title, category, q1_rating, q2_rating, q3_success, q4_message } = req.body;

        const query = `INSERT INTO activity_feedback (user_email, user_name, user_dept, study_year, event_id, event_title, category, q1_rating, q2_rating, q3_success, q4_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await sequelize.query(query, {
            replacements: [user_email, user_name, user_dept, study_year, event_id, event_title, category, q1_rating, q2_rating, q3_success, q4_message || '']
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. API UNTUK DASHBOARD ADMIN (Ambil Statistik & Detail)
app.get('/admin/feedback-stats', async (req, res) => {
    try {
        // Ambil Statistik Rata-rata per Kategori
        const statQuery = `
            SELECT 
                category, 
                COUNT(*) as total_feedback, 
                AVG(q1_rating) as avg_q1, 
                AVG(q2_rating) as avg_q2, 
                SUM(CASE WHEN q3_success = 1 THEN 1 ELSE 0 END) as success_count 
            FROM activity_feedback 
            GROUP BY category
        `;

        // Ambil Detail Lengkap Siapa Bilang Apa
        const detailQuery = `SELECT * FROM activity_feedback ORDER BY created_at DESC`;

        const [stats] = await sequelize.query(statQuery);
        const [details] = await sequelize.query(detailQuery);

        res.json({ stats, details });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API UNTUK NGECEK EVENT APA SAJA YANG SUDAH DI-RATE OLEH USER
app.get('/my-feedbacks/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const [results] = await sequelize.query('SELECT event_id FROM activity_feedback WHERE user_email = ?', {
            replacements: [email]
        });
        res.json(results.map(r => String(r.event_id))); // Kirim kumpulan ID event yang udah di-rate
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`SERVER SUCCESSFUL! 🚀 Cek di http://localhost:${PORT}`);
    try {
        await sequelize.authenticate();
        console.log('Database connected to Server.');
    } catch (err) {
        console.log('Database connection error:', err);
    }
});