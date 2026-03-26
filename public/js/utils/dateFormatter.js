/**
 * Formats a Date object into a time string based on the language.
 * Supports detailed time markers for EN, ZH, ID, MY, VN.
 * 
 * @param {Date|string|number} dateInput - The date to format.
 * @param {string} [forceLang] - Optional language code to override navigator/stored language.
 * @returns {string} The formatted time string.
 */
export const formatTime = (dateInput, forceLang = null) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    let lang = forceLang;
    if (!lang) {
        lang = localStorage.getItem('app_language') || navigator.language || navigator.userLanguage;
    }
    lang = lang.toLowerCase();

    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');

    // Display Hour (12-hour format)
    const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);

    // 1. Chinese (ZH)
    if (lang.includes('zh')) {
        let period = '';
        if (h >= 0 && h < 5) period = '凌晨';
        else if (h >= 5 && h < 9) period = '早上';
        else if (h >= 9 && h < 12) period = '上午';
        else if (h >= 12 && h < 13) period = '中午';
        else if (h >= 13 && h < 18) period = '下午';
        else period = '晚上'; // 18-24
        return `${period} ${displayH}:${m}`;
    }

    // 2. Indonesian (ID)
    // Pagi (05-10), Siang (10-15), Sore (15-18), Malam (18-05)
    if (lang === 'id') {
        let period = '';
        if (h >= 5 && h < 10) period = 'Pagi';
        else if (h >= 10 && h < 15) period = 'Siang';
        else if (h >= 15 && h < 18) period = 'Sore';
        else period = 'Malam'; // 18 - 05

        // Indonesians often use 24h format with markers, or 12h. 
        // User requested strict markers, we will combine.
        // Usually "10:30 Pagi".
        const idDisplayH = h < 10 ? `0${h}` : h; // Prefer 24h visually or 12h? 
        // Request: "Matches convention". 12h is safer with markers.
        return `${displayH}:${m} ${period}`;
    }

    // 3. Vietnamese (VN)
    // Đêm (00-04), Sáng (04-11), Trưa (11-13), Chiều (13-18), Tối (18-24)
    if (lang === 'vn') {
        let period = '';
        if (h >= 0 && h < 4) period = 'Đêm';
        else if (h >= 4 && h < 11) period = 'Sáng';
        else if (h >= 11 && h < 13) period = 'Trưa';
        else if (h >= 13 && h < 18) period = 'Chiều';
        else period = 'Tối'; // 18-24
        return `${displayH}:${m} ${period}`;
    }

    // 4. Burmese (MY)
    // မနက် (Morning): 00-12
    // နေ့လည် (Afternoon): 12-16
    // ညနေ (Evening): 16-19
    // ည (Night): 19-24
    if (lang === 'my') {
        let period = '';
        if (h >= 0 && h < 12) period = 'မနက်';
        else if (h >= 12 && h < 16) period = 'နေ့လည်';
        else if (h >= 16 && h < 19) period = 'ညနေ';
        else period = 'ည'; // 19-24

        // Burmese often puts marker first: "မနက် ၉:၀၀"
        return `${period} ${displayH}:${m}`;
    }

    // 5. English / Default (EN)
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Formats a date for list view (e.g. "Just now", "10:30 AM", "Yesterday", "2023/10/25")
 */
export const formatListDate = (dateInput) => {
    const date = new Date(dateInput);
    const now = new Date();

    if (isNaN(date.getTime())) return '';

    const isToday = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (isToday) {
        return formatTime(date);
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

    const lang = localStorage.getItem('app_language') || navigator.language;

    if (isYesterday) {
        if (lang.includes('zh')) return '昨天';
        if (lang === 'id') return 'Kemarin';
        if (lang === 'vn') return 'Hôm qua';
        if (lang === 'my') return 'မနေ့က';
        return 'Yesterday';
    }

    return date.toLocaleDateString();
};
