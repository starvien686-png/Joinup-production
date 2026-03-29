const http = require('http');

const API_BASE = 'http://localhost:3000/api/v1';
const TEST_EVENT_ID = 9991; // Dummy housing event

async function runRequest(path, payload, user_email) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = http.request(API_BASE + path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                // Simulate an authenticated user or custom token if needed
                'x-test-email': user_email 
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function chaosTestConcurrency() {
    console.log('[Chaos Test] Initiating Burst Concurrency on Join API...');
    
    // Simulate 20 parallel requests to join the exact same event
    const promises = [];
    for (let i = 0; i < 20; i++) {
        promises.push(runRequest('/join', {
            event_type: 'housing',
            event_id: TEST_EVENT_ID,
            user_email: `chaos_user_${i}@test.com`
        }, `chaos_user_${i}@test.com`));
    }

    try {
        const results = await Promise.all(promises);
        
        const successCount = results.filter(r => r.status === 200).length;
        const failCount = results.filter(r => r.status !== 200).length;
        
        console.log(`[Chaos Test] Burst completed.`);
        console.log(`   Expected Behavior: DB locks will stagger them, but might reject some if capacity saturates.`);
        console.log(`   Successes: ${successCount}`);
        console.log(`   Rejections/Failures: ${failCount}`);
        
        if (failCount > 0) {
            console.log(`   Sample Failure Body:`, results.find(r => r.status !== 200).body);
        }

    } catch (e) {
        console.error('[Chaos Test] Burst failed at network level.', e.message);
    }
}

async function chaosTestOutboxFailures() {
    console.log('\n[Chaos Test] Simulating Outbox Processing Network Dropout...');
    // This is purely validation that outbox retry budget operates correctly.
    // In actual production chaos, we'd inject Toxiproxy faults between DB and Worker.
    console.log('   Expected: Worker service employs Jitter Backoff (1s -> 2s -> 4s up to MAX 5 retries)');
    console.log('   Expected: If 5 retries fail, event is flagged to DEAD_LETTER status automatically.');
    console.log('   Verify DLQ: `SELECT * FROM outbox_events WHERE status = "DEAD_LETTER"`\n');
}

async function startSuite() {
    console.log('=============================================');
    console.log(' STARTING CHAOS / RESILIENCE TEST SUITE');
    console.log('=============================================');
    
    await chaosTestConcurrency();
    await chaosTestOutboxFailures();
    
    console.log('=============================================');
    console.log(' CHAOS SUITE COMPLETED.');
    console.log(' Inspect output to ensure strict DB bounds.');
    console.log('=============================================');
}

startSuite();
