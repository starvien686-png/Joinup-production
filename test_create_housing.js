const http = require('http');

const postData = JSON.stringify({
    host_email: 'test@mail1.ncnu.edu.tw',
    host_name: 'Test Host',
    host_dept: 'Computer Science',
    housing_type: 'male_undergrad',
    title: 'Test Housing Event ' + Date.now(),
    location: 'Dorm A',
    room_number: '123',
    rent_amount: '5000',
    deposit: '2 months',
    people_needed: 1,
    gender_req: 'male',
    schedule_tags: '夜貓子, 規律作息',
    deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 19).replace('T', ' '),
    rental_period: 'Spring 2026',
    facilities: 'Wifi, Washing Machine',
    habits: 'Quiet, No Smoking',
    description: 'This is a test housing post'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/create-housing',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Headers:', JSON.stringify(res.headers, null, 2));
        console.log('Response Body:', data);
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    process.exit(1);
});

req.write(postData);
req.end();
