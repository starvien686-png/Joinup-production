require('dotenv').config();
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const dns = require('dns');
const express = require('express');
const cors = require('cors');
const sequelize = require('./database');
const User = require('./User');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const validator = require('validator');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const joinService = require('./services/join_service');
const workerService = require('./services/worker_service');
const pushService = require('./services/push_service');

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- TIMEZONE UTILITY (Asia/Taipei = UTC+8) ---
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TIMEZONE = 'Asia/Taipei';

/**
 * Converts any datetime string to Asia/Taipei timezone format for MySQL DATETIME columns.
 * Handles inputs like: '2026-04-07T14:00', '2026-04-07 14:00:00', ISO strings, etc.
 * Returns: 'YYYY-MM-DD HH:mm:ss' in Asia/Taipei time, or null if input is falsy.
 */
function toTaipei(datetimeStr) {
    if (!datetimeStr) return null;
    // Parse as-is (the input from frontend datetime-local is in the user's local time = Taipei)
    // We treat the raw string as Taipei time and format it for MySQL
    const parsed = dayjs.tz(datetimeStr, APP_TIMEZONE);
    if (!parsed.isValid()) return datetimeStr; // fallback: return original if unparseable
    return parsed.format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Get current time in Asia/Taipei as a JS Date-compatible value.
 * Use this instead of Date.now() for time comparisons on the server.
 */
function nowTaipei() {
    return dayjs().tz(APP_TIMEZONE);
}

// Force IPv4 first for environments like Render that don't support outbound IPv6
dns.setDefaultResultOrder('ipv4first');

const app = express();

// --- LOGGING SETUP (WINSTON) ---
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) fs.mkdirSync('logs');


app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// --- MOUNT JOIN_SERVICE API ---
app.use('/api/v1', joinService);

// --- OTP STORAGE & UTILS ---
const otpStorage = {}; // { email: { hash, expiresAt, attempts, requestId } }

const maskEmail = (email) => {
    const [name, domain] = email.split('@');
    return `${name[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
};

const getEmailVariations = (email) => {
    if (!email) return [];
    if (email.endsWith('@mail1.ncnu.edu.tw')) {
        return [email, email.replace('@mail1.ncnu.edu.tw', '@ncnu.edu.tw')];
    } else if (email.endsWith('@ncnu.edu.tw') && /^s\d+/i.test(email.split('@')[0])) {
        return [email, email.replace('@ncnu.edu.tw', '@mail1.ncnu.edu.tw')];
    }
    return [email];
};

// --- EMAIL QUEUE & RETRY LOGIC ---
class EmailQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    async add(mailOptions, requestId, attempt = 1) {
        this.queue.push({ mailOptions, requestId, attempt });
        logger.info(`[Queue] added email for ${maskEmail(mailOptions.to)}`, { requestId });
        this.process();
    }

    async process() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;
        const { mailOptions, requestId, attempt } = this.queue.shift();

        try {
            await transporter.sendMail({
                ...mailOptions,
                timeout: 10000 // 10s SMTP timeout
            });
            logger.info(`[Queue] sent successfully to ${maskEmail(mailOptions.to)}`, { requestId });
        } catch (error) {
            logger.error(`[Queue] failed attempt ${attempt} for ${maskEmail(mailOptions.to)}: ${error.message}`, { requestId });
            if (attempt < 3) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                setTimeout(() => this.add(mailOptions, requestId, attempt + 1), delay);
            } else {
                logger.error(`[Queue] CRITICAL: Max retries reached for ${maskEmail(mailOptions.to)}`, { requestId });
            }
        } finally {
            this.isProcessing = false;
            this.process();
        }
    }
}
const emailQueue = new EmailQueue();

// --- RATE LIMITING ---
    standardHeaders: true,
    legacyHeaders: false,
});

// --- AUTHENTICATION MIDDLEWARE ---
const checkAuth = async (req, res, next) => {
    // Check various sources for user identification (header, body, or query)
    const userEmail = req.headers['x-user-email'] || req.body.sender_email || req.body.email || req.query.email;
    if (!userEmail) return res.status(401).json({ error: 'Authentication required. Please login first.' });
    
    try {
        const user = await User.findOne({ where: { email: userEmail } });
        if (!user) return res.status(403).json({ error: 'Access denied. Invalid user session.' });
        req.user = user; // Attach user to request
        next();
    } catch (err) {
        res.status(500).json({ error: 'Authentication check failed: ' + err.message });
    }
};

// --- MULTER ERROR HANDLING MIDDLEWARE ---
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large! Maximum limit is 50MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
        return res.status(500).json({ error: `Server error during upload: ${err.message}` });
    }
    next();
};

// --- SMTP TRANSPORTER (POOLED) ---
const transporter = nodemailer.createTransport({
    pool: true, // Enable pooling for faster delivery
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    family: 4,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, major, study_year, role, is_delayed_graduation } = req.body;

        const isStudentFormat = /^s\d{9}@(mail1\.)?ncnu\.edu\.tw$/.test(email);
        const isProfessorFormat = email.endsWith('@ncnu.edu.tw');

        const isStudentRole = ['bachelor_student', 'master_student', 'doctoral_student'].includes(role);
        if (isStudentRole && !isStudentFormat) {
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
            role,
            is_delayed_graduation: !!is_delayed_graduation
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

        res.json({ message: 'Profile and Photo updated successfully! ✨' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/send-otp', otpRateLimiter, async (req, res) => {
    const requestId = crypto.randomUUID();
    try {
        const { email, lang } = req.body;

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format!' });
        }

        const user = await User.findOne({ where: { email: email } });
        if (!user) {
            logger.warn(`OTP request for unknown email: ${maskEmail(email)}`, { requestId });
            return res.status(404).json({ error: 'Email not found in JoinUp system!' });
        }

        // --- IDEMPOTENCY CHECK ---
        const existing = otpStorage[email];
        if (existing && Date.now() - existing.createdAt < 30000) {
            logger.info(`Idempotent request for ${maskEmail(email)}`, { requestId });
            return res.status(200).json({ message: 'OTP is already being sent! Please check your email.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hash = await bcrypt.hash(otp, 10);

        // --- ATOMIC UPDATE (CONCURRENCY) ---
        otpStorage[email] = {
            hash,
            expiresAt: Date.now() + (process.env.OTP_EXPIRY_MINUTES * 60 * 1000),
            attempts: 0,
            createdAt: Date.now(),
            requestId
        };

        let emailSubject = '🔑 JoinUp OTP Code';
        let greeting = 'Hello';
        let mainText = 'Your OTP code is:';
        let footerText = 'Valid for 5 minutes. Do not share this code.';
        let brandName = 'JoinUp';

        // Jika bahasa yang dikirim adalah Mandarin (zh-TW atau zh)
        if (lang === 'zh-TW' || lang === 'zh') {
            emailSubject = '🔑 JoinUp 驗證碼';
            brandName = 'JoinUp 一起加入吧';
            greeting = '您好';
            mainText = '您的驗證碼是：';
            footerText = '驗證碼將在 5 分鐘後過期。請勿將此代碼分享給他人。';
        }

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px; margin: auto;">
                <h2 style="color: #d97706;">${brandName}</h2>
                <p>${greeting} <strong>${user.username}</strong>,</p>
                <p>${mainText}</p>
                <h1 style="color: #d97706; font-size: 40px; letter-spacing: 5px; background: #f3f4f6; padding: 15px; border-radius: 8px;">${otp}</h1>
                <p style="color: #888; font-size: 12px;">${footerText}</p>
            </div>`;

        const mailOptions = {
            sender: process.env.SMTP_FROM,
            from: process.env.SMTP_FROM,
            to: email,
            subject: emailSubject,
            html: emailHtml
        };

        // FIRE AND FORGET (NON-BLOCKING)
        emailQueue.add(mailOptions, requestId);

        logger.info(`OTP generated and queued for ${maskEmail(email)}`, { requestId });
        res.status(202).json({ message: 'OTP is being sent to your email! 🚀' });

    } catch (error) {
        logger.error(`Failed in /send-otp: ${error.message}`, { requestId });
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/reset-password', async (req, res) => {
    const requestId = crypto.randomUUID();
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields!' });
        }

        const record = otpStorage[email];
        if (!record) {
            return res.status(400).json({ error: 'No OTP requested or security session expired!' });
        }

        if (Date.now() > record.expiresAt) {
            delete otpStorage[email];
            return res.status(400).json({ error: 'OTP has expired! Please request a new one.' });
        }

        if (record.attempts >= process.env.MAX_OTP_ATTEMPTS) {
            delete otpStorage[email];
            logger.warn(`Brute force attempt detected for ${maskEmail(email)}`, { requestId });
            return res.status(403).json({ error: 'Too many failed attempts! Please request a new OTP.' });
        }

        const isMatch = await bcrypt.compare(otp, record.hash);
        if (!isMatch) {
            record.attempts++;
            return res.status(401).json({ error: 'Invalid OTP code!' });
        }

        // SUCCESS
        await User.update(
            { password: newPassword },
            { where: { email: email } }
        );

        delete otpStorage[email];
        logger.info(`Password successfully reset for ${maskEmail(email)}`, { requestId });
        res.json({ message: 'Password successfully changed! 🎉' });

    } catch (error) {
        logger.error(`Failed in /reset-password: ${error.message}`, { requestId });
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// --- AUTO-CLEANUP JOB ---
setInterval(() => {
    const now = Date.now();
    Object.keys(otpStorage).forEach(email => {
        if (now > otpStorage[email].expiresAt) {
            delete otpStorage[email];
            logger.info(`Cleaned up expired OTP for ${maskEmail(email)}`);
        }
    });
}, 10 * 60 * 1000); // Every 10 minutes

// Helper functions for Point System
async function awardPoints(email, points) {
    if (!email) {
        console.log(`[Points] Attempted to award ${points} points but email is missing.`);
        return;
    }
    try {
        const emails = getEmailVariations(email);
        const [result] = await sequelize.query('UPDATE users SET credit_points = credit_points + ? WHERE email IN (?)', {
            replacements: [points, emails]
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

            // 2. Participants get points upon feedback submission, so we DO NOT award them here.
        }
    } catch (error) {
        console.error("Failed to handle success points:", error);
    }
}

async function handleCancellation(activityId, category) {
    try {
        let tableName = 'activities';
        let eventType = 'sports';
        if (category === 'carpool') { tableName = 'carpools'; eventType = 'carpool'; }
        else if (category === 'study') { tableName = 'studies'; eventType = 'study'; }
        else if (category === 'hangout') { tableName = 'hangouts'; eventType = 'hangout'; }
        else if (category === 'housing') { tableName = 'housing'; eventType = 'housing'; }

        let timeColumn = 'event_time';
        if (category === 'carpool') timeColumn = 'departure_time';
        else if (category === 'housing') timeColumn = 'deadline';

        const query = `SELECT host_email, title, ${timeColumn} as event_time FROM ${tableName} WHERE id = ?`;
        const [post] = await sequelize.query(query, { replacements: [activityId] });

        if (post.length === 0) return;
        const hostEmail = post[0].host_email;
        const eventTitle = post[0].title;
        const eventTime = post[0].event_time;

        // 2. Count Accepted Participants
        const [parts] = await sequelize.query(
            "SELECT user_id, status FROM event_participants WHERE event_type = ? AND event_id = ? AND status IN ('approved', 'accepted')",
            { replacements: [eventType, activityId] }
        );
        const acceptedCount = parts.length;

        // 3. Deduction Rule Engine
        let shouldDeduct = false;
        if (acceptedCount > 0) {
            shouldDeduct = true;
        } else if (eventTime) {
            const eventDayjs = dayjs.tz(eventTime, APP_TIMEZONE);
            const now = nowTaipei();
            const hoursToStart = eventDayjs.diff(now, 'hour', true);
            if (hoursToStart >= 0 && hoursToStart < 2) {
                shouldDeduct = true;
            }
        }

        if (shouldDeduct) {
            await awardPoints(hostEmail, -2);
            console.log(`[Points] Deducted 2 points from ${hostEmail} for cancelling/deleting event ${activityId}`);
        } else {
            console.log(`[Points] No deduction for ${hostEmail} (Cancel allowed without penalty).`);
        }

        // 4. Send cancellation notifications to accepted participants
        if (acceptedCount > 0) {
            for (let p of parts) {
                const targetId = `${eventType}_${activityId}`;
                await sequelize.query(
                    `INSERT INTO system_notifications (id, recipient_id, type, aggregate_id, metadata, action_metadata, created_at)
                     VALUES (UUID(), ?, 'CANCELLED', ?, ?, '{}', NOW())`,
                    {
                        replacements: [
                            p.user_id,
                            targetId,
                            JSON.stringify({
                                event_title: eventTitle || 'Unknown',
                                category: eventType
                            })
                        ]
                    }
                );
            }
        }

        // 🔔 Send OneSignal Push to Participants
        if (participantEmails.length > 0) {
            const pushTitle = `⚠️ Event Cancelled / 活動取消通知`;
            const pushBody = `The event "${eventTitle}" has been cancelled by the host. / 您參加的活動 "${eventTitle}" 已被主辦人取消。`;
            await pushService.sendPushNotification(participantEmails, pushTitle, pushBody, `https://joinup-production.onrender.com/#home`);
        }
    } catch (error) {
        console.error("Failed to handle cancellation:", error);
    }
}

// 🔔 HELPER: Notify Subscribers for New Event
async function notifySubscribers(category, eventTitle, eventId, eventType, hostEmail) {
    const cleanCategory = (category || '').toLowerCase().trim();
    console.log(`[Notification] 🔍 Searching subscribers for category: "${cleanCategory}" (Event: "${eventTitle}")`);

    try {
        // Use a more flexible JOIN that handles NCNU email aliases (@mail1.ncnu vs @ncnu)
        const query = `
            SELECT DISTINCT u.id, u.email 
            FROM users u
            JOIN user_subscriptions s ON (
                -- Normalize both sides to @ncnu.edu.tw for comparison
                REPLACE(LOWER(TRIM(s.user_email)), '@mail1.ncnu.edu.tw', '@ncnu.edu.tw') = 
                REPLACE(LOWER(TRIM(u.email)), '@mail1.ncnu.edu.tw', '@ncnu.edu.tw')
            )
            WHERE LOWER(TRIM(s.category_name)) = ?
        `;
        const [subscribers] = await sequelize.query(query, { replacements: [cleanCategory] });

        console.log(`[Notification] 👥 Found ${subscribers.length} potential subscribers.`);

        if (subscribers.length === 0) return;

        const targetId = `${eventType}_${eventId}`;
        const metadata = JSON.stringify({
            message: `🚀 [New Event] "${eventTitle}" for ${category}! Check it out!`,
            category: category,
            event_title: eventTitle,
            event_id: eventId,
            event_type: eventType
        });

        let successCount = 0;
        const hostVariants = getEmailVariations(hostEmail).map(e => e.toLowerCase().trim());

        for (const sub of subscribers) {
            const subEmail = sub.email.toLowerCase().trim();
            // Avoid notifying the host themselves
            if (hostVariants.includes(subEmail)) {
                console.log(`[Notification] ⏭️ Skipping host: ${subEmail}`);
                continue;
            }

            try {
                await sequelize.query(
                    `INSERT INTO system_notifications (id, recipient_id, type, aggregate_id, metadata, action_metadata, created_at)
                     VALUES (UUID(), ?, 'NEW_EVENT', ?, ?, '{}', NOW())
                     ON DUPLICATE KEY UPDATE created_at = NOW()`,
                    { replacements: [sub.id, targetId, metadata] }
                );
                successCount++;
            } catch (insertErr) {
                console.error(`[Notification] ❌ INSERT failed for user ${sub.id}:`, insertErr.message);
            }
        }
        console.log(`[Notification] ✅ Successfully sent ${successCount} notifications.`);

        // 🔔 Send OneSignal Push to Subscribers
        if (subscribers.length > 0) {
            const subscriberEmails = subscribers.map(s => s.email);
            const pushTitle = `🚀 New Event in ${category} / 新活動通知`;
            const pushBody = `[${category.toUpperCase()}] "${eventTitle}" check it out! / 我們有新的 ${category} 活動：「${eventTitle}」，快來查看吧！`;
            await pushService.sendPushNotification(subscriberEmails, pushTitle, pushBody, `https://joinup-production.onrender.com/#${category}/${eventId}`);
        }

    } catch (error) {
        console.error(`[Notification] ‼️ CRITICAL FAILURE for ${category}:`, error);
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

// Admin manual penalty route
app.post('/api/v1/admin/penalize', async (req, res) => {
    try {
        const { email, penalty, reason } = req.body;
        if (!email || !penalty) return res.status(400).json({ error: 'Missing email or penalty details' });

        // Deduct points
        await awardPoints(email, -Math.abs(penalty));
        console.log(`[Admin] Deducted ${penalty} points from ${email}. Reason: ${reason || 'N/A'}`);
        res.json({ success: true, message: `Successfully penalized user by ${penalty} points.` });
    } catch (error) {
        console.error("Admin penalize error:", error);
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

        const [result] = await sequelize.query(query, {
            replacements: [host_email, category, title, sport_type, people_needed, toTaipei(event_time), toTaipei(deadline), location, description]
        });

        const insertId = result.insertId || result;
        await awardPoints(host_email, 1); // +1 Point for creating event!

        // 🔔 Notify Instant!
        await notifySubscribers('sports', title, insertId, 'sports', host_email);

        res.status(201).json({ message: 'Yeay! Post created successfully! 🏀' });

    } catch (error) {
        console.error("Failed to create post:", error);
        res.status(500).json({ error: 'Failed to create post: ' + error.message });
    }
});

app.get('/activities', async (req, res) => {
    try {
        const query = `
            SELECT a.*, u.username as host_name, u.major as host_dept, u.study_year, u.profile_pic, u.hobby, u.bio, u.credit_points
            FROM activities a
            JOIN users u ON a.host_email = u.email
            WHERE a.status = 'open' AND (a.deadline > NOW() OR a.deadline IS NULL OR a.event_time > NOW())
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
        const emails = getEmailVariations(req.params.email);
        const query = `
            SELECT * FROM activities 
            WHERE host_email IN (?) 
            ORDER BY created_at DESC
        `;
        const [results] = await sequelize.query(query, {
            replacements: [emails]
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
        } else if (newStatus === 'cancelled' || newStatus === 'deleted') {
            await handleCancellation(activityId, 'sports');
        }

        res.json({ message: 'Status successfully changed to ' + newStatus });
    } catch (error) { res.status(500).json({ error: 'Gagal update status: ' + error.message }); }
});

app.put('/update-carpool-status/:id', async (req, res) => {
    try {
        const activityId = req.params.id;
        const newStatus = req.body.status;
        await sequelize.query(`UPDATE carpools SET status = ? WHERE id = ?`, { replacements: [newStatus, activityId] });

        if (newStatus === 'success') {
            await handleSuccessPoints(activityId, 'carpool');
        } else if (newStatus === 'cancelled' || newStatus === 'deleted') {
            await handleCancellation(activityId, 'carpool');
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
        } else if (newStatus === 'cancelled' || newStatus === 'deleted') {
            await handleCancellation(activityId, 'study');
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
        } else if (newStatus === 'cancelled' || newStatus === 'deleted') {
            await handleCancellation(activityId, 'hangout');
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
        } else if (newStatus === 'cancelled' || newStatus === 'deleted') {
            await handleCancellation(activityId, 'housing');
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
            WHERE room_id = ? 
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
        const { room_id, sender_email, sender_name, message } = req.body;

        const query = `
            INSERT INTO chat_messages 
            (room_id, sender_email, sender_name, message) 
            VALUES (?, ?, ?, ?)
        `;

        await sequelize.query(query, {
            replacements: [
                room_id, sender_email, sender_name, message
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
                   u.hobby,
                   u.credit_points
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

// --- MULTER CONFIGURATION (Memory Storage for Cloudinary Stream) ---
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Strict 50MB limit
});

// Original local upload route (Deprecated - Kept for compatibility but converted to handle memory)
app.post('/upload', checkAuth, upload.single('file'), handleMulterError, (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Default to a warning since local storage is disabled on Render
    res.status(410).json({ error: 'Legacy /upload is deprecated. Please use /api/chat/upload for Cloudinary storage.' });
});

// --- NEW CLOUDINARY UPLOAD ENDPOINT ---
app.post('/api/chat/upload', checkAuth, upload.single('file'), handleMulterError, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        // Implementation of upload_stream to push buffer to Cloudinary
        const stream = cloudinary.uploader.upload_stream(
            { 
                resource_type: 'auto', 
                folder: 'joinup_chat',
                public_id: `chat_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload failed:", error);
                    return res.status(500).json({ error: 'Cloudinary storage failed: ' + error.message });
                }
                
                // Success: return optimized JSON for frontend rendering
                res.status(200).json({
                    url: result.secure_url,
                    type: result.resource_type === 'image' ? 'image' : (result.resource_type === 'video' ? 'video' : 'file'),
                    fileName: req.file.originalname,
                    size: result.bytes
                });
            }
        );

        // Pipe the buffer directly into the Cloudinary stream
        stream.end(req.file.buffer);
    } catch (err) {
        console.error("Upload stream error:", err);
        res.status(500).json({ error: 'Internal upload crash: ' + err.message });
    }
});


// ==========================================
// --- API UNTUK CARPOOL (TEBENGAN) ---
// ==========================================

// 1. Mengambil semua data tebengan
app.get('/carpools', async (req, res) => {
    try {
        const query = `
            SELECT c.*, u.username as host_name, u.major as host_dept, u.study_year, u.profile_pic, u.hobby, u.bio, u.credit_points
            FROM carpools c
            JOIN users u ON c.host_email = u.email
            WHERE c.status = 'open' AND (c.deadline > NOW() OR c.deadline IS NULL OR c.departure_time > NOW())
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

        const [result] = await sequelize.query(query, {
            replacements: [
                host_email, host_name, host_dept, title,
                departure_loc, destination_loc, toTaipei(departure_time), toTaipei(deadline),
                available_seats, price, vehicle_type, description
            ]
        });

        const insertId = result.insertId || result;
        await awardPoints(host_email, 1); // +1 Point for creating carpool!

        // 🔔 Notify Instant!
        await notifySubscribers('carpool', title, insertId, 'carpool', host_email);

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
            SELECT s.*, u.username as host_name, u.major as host_dept, u.study_year, u.profile_pic, u.hobby, u.bio, u.credit_points
            FROM studies s
            JOIN users u ON s.host_email = u.email
            WHERE s.status = 'open' AND (s.deadline > NOW() OR s.deadline IS NULL OR s.event_time > NOW())
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

        const [result] = await sequelize.query(query, {
            replacements: [
                host_email, host_name, host_dept,
                title, event_type, subject, location,
                people_needed, toTaipei(event_time), toTaipei(deadline), description
            ]
        });

        const insertId = result.insertId || result;
        await awardPoints(host_email, 1); // +1 Point for creating study!

        // 🔔 Notify Instant!
        await notifySubscribers('study', title, insertId, 'study', host_email);

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
        const emails = getEmailVariations(req.params.email);
        const query = `SELECT * FROM studies WHERE host_email IN (?) ORDER BY created_at DESC`;
        const [results] = await sequelize.query(query, { replacements: [emails] });
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
            SELECT h.*, u.username as host_name, u.major as host_dept, u.study_year, u.profile_pic, u.hobby, u.bio, u.credit_points
            FROM hangouts h
            JOIN users u ON h.host_email = u.email
            WHERE h.status = 'open' AND (h.deadline > NOW() OR h.deadline IS NULL OR h.event_time > NOW())
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

        const [result] = await sequelize.query(query, {
            replacements: [
                host_email, title, category, host_name, host_dept,
                people_needed, toTaipei(event_time), toTaipei(deadline),
                meeting_location, destination, description
            ]
        });

        const insertId = result.insertId || result;
        await awardPoints(host_email, 1); // +1 Point for creating hangout!

        // 🔔 Notify Instant!
        await notifySubscribers('hangout', title, insertId, 'hangout', host_email);

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
        const emails = getEmailVariations(req.params.email);
        const query = `SELECT * FROM hangouts WHERE host_email IN (?) ORDER BY created_at DESC`;
        const [results] = await sequelize.query(query, { replacements: [emails] });
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
        const emails = getEmailVariations(req.params.email);
        const query = `
            SELECT r.room_id as id, r.post_id, r.room_type as roomType, r.team_name as teamName 
            FROM chat_rooms r
            JOIN chat_participants p ON r.room_id = p.room_id
            WHERE p.user_email IN (?)
            ORDER BY r.created_at DESC
        `;
        const [rooms] = await sequelize.query(query, { replacements: [emails] });
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
        const { host_email, host_name, host_dept, housing_type, title, location, room_number, rent_amount, deposit, people_needed, gender_req, schedule_tags, deadline, rental_period, facilities, habits, description } = req.body;

        const query = `
            INSERT INTO housing 
            (host_email, host_name, host_dept, housing_type, title, location, room_number, rent_amount, deposit, people_needed, gender_req, schedule_tags, deadline, rental_period, facilities, habits, description, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
        `;

        const [result] = await sequelize.query(query, {
            replacements: [host_email, host_name, host_dept, housing_type, title, location, room_number || null, rent_amount || null, deposit || null, people_needed, gender_req, schedule_tags || '', toTaipei(deadline), rental_period, facilities || '', habits || '', description || '']
        });

        const insertId = result.insertId || result;
        await awardPoints(host_email, 1); // +1 Point for creating housing!

        // 🔔 Notify Instant!
        await notifySubscribers('housing', title, insertId, 'housing', host_email);

        res.status(201).json({ success: true, id: insertId });
    } catch (error) {
        console.error("Failed to create housing:", error);
        res.status(500).json({ error: 'Failed to create housing: ' + error.message });
    }
});

// 2. API GET ALL HOUSING (Untuk List)
app.get('/housing', async (req, res) => {
    try {
        const query = `
            SELECT ho.*, u.username as host_name, u.major as host_dept, u.study_year, u.profile_pic, u.hobby, u.bio, u.credit_points
            FROM housing ho
            JOIN users u ON ho.host_email = u.email
            WHERE ho.status = 'open' AND (ho.deadline > NOW() OR ho.deadline IS NULL)
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
        const emails = getEmailVariations(req.params.email);
        const query = "SELECT * FROM housing WHERE host_email IN (?) ORDER BY created_at DESC";
        const [results] = await sequelize.query(query, { replacements: [emails] });
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
        const emails = getEmailVariations(req.params.email);
        // Ambil data user berdasarkan email
        const [results] = await sequelize.query('SELECT * FROM users WHERE email IN (?)', {
            replacements: [emails]
        });

        if (results.length > 0) {
            // KIRIM OBJEK PERTAMA SAJA (results[0]), biar frontend gak bingung baca array
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'User not found!' });
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

        // Award 1 point to participant upon successful feedback
        await awardPoints(user_email, 1);

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
        const emails = getEmailVariations(req.params.email);
        const [results] = await sequelize.query('SELECT event_id FROM activity_feedback WHERE user_email IN (?)', {
            replacements: [emails]
        });
        res.json(results.map(r => String(r.event_id))); // Kirim kumpulan ID event yang udah di-rate
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SUBSCRIPTION API ---
app.get('/api/v1/subscriptions', async (req, res) => {
    try {
        const { email } = req.query;
        const emails = getEmailVariations(email);
        const [results] = await sequelize.query('SELECT category_name FROM user_subscriptions WHERE user_email IN (?)', {
            replacements: [emails]
        });
        res.json(results.map(r => r.category_name));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/v1/subscriptions', async (req, res) => {
    try {
        const { email, category, action } = req.body;
        if (action === 'subscribe') {
            await sequelize.query('INSERT IGNORE INTO user_subscriptions (user_email, category_name) VALUES (?, ?)', {
                replacements: [email, category]
            });
        } else {
            const emails = getEmailVariations(email);
            await sequelize.query('DELETE FROM user_subscriptions WHERE user_email IN (?) AND category_name = ?', {
                replacements: [emails, category]
            });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

async function syncAll() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        // Verify MySQL session timezone is Asia/Taipei (+08:00)
        const [tzResult] = await sequelize.query("SELECT @@session.time_zone AS tz, NOW() AS server_now");
        console.log(`[Timezone] MySQL session: ${tzResult[0].tz}, NOW() = ${tzResult[0].server_now}`);
        console.log(`[Timezone] Node.js dayjs: ${nowTaipei().format('YYYY-MM-DD HH:mm:ss')} (Asia/Taipei)`);

        // 1. Sync User Model (Create 'users' table if not exists)
        await User.sync();
        console.log('User model synchronized.');

        // 2. Create tables for Raw Queries (If not exists)
        const tables = [
            `CREATE TABLE IF NOT EXISTS activities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                host_email VARCHAR(255),
                category VARCHAR(50),
                title VARCHAR(255),
                sport_type VARCHAR(100),
                people_needed INT,
                event_time DATETIME,
                deadline DATETIME,
                location VARCHAR(255),
                description TEXT,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS carpools (
                id INT AUTO_INCREMENT PRIMARY KEY,
                host_email VARCHAR(255),
                host_name VARCHAR(100),
                host_dept VARCHAR(100),
                title VARCHAR(255),
                departure_loc VARCHAR(255),
                destination_loc VARCHAR(255),
                departure_time DATETIME,
                deadline DATETIME,
                available_seats INT,
                price VARCHAR(50),
                vehicle_type VARCHAR(50),
                description TEXT,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS studies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                host_email VARCHAR(255),
                host_name VARCHAR(100),
                host_dept VARCHAR(100),
                title VARCHAR(255),
                event_type VARCHAR(50),
                subject VARCHAR(100),
                location VARCHAR(255),
                people_needed INT,
                event_time DATETIME,
                deadline DATETIME,
                description TEXT,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS hangouts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                host_email VARCHAR(255),
                title VARCHAR(255),
                category VARCHAR(100),
                host_name VARCHAR(100),
                host_dept VARCHAR(100),
                people_needed INT,
                event_time DATETIME,
                deadline DATETIME,
                meeting_location VARCHAR(255),
                destination VARCHAR(255),
                description TEXT,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS housing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                host_email VARCHAR(255),
                host_name VARCHAR(100),
                host_dept VARCHAR(100),
                housing_type VARCHAR(50),
                title VARCHAR(255),
                location VARCHAR(255),
                room_number VARCHAR(50),
                rent_amount VARCHAR(50),
                deposit VARCHAR(100),
                people_needed INT,
                gender_req VARCHAR(50),
                schedule_tags TEXT,
                deadline DATETIME,
                rental_period VARCHAR(100),
                facilities TEXT,
                habits TEXT,
                description TEXT,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS chat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                room_id VARCHAR(100),
                sender_email VARCHAR(255),
                sender_name VARCHAR(100),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS chat_participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                room_id VARCHAR(100),
                user_email VARCHAR(255),
                user_name VARCHAR(100),
                role VARCHAR(50),
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS activity_feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255),
                user_name VARCHAR(100),
                user_dept VARCHAR(100),
                study_year VARCHAR(50),
                event_id INT,
                event_title VARCHAR(255),
                category VARCHAR(50),
                q1_rating INT,
                q2_rating INT,
                q3_success TINYINT(1),
                q4_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS event_participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_type VARCHAR(50),
                event_id INT,
                user_id INT,
                status VARCHAR(50) DEFAULT 'pending',
                snapshot_display_name VARCHAR(255),
                snapshot_avatar_url TEXT,
                snapshot_bio TEXT,
                version INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE(event_type, event_id, user_id),
                INDEX(event_id, status, created_at),
                INDEX(event_id, status, updated_at)
            )`,
            `CREATE TABLE IF NOT EXISTS system_notifications (
                id VARCHAR(36) PRIMARY KEY,
                recipient_id INT,
                type VARCHAR(50),
                aggregate_id VARCHAR(100),
                link TEXT,
                metadata TEXT,
                action_metadata TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                delivery_state VARCHAR(50) DEFAULT 'delivered',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(recipient_id, type, aggregate_id)
            )`,
            `CREATE TABLE IF NOT EXISTS outbox_events (
                id VARCHAR(36) PRIMARY KEY,
                idempotency_key VARCHAR(100) UNIQUE,
                aggregate_type VARCHAR(50),
                aggregate_id VARCHAR(100),
                type VARCHAR(100),
                payload TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                retry_count INT DEFAULT 0,
                last_attempt_at TIMESTAMP NULL,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS audit_logs (
                id VARCHAR(36) PRIMARY KEY,
                actor_id INT,
                event_id INT,
                participant_id INT,
                action VARCHAR(100),
                previous_state TEXT,
                new_state TEXT,
                request_id VARCHAR(100),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS dead_letter_queue (
                id VARCHAR(36) PRIMARY KEY,
                original_event_id VARCHAR(36),
                idempotency_key VARCHAR(100),
                aggregate_type VARCHAR(50),
                aggregate_id VARCHAR(100),
                type VARCHAR(100),
                payload TEXT,
                error_message TEXT,
                failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS request_idempotency (
                idempotency_key VARCHAR(100) PRIMARY KEY,
                request_hash VARCHAR(100),
                response_snapshot TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS user_subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(255),
                category_name ENUM('carpool', 'hangout', 'sports', 'study', 'housing'),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email, category_name)
            )`
        ];

        for (let sql of tables) {
            await sequelize.query(sql);
        }
        console.log('All raw tables verified/created.');

        // --- MIGRATION: ADD MISSING COLUMNS IF THEY DON'T EXIST ---
        console.log('Running migrations...');
        const addColumnSafe = async (table, column, definition) => {
            try {
                await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`[Migration] Added column ${column} to ${table}`);
            } catch (err) {
                if (!err.message.includes('Duplicate column name')) {
                    console.error(`[Migration] Error adding ${column} to ${table}:`, err.message);
                }
            }
        };

        const modifyColumnSafe = async (table, column, definition) => {
            try {
                await sequelize.query(`ALTER TABLE ${table} MODIFY COLUMN ${column} ${definition}`);
                console.log(`[Migration] Modified column ${column} in ${table}`);
            } catch (err) {
                console.error(`[Migration] Error modifying ${column} in ${table}:`, err.message);
            }
        };

        // Housing Migrations
        await addColumnSafe('housing', 'host_name', 'VARCHAR(255) AFTER host_email');
        await addColumnSafe('housing', 'host_dept', 'VARCHAR(255) AFTER host_name');
        await addColumnSafe('housing', 'schedule_tags', 'TEXT AFTER gender_req');
        await addColumnSafe('housing', 'deadline', 'DATETIME AFTER schedule_tags');
        await addColumnSafe('housing', 'rental_period', 'VARCHAR(100) AFTER deadline');
        await addColumnSafe('housing', 'facilities', 'TEXT AFTER rental_period');
        await addColumnSafe('housing', 'habits', 'TEXT AFTER facilities');

        // Field Type Optimizations for Flexible Input
        await modifyColumnSafe('housing', 'rent_amount', 'VARCHAR(100)');
        await modifyColumnSafe('housing', 'deposit', 'VARCHAR(100)');
        await modifyColumnSafe('housing', 'room_number', 'VARCHAR(100)');

    } catch (err) {
        console.error('Initial Database Sync Failed:', err);
    }
}

// ==========================================
// --- START WORKER SERVICE ---
// ==========================================
const { startWorker } = require('./services/worker_service');
startWorker();

// --- BACKGROUND WORKER: AUTOMATIC EVENT RETIREMENT & COMPLETION ---
async function startEventRetirementWorker() {
    console.log('[Worker] Starting Autonomous Event Retirement/Completion (Interval: 60s)');

    const retireLogic = async () => {
        try {
            const categories = [
                { table: 'activities', type: 'sports', timeCol: 'event_time' },
                { table: 'carpools', type: 'carpool', timeCol: 'departure_time' },
                { table: 'studies', type: 'study', timeCol: 'event_time' },
                { table: 'hangouts', type: 'hangout', timeCol: 'event_time' },
                { table: 'housing', type: 'housing', timeCol: 'deadline' }
            ];

            for (const cat of categories) {
                // Fetch candidate events that are open/paused and either:
                // 1) 3 hours past their scheduled time
                // 2) Past their deadline
                const [candidates] = await sequelize.query(`
                    SELECT id, host_email FROM ${cat.table} 
                    WHERE status IN ('open', 'paused') 
                    AND (
                        (IFNULL(${cat.timeCol}, '2099-01-01') < DATE_SUB(NOW(), INTERVAL 3 HOUR))
                        OR (deadline IS NOT NULL AND deadline < NOW())
                    )
                `);

                for (const event of candidates) {
                    const [parts] = await sequelize.query(`
                        SELECT COUNT(*) as count FROM event_participants 
                        WHERE event_type = ? AND event_id = ? AND status IN ('approved', 'accepted')
                    `, { replacements: [cat.type, event.id] });
                    const count = parseInt(parts[0].count, 10);

                    if (count > 0) {
                        // Mark as success ONLY if we've passed the 3-hour buffer post-event time
                        const [checkTime] = await sequelize.query(`
                            SELECT 1 FROM ${cat.table} 
                            WHERE id = ? AND IFNULL(${cat.timeCol}, '2099-01-01') < DATE_SUB(NOW(), INTERVAL 3 HOUR)
                        `, { replacements: [event.id] });

                        if (checkTime.length > 0) {
                            await sequelize.query(`UPDATE ${cat.table} SET status = 'success' WHERE id = ?`, { replacements: [event.id] });
                            if (typeof awardPoints === 'function') {
                                await awardPoints(event.host_email, 1);
                            }
                            console.log(`[Worker] Auto-completed ${cat.type} ${event.id}; 1 host point awarded.`);
                        }
                        // If it's just past the deadline but not PAST the event_time+3hr, we leave it open so the event can still happen.
                    } else {
                        // No participants and reached a time limit (deadline or event_time) -> Expire it.
                        await sequelize.query(`UPDATE ${cat.table} SET status = 'expired' WHERE id = ?`, { replacements: [event.id] });
                        console.log(`[Worker] Auto-expired ${cat.type} ${event.id} (no participants).`);
                    }
                }
            }
        } catch (error) {
            console.error('[Worker] Retirement error:', error.message);
        }
    };

    // Run once at start
    await retireLogic();
    // Then every 60 seconds
    setInterval(retireLogic, 60000);
}

// 🕒 DAILY DIGEST CRON JOB
// Logic provided by user:
// 12:00 -> 19:01 (Prev Day) to 12:00 (Today)
// 19:00 -> 12:01 (Today) to 19:00 (Today)
cron.schedule('0 12,19 * * *', async () => {
    try {
        const now = nowTaipei();
        const currentHour = now.hour();

        let startTime, endTime, translationKey;

        if (currentHour === 12) {
            startTime = now.subtract(1, 'day').hour(19).minute(1).second(0).format('YYYY-MM-DD HH:mm:ss');
            endTime = now.hour(12).minute(0).second(59).format('YYYY-MM-DD HH:mm:ss');
            translationKey = 'notif.digest.morning';
        } else {
            startTime = now.hour(12).minute(1).second(0).format('YYYY-MM-DD HH:mm:ss');
            endTime = now.hour(19).minute(0).second(59).format('YYYY-MM-DD HH:mm:ss');
            translationKey = 'notif.digest.afternoon';
        }

        console.log(`[Cron] Running Digest for ${translationKey} Range: ${startTime} to ${endTime}`);

        const tables = ['activities', 'carpools', 'studies', 'hangouts', 'housing'];
        let totalCount = 0;

        for (const table of tables) {
            const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table} WHERE created_at BETWEEN ? AND ?`, {
                replacements: [startTime, endTime]
            });
            totalCount += result[0].count;
        }

        if (totalCount > 0) {
            const [users] = await sequelize.query("SELECT id FROM users");
            const metadata = JSON.stringify({
                message: translationKey === 'notif.digest.morning'
                    ? `There are ${totalCount} new events this morning! / 今天早上有 ${totalCount} 個新活動！`
                    : `There are ${totalCount} new events this afternoon! / 今天下午有 ${totalCount} 個新活動！`,
                translationKey: translationKey,
                translationParams: { count: totalCount },
                link: '#home'
            });

            for (const user of users) {
                // aggregate_id unique per day/slot to avoid dupe inserts
                const digestId = `digest_${translationKey}_${now.format('YYYYMMDD')}`;
                await sequelize.query(
                    `INSERT INTO system_notifications (id, recipient_id, type, aggregate_id, metadata, action_metadata, created_at)
                     VALUES (UUID(), ?, 'daily_digest', ?, ?, '{}', NOW())
                     ON DUPLICATE KEY UPDATE created_at = NOW()`,
                    { replacements: [user.id, digestId, metadata] }
                );
            }

            // 🔔 Send OneSignal Push to ALL users for Digest
            const pushTitle = `📢 Daily Digest / 活動快報`;
            const pushBody = translationKey === 'notif.digest.morning'
                ? `There are ${totalCount} new events this morning! / 今天早上有 ${totalCount} 個新活動，快來看看吧！`
                : `There are ${totalCount} new events this afternoon! / 今天下午有 ${totalCount} 個新活動，快來看看吧！`;
            
            const allUsersEmails = users.map(u => u.email).filter(e => !!e);
            await pushService.sendPushNotification(allUsersEmails, pushTitle, pushBody, `https://joinup-production.onrender.com/#home`);

            console.log(`[Cron] Sent ${translationKey} to ${users.length} users. Total events: ${totalCount}`);
        } else {
            console.log(`[Cron] No new events found for range. Skipping notification.`);
        }
    } catch (error) {
        console.error("[Cron] Daily Digest Error:", error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Taipei"
});

app.listen(PORT, async () => {
    console.log(`SERVER SUCCESSFUL! 🚀 Run on port ${PORT}`);
    await syncAll();
    startEventRetirementWorker();
    workerService.startWorker();
});