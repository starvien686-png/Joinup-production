const { nowTaipei, dayjs } = require('../services/time_service');

console.log('--- Timezone Verification ---');
const currentTaipei = nowTaipei();
console.log('Current Taipei Time:', currentTaipei.format('YYYY-MM-DD HH:mm:ss Z'));

// Test: Event with April 28 deadline should be OPEN on April 23
const mockNow = dayjs('2026-04-23 10:00:00').tz('Asia/Taipei');
const deadline = '2026-04-28 00:00:00';

console.log('\n--- Scenario: Join on April 23 for April 28 deadline ---');
console.log('Mock Current Time:', mockNow.format('YYYY-MM-DD HH:mm:ss'));
console.log('Deadline:', deadline);

const isExpired = mockNow.isAfter(dayjs(deadline));
console.log('Is Expired?', isExpired);

if (!isExpired) {
    console.log('SUCCESS: Registration is still open as expected.');
} else {
    console.log('FAILURE: System incorrectly thinks registration is closed.');
}

// Test: Event with April 22 deadline should be CLOSED on April 23
const oldDeadline = '2026-04-22 23:59:59';
const isOldExpired = mockNow.isAfter(dayjs(oldDeadline));
console.log('\n--- Scenario: Join on April 23 for April 22 deadline ---');
console.log('Mock Current Time:', mockNow.format('YYYY-MM-DD HH:mm:ss'));
console.log('Deadline:', oldDeadline);
console.log('Is Expired?', isOldExpired);

if (isOldExpired) {
    console.log('SUCCESS: Registration correctly identified as closed.');
} else {
    console.log('FAILURE: System incorrectly thinks registration is still open.');
}
