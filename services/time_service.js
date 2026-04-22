const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TIMEZONE = 'Asia/Taipei';

/**
 * Returns a dayjs object set to the current time in Asia/Taipei.
 */
function nowTaipei() {
    return dayjs().tz(APP_TIMEZONE);
}

/**
 * Safely converts a datetime string to YYYY-MM-DD HH:mm:ss in Taipei time.
 * @param {string} datetimeStr 
 */
function toTaipei(datetimeStr) {
    if (!datetimeStr) return null;
    const parsed = dayjs.tz(datetimeStr, APP_TIMEZONE);
    if (!parsed.isValid()) return datetimeStr;
    return parsed.format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Formats any date object or string into MySQL-friendly YYYY-MM-DD HH:mm:ss.
 * @param {Date|string|dayjs.Dayjs} date 
 */
function formatTaipei(date) {
    if (!date) return null;
    return dayjs(date).tz(APP_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
}

module.exports = {
    dayjs,
    APP_TIMEZONE,
    nowTaipei,
    toTaipei,
    formatTaipei
};
